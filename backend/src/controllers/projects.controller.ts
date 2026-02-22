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
import { redisClient, s3Service, repoZipUploadService } from "..";
import logger from "../logger/logger";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import {
  fileMetadataSchema,
  projectFormDataSchema,
  githubRepoIdSchema,
  searchProjectSchema,
} from "../validations/projects.validation";
import { Project } from "../models/project.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { githubAppService } from "../services/githubApp.service";
import { MAX_ALLOWED_IMAGES } from "../types/constants";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";

const MARKETPLACE_SELECT = {
  title: 1,
  description: 1,
  project_type: 1,
  tech_stack: 1,
  price: 1,
  avgRating: 1,
  totalReviews: 1,
  live_link: 1,
  createdAt: 1,
  project_images: { $slice: 1 },
} as const;

const SELLER_POPULATE = {
  path: "userid",
  select: "username name profile_image_url -_id",
} as const;

const searchAndFilterProjects = async (
  searchTerm: string = "",
  projectTypes: string[] = [],
  techStack: string[] = [],
  minPrice?: number,
  maxPrice?: number,
  sortBy: SortOption = "newest",
  limit: number = 12,
  offset: number = 0
) => {
  const query: ProjectQuery = {
    isActive: true,
    github_access_revoked: false,
    repo_zip_status: "SUCCESS",
  };

  if (projectTypes.length > 0) {
    query.project_type = { $in: projectTypes };
  }

  if (techStack.length > 0) {
    query.tech_stack = { $in: techStack };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  const trimmedSearch = searchTerm.trim();
  if (trimmedSearch.length > 0) {
    const escaped = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
      { tech_stack: { $regex: escaped, $options: "i" } },
    ];
  }

  const sort: ProjectSort = {};

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

  const [projects, totalCount] = await Promise.all([
    Project.find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .select(MARKETPLACE_SELECT)
      .populate(SELLER_POPULATE)
      .lean(),
    Project.countDocuments(query),
  ]);

  return {
    projects: projects.map((p) => ({
      ...p,
      project_images: p.project_images?.[0] ?? "",
    })),
    totalCount,
  };
};

const getPrivateRepos = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_private_repos" });

  if (req.rateLimited) {
    enrichContext({ outcome: "error", reason: "rate_limited" });
    response(
      res,
      429,
      "Too many refresh requests and no cached data available",
      null
    );
    return;
  }

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const page = parseInt(req.query.page as string) || 1;
  const redisKey = privateRepoPrefix(req.user._id);
  enrichContext({
    entity: { type: "github_repos", id: userId.toString() },
    page,
  });

  const [installation, error] = await tryCatch(
    GitHubAppInstallation.findOne({
      user_id: userId,
      suspended_at: null,
    })
  );

  if (error) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch installation", error);
    throw new ApiError("Something went wrong", 500);
  }

  if (!installation) {
    enrichContext({ outcome: "success", has_installation: false });
    response(res, 200, "No GitHub App installation found", {
      needsInstallation: true,
      installUrl: githubAppService.getInstallUrl(req.user._id),
      repos: [],
      page: 1,
      hasMore: false,
      totalCount: 0,
    });
    return;
  }

  const apiStartTime = performance.now();
  const [result, repoError] = await tryCatch(
    githubAppService.getInstallationRepos(installation.installation_id, page)
  );
  enrichContext({
    external_api_latency_ms: Math.round(performance.now() - apiStartTime),
  });

  if (repoError || !result) {
    logger.error("Failed to fetch repos for installation", {
      installation_id: installation.installation_id,
      page,
      error: repoError,
    });
    throw new ApiError("Failed to fetch repositories", 500);
  }

  const { repos, totalCount } = result;
  const privateRepos = repos.filter((repo) => repo.private);

  const formattedRepos = privateRepos.map((repo) => ({
    github_repo_id: repo.id.toString(),
    name: repo.name,
    description: repo.description || "",
    language: repo.language || "",
    updated_at: repo.updated_at,
    installation_id: installation.installation_id,
  }));

  const totalPages = Math.ceil(totalCount / 100);
  const hasMore = page < totalPages;

  const responseData = {
    repos: formattedRepos,
    page,
    hasMore,
    totalCount,
  };
  const CACHE_DURATION = 60 * 60;
  const [, cacheError] = await tryCatch(
    redisClient.hset(redisKey, `page:${page}`, JSON.stringify(responseData))
  );
  if (!cacheError) {
    await tryCatch(redisClient.expire(redisKey, CACHE_DURATION));
  } else {
    enrichContext({ cache_error: true });
    logger.error("Redis caching error", cacheError);
  }

  enrichContext({
    outcome: "success",
    repos_count: formattedRepos.length,
    page,
    hasMore,
  });
  response(res, 200, "Repos fetched successfully", responseData);
});

