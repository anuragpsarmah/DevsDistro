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
import logger from "../logger/winston.logger";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import {
  fileMetadataSchema,
  projectFormDataSchema,
} from "../validation/projects.validation";
import { Project } from "../models/project.model";

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
      try {
        const userid = new mongoose.Types.ObjectId(req.user._id);
        const projects = await Project.find({ userid });

        if (projects.length >= 2) {
          response(res, 400, "Only two projects can be listed at a time");
          return;
        }
      } catch (error) {
        response(res, 500, "Failed to fetch total listed projects");
        return;
      }

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
      try {
        const userid = new mongoose.Types.ObjectId(req.user._id);
        const projects = await Project.find({ userid });

        if (projects.length >= 2) {
          response(res, 400, "Only two projects can be listed at a time");
          return;
        }
      } catch (error) {
        response(res, 500, "Failed to fetch total listed projects");
        return;
      }

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
          if (i < projectFormData.project_images.length)
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
      projectFormData.userid = new mongoose.Types.ObjectId(req.user._id);

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

const getTotalListedProjects = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      let projects = [];
      try {
        const userid = new mongoose.Types.ObjectId(req.user._id);
        projects = await Project.find({ userid });

        response(res, 200, "Total listed projects fetched successfully", {
          totalListedProjects: projects.length,
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

        if (deleteResponse.deletedCount == 0)
          response(res, 404, "No such project was listed. Invalid Request.");
        else response(res, 200, "Project was deleted successfully");
        return;
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
