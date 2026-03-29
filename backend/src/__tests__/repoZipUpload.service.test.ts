import { PassThrough } from "stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("..", () => ({
  redisClient: {
    set: vi.fn(),
    del: vi.fn(),
  },
  s3Service: {
    uploadStream: vi.fn(),
  },
}));

vi.mock("../services/githubApp.service", () => ({
  githubAppService: {
    getInstallationToken: vi.fn(),
  },
}));

vi.mock("../models/project.model", () => ({
  Project: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../logger/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axios from "axios";
import { redisClient, s3Service } from "..";
import { githubAppService } from "../services/githubApp.service";
import { Project } from "../models/project.model";
import RepoZipUploadService from "../services/repoZipUpload.service";

const PROJECT_ID = "507f191e810c19729de860ea";
const REPO_ID = "953781574";

const makeZipStream = () => {
  const stream = new PassThrough();
  stream.end(Buffer.from("zip"));
  return stream;
};

describe("RepoZipUploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(redisClient.set).mockResolvedValue("OK" as any);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);
    vi.mocked(s3Service.uploadStream).mockResolvedValue(undefined);
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_test_token"
    );

    vi.mocked(Project.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ repo_zip_status: "PROCESSING" }),
      }),
    } as any);
    vi.mocked(Project.findByIdAndUpdate).mockResolvedValue({} as any);
  });

  it("stores repo ZIPs under a versioned S3 key so cleanup cannot delete the current package", async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        headers: { "content-length": "3" },
        data: makeZipStream(),
      } as any)
      .mockResolvedValueOnce({
        data: {
          full_name: "anuragpsarmah/devsdistro-seller-repo",
          default_branch: "main",
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          tree: [{ path: "README.md", type: "blob" }],
          truncated: false,
        },
      } as any);

    const service = new RepoZipUploadService();
    await service.processRepoZipUpload(PROJECT_ID, REPO_ID, 12345);

    const successUpdateCall = vi
      .mocked(Project.findByIdAndUpdate)
      .mock.calls.find(([, update]) => {
        const updateDoc = update as Record<string, unknown>;
        return updateDoc.repo_zip_status === "SUCCESS";
      });

    expect(successUpdateCall).toBeDefined();

    const successUpdate = successUpdateCall?.[1] as {
      repo_zip_s3_key: string;
    };

    expect(successUpdate.repo_zip_s3_key).toMatch(
      new RegExp(`^repoZips/${PROJECT_ID}/\\d{13}-[a-f0-9]{12}\\.zip$`)
    );
    expect(successUpdate.repo_zip_s3_key).not.toBe(
      `repoZips/${PROJECT_ID}.zip`
    );
    expect(s3Service.uploadStream).toHaveBeenCalledWith(
      successUpdate.repo_zip_s3_key,
      expect.any(PassThrough),
      "application/zip"
    );
  });
});