const getPreSignedUrlForProjectMediaUpload = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_presigned_upload_url" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);
    enrichContext({ entity: { type: "media_upload", id: userid.toString() } });

    const {
      metadata,
      existingImageCount,
      existingVideoCount,
      modificationType,
    } = req.body;
    enrichContext({ modification_type: modificationType });

    if (modificationType !== "new" && modificationType !== "existing") {
      enrichContext({
        outcome: "validation_failed",
        reason: "invalid_modification_type",
      });
      response(res, 400, "Invalid modification type");
      return;
    }

    if (modificationType === "new") {
      const [queryResult, countError] = await tryCatch(
        Promise.all([
          Project.countDocuments({ userid }),
          User.findById(userid).select("project_listing_limit").lean(),
        ])
      );

      if (countError || !queryResult) {
        enrichContext({
          outcome: "error",
          error: {
            name: "DatabaseError",
            message:
              countError instanceof Error
                ? countError.message
                : "Count query failed",
          },
        });
        logger.error("Failed to count projects", countError);
        response(res, 500, "Failed to fetch total listed projects");
        return;
      }

      const [projectCount, userData] = queryResult;
      const projectListingLimit =
        userData?.project_listing_limit ??
        parseInt(process.env.DEFAULT_PROJECT_LISTING_LIMIT || "2", 10);

      if (projectCount >= projectListingLimit) {
        enrichContext({
          outcome: "validation_failed",
          reason: "max_projects_reached",
        });
        response(
          res,
          400,
          `Only ${projectListingLimit} projects can be listed at a time`
        );
        return;
      }
    }

    if (
      isNaN(existingImageCount) ||
      isNaN(existingVideoCount) ||
      existingImageCount < 0 ||
      existingVideoCount < 0 ||
      !Number.isInteger(existingImageCount) ||
      !Number.isInteger(existingVideoCount)
    ) {
      enrichContext({
        outcome: "validation_failed",
        reason: "invalid_counts",
        requested_counts: { existingImageCount, existingVideoCount },
      });
      response(res, 400, "Invalid count values provided");
      return;
    }

    const result = fileMetadataSchema.safeParse(metadata);
    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
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
      enrichContext({ outcome: "validation_failed", reason: "no_images" });
      response(res, 400, "At least one image is required");
      return;
    }
    if (
      metadataFileCheck.image > allowedImagesCount ||
      (metadataFileCheck.video && existingVideoCount)
    ) {
      enrichContext({
        outcome: "validation_failed",
        reason: "too_many_files",
        files_stats: {
          requested_images: metadataFileCheck.image,
          allowed_images: allowedImagesCount,
          max_images: MAX_ALLOWED_IMAGES,
          existing_images: existingImageCount,
          requested_video: metadataFileCheck.video > 0,
          existing_video: existingVideoCount > 0,
        },
      });
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
      enrichContext({
        outcome: "error",
        error: {
          name: "S3Error",
          message:
            urlError instanceof Error ? urlError.message : "S3 presign failed",
        },
      });
      logger.error("Failed to generate presigned URLs", urlError);
      if (urlError instanceof Error) throw new ApiError(urlError.message, 400);
      else throw new ApiError("Something went wrong", 500);
    }

    enrichContext({ outcome: "success", urls_generated: preSignedUrls.length });
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
    enrichContext({ action: "store_project" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const { modificationType, projectData } = req.body;
    const userid = new mongoose.Types.ObjectId(req.user._id);
    enrichContext({
      entity: { type: "project", github_repo_id: projectData?.github_repo_id },
      modification_type: modificationType,
    });

    if (modificationType !== "new" && modificationType !== "existing") {
      enrichContext({
        outcome: "validation_failed",
        reason: "invalid_modification_type",
      });
      response(res, 400, "Invalid modification type");
      return;
    }

    if (modificationType === "new") {
      const [queryResult, countError] = await tryCatch(
        Promise.all([
          Project.countDocuments({ userid }),
          User.findById(userid).select("project_listing_limit").lean(),
        ])
      );

      if (countError || !queryResult) {
        enrichContext({
          outcome: "error",
          error: {
            name: "DatabaseError",
            message:
              countError instanceof Error
                ? countError.message
                : "Count query failed",
          },
        });
        logger.error("Failed to count projects", countError);
        response(res, 500, "Failed to fetch total listed projects");
        return;
      }

      const [projectCount, userData] = queryResult;
      const projectListingLimit =
        userData?.project_listing_limit ??
        parseInt(process.env.DEFAULT_PROJECT_LISTING_LIMIT || "2", 10);

      if (projectCount >= projectListingLimit) {
        enrichContext({
          outcome: "validation_failed",
          reason: "max_projects_reached",
        });
        response(
          res,
          400,
          `Only ${projectListingLimit} projects can be listed at a time`
        );
        return;
      }
    }

    const result = projectFormDataSchema.safeParse(projectData);
    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
      response(
        res,
        400,
        "Payload failed validation",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const installationId = projectData.installation_id;

    if (!installationId) {
      enrichContext({
        outcome: "validation_failed",
        reason: "missing_installation_id",
      });
      response(res, 400, "Installation ID is required");
      return;
    }

    const [installation, installError] = await tryCatch(
      GitHubAppInstallation.findOne({
        installation_id: installationId,
        user_id: userid,
        suspended_at: null,
      })
    );

    if (installError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to verify installation", installError);
      throw new ApiError("Something went wrong", 500);
    }

    if (!installation) {
      enrichContext({
        outcome: "unauthorized",
        reason: "no_installation_access",
      });
      response(res, 403, "No access to this GitHub App installation");
      return;
    }

    const [installationToken, tokenError] = await tryCatch(
      githubAppService.getInstallationToken(installationId)
    );

    if (tokenError || !installationToken) {
      enrichContext({ outcome: "error", error: { name: "TokenError" } });
      logger.error("Failed to get installation token", tokenError);
      throw new ApiError("Failed to verify repository access", 500);
    }

    const [, githubError] = await tryCatch(
      axios.get(
        `https://api.github.com/repositories/${projectData.github_repo_id}`,
        {
          headers: {
            Authorization: `Bearer ${installationToken}`,
            Accept: "application/vnd.github+json",
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
          enrichContext({ outcome: "not_found", reason: "repo_not_found" });
          response(
            res,
            404,
            "Repository not found or not accessible via this installation"
          );
          return;
        } else if (status === 403) {
          enrichContext({
            outcome: "unauthorized",
            reason: "repo_access_denied",
          });
          response(res, 403, "Access denied to the repository");
          return;
        } else {
          enrichContext({
            outcome: "error",
            error: { name: "GitHubAPIError", code: String(status) },
          });
          logger.error("GitHub API error", githubError);
          response(res, 500, "Failed to verify repository access");
          return;
        }
      } else {
        enrichContext({ outcome: "error", error: { name: "GitHubAPIError" } });
        logger.error("GitHub API error", githubError);
        throw new ApiError("Failed to verify repository access", 500);
      }
    }

    const { existingImages, project_images, project_video, existingVideo } =
      projectData;

    const [project, projectError] = await tryCatch(
      Project.findOne({
        github_repo_id: projectData.github_repo_id,
        userid,
      })
    );

    if (projectError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to fetch project", projectError);
      throw new ApiError("Something went wrong", 500);
    }

    if (project) {
      enrichContext({
        entity: {
          type: "project",
          id: project._id.toString(),
          github_repo_id: project.github_repo_id,
        },
      });
    }

    if (project && modificationType === "new") {
      enrichContext({ outcome: "validation_failed", reason: "project_exists" });
      response(res, 400, "Project already exists");
      return;
    }
    if (!project && modificationType === "existing") {
      enrichContext({ outcome: "not_found", reason: "project_not_found" });
      response(res, 400, "Project does not exist");
      return;
    }

    let validatedExistingImages: string[] = [];
    let validatedExistingVideo: string = "";

    if (modificationType === "existing" && project) {
      validatedExistingImages = existingImages.filter((url: string) =>
        project.project_images?.includes(url)
      );

      if (existingVideo && project.project_video === existingVideo) {
        validatedExistingVideo = existingVideo;
      }

      if (validatedExistingImages.length !== existingImages.length) {
        enrichContext({
          security_warning: "unowned_images_attempt",
          unowned_count: existingImages.length - validatedExistingImages.length,
        });
        logger.warn(
          `Security: User ${userid} sent ${existingImages.length - validatedExistingImages.length} unowned image URL(s)`
        );
      }
      if (existingVideo && !validatedExistingVideo) {
        enrichContext({ security_warning: "unowned_video_attempt" });
        logger.warn(`Security: User ${userid} sent unowned video URL`);
      }
    }
    const allowedImagesCount = 5 - validatedExistingImages.length;

    if (!validatedExistingImages.length && project_images.length === 0) {
      enrichContext({ outcome: "validation_failed", reason: "no_images" });
      response(res, 400, "At least one image is required");
      return;
    }

    if (
      project_images.length > allowedImagesCount ||
      (project_video && validatedExistingVideo)
    ) {
      enrichContext({ outcome: "validation_failed", reason: "too_many_files" });
      response(res, 400, "Sent more files than allowed");
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
      enrichContext({ outcome: "error", error: { name: "S3ValidationError" } });
      logger.error("Failed to verify uploads", urlError);
      if (urlError instanceof Error) throw new ApiError(urlError.message, 400);
      else throw new ApiError("Couldn't verify uploads. Try again.", 500);
    }

    const preSignedImageUrls = preSignedUrls.slice(0, project_images.length);
    const preSignedVideoUrl = preSignedUrls[project_images.length] || "";

    const filteredProjectData = {
      github_repo_id: projectData.github_repo_id,
      title: result.data.title,
      description: result.data.description,
      project_type: result.data.project_type,
      tech_stack: result.data.tech_stack,
      live_link: result.data.live_link,
      price: result.data.price,
      project_images: [...preSignedImageUrls, ...validatedExistingImages],
      project_video: validatedExistingVideo || preSignedVideoUrl,
      userid,
      github_installation_id: installationId,
    };

    if (modificationType === "new") {
      const [newProject, createError] = await tryCatch(
        Project.create(filteredProjectData)
      );

      if (createError || !newProject) {
        logger.error("Error storing project data:", createError);
        throw new ApiError("Something went wrong", 500);
      }

      repoZipUploadService
        .processRepoZipUpload(
          newProject._id.toString(),
          projectData.github_repo_id,
          installationId
        )
        .catch((err) => {
          logger.error("Background repo ZIP upload failed", {
            projectId: newProject._id.toString(),
            error: err instanceof Error ? err.message : "Unknown error",
          });
        });
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

      // Queue unused media for background cleanup
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
        enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
        logger.error("Failed to update project", createError);
        throw new ApiError("Something went wrong", 500);
      }
    }
    enrichContext({ outcome: "success" });
    response(res, 200, "Project listed/modified successfully");
  }
);

const getTotalListedProjects = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_total_listed_projects" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);
    const [queryResult, countError] = await tryCatch(
      Promise.all([
        Project.countDocuments({ userid }),
        User.findById(userid).select("project_listing_limit").lean(),
      ])
    );

    if (countError || !queryResult) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to count listed projects", countError);
      response(res, 200, "Failed to fetch total listed projects", {
        totalListedProjects: -1,
        projectListingLimit: parseInt(
          process.env.DEFAULT_PROJECT_LISTING_LIMIT || "2",
          10
        ),
      });
      return;
    }

    const [projectCount, userData] = queryResult;
    const projectListingLimit =
      userData?.project_listing_limit ??
      parseInt(process.env.DEFAULT_PROJECT_LISTING_LIMIT || "2", 10);

    enrichContext({ outcome: "success", project_count: projectCount });
    response(res, 200, "Total listed projects fetched successfully", {
      totalListedProjects: projectCount,
      projectListingLimit,
    });
  }
);

