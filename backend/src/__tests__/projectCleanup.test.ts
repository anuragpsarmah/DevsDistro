/**
 * Tests for projectCleanup.util.ts
 *
 * Covers:
 * - performProjectHardDelete: all 4 cleanup steps + error resilience
 * - startScheduledDeletionJob: polling behaviour + multi-project deletion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Module mocks (hoisted before imports) ───────────────────────────────────

vi.mock("../models/project.model", () => ({
  Project: {
    deleteOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    updateMany: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: { zadd: vi.fn() },
}));

vi.mock("../utils/projectPackageRetention.util", () => ({
  isRepoZipKeyRetained: vi.fn().mockResolvedValue(false),
  queueRepoZipKeyForCleanup: vi
    .fn()
    .mockImplementation(async (s3Key: string) => {
      const { redisClient } = await import("..");
      try {
        await redisClient.zadd("media-cleanup-schedule", Date.now(), s3Key);
      } catch {
        return undefined;
      }

      return undefined;
    }),
  reconcileProjectPackageRetention: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../models/projectReview.model", () => ({
  Review: {
    deleteMany: vi.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  performProjectHardDelete,
  startScheduledDeletionJob,
} from "../utils/projectCleanup.util";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { Review } from "../models/projectReview.model";
import { redisClient } from "..";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockProject = (overrides: object = {}) => ({
  _id: "507f191e810c19729de860ea",
  project_images: [] as string[],
  project_images_detail: [] as string[],
  project_video: null as string | null,
  repo_zip_s3_key: null as string | null,
  ...overrides,
});

// ─── performProjectHardDelete ─────────────────────────────────────────────────

describe("performProjectHardDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_CLOUDFRONT_DISTRIBUTION = "https://cdn.example.com";
  });

  // ── Step 1: Wishlist cleanup ────────────────────────────────────────────────

  it("removes the project from all user wishlists", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 2 } as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await performProjectHardDelete(mockProject());

    expect(User.updateMany).toHaveBeenCalledWith(
      { wishlist: "507f191e810c19729de860ea" },
      { $pull: { wishlist: "507f191e810c19729de860ea" } }
    );
  });

  // ── Step 2: Media S3 cleanup ────────────────────────────────────────────────

  it("queues all project_images for S3 cleanup (strips CloudFront prefix)", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const project = mockProject({
      project_images: [
        "https://cdn.example.com/imgs/a.jpg",
        "https://cdn.example.com/imgs/b.jpg",
      ],
    });

    await performProjectHardDelete(project);

    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "imgs/a.jpg"
    );
    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "imgs/b.jpg"
    );
  });

  it("queues project_images_detail for S3 cleanup", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const project = mockProject({
      project_images_detail: ["https://cdn.example.com/detail/d1.jpg"],
    });

    await performProjectHardDelete(project);

    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "detail/d1.jpg"
    );
  });

  it("queues project_video for S3 cleanup when present", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const project = mockProject({
      project_video: "https://cdn.example.com/videos/v1.mp4",
    });

    await performProjectHardDelete(project);

    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "videos/v1.mp4"
    );
  });

  it("does NOT call redisClient.zadd when project has no media or zip", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await performProjectHardDelete(mockProject());

    expect(redisClient.zadd).not.toHaveBeenCalled();
  });

  // ── Step 3: Repo ZIP S3 cleanup ─────────────────────────────────────────────

  it("queues repo_zip_s3_key for S3 cleanup when present", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const project = mockProject({ repo_zip_s3_key: "zips/proj_abc123.zip" });

    await performProjectHardDelete(project);

    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "zips/proj_abc123.zip"
    );
  });

  it("does NOT call redisClient.zadd for ZIP when repo_zip_s3_key is null", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await performProjectHardDelete(mockProject({ repo_zip_s3_key: null }));

    expect(redisClient.zadd).not.toHaveBeenCalled();
  });

  // ── Step 4: Review cleanup ──────────────────────────────────────────────────

  it("deletes all reviews for the project before deleting the document", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Review.deleteMany).mockResolvedValue({ deletedCount: 3 } as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await performProjectHardDelete(mockProject());

    expect(Review.deleteMany).toHaveBeenCalledWith({
      projectId: "507f191e810c19729de860ea",
    });
  });

  it("continues to delete document even if Review.deleteMany throws", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Review.deleteMany).mockRejectedValue(new Error("DB error"));
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await expect(
      performProjectHardDelete(mockProject())
    ).resolves.toBeUndefined();

    expect(Project.deleteOne).toHaveBeenCalled();
  });

  // ── Step 5: Document deletion ───────────────────────────────────────────────

  it("deletes the project document from the DB", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await performProjectHardDelete(mockProject());

    expect(Project.deleteOne).toHaveBeenCalledWith({
      _id: "507f191e810c19729de860ea",
    });
  });

  // ── Error resilience ────────────────────────────────────────────────────────

  it("continues to delete document even if wishlist removal throws", async () => {
    vi.mocked(User.updateMany).mockRejectedValue(new Error("DB timeout"));
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    await expect(
      performProjectHardDelete(mockProject())
    ).resolves.toBeUndefined();

    expect(Project.deleteOne).toHaveBeenCalled();
  });

  it("continues to delete document even if Redis zadd throws", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(redisClient.zadd).mockRejectedValue(new Error("Redis down"));
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const project = mockProject({ repo_zip_s3_key: "zips/proj.zip" });

    await expect(performProjectHardDelete(project)).resolves.toBeUndefined();

    expect(Project.deleteOne).toHaveBeenCalled();
  });

  it("queues all media types together in a single run", async () => {
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const project = mockProject({
      project_images: ["https://cdn.example.com/i1.jpg"],
      project_images_detail: ["https://cdn.example.com/d1.jpg"],
      project_video: "https://cdn.example.com/v1.mp4",
      repo_zip_s3_key: "zips/p.zip",
    });

    await performProjectHardDelete(project);

    expect(redisClient.zadd).toHaveBeenCalledTimes(4);
  });
});

// ─── startScheduledDeletionJob ────────────────────────────────────────────────

describe("startScheduledDeletionJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockFindChain = (results: object[]) =>
    ({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(results),
      }),
    }) as any;

  it("queries projects with scheduled_deletion_at <= now at startup (10s delay)", async () => {
    vi.mocked(Project.find).mockReturnValue(mockFindChain([]));

    startScheduledDeletionJob();
    await vi.advanceTimersByTimeAsync(10_001);

    expect(Project.find).toHaveBeenCalledWith({
      scheduled_deletion_at: { $lte: expect.any(Date) },
    });
  });

  it("does nothing when no overdue projects are found", async () => {
    vi.mocked(Project.find).mockReturnValue(mockFindChain([]));

    startScheduledDeletionJob();
    await vi.advanceTimersByTimeAsync(10_001);

    expect(Project.deleteOne).not.toHaveBeenCalled();
    expect(User.updateMany).not.toHaveBeenCalled();
  });

  it("hard-deletes a single overdue project", async () => {
    const overdue = mockProject({ _id: "overdue1" });
    vi.mocked(Project.find).mockReturnValue(mockFindChain([overdue]));
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    startScheduledDeletionJob();
    await vi.advanceTimersByTimeAsync(10_001);

    expect(Project.deleteOne).toHaveBeenCalledWith({ _id: "overdue1" });
  });

  it("hard-deletes every overdue project in the batch", async () => {
    const projects = [
      "507f191e810c19729de860e1",
      "507f191e810c19729de860e2",
      "507f191e810c19729de860e3",
    ].map((id) => mockProject({ _id: id }));
    vi.mocked(Project.find).mockReturnValue(mockFindChain(projects));
    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    startScheduledDeletionJob();
    await vi.advanceTimersByTimeAsync(10_001);

    expect(Project.deleteOne).toHaveBeenCalledTimes(3);
    expect(Project.deleteOne).toHaveBeenCalledWith({
      _id: "507f191e810c19729de860e1",
    });
    expect(Project.deleteOne).toHaveBeenCalledWith({
      _id: "507f191e810c19729de860e2",
    });
    expect(Project.deleteOne).toHaveBeenCalledWith({
      _id: "507f191e810c19729de860e3",
    });
  });

  it("re-runs the job after 1 hour to catch newly overdue projects", async () => {
    // First run at 10s: no overdue projects
    // Second run at 1h + 10s: 1 overdue project
    vi.mocked(Project.find)
      .mockReturnValueOnce(mockFindChain([]))
      .mockReturnValueOnce(
        mockFindChain([mockProject({ _id: "late_project" })])
      );

    vi.mocked(User.updateMany).mockResolvedValue({} as any);
    vi.mocked(Project.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    startScheduledDeletionJob();

    // Startup sweep
    await vi.advanceTimersByTimeAsync(10_001);
    expect(Project.deleteOne).not.toHaveBeenCalled();

    // Hourly sweep
    await vi.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(Project.deleteOne).toHaveBeenCalledWith({ _id: "late_project" });
  });

  it("does not fire before the 10s startup delay", async () => {
    vi.mocked(Project.find).mockReturnValue(mockFindChain([]));

    startScheduledDeletionJob();

    // Only 5 seconds passed — job should NOT have run yet
    await vi.advanceTimersByTimeAsync(5_000);

    expect(Project.find).not.toHaveBeenCalled();
  });
});
