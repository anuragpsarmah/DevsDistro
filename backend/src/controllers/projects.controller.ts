import { Request, Response } from "express";
import mongoose, { Mongoose } from "mongoose";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import response from "../utils/response.util";
import { User } from "../models/user.model";
import { decrypt } from "../utils/encryption.util";
import axios, { AxiosError } from "axios";
import {
  FileMetaData,
  ProjectQuery,
  ProjectSort,
  SortOption,
} from "../types/types";
import { redisClient, s3Service } from "..";
import logger from "../logger/logger";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import {
  fileMetadataSchema,
  projectFormDataSchema,
  githubRepoIdSchema,
  searchProjectSchema,
} from "../validations/projects.validation";
import { Project } from "../models/project.model";
import { MAX_ALLOWED_IMAGES } from "../types/constants";
import { tryCatch } from "../utils/tryCatch.util";

const searchAndFilterProjects = async (
  searchTerm: string = "",
  projectTypes: string[] = [],
  sortBy: SortOption = "newest",
  limit: number = 10,
  offset: number = 0
) => {
  let query: ProjectQuery = { isActive: true };
  let sort: ProjectSort = {};

  if (projectTypes && projectTypes.length > 0) {
    query.project_type = { $in: projectTypes };
  }

  const hasSearchTerm = searchTerm && searchTerm.trim().length > 0;
  if (hasSearchTerm) {
    query.$text = { $search: searchTerm.trim() };
  }

  if (hasSearchTerm) {
    sort.score = { $meta: "textScore" };

    switch (sortBy) {
      case "newest":
        sort.createdAt = -1;
        break;
      case "price_low":
        sort.price = 1;
        sort.createdAt = -1;
        break;
      case "price_high":
        sort.price = -1;
        sort.createdAt = -1;
        break;
      case "rating_high":
        sort.avgRating = -1;
        sort.totalReviews = -1;
        sort.createdAt = -1;
        break;
      case "rating_low":
        sort.avgRating = 1;
        sort.totalReviews = 1;
        sort.createdAt = -1;
        break;
    }
  } else {
    switch (sortBy) {
      case "newest":
        sort.createdAt = -1;
        break;
      case "price_low":
        sort.price = 1;
        sort.createdAt = -1;
        break;
      case "price_high":
        sort.price = -1;
        sort.createdAt = -1;
        break;
      case "rating_high":
        sort.avgRating = -1;
        sort.totalReviews = -1;
        sort.createdAt = -1;
        break;
      case "rating_low":
        sort.avgRating = 1;
        sort.totalReviews = 1;
        sort.createdAt = -1;
        break;
    }
  }

  const [projects, totalCount] = await Promise.all([
    Project.find(query)
      .sort(sort)
      .limit(limit)
      .skip(offset)
      .select("-__v")
      .lean(),
    Project.countDocuments(query),
  ]);

  return { projects, totalCount };
};