const getTotalActiveProjects = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_total_active_projects" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);
    const [projectCount, countError] = await tryCatch(
      Project.countDocuments({
        userid,
        isActive: true,
      })
    );

    if (countError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to count active projects", countError);
      response(res, 200, "Failed to fetch total listed projects", {
        totalActiveProjects: -1,
      });
      return;
    }

    enrichContext({ outcome: "success", active_project_count: projectCount });
    response(res, 200, "Total active projects fetched successfully", {
      totalActiveProjects: projectCount,
    });
  }
);

const getInitialProjectData = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_initial_project_data" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const dbStartTime = performance.now();
    const [projectData, projectError] = await tryCatch(
      Project.find({ userid })
        .select({
          _id: 0,
          github_repo_id: 1,
          title: 1,
          description: 1,
          tech_stack: 1,
          isActive: 1,
          github_access_revoked: 1,
          repo_zip_status: 1,
          project_images: { $slice: 1 },
        })
        .lean()
        .then((result) => {
          return result.map((project) => ({
            ...project,
            project_images: project.project_images?.[0] ?? "",
          }));
        })
    );
    enrichContext({
      db_latency_ms: Math.round(performance.now() - dbStartTime),
    });

    if (projectError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to fetch initial project data", projectError);
      response(res, 500, "Failed to fetch project data. Try again later.");
      return;
    }

    enrichContext({
      outcome: "success",
      projects_count: projectData?.length || 0,
    });
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
    enrichContext({ action: "get_specific_project_data" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const result = githubRepoIdSchema.safeParse(req.query);
    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
      response(
        res,
        400,
        "Query validation failed",
        {},
        result.error.errors[0].message
      );
      return;
    }

    enrichContext({
      entity: {
        type: "project",
        github_repo_id: req.query.github_repo_id as string,
      },
    });

    const [projectData, projectError] = await tryCatch(
      Project.findOne({
        userid,
        github_repo_id: req.query.github_repo_id,
      }).select(
        "github_repo_id github_installation_id price project_type live_link project_images project_video"
      )
    );

    if (projectError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to fetch specific project", projectError);
      response(res, 500, "Failed to fetch project data. Try again later.");
      return;
    }

    if (!projectData) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "Invalid Repo ID. No such records found.");
      return;
    }

    enrichContext({ outcome: "success" });
    response(res, 200, "Project data fetched successfully", projectData);
  }
);

