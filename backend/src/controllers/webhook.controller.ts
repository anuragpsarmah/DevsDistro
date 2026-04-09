import { Request, Response } from "express";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import asyncHandler from "../utils/asyncHandler.util";
import response from "../utils/response.util";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";
import { githubAppService } from "../services/githubApp.service";
import logger from "../logger/logger";
import { redisClient } from "..";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import RepoZipUploadService from "../services/repoZipUpload.service";

const repoZipUploadService = new RepoZipUploadService();

interface WebhookPayload {
  action: string;
  installation?: {
    id: number;
    account: {
      login: string;
      id: number;
      type: string;
    };
    repository_selection: "all" | "selected";
    suspended_at?: string | null;
    suspended_by?: { login: string };
  };
  repositories_added?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
  repositories_removed?: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner?: {
      id: number;
      login: string;
      type?: string;
    };
  };
  sender: {
    login: string;
    id: number;
  };
  ref?: string;
  after?: string;
}

// POST /api/webhooks/github
const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const event = req.headers["x-github-event"] as string;
  const signature = req.headers["x-hub-signature-256"] as string;
  const deliveryId = req.headers["x-github-delivery"] as string;

  enrichContext({
    action: "webhook_received",
    webhook_event: event,
    webhook_delivery_id: deliveryId,
  });

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

  if (!githubAppService.verifyWebhookSignature(rawBody, signature)) {
    enrichContext({ outcome: "unauthorized" });
    logger.warn("Invalid webhook signature", { deliveryId });
    response(res, 401, "Invalid signature");
    return;
  }

  const payload: WebhookPayload = Buffer.isBuffer(req.body)
    ? JSON.parse(req.body.toString("utf8"))
    : typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

  logger.info("Webhook received", {
    event,
    action: payload.action,
    delivery_id: deliveryId,
  });

  try {
    switch (event) {
      case "ping":
        logger.info("Webhook ping received", { deliveryId });
        break;
      case "installation":
        await handleInstallationEvent(payload);
        break;
      case "installation_repositories":
        await handleInstallationRepositoriesEvent(payload);
        break;
      case "repository":
        await handleRepositoryEvent(payload);
        break;
      case "push":
        await handlePushEvent(payload);
        break;
      default:
        logger.info("Unhandled webhook event", { event });
    }

    enrichContext({ outcome: "success" });
    response(res, 200, "Webhook processed");
  } catch (error) {
    enrichContext({ outcome: "error" });
    logger.error("Webhook processing failed", { error, event, deliveryId });
    response(res, 200, "Webhook processing failed but acknowledged");
  }
});

async function handleInstallationEvent(payload: WebhookPayload) {
  const { action, installation } = payload;

  if (!installation) {
    logger.warn("Installation event missing installation data");
    return;
  }

  const installationId = installation.id;

  switch (action) {
    case "created":
      logger.info("Installation created webhook", { installationId });
      break;

    case "deleted":
      const [deletedInstallation] = await tryCatch(
        GitHubAppInstallation.findOneAndDelete({
          installation_id: installationId,
        })
      );

      if (deletedInstallation) {
        const [updateResult] = await tryCatch(
          Project.updateMany(
            { userid: deletedInstallation.user_id },
            { isActive: false, github_access_revoked: true }
          )
        );

        const [, cacheError] = await tryCatch(
          redisClient.del(
            privateRepoPrefix(deletedInstallation.user_id.toString())
          )
        );
        if (cacheError) {
          logger.error(
            "Failed to clear private repos cache after installation deletion",
            { installationId, cacheError }
          );
        }

        logger.info("Installation deleted, projects marked as access revoked", {
          installationId,
          account: installation.account.login,
          affectedProjects: updateResult?.modifiedCount || 0,
        });
      }
      break;

    case "suspend":
      await tryCatch(
        GitHubAppInstallation.updateOne(
          { installation_id: installationId },
          {
            suspended_at: installation.suspended_at
              ? new Date(installation.suspended_at)
              : new Date(),
          }
        )
      );

      const [suspendedInstallation] = await tryCatch(
        GitHubAppInstallation.findOne({
          installation_id: installationId,
        }).select("user_id")
      );

      if (suspendedInstallation) {
        const [suspendResult] = await tryCatch(
          Project.updateMany(
            { userid: suspendedInstallation.user_id },
            { isActive: false, github_access_revoked: true }
          )
        );

        const [, suspendCacheError] = await tryCatch(
          redisClient.del(
            privateRepoPrefix(suspendedInstallation.user_id.toString())
          )
        );
        if (suspendCacheError) {
          logger.error("Failed to clear private repos cache after suspend", {
            installationId,
            suspendCacheError,
          });
        }

        logger.info("Installation suspended, projects deactivated", {
          installationId,
          affectedProjects: suspendResult?.modifiedCount || 0,
        });
      }
      break;

    case "unsuspend":
      const [unsuspendedInstallation] = await tryCatch(
        GitHubAppInstallation.findOneAndUpdate(
          { installation_id: installationId },
          { suspended_at: null }
        ).select("user_id")
      );

      if (unsuspendedInstallation) {
        const reactivatedCount =
          await githubAppService.reactivateProjectsWithRestoredAccess(
            unsuspendedInstallation.user_id.toString(),
            installationId
          );

        enrichContext({
          outcome: "success",
          reactivated_suspended_projects: reactivatedCount,
        });

        if (unsuspendedInstallation) {
          const [, unsuspendCacheError] = await tryCatch(
            redisClient.del(
              privateRepoPrefix(unsuspendedInstallation.user_id.toString())
            )
          );
          if (unsuspendCacheError) {
            logger.error(
              "Failed to clear private repos cache after unsuspend",
              {
                installationId,
                unsuspendCacheError,
              }
            );
          }
        }

        logger.info("Installation unsuspended, projects reactivated", {
          installationId,
          affectedProjects: reactivatedCount || 0,
        });
      }
      break;

    default:
      logger.info("Unhandled installation action", { action, installationId });
  }
}