const getPrivateRepos = asyncHandler(async (req: Request, res: Response) => {
  const { ENCRYPTION_KEY_32, ENCRYPTION_IV } = process.env;
  if (req.rateLimited) {
    response(
      res,
      429,
      "Too many refresh requests and no cached data available",
      null
    );
    return;
  }

  if (!req.user) throw new ApiError("Error during validation", 401);

  const redisKey = privateRepoPrefix(req.user._id);
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const [userData, userError] = await tryCatch(User.findById(userId));

  if (userError) {
    logger.error("Error fetching private repos:", userError);
    throw new ApiError("Something went wrong", 500);
  }

  if (!userData) {
    response(res, 401, "Unauthorized Access");
    return;
  }

  const [github_access_token, decryptionError] = await tryCatch(() =>
    decrypt(
      userData?.github_access_token,
      ENCRYPTION_KEY_32 as string,
      ENCRYPTION_IV as string
    )
  );

  if (decryptionError) {
    logger.error("Error fetching private repos:", decryptionError);
    throw new ApiError("Something went wrong", 500);
  }

  let [private_repositories, fetchError] = await tryCatch(
    axios.get(`https://api.github.com/user/repos`, {
      headers: {
        Authorization: `Bearer ${github_access_token}`,
      },
      params: {
        visibility: "private",
      },
    })
  );

  if (fetchError) {
    logger.error("Error fetching private repos:", fetchError);
    throw new ApiError("Something went wrong", 500);
  }

  if (
    !private_repositories ||
    !private_repositories.data ||
    private_repositories.data.length === 0
  ) {
    response(res, 200, "No private repositories found", []);
    return;
  }

  const currentDate = new Date();

  private_repositories = private_repositories.data
    .map((repo: any) => {
      const updatedDate = new Date(repo?.updated_at);
      const differenceInMs = currentDate.getTime() - updatedDate.getTime();

      let updatedAtDisplay;
      if (differenceInMs >= 86400000) {
        updatedAtDisplay = `${Math.floor(differenceInMs / 86400000)}d`;
      } else if (differenceInMs >= 3600000) {
        updatedAtDisplay = `${Math.floor(differenceInMs / 3600000)}h`;
      } else {
        updatedAtDisplay = `${Math.floor(differenceInMs / 60000)}m`;
      }

      return {
        github_repo_id: repo?.id || null,
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

  const CACHE_DURATION = 60 * 60 * 24;
  const [, cacheError] = await tryCatch(
    redisClient.setex(
      redisKey,
      CACHE_DURATION,
      JSON.stringify(private_repositories)
    )
  );

  if (cacheError) logger.error("Redis caching error:", cacheError);

  response(res, 200, "Repos fetched successfully", private_repositories);
});

const getPreSignedUrlForProjectMediaUpload = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);
    const {
      metadata,
      existingImageCount,
      existingVideoCount,
      modificationType,
    } = req.body;

    if (modificationType === "new") {
      const [projectCount, countError] = await tryCatch(
        Project.countDocuments({ userid })
      );

      if (countError) {
        logger.error("Failed to fetch total listed projects:", countError);
        response(res, 500, "Failed to fetch total listed projects");
        return;
      }

      if (projectCount >= 2) {
        response(res, 400, "Only two projects can be listed at a time");
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
        "Payload validation failed",
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

    const [preSignedUrls, urlError] = await tryCatch(
      Promise.all(
        metadata.map((file: FileMetaData) => {
          return s3Service.createPreSignedUploadUrl(file);
        })
      )
    );

    if (urlError) {
      logger.error("Error generating pre-signed urls:", urlError);
      if (urlError instanceof Error) throw new ApiError(urlError.message, 400);
      else throw new ApiError("Something went wrong", 500);
    }

    response(
      res,
      200,
      `${preSignedUrls.length} Pre-signed upload urls generated`,
      preSignedUrls
    );
  }
);

const validateMediaUploadAndStoreProject = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const { modificationType, projectData } = req.body;
    const userid = new mongoose.Types.ObjectId(req.user._id);

    if (modificationType === "new") {
      const [projectCount, countError] = await tryCatch(
        Project.countDocuments({ userid })
      );

      if (countError) {
        logger.error("Failed to fetch total listed projects:", countError);
        response(res, 500, "Failed to fetch total listed projects");
        return;
      }
      if (projectCount >= 2) {
        response(res, 400, "Only two projects can be listed at a time");
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

    const { ENCRYPTION_KEY_32, ENCRYPTION_IV } = process.env;

    const [userData, encryptedTokenError] = await tryCatch(
      User.findById(userid).select("github_access_token")
    );

    if (encryptedTokenError) {
      throw new ApiError("Something went wrong", 500);
    }

    if (!userData?.github_access_token) {
      response(res, 401, "GitHub access token not found");
      return;
    }

    const [decrypted_github_access_token, dcryptedTokenError] = await tryCatch(
      () =>
        decrypt(
          userData.github_access_token,
          ENCRYPTION_KEY_32 as string,
          ENCRYPTION_IV as string
        )
    );

    if (dcryptedTokenError) {
      throw new ApiError("Something went wrong", 500);
    }

    const [, githubError] = await tryCatch(
      axios.get(
        `https://api.github.com/repositories/${projectData.github_repo_id}`,
        {
          headers: {
            Authorization: `Bearer ${decrypted_github_access_token}`,
          },
        }
      )
    );

    if (githubError) {
      if (
        (githubError as AxiosError).isAxiosError &&
        (githubError as AxiosError).response
      ) {
        const status = (githubError as AxiosError).response?.status;

        if (status === 404) {
          response(
            res,
            404,
            "Repository not found or you don't have access to it"
          );
          return;
        } else if (status === 403) {
          response(res, 403, "Access denied to the repository");
          return;
        } else {
          logger.error("GitHub API error:", githubError);
          response(res, 500, "Failed to verify repository access");
          return;
        }
      } else {
        logger.error("GitHub API error:", githubError);
        throw new ApiError("Failed to verify repository access", 500);
      }
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

    const [project, projectError] = await tryCatch(
      Project.findOne({
        github_repo_id: projectData.github_repo_id,
        userid,
      })
    );

    if (projectError) {
      logger.error("Error fetching project:", projectError);
      throw new ApiError("Something went wrong", 500);
    }

    if (project && modificationType === "new") {
      response(res, 400, "Project already exists");
      return;
    }
    if (!project && modificationType === "existing") {
      response(res, 400, "Project does not exist");
      return;
    }

    const mediaKeys = [
      ...project_images,
      ...(project_video ? [project_video] : []),
    ];

    const [preSignedUrls, urlError] = await tryCatch(
      Promise.all(
        mediaKeys.map((key) =>
          s3Service.validateAndCreatePreSignedDownloadUrl(key)
        )
      )
    );

    if (urlError) {
      logger.error("Error verifying uploads:", urlError);
      if (urlError instanceof Error) throw new ApiError(urlError.message, 400);
      else throw new ApiError("Couldn't verify uploads. Try again.", 500);
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

    if (modificationType === "new") {
      const [, createError] = await tryCatch(
        Project.create(filteredProjectData)
      );

      if (createError) {
        logger.error("Error storing project data:", createError);
        throw new ApiError("Something went wrong", 500);
      }
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
        const S3Uploadkey = media.replace(
          `${process.env.S3_CLOUDFRONT_DISTRIBUTION as string}/`,
          ""
        );

        const [, redisError] = await tryCatch(
          redisClient.zadd("media-cleanup-schedule", Date.now(), S3Uploadkey)
        );

        if (redisError) logger.error("Failed to delete object:", redisError);
      }

      const [, createError] = await tryCatch(() =>
        project?.set(filteredProjectData).save()
      );

      if (createError) {
        logger.error("Error storing project data:", createError);
        throw new ApiError("Something went wrong", 500);
      }
    }
    response(res, 200, "Project listed/modified successfully");
  }
);

const getTotalListedProjects = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);
    const [projectCount, countError] = await tryCatch(
      Project.countDocuments({ userid })
    );

    if (countError) {
      logger.error("Failed to fetch total listed projects:", countError);
      response(res, 200, "Failed to fetch total listed projects", {
        totalListedProjects: -1,
      });
      return;
    }

    response(res, 200, "Total listed projects fetched successfully", {
      totalListedProjects: projectCount,
    });
  }
);

