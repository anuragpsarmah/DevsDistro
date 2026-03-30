import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { Review } from "../models/projectReview.model";
import { redisClient } from "..";
import logger from "../logger/logger";
import { tryCatch } from "./tryCatch.util";
import {
  isRepoZipKeyRetained,
  queueRepoZipKeyForCleanup,
  reconcileProjectPackageRetention,
} from "./projectPackageRetention.util";

/**
 * Performs all cleanup steps required to hard-delete a project:
 * 1. Removes from all user wishlists
 * 2. Queues project media for S3 deletion
 * 3. Deletes the project document
 * 4. Deletes only unretained package artifacts
 */
export async function performProjectHardDelete(project: {
  _id: any;
  project_images?: string[];
  project_images_detail?: string[];
  project_video?: string | null;
  repo_zip_s3_key?: string | null;
}): Promise<void> {
  // 1. Remove from all wishlists
  const [, wishlistError] = await tryCatch(
    User.updateMany(
      { wishlist: project._id },
      { $pull: { wishlist: project._id } }
    )
  );
  if (wishlistError) {
    logger.error(
      "Failed to remove project from wishlists during hard delete",
      wishlistError
    );
  }

  // 2. Queue project media for S3 cleanup
  const toBeDeletedKeys = [
    ...(project.project_images ?? []),
    ...(project.project_images_detail ?? []),
    ...(project.project_video ? [project.project_video] : []),
  ];

  for (const key of toBeDeletedKeys) {
    const s3Key = key.replace(`${process.env.S3_CLOUDFRONT_DISTRIBUTION}/`, "");
    const [, redisError] = await tryCatch(
      redisClient.zadd("media-cleanup-schedule", Date.now(), s3Key)
    );
    if (redisError) {
      logger.error("Failed to queue media for cleanup", redisError);
    }
  }

  // 3. Delete all reviews for this project
  const [, reviewsDeleteError] = await tryCatch(
    Review.deleteMany({ projectId: project._id })
  );
  if (reviewsDeleteError) {
    logger.error("Failed to delete project reviews during hard delete", {
      projectId: project._id.toString(),
      error: reviewsDeleteError,
    });
  }

  // 4. Delete the project document
  const [, deleteError] = await tryCatch(
    Project.deleteOne({ _id: project._id })
  );
  if (deleteError) {
    logger.error(
      "Failed to delete project document during hard delete",
      deleteError
    );
    return;
  }

  await reconcileProjectPackageRetention(project._id, {
    retainLatestPackage: false,
  });

  // Legacy safeguard: projects created before package backfill may still only
  // have repo_zip_s3_key on the project record and no ProjectPackage row.
  if (project.repo_zip_s3_key) {
    const stillRetained = await isRepoZipKeyRetained(project.repo_zip_s3_key);
    if (!stillRetained) {
      await queueRepoZipKeyForCleanup(project.repo_zip_s3_key);
    }
  }
}

/**
 * Starts a background job that runs hourly and hard-deletes any projects
 * whose scheduled_deletion_at timestamp has passed.
 */
export function startScheduledDeletionJob(): void {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  const runJob = async () => {
    const [dueProjects, queryError] = await tryCatch(
      Project.find({ scheduled_deletion_at: { $lte: new Date() } })
        .select(
          "project_images project_images_detail project_video repo_zip_s3_key _id"
        )
        .lean()
    );

    if (queryError) {
      logger.error(
        "Scheduled deletion job: failed to query due projects",
        queryError
      );
      return;
    }

    if (!dueProjects || dueProjects.length === 0) return;

    logger.info(
      `Scheduled deletion job: hard-deleting ${dueProjects.length} project(s)`
    );

    for (const project of dueProjects) {
      await performProjectHardDelete(project as any);
    }
  };

  // Run once shortly after startup to catch any overdue deletions
  setTimeout(runJob, 10_000);

  setInterval(runJob, INTERVAL_MS);
}
