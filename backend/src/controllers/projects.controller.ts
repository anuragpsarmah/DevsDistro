import { Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import response from "../utils/response.util";
import { User } from "../models/user.model";
import { decrypt } from "../utils/encryption.util";
import axios from "axios";
import { FileMetaData } from "../types/types";
import { redisClient, s3Service } from "..";
import logger from "../logger/winston.logger";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import {
  fileMetadataSchema,
  projectFormDataSchema,
} from "../validation/projects.validation";
import { Project } from "../models/project.model";

const cleanupOperation = async (keys: string[]) => {
  try {
    for (const key of keys) {
      const uploadKey = "s3upload_" + key;
      const keyStatus = await redisClient.get(uploadKey);

      if (keyStatus) {
        try {
          await s3Service.deleteObject(key);
        } catch (deleteError) {
          logger.error(`Failed to delete object ${key}:`, deleteError);
        }
      }
    }
  } catch (cleanupError) {
    logger.error("Error during cleanup operation:", cleanupError);
  }
};

const getPrivateRepos = asyncHandler(async (req: Request, res: Response) => {
  const { ENCRYPTION_KEY_32, ENCRYPTION_IV } = process.env;

  if (req.user) {
    const redisKey = privateRepoPrefix(req.user._id);
    const userId = new mongoose.Types.ObjectId(req.user._id);

    try {
      const userData = await User.findById(userId);

      if (!userData?.github_access_token) {
        response(res, 401, "Unauthorized Access");
      } else {
        const github_access_token = decrypt(
          userData?.github_access_token,
          ENCRYPTION_KEY_32 as string,
          ENCRYPTION_IV as string
        );

        let private_repositories = await axios.get(
          `https://api.github.com/user/repos`,
          {
            headers: {
              Authorization: `Bearer ${github_access_token}`,
            },
            params: {
              visibility: "private",
            },
          }
        );

        const currentDate = new Date();

        private_repositories = private_repositories.data
          .map((repo: any) => {
            const updatedDate = new Date(repo?.updated_at);
            const differenceInMs =
              currentDate.getTime() - updatedDate.getTime();

            let updatedAtDisplay;
            if (differenceInMs >= 86400000) {
              updatedAtDisplay = `${Math.floor(differenceInMs / 86400000)}d`;
            } else if (differenceInMs >= 3600000) {
              updatedAtDisplay = `${Math.floor(differenceInMs / 3600000)}h`;
            } else {
              updatedAtDisplay = `${Math.floor(differenceInMs / 60000)}m`;
            }

            return {
              name: repo?.name || "",
              description: repo?.description || "",
              language: repo?.language || "",
              updated_at_display: updatedAtDisplay,
              updated_at_ms: differenceInMs,
            };
          })
          .sort((a: any, b: any) => a.updated_at_ms - b.updated_at_ms)
          .map(
            ({
              updated_at_display,
              updated_at_ms,
              ...repo
            }: {
              [key: string]: any;
            }) => ({
              ...repo,
              updated_at: updated_at_display,
            })
          );

        try {
          const CACHE_DURATION = 60 * 60 * 24;
          await redisClient.setex(
            redisKey,
            CACHE_DURATION,
            JSON.stringify(private_repositories)
          );
        } catch (error) {
          logger.error("Redis caching error:", error);
        }

        response(res, 200, "Repos fetched successfully", private_repositories);
      }
    } catch (error) {
      throw new ApiError("Something went wrong", 500);
    }
  } else {
    throw new ApiError("Error during validation", 401);
  }
});

const getPreSignedUrlForProjectMediaUpload = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const { metadata } = req.body;

      const result = fileMetadataSchema.safeParse(metadata);

      if (!result.success) {
        response(
          res,
          400,
          "Payload failed validation",
          {},
          result.error.errors[0].message
        );
        return;
      }

      const metadataFileCheck = {
        image: 0,
        video: 0,
      };

      metadata.forEach((file: FileMetaData) => {
        if (file.fileType === "image/png" || file.fileType === "image/jpeg")
          metadataFileCheck.image++;
        else metadataFileCheck.video++;
      });

      if (metadataFileCheck.image === 0) {
        response(res, 400, "At least one image is required");
        return;
      }

      if (metadataFileCheck.image > 5 || metadataFileCheck.video > 1) {
        response(res, 400, "Sent more files than allowed");
        return;
      }

      try {
        const preSignedUrlPromises = metadata.map((file: FileMetaData) => {
          return s3Service.createPreSignedUploadUrl(file);
        });

        const preSignedUrls = await Promise.all(preSignedUrlPromises);

        const keys = preSignedUrls.map((url: { [key: string]: string }) => {
          return url.key;
        });

        response(
          res,
          200,
          `${preSignedUrls.length} Pre-signed upload urls generated`,
          preSignedUrls
        );

        setTimeout(() => {
          cleanupOperation(keys).catch((error) => {
            logger.error("Failed to initiate cleanup operation:", error);
          });
        }, 360 * 1000);
      } catch (error) {
        if (error instanceof Error) throw new ApiError(error.message, 400);
        else throw new ApiError("Something went wrong", 500);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const validateMediaUploadAndStoreProject = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const projectFormData = req.body;

      const result = projectFormDataSchema.safeParse(projectFormData);

      if (!result.success) {
        response(
          res,
          400,
          "Payload failed validation",
          {},
          result.error.errors[0].message
        );
        return;
      }

      try {
        const project = await Project.findOne({ title: projectFormData.title });
        if (project) {
          response(res, 400, "Project already exists");
          return;
        }
      } catch (error) {
        throw new ApiError("Something went wrong", 500);
      }

      const toBeValidatedKeys = [
        ...projectFormData.project_images,
        ...(projectFormData.project_video
          ? [projectFormData.project_video]
          : []),
      ];

      const preSignedImageGetUrls = [];
      let preSignedVideoGetUrl;
      for (let i = 0; i < toBeValidatedKeys.length; i++) {
        try {
          const url = await s3Service.validateAndCreatePreSignedDownloadUrl(
            toBeValidatedKeys[i]
          );
          if (i != toBeValidatedKeys.length - 1)
            preSignedImageGetUrls.push(url);
          else preSignedVideoGetUrl = url;
        } catch (error) {
          if (error instanceof Error) response(res, 400, error.message);
          else throw new ApiError("Couldn't verify uploads. Try again.", 500);
          return;
        }
      }

      projectFormData.project_images = preSignedImageGetUrls;
      projectFormData.project_video = preSignedVideoGetUrl;

      try {
        await Project.create(projectFormData);
        response(res, 200, "Project listed successfully");
      } catch (error) {
        throw new ApiError("Something went wrong", 500);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

export {
  getPrivateRepos,
  getPreSignedUrlForProjectMediaUpload,
  validateMediaUploadAndStoreProject,
};