const toggleProjectListing = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "toggle_project_listing" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const result = githubRepoIdSchema.safeParse(req.body);
    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
      response(
        res,
        400,
        "Payload validation failed",
        {},
        result.error.errors[0].message
      );
      return;
    }

    enrichContext({
      entity: { type: "project", github_repo_id: req.body.github_repo_id },
    });

    const [queryResult, countError] = await tryCatch(
      Promise.all([
        Project.findOne({
          userid,
          github_repo_id: req.body.github_repo_id,
        }).select("github_access_revoked"),
        User.findById(userid).select("project_listing_limit").lean(),
      ])
    );

    if (countError || !queryResult) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to find project", countError);
      response(res, 500, "Failed to toggle project status. Try again later.");
      return;
    }

    const [existingProject, userData] = queryResult;

    if (!existingProject) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "Invalid Repo ID. No such records found.");
      return;
    }

    if (existingProject.github_access_revoked) {
      enrichContext({ outcome: "forbidden", reason: "github_access_revoked" });
      response(
        res,
        403,
        "Cannot toggle project status. GitHub repository access has been revoked. Please reinstall the GitHub App with access to this repository."
      );
      return;
    }

    if (!existingProject.isActive && userData?.project_listing_limit === 0) {
      enrichContext({
        outcome: "forbidden",
        reason: "project_listing_limit_reached",
      });
      response(
        res,
        403,
        "Cannot toggle project status. Project listing limit reached. Please upgrade your plan to list more projects."
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
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to toggle project status", updateError);
      response(res, 500, "Failed to toggle project status. Try again later.");
      return;
    }

    if (!updatedProject) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "Invalid Repo ID. No such records found.");
      return;
    }

    enrichContext({
      outcome: "success",
      new_status: updatedProject.isActive,
      entity: {
        type: "project",
        id: updatedProject._id.toString(),
        github_repo_id: updatedProject.github_repo_id,
      },
    });
    response(res, 200, "Project listing status toggled successfully", {
      status: updatedProject.isActive,
    });
  }
);

