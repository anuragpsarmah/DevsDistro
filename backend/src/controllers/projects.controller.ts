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

const getPrivateRepos = asyncHandler(async (req: Request, res: Response) => {
  const { ENCRYPTION_KEY_32, ENCRYPTION_IV } = process.env;

  if (req.user) {
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
              ...repo
            }: {
              updated_at_display: string;
              [key: string]: any;
            }) => ({
              ...repo,
              updated_at: updated_at_display,
            })
          );

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
    const { metadata } = req.body;

    const metadataFileCheck = {
      image: 0,
      video: 0,
    };

    metadata.forEach((file: FileMetaData) => {
      if (file.fileType === "image/png" || file.fileType === "image/jpeg")
        metadataFileCheck.image++;
      else metadata.video++;
    });

    if (metadataFileCheck.image === 0) {
      response(res, 400, "Atlease one image is required");
      return;
    }

    if (metadataFileCheck.image > 5 || metadataFileCheck.video > 1) {
      response(res, 400, "Sent more files than allowed");
      return;
    }

    try {
      const preSignedUrlPromises = metadata.map(async (file: FileMetaData) => {
        return s3Service.createPreSignedUploadUrl(file);
      });

      const preSignedUrls = await Promise.all(preSignedUrlPromises);

      const keys = preSignedUrls.map((url: { [key: string]: string }) => {
        return url.key;
      });

      setTimeout((keys: [string]) => {
        keys.forEach(async (key: string) => {
          const validationKey = "s3validation:" + key;
          const keyValidationStatus = await redisClient.get(validationKey);

          if (keyValidationStatus === "notValidated") {
            await s3Service.deleteObject(key);
            await redisClient.del(validationKey);
          }
        });
      }, 360);

      response(
        res,
        200,
        `${preSignedUrls.length} Pre-signed upload urls generated`,
        preSignedUrls
      );
    } catch (error) {
      if (error instanceof Error) throw new ApiError(error.message, 400);
      else throw new ApiError("Something went wrong", 500);
    }
  }
);

export { getPrivateRepos, getPreSignedUrlForProjectMediaUpload };