const getTotalActiveProjects = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);
    const [projectCount, countError] = await tryCatch(
      Project.countDocuments({
        userid,
        isActive: true,
      })
    );

    if (countError) {
      logger.error("Failed to fetch total listed projects:", countError);
      response(res, 200, "Failed to fetch total listed projects", {
        totalActiveProjects: -1,
      });
      return;
    }

    response(res, 200, "Total active projects fetched successfully", {
      totalActiveProjects: projectCount,
    });
  }
);

const getInitialProjectData = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const [projectData, projectError] = await tryCatch(
      Project.find({ userid })
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
        })
    );

    if (projectError) {
      logger.error("Failed to fetch project data:", projectError);
      response(res, 500, "Failed to fetch project data. Try again later.");
      return;
    }

    response(
      res,
      200,
      "Initial project data fetched successfully",
      projectData
    );
  }
);

const getSpecificProjectData = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const result = githubRepoIdSchema.safeParse(req.query);
    if (!result.success) {
      response(
        res,
        400,
        "Query validation failed",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const [projectData, projectError] = await tryCatch(
      Project.findOne({
        userid,
        github_repo_id: req.query.github_repo_id,
      }).select(
        "-_id -__v -createdAt -updatedAt -userid -title -description -isActive -tech_stack"
      )
    );

    if (projectError) {
      logger.error("Failed to fetch project data:", projectError);
      response(res, 500, "Failed to fetch project data. Try again later.");
      return;
    }

    if (!projectData) {
      response(res, 404, "Invalid Repo ID. No such records found.");
      return;
    }

    response(res, 200, "Project data fetched successfully", projectData);
  }
);