const deleteProjectListing = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "delete_project_listing" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userid = new mongoose.Types.ObjectId(req.user._id);

    const result = githubRepoIdSchema.safeParse(req.query);
    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
      response(
        res,
        400,
        "Query validation failed",
        {},
        result.error.errors[0].message
      );
      return;
    }

    enrichContext({
      entity: {
        type: "project",
        github_repo_id: req.query.github_repo_id as string,
      },
    });

    const [projectData, projectError] = await tryCatch(
      Project.findOne({
        userid,
        github_repo_id: req.query.github_repo_id,
      }).select("project_images project_video repo_zip_s3_key _id")
    );

    if (projectError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to fetch project for deletion", projectError);
      response(res, 500, "Failed to delete listed project. Try again later.");
      return;
    }

    if (projectData) {
      enrichContext({
        entity: {
          type: "project",
          id: projectData._id.toString(),
          github_repo_id: req.query.github_repo_id as string,
        },
      });
    }

    const [deleteResponse, deleteError] = await tryCatch(
      Project.deleteOne({
        userid,
        github_repo_id: req.query.github_repo_id,
      })
    );

    if (deleteError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to delete project", deleteError);
      response(res, 500, "Failed to delete listed project. Try again later.");
      return;
    }

    if (deleteResponse.deletedCount == 0) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "No such project was listed. Invalid Request.");
      return;
    }

    const toBeDeletedKeys = [
      ...(projectData?.project_images ? projectData.project_images : []),
      ...(projectData?.project_video ? [projectData.project_video] : []),
    ];

    enrichContext({ media_cleanup_count: toBeDeletedKeys.length });

    for (const key of toBeDeletedKeys) {
      const S3Uploadkey = key.replace(
        `${process.env.S3_CLOUDFRONT_DISTRIBUTION as string}/`,
        ""
      );

      const [, redisError] = await tryCatch(
        redisClient.zadd("media-cleanup-schedule", Date.now(), S3Uploadkey)
      );

      if (redisError) {
        enrichContext({ cleanup_queue_error: true });
        logger.error("Failed to queue media for cleanup", redisError);
      }
    }

    if (projectData?.repo_zip_s3_key) {
      const [, zipCleanupError] = await tryCatch(
        redisClient.zadd(
          "media-cleanup-schedule",
          Date.now(),
          projectData.repo_zip_s3_key
        )
      );

      if (zipCleanupError) {
        enrichContext({ cleanup_queue_error: true });
        logger.error("Failed to queue repo ZIP for cleanup", zipCleanupError);
      }
    }

    enrichContext({ outcome: "success" });
    response(res, 200, "Project was deleted successfully");
  }
);