async function handleInstallationRepositoriesEvent(payload: WebhookPayload) {
  const { action, installation, repositories_added, repositories_removed } =
    payload;

  if (!installation) {
    logger.warn("Installation repositories event missing installation data");
    return;
  }

  const installationId = installation.id;

  if (action === "added" && repositories_added) {
    const [installationDoc] = await tryCatch(
      GitHubAppInstallation.findOne({ installation_id: installationId }).select(
        "user_id suspended_at"
      )
    );

    if (installationDoc && installationDoc.suspended_at !== null) return;

    if (installationDoc) {
      const addedRepoIdStrings = repositories_added.map((r) => r.id.toString());
      const [reactivateResult, reactivationError] = await tryCatch(
        Project.updateMany(
          {
            userid: installationDoc.user_id,
            github_repo_id: { $in: addedRepoIdStrings },
            github_access_revoked: true,
          },
          {
            isActive: false,
            github_access_revoked: false,
            github_installation_id: installationId,
          }
        )
      );

      if (reactivationError) {
        logger.error("Failed to reactivate projects", {
          installationId,
          reactivationError,
        });
      }

      if (
        reactivateResult?.modifiedCount &&
        reactivateResult.modifiedCount > 0
      ) {
        logger.info(
          "Projects reactivated after repo access restored via webhook",
          {
            installationId,
            reactivatedCount: reactivateResult.modifiedCount,
          }
        );
      }

      const [, cacheError] = await tryCatch(
        redisClient.del(privateRepoPrefix(installationDoc.user_id.toString()))
      );
      if (cacheError) {
        logger.error("Failed to clear private repos cache after repos added", {
          installationId,
          cacheError,
        });
      }
    }

    logger.info("Repositories added to installation", {
      installationId,
      count: repositories_added.length,
    });
  }

  if (action === "removed" && repositories_removed) {
    const removedRepoIds = repositories_removed.map((r) => r.id);
    const removedRepoIdStrings = removedRepoIds.map((id) => id.toString());
    const [updateResult] = await tryCatch(
      Project.updateMany(
        {
          github_installation_id: installationId,
          github_repo_id: { $in: removedRepoIdStrings },
        },
        {
          isActive: false,
          github_access_revoked: true,
          github_installation_id: installationId,
        }
      )
    );

    const [removedInstallationDoc] = await tryCatch(
      GitHubAppInstallation.findOne({ installation_id: installationId }).select(
        "user_id suspended_at"
      )
    );

    if (removedInstallationDoc && removedInstallationDoc.suspended_at !== null)
      return;

    if (removedInstallationDoc?.user_id) {
      const [, cacheError] = await tryCatch(
        redisClient.del(
          privateRepoPrefix(removedInstallationDoc.user_id.toString())
        )
      );
      if (cacheError) {
        logger.error(
          "Failed to clear private repos cache after repos removed",
          { installationId, cacheError }
        );
      }
    }

    logger.info(
      "Repositories removed from installation, projects marked as access revoked",
      {
        installationId,
        repoCount: repositories_removed.length,
        affectedProjects: updateResult?.modifiedCount || 0,
      }
    );
  }
}