const toggleProjectListing = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const result = githubRepoIdSchema.safeParse(req.body);
    if (!result.success) {
      response(
        res,
        400,
        "Payload validation failed",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const [updatedProject, updateError] = await tryCatch(
      Project.findOneAndUpdate(
        { userid, github_repo_id: req.body.github_repo_id },
        [{ $set: { isActive: { $not: "$isActive" } } }],
        { new: true }
      )
    );

    if (updateError) {
      logger.error("Failed to toggle project status:", updateError);
      response(res, 500, "Failed to toggle project status. Try again later.");
      return;
    }

    if (!updatedProject) {
      response(res, 404, "Invalid Repo ID. No such records found.");
      return;
    }

    response(res, 200, "Project listing status toggled successfully", {
      status: updatedProject.isActive,
    });
  }
);

const deleteProjectListing = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const result = githubRepoIdSchema.safeParse(req.query);
    if (!result.success) {
      response(
        res,
        400,
        "Query validation failed",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const [projectData, projectError] = await tryCatch(
      Project.findOne({
        userid,
        github_repo_id: req.query.github_repo_id,
      }).select("project_images project_video -_id")
    );

    if (projectError) {
      logger.error("Failed to delete project:", projectError);
      response(res, 500, "Failed to delete listed project. Try again later.");
      return;
    }

    const [deleteResponse, deleteError] = await tryCatch(
      Project.deleteOne({
        userid,
        github_repo_id: req.query.github_repo_id,
      })
    );

    if (deleteError) {
      logger.error("Failed to delete project:", projectError);
      response(res, 500, "Failed to delete listed project. Try again later.");
      return;
    }

    if (deleteResponse.deletedCount == 0) {
      response(res, 404, "No such project was listed. Invalid Request.");
      return;
    }

    const toBeDeletedKeys = [
      ...(projectData?.project_images ? projectData.project_images : []),
      ...(projectData?.project_video ? [projectData.project_video] : []),
    ];

    for (const key of toBeDeletedKeys) {
      const S3Uploadkey = key.replace(
        `${process.env.S3_CLOUDFRONT_DISTRIBUTION as string}/`,
        ""
      );

      const [, redisError] = await tryCatch(
        redisClient.zadd("media-cleanup-schedule", Date.now(), S3Uploadkey)
      );

      if (redisError) logger.error("Failed to delete object:", redisError);
    }

    response(res, 200, "Project was deleted successfully");
  }
);

const searchProject = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = searchProjectSchema.safeParse(req.body);
  if (!validationResult.success) {
    response(
      res,
      400,
      "Query validation failed",
      {},
      validationResult.error.errors[0].message
    );
    return;
  }

  const { searchTerm, projectTypes, sortBy, limit, offset } = req.body;

  const [searchData, searchError] = await tryCatch(
    searchAndFilterProjects(searchTerm, projectTypes, sortBy, limit, offset)
  );

  if (searchError) {
    logger.error("Failed to fetch project data:", searchError);
    response(res, 500, "Failed to fetch project data. Try again later.");
    return;
  }

  const { projects, totalCount } = searchData;
  const hasNextPage = offset + limit < totalCount;
  const hasPrevPage = offset > 0;
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  response(res, 200, "Projects fetched successfully", {
    projects,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      limit,
      offset,
      hasNextPage,
      hasPrevPage,
    },
    searchInfo: {
      searchTerm: searchTerm || null,
      projectTypes: projectTypes.length > 0 ? projectTypes : null,
      sortBy,
      resultsFound: totalCount > 0,
      hasTextSearch: searchTerm && searchTerm.trim().length > 0,
    },
  });
});

export {
  getPrivateRepos,
  getPreSignedUrlForProjectMediaUpload,
  validateMediaUploadAndStoreProject,
  getTotalListedProjects,
  getTotalActiveProjects,
  getInitialProjectData,
  getSpecificProjectData,
  toggleProjectListing,
  deleteProjectListing,
  searchProject,
};
