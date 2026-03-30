import mongoose from "mongoose";
import { redisClient } from "..";
import logger from "../logger/logger";
import { Project } from "../models/project.model";
import { ProjectPackage } from "../models/projectPackage.model";
import { Purchase } from "../models/purchase.model";
import { tryCatch } from "./tryCatch.util";

const CLEANUP_QUEUE_KEY = "media-cleanup-schedule";

const toObjectId = (
  value: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId | null => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

export async function queueRepoZipKeyForCleanup(
  s3Key: string | null | undefined
): Promise<void> {
  if (!s3Key) return;

  const [, cleanupError] = await tryCatch(
    redisClient.zadd(CLEANUP_QUEUE_KEY, Date.now(), s3Key)
  );

  if (cleanupError) {
    logger.error("Failed to queue repo ZIP for cleanup", {
      s3Key,
      error:
        cleanupError instanceof Error ? cleanupError.message : "Unknown error",
    });
  }
}

export async function isRepoZipKeyRetained(
  s3Key: string | null | undefined
): Promise<boolean> {
  if (!s3Key) return false;

  const [[liveProject], [retainedPackage], [purchaseReference]] =
    await Promise.all([
      tryCatch(
        Project.findOne({
          repo_zip_s3_key: s3Key,
          repo_zip_status: "SUCCESS",
        })
          .select("_id")
          .lean()
      ),
      tryCatch(ProjectPackage.findOne({ s3_key: s3Key }).select("_id").lean()),
      tryCatch(
        Purchase.findOne({
          status: "CONFIRMED",
          "package_snapshot.s3_key": s3Key,
        })
          .select("_id")
          .lean()
      ),
    ]);

  return Boolean(liveProject || retainedPackage || purchaseReference);
}

export async function reconcileProjectPackageRetention(
  projectId: string | mongoose.Types.ObjectId,
  options?: { retainLatestPackage?: boolean }
): Promise<void> {
  const retainLatestPackage = options?.retainLatestPackage ?? true;
  const projectObjectId = toObjectId(projectId);

  if (!projectObjectId) {
    logger.warn(
      "Skipping project package retention reconciliation for invalid project id",
      {
        projectId: String(projectId),
      }
    );
    return;
  }

  const retainedPackageIds = new Set<string>();
  const retainedS3Keys = new Set<string>();

  if (retainLatestPackage) {
    const [project] = await tryCatch(
      Project.findById(projectObjectId)
        .select("latest_package_id repo_zip_s3_key")
        .lean()
    );

    if (project?.latest_package_id) {
      retainedPackageIds.add(project.latest_package_id.toString());
    }

    if (project?.repo_zip_s3_key) {
      retainedS3Keys.add(project.repo_zip_s3_key);
    }
  }

  const [purchases, purchasesError] = await tryCatch(
    Purchase.find({
      projectId: projectObjectId,
      status: "CONFIRMED",
    })
      .select("purchased_package_id package_snapshot.s3_key")
      .lean()
  );

  if (purchasesError) {
    logger.error(
      "Failed to fetch purchases during project package retention reconciliation",
      {
        projectId: projectObjectId.toString(),
        error:
          purchasesError instanceof Error
            ? purchasesError.message
            : "Unknown error",
      }
    );
    return;
  }

  for (const purchase of purchases ?? []) {
    if (purchase.purchased_package_id) {
      retainedPackageIds.add(purchase.purchased_package_id.toString());
    }

    const purchaseS3Key = (purchase as any).package_snapshot?.s3_key;
    if (purchaseS3Key) {
      retainedS3Keys.add(purchaseS3Key);
    }
  }

  const [packages, packagesError] = await tryCatch(
    ProjectPackage.find({ projectId: projectObjectId })
      .select("_id s3_key")
      .lean()
  );

  if (packagesError) {
    logger.error("Failed to reconcile project package retention", {
      projectId: projectObjectId.toString(),
      error:
        packagesError instanceof Error
          ? packagesError.message
          : "Unknown error",
    });
    return;
  }

  for (const pkg of packages ?? []) {
    const packageId = pkg._id.toString();
    if (retainedPackageIds.has(packageId) || retainedS3Keys.has(pkg.s3_key)) {
      continue;
    }

    await queueRepoZipKeyForCleanup(pkg.s3_key);

    const [, deleteError] = await tryCatch(
      ProjectPackage.deleteOne({ _id: pkg._id })
    );

    if (deleteError) {
      logger.error("Failed to delete unretained project package record", {
        projectId: projectObjectId.toString(),
        packageId,
        s3Key: pkg.s3_key,
        error:
          deleteError instanceof Error ? deleteError.message : "Unknown error",
      });
    }
  }
}
