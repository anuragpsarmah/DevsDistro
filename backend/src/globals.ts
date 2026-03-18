import type { Redis } from "ioredis";
import type S3Service from "./services/S3.service";
import type RepoZipUploadService from "./services/repoZipUpload.service";

export let redisClient: Redis;
export let s3Service: S3Service;
export let repoZipUploadService: RepoZipUploadService;

export function setGlobals(config: {
  redis?: Redis;
  s3?: S3Service;
  repoZip?: RepoZipUploadService;
}) {
  if (config.redis) redisClient = config.redis;
  if (config.s3) s3Service = config.s3;
  if (config.repoZip) repoZipUploadService = config.repoZip;
}