async function handleRepositoryEvent(payload: WebhookPayload) {
  const { action, repository } = payload;

  if (!repository) {
    logger.warn("Repository event missing repository data");
    return;
  }

  const repoId = repository.id.toString();

  const clearPrivateRepoCacheForRepository = async () => {
    let cacheOwnerUserId: string | null = null;

    if (repository.owner?.id) {
      const [installationDoc] = await tryCatch(
        GitHubAppInstallation.findOne({
          account_id: repository.owner.id,
        })
          .select("user_id")
          .lean()
      );

      if (installationDoc?.user_id) {
        cacheOwnerUserId = installationDoc.user_id.toString();
      }
    }

    if (!cacheOwnerUserId) {
      const [affectedProject] = await tryCatch(
        Project.findOne({ github_repo_id: repoId }).select("userid").lean()
      );

      if (affectedProject?.userid) {
        cacheOwnerUserId = affectedProject.userid.toString();
      }
    }

    if (!cacheOwnerUserId) return;

    const [, cacheError] = await tryCatch(
      redisClient.del(privateRepoPrefix(cacheOwnerUserId))
    );

    if (cacheError) {
      logger.error("Failed to clear private repos cache after repo event", {
        repoId,
        action,
        userId: cacheOwnerUserId,
        cacheError,
      });
    }
  };

  switch (action) {
    case "deleted":
      const [result] = await tryCatch(
        Project.updateMany(
          { github_repo_id: repoId },
          { isActive: false, github_access_revoked: true }
        )
      );

      const [affectedProject] = await tryCatch(
        Project.findOne({ github_repo_id: repoId }).select("userid").lean()
      );
      if (affectedProject) {
        const [, cacheError] = await tryCatch(
          redisClient.del(privateRepoPrefix(affectedProject.userid.toString()))
        );
        if (cacheError) {
          logger.error(
            "Failed to clear private repos cache after repo deletion",
            { repoId, userId: affectedProject.userid.toString(), cacheError }
          );
        }
      }

      logger.info(
        "Repository deleted, projects deactivated and access revoked",
        {
          repoId,
          affectedCount: result?.modifiedCount || 0,
        }
      );
      break;

    case "privatized":
    case "publicized":
      await clearPrivateRepoCacheForRepository();
      logger.info("Repository visibility changed", { repoId, action });
      break;

    default:
      logger.info("Unhandled repository action", { action, repoId });
  }
}

async function handlePushEvent(payload: WebhookPayload) {
  const { repository } = payload;

  if (!repository) {
    logger.warn("Push event missing repository data");
    return;
  }

  const repoId = repository.id.toString();

  const [project, findError] = await tryCatch(
    Project.findOne({
      github_repo_id: repoId,
      github_access_revoked: { $ne: true },
      repo_zip_status: "SUCCESS",
      scheduled_deletion_at: null,
    })
      .select(
        "_id userid github_repo_id github_installation_id repo_zip_s3_key repackage_status"
      )
      .lean()
  );

  if (findError) {
    logger.error("Failed to query project for push auto-repackage", {
      repoId,
      findError,
    });
    return;
  }

  if (!project) return;

  if ((project as any).repackage_status === "PROCESSING") return;

  const repositoryDetails = await githubAppService.getRepository(
    project.github_installation_id!,
    Number(project.github_repo_id)
  );

  const defaultBranch = repositoryDetails?.default_branch;
  if (defaultBranch && payload.ref !== `refs/heads/${defaultBranch}`) {
    return;
  }

  const [user, userFindError] = await tryCatch(
    User.findOne({ _id: project.userid, auto_repackage_on_push: true })
      .select("_id")
      .lean()
  );

  if (userFindError) {
    logger.error("Failed to query user for push auto-repackage", {
      repoId,
      userFindError,
    });
    return;
  }

  if (!user) return;

  const [, updateError] = await tryCatch(
    Project.updateOne(
      { _id: project._id },
      {
        repackage_status: "PROCESSING",
        $unset: { repackage_error: 1 },
      }
    )
  );

  if (updateError) {
    logger.error("Failed to reset project for auto-repackage", {
      projectId: project._id,
      updateError,
    });
    return;
  }

  repoZipUploadService
    .processRepoZipUpload(
      project._id.toString(),
      project.github_repo_id,
      project.github_installation_id!,
      {
        source: "AUTO_REPACKAGE",
        commitSha:
          payload.after && /^[0-9a-f]{40}$/i.test(payload.after)
            ? payload.after
            : undefined,
      }
    )
    .catch((err) => {
      logger.error("Auto-repackage on push failed", {
        projectId: project._id.toString(),
        error: err instanceof Error ? err.message : "Unknown error",
      });
    });

  logger.info("Auto-repackage triggered on push", {
    projectId: project._id,
    repoId,
  });
}

export { handleWebhook };
