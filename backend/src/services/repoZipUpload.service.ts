import axios from "axios";
import crypto from "crypto";
import { redisClient, s3Service } from "..";
import { githubAppService } from "./githubApp.service";
import { Project } from "../models/project.model";
import { ProjectPackage } from "../models/projectPackage.model";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";
import { ProjectPackageSource, TreeNode } from "../types/types";
import { LOCK_TTL_SECONDS, MAX_REPO_SIZE_BYTES } from "../types/constants";
import {
  isRepoZipKeyRetained,
  queueRepoZipKeyForCleanup,
  reconcileProjectPackageRetention,
} from "../utils/projectPackageRetention.util";

type ProcessRepoZipUploadOptions = {
  source?: ProjectPackageSource;
  commitSha?: string;
};

export default class RepoZipUploadService {
  private getLockKey(projectId: string): string {
    return `repo-zip-lock:${projectId}`;
  }

  private buildRepoZipS3Key(projectId: string): string {
    const version = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    return `repoZips/${projectId}/${version}.zip`;
  }

  private async resolveRepoInfo(
    githubRepoId: string,
    installationToken: string
  ): Promise<{ full_name: string; default_branch: string }> {
    const [repoResponse, repoError] = await tryCatch(
      axios.get<{ full_name: string; default_branch: string }>(
        `https://api.github.com/repositories/${githubRepoId}`,
        {
          headers: {
            Authorization: `Bearer ${installationToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      )
    );

    if (repoError || !repoResponse) {
      throw new Error(
        `Failed to fetch repo info: ${repoError instanceof Error ? repoError.message : "Unknown error"}`
      );
    }

    return repoResponse.data;
  }

  private async resolveHeadCommitSha(
    fullName: string,
    defaultBranch: string,
    installationToken: string
  ): Promise<string> {
    const [commitResponse, commitError] = await tryCatch(
      axios.get<{ sha: string }>(
        `https://api.github.com/repos/${fullName}/commits/${encodeURIComponent(defaultBranch)}`,
        {
          headers: {
            Authorization: `Bearer ${installationToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      )
    );

    if (commitError || !commitResponse?.data?.sha) {
      throw new Error(
        `Failed to resolve head commit: ${commitError instanceof Error ? commitError.message : "Unknown error"}`
      );
    }

    return commitResponse.data.sha;
  }

  private async fetchAndStoreRepoTree(
    projectId: string,
    fullName: string,
    commitSha: string,
    installationToken: string
  ): Promise<void> {
    await tryCatch(
      Project.findByIdAndUpdate(projectId, { repo_tree_status: "PROCESSING" })
    );

    const [treeResponse, treeError] = await tryCatch(
      axios.get<{
        tree: Array<{ path: string; type: string }>;
        truncated: boolean;
      }>(
        `https://api.github.com/repos/${fullName}/git/trees/${commitSha}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${installationToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      )
    );

    if (treeError || !treeResponse) {
      throw new Error(
        `Failed to fetch repo tree: ${treeError instanceof Error ? treeError.message : "Unknown error"}`
      );
    }

    const { tree: entries, truncated } = treeResponse.data;

    if (truncated) {
      logger.warn("Repo tree was truncated by GitHub (>100k entries)", {
        projectId,
      });
    }

    const root: TreeNode = { name: "root", type: "directory", children: [] };
    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set("", root);

    for (const entry of entries) {
      const lastSlash = entry.path.lastIndexOf("/");
      const parentPath =
        lastSlash === -1 ? "" : entry.path.substring(0, lastSlash);
      const name =
        lastSlash === -1 ? entry.path : entry.path.substring(lastSlash + 1);

      const parent = nodeMap.get(parentPath);
      if (!parent?.children) continue;

      if (entry.type === "tree") {
        const dirNode: TreeNode = { name, type: "directory", children: [] };
        parent.children.push(dirNode);
        nodeMap.set(entry.path, dirNode);
      } else {
        parent.children.push({ name, type: "file" });
      }
    }

    await tryCatch(
      Project.findByIdAndUpdate(projectId, {
        repo_tree: root,
        repo_tree_status: "SUCCESS",
        repo_tree_error: null,
      })
    );
  }

  private async finalizeNoopRepackage(
    projectId: string,
    commitSha: string,
    source: ProjectPackageSource
  ): Promise<void> {
    await tryCatch(
      Project.findByIdAndUpdate(projectId, {
        repackage_status: "IDLE",
        repackage_error: null,
        latest_package_commit_sha: commitSha,
      })
    );

    logger.info("Skipping package creation because commit is unchanged", {
      projectId,
      commitSha,
      source,
    });
  }

  async processRepoZipUpload(
    projectId: string,
    githubRepoId: string,
    installationId: number,
    options: ProcessRepoZipUploadOptions = {}
  ): Promise<void> {
    const lockKey = this.getLockKey(projectId);
    const source = options.source ?? "INITIAL_LISTING";

    const lockAcquired = await redisClient.set(
      lockKey,
      "1",
      "EX",
      LOCK_TTL_SECONDS,
      "NX"
    );

    if (!lockAcquired) {
      logger.info("Repo ZIP upload already in progress", { projectId });
      return;
    }

    let uploadedS3Key: string | null = null;
    let createdPackageId: string | null = null;
    let hadLatestPackage = false;

    try {
      const [project, findError] = await tryCatch(
        Project.findById(projectId)
          .select(
            "userid repo_zip_status repo_zip_s3_key latest_package_id latest_package_commit_sha"
          )
          .lean()
      );

      if (findError || !project) {
        logger.error("Failed to find project for ZIP upload", {
          projectId,
          error:
            findError instanceof Error
              ? findError.message
              : "Project not found",
        });
        await redisClient.del(lockKey);
        return;
      }

      hadLatestPackage =
        project.repo_zip_status === "SUCCESS" &&
        Boolean(project.repo_zip_s3_key);

      if (source === "INITIAL_LISTING" && hadLatestPackage) {
        logger.info("Repo ZIP already uploaded for project", { projectId });
        await redisClient.del(lockKey);
        return;
      }

      if (
        hadLatestPackage &&
        project.latest_package_id &&
        project.repo_zip_s3_key &&
        options.commitSha &&
        project.latest_package_commit_sha === options.commitSha
      ) {
        await this.finalizeNoopRepackage(projectId, options.commitSha, source);
        return;
      }

      const [installationToken, tokenError] = await tryCatch(
        githubAppService.getInstallationToken(installationId)
      );

      if (tokenError || !installationToken) {
        throw new Error(
          `Failed to get installation token: ${tokenError instanceof Error ? tokenError.message : "Unknown error"}`
        );
      }

      const { full_name, default_branch } = await this.resolveRepoInfo(
        githubRepoId,
        installationToken
      );
      const commitSha =
        options.commitSha ??
        (await this.resolveHeadCommitSha(
          full_name,
          default_branch,
          installationToken
        ));

      if (
        hadLatestPackage &&
        project.latest_package_id &&
        project.repo_zip_s3_key &&
        project.latest_package_commit_sha === commitSha
      ) {
        await this.finalizeNoopRepackage(projectId, commitSha, source);
        return;
      }

      const [zipResponse, downloadError] = await tryCatch(
        axios.get(
          `https://api.github.com/repositories/${githubRepoId}/zipball/${commitSha}`,
          {
            headers: {
              Authorization: `Bearer ${installationToken}`,
              Accept: "application/vnd.github+json",
            },
            responseType: "stream",
            maxContentLength: MAX_REPO_SIZE_BYTES,
            maxBodyLength: MAX_REPO_SIZE_BYTES,
          }
        )
      );

      if (downloadError || !zipResponse) {
        throw new Error(
          `Failed to download repo: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`
        );
      }

      const contentLength = parseInt(
        zipResponse.headers["content-length"] || "0",
        10
      );
      if (contentLength > MAX_REPO_SIZE_BYTES) {
        zipResponse.data.destroy();
        throw new Error(
          `Repository archive exceeds maximum size of ${MAX_REPO_SIZE_BYTES / (1024 * 1024)}MB`
        );
      }

      let streamedBytes = 0;
      const sizeEnforcedStream = zipResponse.data;
      sizeEnforcedStream.on("data", (chunk: Buffer) => {
        streamedBytes += chunk.length;
        if (streamedBytes > MAX_REPO_SIZE_BYTES) {
          sizeEnforcedStream.destroy(
            new Error(
              `Repository archive exceeds maximum size of ${MAX_REPO_SIZE_BYTES / (1024 * 1024)}MB`
            )
          );
        }
      });

      uploadedS3Key = this.buildRepoZipS3Key(projectId);

      const [, uploadError] = await tryCatch(
        s3Service.uploadStream(
          uploadedS3Key,
          sizeEnforcedStream,
          "application/zip"
        )
      );

      if (uploadError) {
        throw new Error(
          `Failed to upload to S3: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`
        );
      }

      const [createdPackage, createPackageError] = await tryCatch(
        ProjectPackage.create({
          projectId,
          sellerId: project.userid,
          github_repo_id: githubRepoId,
          commit_sha: commitSha,
          s3_key: uploadedS3Key,
          source,
        })
      );

      if (createPackageError || !createdPackage) {
        throw new Error(
          `Failed to create project package record: ${createPackageError instanceof Error ? createPackageError.message : "Unknown error"}`
        );
      }

      createdPackageId = createdPackage._id.toString();

      const previousLatestPackageId =
        project.latest_package_id?.toString() ?? null;

      const [, updateError] = await tryCatch(
        Project.findByIdAndUpdate(projectId, {
          repo_zip_status: "SUCCESS",
          repo_zip_s3_key: uploadedS3Key,
          repo_zip_error: null,
          latest_package_id: createdPackage._id,
          latest_package_commit_sha: commitSha,
          repackage_status: "IDLE",
          repackage_error: null,
        })
      );

      if (updateError) {
        throw new Error(
          `Failed to update project after successful upload: ${updateError instanceof Error ? updateError.message : "Unknown error"}`
        );
      }

      logger.info("Repo ZIP uploaded successfully", {
        projectId,
        s3Key: uploadedS3Key,
        commitSha,
        source,
        sizeBytes: streamedBytes,
      });

      const [, treeError] = await tryCatch(
        this.fetchAndStoreRepoTree(
          projectId,
          full_name,
          commitSha,
          installationToken
        )
      );

      if (treeError) {
        const treeErrorMessage =
          treeError instanceof Error ? treeError.message : "Unknown error";
        await tryCatch(
          Project.findByIdAndUpdate(projectId, {
            repo_tree_status: "FAILED",
            repo_tree_error: treeErrorMessage,
          })
        );
        logger.error("Repo tree fetch failed", {
          projectId,
          githubRepoId,
          error: treeErrorMessage,
        });
      } else {
        logger.info("Repo tree fetched successfully", { projectId });
      }

      if (
        previousLatestPackageId &&
        previousLatestPackageId !== createdPackageId
      ) {
        await reconcileProjectPackageRetention(projectId, {
          retainLatestPackage: true,
        });
      } else if (
        hadLatestPackage &&
        project.repo_zip_s3_key &&
        project.repo_zip_s3_key !== uploadedS3Key
      ) {
        const legacyKeyRetained = await isRepoZipKeyRetained(
          project.repo_zip_s3_key
        );
        if (!legacyKeyRetained) {
          await queueRepoZipKeyForCleanup(project.repo_zip_s3_key);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (createdPackageId) {
        await tryCatch(ProjectPackage.deleteOne({ _id: createdPackageId }));
      }

      if (uploadedS3Key) {
        await tryCatch(s3Service.deleteObject(uploadedS3Key));
      }

      const [, updateError] = await tryCatch(
        Project.findByIdAndUpdate(projectId, {
          ...(hadLatestPackage
            ? {
                repackage_status: "FAILED",
                repackage_error: errorMessage,
              }
            : {
                repo_zip_status: "FAILED",
                repo_zip_error: errorMessage,
                repackage_status: "IDLE",
                repackage_error: null,
              }),
        })
      );

      if (updateError) {
        logger.error("Failed to update project status after failed upload", {
          projectId,
        });
      }

      logger.error("Repo ZIP upload failed", {
        projectId,
        githubRepoId,
        error: errorMessage,
      });
    } finally {
      await redisClient.del(lockKey);
    }
  }
}
