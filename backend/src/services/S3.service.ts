import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import crypto from "crypto";
import { FileMetaData, UploadMetadata } from "../types/types";
import { redisClient } from "..";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

export default class S3Service {
  private ALLOWED_TYPES: { [key: string]: string[] };
  private MAX_FILE_SIZE: { [key: string]: number };
  private s3Client: S3Client;
  private UPLOAD_EXPIRY: number = 300;
  private REDIS_UPLOAD_KEY_PREFIX: string = "s3upload_";

  constructor() {
    this.s3Client = new S3Client({
      region: "ap-south-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
      },
    });

    this.ALLOWED_TYPES = {
      "image/png": ["png"],
      "image/jpeg": ["jpg", "jpeg"],
      "video/mp4": ["mp4"],
    };

    this.MAX_FILE_SIZE = {
      "image/png": 2 * 1024 * 1024,
      "image/jpeg": 2 * 1024 * 1024,
      "video/mp4": 50 * 1024 * 1024,
    };
  }

  private getRedisUploadKey(s3Key: string): string {
    return `${this.REDIS_UPLOAD_KEY_PREFIX}${s3Key}`;
  }

  private isMissingObjectError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const candidate = error as {
      name?: string;
      Code?: string;
      code?: string;
      $metadata?: { httpStatusCode?: number };
    };

    return (
      candidate.name === "NotFound" ||
      candidate.Code === "NotFound" ||
      candidate.Code === "NoSuchKey" ||
      candidate.code === "NotFound" ||
      candidate.code === "NoSuchKey" ||
      candidate.$metadata?.httpStatusCode === 404
    );
  }

  async createPreSignedUploadUrl(fileMetaData: FileMetaData) {
    const { originalName, fileType, fileSize } = fileMetaData;

    if (!this.ALLOWED_TYPES[fileType]) {
      throw new Error(`${originalName} has invalid file type`);
    }

    if (fileSize > this.MAX_FILE_SIZE[fileType]) {
      throw new Error(`${originalName} is too large`);
    }

    const extension = originalName.split(".").pop()?.toLowerCase();
    if (!this.ALLOWED_TYPES[fileType].includes(extension as string)) {
      throw new Error(`${originalName} has invalid file extension`);
    }

    const uniqueId = crypto.randomBytes(16).toString("hex");
    let key = `projectMedia/${uniqueId}-${originalName}`.replace(/\s+/g, "");

    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET as string,
      Key: key,
      ContentType: fileType,
    });

    let uploadSignedUrl;
    try {
      uploadSignedUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: this.UPLOAD_EXPIRY,
      });
    } catch (error) {
      throw error;
    }

    const metadata: UploadMetadata = {
      timestamp: Date.now(),
      expectedType: fileType,
      expectedSize: fileSize,
    };

    const expiryTimestamp = Date.now() + 320 * 1000;

    const redisUploadKey = this.getRedisUploadKey(key);
    try {
      await redisClient.setex(redisUploadKey, 420, JSON.stringify(metadata));
      await redisClient.zadd(
        "media-cleanup-schedule",
        expiryTimestamp,
        redisUploadKey
      );
    } catch (error) {
      try {
        await redisClient.del(redisUploadKey);
        await redisClient.zrem("media-cleanup-schedule", redisUploadKey);
      } catch (cleanupError) {
        logger.error(
          "Failed to cleanup after error during pre-signed url generation:",
          cleanupError
        );
      }
      throw error;
    }

    return { uploadSignedUrl, key };
  }

  async validateAndCreatePreSignedDownloadUrl(key: string) {
    const redisUploadKey = this.getRedisUploadKey(key);

    let metadataStr;
    try {
      metadataStr = await redisClient.get(redisUploadKey);
    } catch (error) {
      throw error;
    }

    if (!metadataStr) {
      throw new Error("Invalid key or key expired");
    }

    const metadata: UploadMetadata = JSON.parse(metadataStr);

    if (Date.now() - metadata.timestamp > this.UPLOAD_EXPIRY * 1000)
      throw new Error("Expired key");

    try {
      const validateCommand = new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key: key,
      });

      const response = await this.s3Client.send(validateCommand);
      const responseContentType = response.ContentType as string;
      const responseFileSize = response.ContentLength as number;

      if (
        responseContentType !== metadata.expectedType ||
        responseFileSize > metadata.expectedSize ||
        responseFileSize > this.MAX_FILE_SIZE[responseContentType]
      ) {
        throw new Error("Invalid upload. File deleted.");
      }

      const cloudFrontUrl = `${process.env.S3_CLOUDFRONT_DISTRIBUTION as string}/${key}`;

      await redisClient.del(redisUploadKey);
      await redisClient.zrem("media-cleanup-schedule", redisUploadKey);

      return cloudFrontUrl;
    } catch (error) {
      throw error;
    }
  }

  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string
  ): Promise<void> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: process.env.S3_BUCKET as string,
        Key: key,
        Body: stream,
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 10 * 1024 * 1024,
    });

    await upload.done();
  }

  async createSignedDownloadUrl(
    key: string,
    expiresIn: number = 900,
    filename?: string
  ): Promise<string> {
    // Use the provided filename if given, otherwise fall back to the S3 key segment.
    const resolvedFilename = filename ?? key.split("/").pop() ?? "download.zip";
    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET as string,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${resolvedFilename}"`,
    });

    const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
      expiresIn,
    });
    return signedUrl;
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key: key,
      });

      await this.s3Client.send(headCommand);
      return true;
    } catch (error) {
      if (this.isMissingObjectError(error)) {
        return false;
      }

      throw error;
    }
  }

  async deleteObject(key: string) {
    const [, error] = await tryCatch(async () => {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);

      const redisUploadKey = this.getRedisUploadKey(key);
      await redisClient.del(redisUploadKey);
    });

    if (error) {
      throw new Error("Failed to delete invalid object");
    }
  }
}
