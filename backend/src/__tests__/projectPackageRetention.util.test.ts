import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("..", () => ({
  redisClient: {
    zadd: vi.fn(),
  },
}));

vi.mock("../logger/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../models/project.model", () => ({
  Project: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../models/projectPackage.model", () => ({
  ProjectPackage: {
    find: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

import { redisClient } from "..";
import { ProjectPackage } from "../models/projectPackage.model";
import { Purchase } from "../models/purchase.model";
import { reconcileProjectPackageRetention } from "../utils/projectPackageRetention.util";

const PROJECT_ID = "507f1f77bcf86cd799439033";

describe("reconcileProjectPackageRetention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early without deleting packages when the confirmed-purchase lookup fails", async () => {
    vi.mocked(Purchase.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("purchase lookup failed")),
      }),
    } as any);

    vi.mocked(ProjectPackage.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "507f1f77bcf86cd799439066",
            s3_key: "repoZips/project/package.zip",
          },
        ]),
      }),
    } as any);

    await reconcileProjectPackageRetention(PROJECT_ID, {
      retainLatestPackage: false,
    });

    expect(ProjectPackage.find).not.toHaveBeenCalled();
    expect(ProjectPackage.deleteOne).not.toHaveBeenCalled();
    expect(redisClient.zadd).not.toHaveBeenCalled();
  });
});
