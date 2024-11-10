import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
  } from "@aws-sdk/client-s3";
  import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
  import crypto from "crypto";
  import { FileMetaData } from "../types/types";
  import { redisClient } from "..";
  
  interface UploadMetadata {
    timestamp: number;
    expectedType: string;
    expectedSize: number;
  }
  
  export default class S3Service {
    private ALLOWED_TYPES: { [key: string]: string[] };
    private MAX_FILE_SIZE: { [key: string]: number };
    private s3Client: S3Client;
    private UPLOAD_EXPIRY: number = 180;
    private REDIS_KEY_PREFIX = 's3upload:';
  
    constructor() {
      this.s3Client = new S3Client({
        region: "ap-south-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
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
  
    private getRedisKey(s3Key: string): string {
      return `${this.REDIS_KEY_PREFIX}${s3Key}`;
    }
  
    async createPreSignedUploadUrl(
      fileMetaData: FileMetaData
    ): Promise<{ [key: string]: string }> {
      const { originalName, fileType, fileSize } = fileMetaData;
  
      if (!this.ALLOWED_TYPES[fileType]) {
        throw new Error(`${originalName} has invalid file type`);
      }
  
      if (fileSize > this.MAX_FILE_SIZE[fileType]) {
        throw new Error(`${originalName} is too large`);
      }
  
      const extension = originalName.split(".").pop()?.toLowerCase();
      if (!this.ALLOWED_TYPES[fileType].includes(extension as string)) {
        throw new Error(`${originalName} has invalid file type`);
      }
  
      const uniqueId = crypto.randomBytes(16).toString("hex");
      const key = `upload/${uniqueId}-${originalName}`;
  
      const putCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key: key,
        ContentType: fileType,
      });
  
      const uploadSignedUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: this.UPLOAD_EXPIRY,
      });
  
      const metadata: UploadMetadata = {
        timestamp: Date.now(),
        expectedType: fileType,
        expectedSize: fileSize
      };
  
      const redisKey = this.getRedisKey(key);
      await redisClient.setex(
        redisKey,
        this.UPLOAD_EXPIRY,
        JSON.stringify(metadata)
      );
  
      return { uploadSignedUrl, key };
    }
  
    async validateAndCreatePreSignedDownloadUrl(key: string) {
      const redisKey = this.getRedisKey(key);
      const metadataStr = await redisClient.get(redisKey);
  
      if (!metadataStr) {
        throw new Error("Invalid Key or Upload Expired");
      }
  
      const metadata: UploadMetadata = JSON.parse(metadataStr);
  
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
          await this.deleteObject(key);
          throw new Error("Invalid upload. File deleted.");
        }
  
        const getCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET as string,
          Key: key,
        });
  
        const downloadSignedUrl = await getSignedUrl(this.s3Client, getCommand);
  
        await redisClient.del(redisKey);
  
        return downloadSignedUrl;
      } catch (error) {
        await redisClient.del(redisKey);
        throw error;
      }
    }
  
    async deleteObject(key: string) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET as string,
        Key: key,
      });
  
      await this.s3Client.send(deleteCommand);
      
      const redisKey = this.getRedisKey(key);
      await redisClient.del(redisKey);
    }
  }