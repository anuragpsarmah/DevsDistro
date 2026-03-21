import axios from "axios";
import { redisClient, s3Service } from "..";
import { githubAppService } from "./githubApp.service";
import { Project } from "../models/project.model";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";
import { TreeNode } from "../types/types";
import { LOCK_TTL_SECONDS, MAX_REPO_SIZE_BYTES } from "../types/constants";

export default class RepoZipUploadService {
  private getLockKey(projectId: string): string {
    return `repo-zip-lock:${projectId}`;
  }

  private async fetchAndStoreRepoTree(
    projectId: string,
    githubRepoId: string,
    installationToken: string
  ): Promise<void> {
    await tryCatch(
      Project.findByIdAndUpdate(projectId, { repo_tree_status: "PROCESSING" })
    );

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

    const { full_name, default_branch } = repoResponse.data;

    const [treeResponse, treeError] = await tryCatch(
      axios.get<{
        tree: Array<{ path: string; type: string }>;
        truncated: boolean;
      }>(
        `https://api.github.com/repos/${full_name}/git/trees/${default_branch}?recursive=1`,
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

  async processRepoZipUpload(
    projectId: string,
    githubRepoId: string,
    installationId: number
  ): Promise<void> {
    const lockKey = this.getLockKey(projectId);

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

    try {
      const [project, findError] = await tryCatch(
        Project.findById(projectId).select("repo_zip_status").lean()
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

      if (project.repo_zip_status === "SUCCESS") {
        logger.info("Repo ZIP already uploaded", { projectId });
        await redisClient.del(lockKey);
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

      const [zipResponse, downloadError] = await tryCatch(
        axios.get(
          `https://api.github.com/repositories/${githubRepoId}/zipball`,
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

      const s3Key = `repoZips/${projectId}.zip`;

      const [, uploadError] = await tryCatch(
        s3Service.uploadStream(s3Key, sizeEnforcedStream, "application/zip")
      );

      if (uploadError) {
        throw new Error(
          `Failed to upload to S3: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`
        );
      }

      const [, updateError] = await tryCatch(
        Project.findByIdAndUpdate(projectId, {
          repo_zip_status: "SUCCESS",
          repo_zip_s3_key: s3Key,
          repo_zip_error: null,
        })
      );

      if (updateError) {
        logger.error(
          "Failed to update project status after successful upload",
          {
            projectId,
            error:
              updateError instanceof Error
                ? updateError.message
                : "Unknown error",
          }
        );
      }

      logger.info("Repo ZIP uploaded successfully", {
        projectId,
        s3Key,
        sizeBytes: streamedBytes,
      });

      const [, treeError] = await tryCatch(
        this.fetchAndStoreRepoTree(projectId, githubRepoId, installationToken)
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const [, updateError] = await tryCatch(
        Project.findByIdAndUpdate(projectId, {
          repo_zip_status: "FAILED",
          repo_zip_error: errorMessage,
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
