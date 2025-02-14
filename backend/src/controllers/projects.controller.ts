import { Request, Response } from "express";
import mongoose, { Mongoose } from "mongoose";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import response from "../utils/response.util";
import { User } from "../models/user.model";
import { decrypt } from "../utils/encryption.util";
import axios from "axios";
import { FileMetaData } from "../types/types";
import { redisClient, s3Service } from "..";
import logger from "../logger/logger";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import {
  fileMetadataSchema,
  projectFormDataSchema,
} from "../validations/projects.validation";
import { Project } from "../models/project.model";
import { MAX_ALLOWED_IMAGES } from "../types/constants";

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
      const userid = new mongoose.Types.ObjectId(req.user._id);
      const {
        metadata,
        existingImageCount,
        existingVideoCount,
        modificationType,
      } = req.body;

      if (modificationType === "new") {
        try {
          const projectCount = await Project.countDocuments({ userid });
          if (projectCount >= 2) {
            response(res, 400, "Only two projects can be listed at a time");
            return;
          }
        } catch (error) {
          response(res, 500, "Failed to fetch total listed projects");
          return;
        }
      }

      if (isNaN(existingImageCount) || isNaN(existingVideoCount)) {
        response(res, 400, "Invalid count values provided");
        return;
      }

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

      const allowedImagesCount = MAX_ALLOWED_IMAGES - existingImageCount;
      const metadataFileCheck = {
        image: 0,
        video: 0,
      };
      metadata.forEach((file: FileMetaData) => {
        if (file.fileType === "image/png" || file.fileType === "image/jpeg")
          metadataFileCheck.image++;
        else metadataFileCheck.video++;
      });

      if (!existingImageCount && metadataFileCheck.image === 0) {
        response(res, 400, "At least one image is required");
        return;
      }
      if (
        metadataFileCheck.image > allowedImagesCount ||
        (metadataFileCheck.video && existingVideoCount)
      ) {
        response(res, 400, "Sent more files than allowed");
        return;
      }

      try {
        const preSignedUrls = await Promise.all(
          metadata.map((file: FileMetaData) => {
            return s3Service.createPreSignedUploadUrl(file);
          })
        );

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
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const validateMediaUploadAndStoreProject = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const { modificationType, projectData } = req.body;
      const userid = new mongoose.Types.ObjectId(req.user._id);

      if (modificationType === "new") {
        try {
          const projectCount = await Project.countDocuments({ userid });
          if (projectCount >= 2) {
            response(res, 400, "Only two projects can be listed at a time");
            return;
          }
        } catch (error) {
          response(res, 500, "Failed to fetch total listed projects");
          return;
        }
      }

      const result = projectFormDataSchema.safeParse(projectData);
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

      const { existingImages, project_images, project_video, existingVideo } =
        projectData;
      const allowedImagesCount = 5 - existingImages.length;

      if (!existingImages.length && project_images.length === 0) {
        response(res, 400, "At least one image is required");
        return;
      }

      if (
        project_images.length > allowedImagesCount ||
        (project_video && existingVideo)
      ) {
        response(res, 400, "Sent more files than allowed");
        return;
      }

      let project;
      try {
        project = await Project.findOne({ title: projectData.title, userid });

        if (project && modificationType === "new") {
          response(res, 400, "Project already exists");
          return;
        }
        if (!project && modificationType === "existing") {
          response(res, 400, "Project does not exist");
          return;
        }
      } catch (error) {
        throw new ApiError("Something went wrong", 500);
      }

      const mediaKeys = [
        ...project_images,
        ...(project_video ? [project_video] : []),
      ];

      let preSignedUrls;
      try {
        preSignedUrls = await Promise.all(
          mediaKeys.map((key) =>
            s3Service.validateAndCreatePreSignedDownloadUrl(key)
          )
        );
      } catch (error) {
        if (error instanceof Error) {
          response(res, 400, error.message);
        } else {
          throw new ApiError("Couldn't verify uploads. Try again.", 500);
        }
        return;
      }

      const preSignedImageUrls = preSignedUrls.slice(0, project_images.length);
      const preSignedVideoUrl = preSignedUrls[project_images.length] || "";

      const {
        existingImages: _,
        existingVideo: __,
        ...filteredProjectData
      } = {
        ...projectData,
        project_images: [...preSignedImageUrls, ...existingImages],
        project_video: existingVideo || preSignedVideoUrl,
        userid,
      };

      try {
        if (modificationType === "new") {
          await Project.create(filteredProjectData);
        } else {
          const currentMedia = [
            ...(project?.project_images ?? []),
            ...(project?.project_video ? [project?.project_video] : []),
          ];
          const updatedMedia = [
            ...(filteredProjectData.project_images ?? []),
            ...(filteredProjectData.project_video
              ? [filteredProjectData.project_video]
              : []),
          ];
          const mediaToRemove = currentMedia.filter(
            (url) => !updatedMedia.includes(url)
          );

          for (const media of mediaToRemove) {
            try {
              const S3Uploadkey = media.replace(
                `${process.env.S3_CLOUDFRONT_DISTRIBUTION as string}/`,
                ""
              );

              await redisClient.zadd(
                "media-cleanup-schedule",
                Date.now(),
                S3Uploadkey
              );
            } catch (error) {
              logger.error("Failed to delete object:", error);
            }
          }

          await project?.set(filteredProjectData).save();
        }
        response(res, 200, "Project listed/modified successfully");
      } catch (error) {
        throw new ApiError("Something went wrong", 500);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const getTotalListedProjects = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      try {
        const userid = new mongoose.Types.ObjectId(req.user._id);
        const projectCount = await Project.countDocuments({ userid });

        response(res, 200, "Total listed projects fetched successfully", {
          totalListedProjects: projectCount,
        });
      } catch (error) {
        response(res, 200, "Failed to fetch total listed projects", {
          totalListedProjects: -1,
        });
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const getInitialProjectData = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userid = new mongoose.Types.ObjectId(req.user._id);

      try {
        const projectData = await Project.find({ userid })
          .select({
            _id: 0,
            userid: 0,
            price: 0,
            project_type: 0,
            live_link: 0,
            project_video: 0,
            createdAt: 0,
            updatedAt: 0,
            __v: 0,
            project_images: { $slice: 1 },
          })
          .then((result) => {
            return result.map((project) => {
              return {
                ...project.toObject(),
                project_images: project.project_images[0],
              };
            });
          });

        response(
          res,
          200,
          "Initial project data fetched successfully",
          projectData
        );
      } catch (error) {
        response(res, 500, "Failed to fetch project data. Try again later.");
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const getSpecificProjectData = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userid = new mongoose.Types.ObjectId(req.user._id);

      try {
        const projectData = await Project.findOne({
          userid,
          title: req.query.title,
        }).select(
          "-_id -__v -createdAt -updatedAt -userid -title -description -isActive -tech_stack"
        );

        if (!projectData) {
          response(res, 404, "Invalid project title. No such records found.");
          return;
        }

        response(res, 200, "Project data fetched successfully", projectData);
      } catch (error) {
        response(res, 500, "Failed to fetch project data. Try again later.");
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const toggleProjectListing = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userid = new mongoose.Types.ObjectId(req.user._id);

      try {
        const projectData = await Project.findOne({
          userid,
          title: req.body.title,
        });

        if (!projectData) {
          response(res, 404, "Invalid project title. No such records found.");
          return;
        }

        projectData.isActive = !projectData?.isActive;
        await projectData.save();

        response(res, 200, "Project listing status toggled successfully", {
          status: projectData.isActive,
        });
      } catch (error) {
        response(res, 500, "Failed to fetch project data. Try again later.");
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const deleteProjectListing = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userid = new mongoose.Types.ObjectId(req.user._id);

      try {
        const projectData = await Project.findOne({
          userid,
          title: req.query.title,
        }).select("project_images project_video -_id");

        const deleteResponse = await Project.deleteOne({
          userid,
          title: req.query.title,
        });

        if (deleteResponse.deletedCount == 0) {
          response(res, 404, "No such project was listed. Invalid Request.");
          return;
        }

        const toBeDeletedKeys = [
          ...(projectData?.project_images ? projectData.project_images : []),
          ...(projectData?.project_video ? [projectData.project_video] : []),
        ];

        for (const key of toBeDeletedKeys) {
          try {
            const S3Uploadkey = key.replace(
              `${process.env.S3_CLOUDFRONT_DISTRIBUTION as string}/`,
              ""
            );

            await redisClient.zadd(
              "media-cleanup-schedule",
              Date.now(),
              S3Uploadkey
            );
          } catch (error) {
            logger.error("Failed to delete object:", error);
          }
        }

        response(res, 200, "Project was deleted successfully");
      } catch (error) {
        response(res, 500, "Failed to delete listed project. Try again later.");
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
  getTotalListedProjects,
  getInitialProjectData,
  getSpecificProjectData,
  toggleProjectListing,
  deleteProjectListing,
};
