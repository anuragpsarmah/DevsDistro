import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { enrichContext } from "./asyncContext";
import jwt from "jsonwebtoken";
import { redisClient } from "../index";
import {
  REFRESH_TOKEN_DURATION_MS,
  REFRESH_TOKEN_DURATION_S,
  REUSE_DETECTION_GRACE_MS,
} from "../config/token.config";

const REFRESH_TOKEN_BYTE_LENGTH = 40;
const REFRESH_TOKEN_MAX_PER_USER = 5;

export const createSessionToken = (
  userid: mongoose.Types.ObjectId,
  username: string,
  name: string,
  profile_image_url: string
) => {
  const expiresIn = process.env.JWT_EXPIRES_IN as string;
  enrichContext({
    auth_session_created: true,
    auth_session_expires_in: expiresIn,
  });
  const session_token = jwt.sign(
    { _id: userid, username, name, profile_image_url },
    process.env.JWT_SECRET as string,
    { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] }
  );

  return session_token;
};

export function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString("hex");
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_DURATION_MS);
}

export async function addRefreshToken(
  userId: mongoose.Types.ObjectId,
  rawToken: string
): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  const expiresAt = getRefreshTokenExpiryDate();
  const now = new Date();

  await User.updateOne({ _id: userId }, [
    {
      $set: {
        refresh_tokens: {
          $filter: {
            input: "$refresh_tokens",
            as: "rt",
            cond: { $gt: ["$$rt.expires_at", now] },
          },
        },
      },
    },
    {
      $set: {
        refresh_tokens: {
          $cond: {
            if: {
              $gte: [{ $size: "$refresh_tokens" }, REFRESH_TOKEN_MAX_PER_USER],
            },
            then: {
              $slice: ["$refresh_tokens", -(REFRESH_TOKEN_MAX_PER_USER - 1)],
            },
            else: "$refresh_tokens",
          },
        },
      },
    },
    {
      $set: {
        refresh_tokens: {
          $concatArrays: [
            "$refresh_tokens",
            [{ token_hash: hash, expires_at: expiresAt, created_at: now }],
          ],
        },
      },
    },
  ]);
}

type RotateResult = {
  _id: mongoose.Types.ObjectId;
  username: string;
  name: string;
  profile_image_url: string;
};

export async function rotateRefreshToken(
  oldRawToken: string,
  newRawToken: string
): Promise<RotateResult | "REUSE_DETECTED" | null> {
  const oldHash = hashRefreshToken(oldRawToken);
  const newHash = hashRefreshToken(newRawToken);
  const now = new Date();
  const newExpiresAt = getRefreshTokenExpiryDate();

  const user = await User.findOneAndUpdate(
    {
      refresh_tokens: {
        $elemMatch: {
          token_hash: oldHash,
          expires_at: { $gt: now },
        },
      },
    },
    [
      {
        $set: {
          refresh_tokens: {
            $filter: {
              input: "$refresh_tokens",
              as: "rt",
              cond: { $gt: ["$$rt.expires_at", now] },
            },
          },
        },
      },
      {
        $set: {
          refresh_tokens: {
            $filter: {
              input: "$refresh_tokens",
              as: "rt",
              cond: { $ne: ["$$rt.token_hash", oldHash] },
            },
          },
        },
      },
      {
        $set: {
          refresh_tokens: {
            $cond: {
              if: {
                $gte: [
                  { $size: "$refresh_tokens" },
                  REFRESH_TOKEN_MAX_PER_USER,
                ],
              },
              then: {
                $slice: ["$refresh_tokens", -(REFRESH_TOKEN_MAX_PER_USER - 1)],
              },
              else: "$refresh_tokens",
            },
          },
        },
      },
      {
        $set: {
          refresh_tokens: {
            $concatArrays: [
              "$refresh_tokens",
              [
                {
                  token_hash: newHash,
                  expires_at: newExpiresAt,
                  created_at: now,
                },
              ],
            ],
          },
        },
      },
    ],
    {
      new: false,
      projection: { _id: 1, username: 1, name: 1, profile_image_url: 1 },
    }
  ).lean<RotateResult>();

  if (user) {
    try {
      await redisClient.set(
        `consumed_rt:${oldHash}`,
        JSON.stringify({ userId: user._id.toString(), consumedAt: Date.now() }),
        "EX",
        REFRESH_TOKEN_DURATION_S
      );
    } catch {}

    return {
      _id: user._id,
      username: user.username,
      name: user.name,
      profile_image_url: user.profile_image_url,
    };
  }

  try {
    const storedValue = await redisClient.get(`consumed_rt:${oldHash}`);
    if (storedValue) {
      const { userId, consumedAt } = JSON.parse(storedValue) as {
        userId: string;
        consumedAt: number;
      };

      if (Date.now() - consumedAt <= REUSE_DETECTION_GRACE_MS) {
        return null;
      }

      await revokeAllRefreshTokens(new mongoose.Types.ObjectId(userId));
      return "REUSE_DETECTED";
    }
  } catch {}

  return null;
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const hash = hashRefreshToken(rawToken);
  await User.updateOne(
    { "refresh_tokens.token_hash": hash },
    { $pull: { refresh_tokens: { token_hash: hash } } }
  );
}

export async function revokeAllRefreshTokens(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { refresh_tokens: [] } });
}