const searchProject = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "search_projects" });

  const validationResult = searchProjectSchema.safeParse(req.body);
  if (!validationResult.success) {
    enrichContext({ outcome: "validation_failed" });
    response(
      res,
      400,
      "Query validation failed",
      {},
      validationResult.error.errors[0].message
    );
    return;
  }

  const {
    searchTerm,
    projectTypes,
    techStack,
    minPrice,
    maxPrice,
    sortBy,
    limit,
    offset,
  } = validationResult.data;

  enrichContext({
    search: {
      term: searchTerm || undefined,
      filters: { projectTypes, techStack, minPrice, maxPrice, sortBy },
    },
  });

  const dbStartTime = performance.now();
  const [searchData, searchError] = await tryCatch(
    searchAndFilterProjects(
      searchTerm,
      projectTypes,
      techStack,
      minPrice,
      maxPrice,
      sortBy,
      limit,
      offset
    )
  );
  enrichContext({ db_latency_ms: Math.round(performance.now() - dbStartTime) });

  if (searchError) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to search projects", searchError);
    response(res, 500, "Failed to fetch project data. Try again later.");
    return;
  }

  const { projects, totalCount } = searchData;
  const hasNextPage = offset + limit < totalCount;
  const hasPrevPage = offset > 0;
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  enrichContext({
    outcome: "success",
    search: { results_count: totalCount },
  });

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
  });
});

const getRepoZipStatus = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_repo_zip_status" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userid = new mongoose.Types.ObjectId(req.user._id);
  const result = githubRepoIdSchema.safeParse(req.query);
  if (!result.success) {
    enrichContext({ outcome: "validation_failed" });
    response(
      res,
      400,
      "Query validation failed",
      {},
      result.error.errors[0].message
    );
    return;
  }

  const [project, error] = await tryCatch(
    Project.findOne({
      userid,
      github_repo_id: req.query.github_repo_id,
    })
      .select("repo_zip_status repo_zip_error")
      .lean()
  );

  if (error) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch repo zip status", error);
    throw new ApiError("Something went wrong", 500);
  }

  if (!project) {
    enrichContext({ outcome: "not_found" });
    response(res, 404, "Project not found");
    return;
  }

  enrichContext({ outcome: "success" });
  response(res, 200, "Repo ZIP status fetched", {
    repo_zip_status: project.repo_zip_status,
    repo_zip_error: project.repo_zip_error,
  });
});

