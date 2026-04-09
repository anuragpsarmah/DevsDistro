import { Request, Response } from "express";
import { User } from "../models/user.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import asyncHandler from "../utils/asyncHandler.util";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";
import { githubAppService } from "../services/githubApp.service";
import logger from "../logger/logger";

// GET /api/github-app/status
const checkInstallationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "check_installation_status" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized", 401);
    }

    const userId = req.user._id;

    const [installation, error] = await tryCatch(
      GitHubAppInstallation.exists({
        user_id: userId,
        suspended_at: null,
      })
    );

    if (error) {
      enrichContext({ outcome: "error" });
      logger.error("Failed to fetch installation", error);
      throw new ApiError("Internal Server Error", 500);
    }

    const hasInstallation = !!installation;

    enrichContext({
      outcome: "success",
      has_installation: hasInstallation,
    });

    response(res, 200, "Installation status retrieved", {
      hasInstallation,
      installUrl: hasInstallation
        ? null
        : githubAppService.getInstallUrl(userId),
    });
  }
);

// GET /api/github-app/callback
const handleAppInstallCallback = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "github_app_callback" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized", 401);
    }

    const { installation_id, setup_action, state } = req.query;

    if (!installation_id || !state) {
      enrichContext({ outcome: "validation_failed" });
      response(res, 400, "Missing installation_id or state");
      return;
    }

    if (
      !githubAppService.verifyInstallState(
        state as string,
        req.user._id.toString()
      )
    ) {
      enrichContext({ outcome: "invalid_state" });
      response(res, 403, "Invalid or expired state token");
      return;
    }

    const installationId = parseInt(installation_id as string, 10);

    enrichContext({
      installation_id: installationId,
      setup_action: setup_action as string,
    });

    const installation = await githubAppService.getInstallation(installationId);

    if (!installation) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "Installation not found on GitHub");
      return;
    }

    if (installation.account.type !== "User") {
      enrichContext({ outcome: "organization_rejected" });
      logger.warn("Organization installation rejected", {
        installationId,
        accountType: installation.account.type,
        accountLogin: installation.account.login,
      });
      response(
        res,
        400,
        "Organization accounts are not supported. Please install the app on your personal GitHub account."
      );
      return;
    }

    const [user, userError] = await tryCatch(
      User.findById(req.user._id).select("github_id")
    );

    if (userError || !user) {
      enrichContext({ outcome: "error" });
      logger.error("Failed to fetch user", userError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (installation.account.id.toString() !== user.github_id) {
      enrichContext({
        outcome: "account_mismatch",
        installed_account: installation.account.login,
        expected_github_id: user.github_id,
      });
      logger.warn("GitHub App installed on wrong account", {
        installationId,
        installedAccountLogin: installation.account.login,
        installedAccountId: installation.account.id,
        expectedGithubId: user.github_id,
      });
      response(
        res,
        400,
        "GitHub App must be installed on the same account you're logged in with. Please uninstall from the other account and try again."
      );
      return;
    }

    const [upsertedInstallation, createError] = await tryCatch(
      GitHubAppInstallation.findOneAndUpdate(
        { installation_id: installationId },
        {
          $set: {
            account_type: "User",
            account_login: installation.account.login,
            account_id: installation.account.id,
            repository_selection: installation.repository_selection,
            user_id: req.user._id,
            github_id: user.github_id,
            suspended_at: installation.suspended_at
              ? new Date(installation.suspended_at)
              : null,
          },
        },
        { upsert: true, new: true }
      )
    );

    if (createError || !upsertedInstallation) {
      enrichContext({ outcome: "error" });
      logger.error("Failed to upsert installation", createError);
      throw new ApiError("Internal Server Error", 500);
    }

    const reactivatedCount =
      await githubAppService.reactivateProjectsWithRestoredAccess(
        req.user._id.toString(),
        installationId
      );

    enrichContext({
      outcome: "success",
      is_new_installation: true,
      reactivated_projects: reactivatedCount,
    });
    response(res, 200, "Installation registered", {
      installation_id: installationId,
      account_login: upsertedInstallation.account_login,
      reactivated_projects: reactivatedCount,
    });
  }
);

export { checkInstallationStatus, handleAppInstallCallback };