const retryRepoZipUpload = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "retry_repo_zip_upload" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userid = new mongoose.Types.ObjectId(req.user._id);
  const result = githubRepoIdSchema.safeParse(req.body);
  if (!result.success) {
    enrichContext({ outcome: "validation_failed" });
    response(
      res,
      400,
      "Payload validation failed",
      {},
      result.error.errors[0].message
    );
    return;
  }

  const [project, error] = await tryCatch(
    Project.findOne({
      userid,
      github_repo_id: req.body.github_repo_id,
    })
  );

  if (error) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch project for retry", error);
    throw new ApiError("Something went wrong", 500);
  }

  if (!project) {
    enrichContext({ outcome: "not_found" });
    response(res, 404, "Project not found");
    return;
  }

  if (project.repo_zip_status !== "FAILED") {
    enrichContext({
      outcome: "validation_failed",
      reason: "not_failed_status",
    });
    response(res, 400, "Can only retry failed uploads");
    return;
  }

  const [, saveError] = await tryCatch(
    Project.updateOne(
      { _id: project._id },
      { repo_zip_status: "PROCESSING", $unset: { repo_zip_error: 1 } }
    )
  );

  if (saveError) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to reset project status for retry", saveError);
    throw new ApiError("Something went wrong", 500);
  }

  // Fire-and-forget: restart background repo ZIP upload
  repoZipUploadService
    .processRepoZipUpload(
      project._id.toString(),
      project.github_repo_id,
      project.github_installation_id!
    )
    .catch((err) => {
      logger.error("Retry repo ZIP upload failed", {
        projectId: project._id.toString(),
        error: err instanceof Error ? err.message : "Unknown error",
      });
    });

  enrichContext({ outcome: "success" });
  response(res, 200, "Retry initiated");
});

const refreshRepoZip = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "refresh_repo_zip" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userid = new mongoose.Types.ObjectId(req.user._id);
  const result = githubRepoIdSchema.safeParse(req.body);
  if (!result.success) {
    enrichContext({ outcome: "validation_failed" });
    response(
      res,
      400,
      "Payload validation failed",
      {},
      result.error.errors[0].message
    );
    return;
  }

  const [project, error] = await tryCatch(
    Project.findOne({
      userid,
      github_repo_id: req.body.github_repo_id,
    })
  );

  if (error) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch project for refresh", error);
    throw new ApiError("Something went wrong", 500);
  }

  if (!project) {
    enrichContext({ outcome: "not_found" });
    response(res, 404, "Project not found");
    return;
  }

  if (project.repo_zip_status === "PROCESSING") {
    enrichContext({
      outcome: "validation_failed",
      reason: "already_processing",
    });
    response(res, 400, "Upload is already in progress");
    return;
  }

  // Schedule old ZIP for cleanup if it exists
  if (project.repo_zip_s3_key) {
    const [, cleanupError] = await tryCatch(
      redisClient.zadd(
        "media-cleanup-schedule",
        Date.now(),
        project.repo_zip_s3_key
      )
    );

    if (cleanupError) {
      logger.error("Failed to queue old repo ZIP for cleanup", cleanupError);
    }
  }

  // Reset status and trigger re-upload
  const [, updateError] = await tryCatch(
    Project.updateOne(
      { _id: project._id },
      {
        repo_zip_status: "PROCESSING",
        $unset: { repo_zip_s3_key: 1, repo_zip_error: 1 },
      }
    )
  );

  if (updateError) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to reset project for refresh", updateError);
    throw new ApiError("Something went wrong", 500);
  }

  // Fire-and-forget: trigger background re-upload
  repoZipUploadService
    .processRepoZipUpload(
      project._id.toString(),
      project.github_repo_id,
      project.github_installation_id!
    )
    .catch((err) => {
      logger.error("Refresh repo ZIP upload failed", {
        projectId: project._id.toString(),
        error: err instanceof Error ? err.message : "Unknown error",
      });
    });

  enrichContext({ outcome: "success" });
  response(res, 200, "Refresh initiated");
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
  getRepoZipStatus,
  retryRepoZipUpload,
  refreshRepoZip,
};
