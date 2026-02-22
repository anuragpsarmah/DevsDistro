import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import { redisClient } from "../index";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { encrypt, decrypt } from "../utils/encryption.util";
import { tryCatch } from "../utils/tryCatch.util";
import logger from "../logger/logger";

const {
  GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY,
  GITHUB_WEBHOOK_SECRET,
  ENCRYPTION_KEY_32,
  ENCRYPTION_IV,
  JWT_SECRET,
} = process.env;

interface InstallationToken {
  token: string;
  expires_at: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string;
}

interface Installation {
  id: number;
  account: {
    login: string;
    id: number;
    type: string;
  };
  repository_selection: "all" | "selected";
  suspended_at: string | null;
}

const INSTALL_STATE_EXPIRY_SECONDS = 10 * 60;

class GitHubAppService {
  private appId: string;
  private privateKey: string;
  private webhookSecret: string;
  private installStateSecret: string;

  constructor() {
    this.appId = GITHUB_APP_ID || "";
    this.privateKey = (GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    this.webhookSecret = GITHUB_WEBHOOK_SECRET || "";
    this.installStateSecret = crypto
      .createHmac("sha256", JWT_SECRET || "")
      .update("github-app-install-state")
      .digest("hex");
  }

  generateAppJWT(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iat: now - 60,
      exp: now + 10 * 60,
      iss: this.appId,
    };

    return jwt.sign(payload, this.privateKey, { algorithm: "RS256" });
  }

  async getInstallationToken(installationId: number): Promise<string> {
    const cacheKey = `gh-install-token:${installationId}`;
    const TOKEN_BUFFER_SECONDS = 5 * 60;

    const [redisCachedData] = await tryCatch(redisClient.get(cacheKey));
    if (redisCachedData) {
      const { token, expiresAt } = JSON.parse(redisCachedData);
      const expiresAtMs = new Date(expiresAt).getTime();
      if (expiresAtMs - Date.now() > TOKEN_BUFFER_SECONDS * 1000) {
        return token;
      }
    }

    const [dbCachedData] = await tryCatch(
      GitHubAppInstallation.findOne({ installation_id: installationId })
    );

    if (
      dbCachedData?.cached_installation_token &&
      dbCachedData?.token_expires_at
    ) {
      const expiresAtMs = new Date(dbCachedData.token_expires_at).getTime();
      if (expiresAtMs - Date.now() > TOKEN_BUFFER_SECONDS * 1000) {
        const [decryptedToken, decryptError] = await tryCatch(() =>
          decrypt(
            dbCachedData.cached_installation_token!,
            ENCRYPTION_KEY_32 as string,
            ENCRYPTION_IV as string
          )
        );

        if (!decryptError && decryptedToken) {
          await tryCatch(
            redisClient.setex(
              cacheKey,
              3300,
              JSON.stringify({
                token: decryptedToken,
                expiresAt: dbCachedData.token_expires_at,
              })
            )
          );
          return decryptedToken;
        }
      }
    }

    const appJWT = this.generateAppJWT();
    const [response, error] = await tryCatch(
      axios.post<InstallationToken>(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      )
    );

    if (error || !response) {
      logger.error("Failed to get installation token", {
        installationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to get installation access token");
    }

    const { token, expires_at } = response.data;

    await tryCatch(
      redisClient.setex(
        cacheKey,
        3300,
        JSON.stringify({ token, expiresAt: expires_at })
      )
    );

    const [encryptedToken] = await tryCatch(() =>
      encrypt(token, ENCRYPTION_KEY_32 as string, ENCRYPTION_IV as string)
    );

    if (encryptedToken) {
      await tryCatch(
        GitHubAppInstallation.updateOne(
          { installation_id: installationId },
          {
            cached_installation_token: encryptedToken,
            token_expires_at: new Date(expires_at),
          }
        )
      );
    }

    return token;
  }

  async getInstallationRepos(
    installationId: number,
    page: number = 1
  ): Promise<{ repos: Repository[]; totalCount: number }> {
    const token = await this.getInstallationToken(installationId);
    const perPage = 10;

    const [response, error] = await tryCatch(
      axios.get<{ repositories: Repository[]; total_count: number }>(
        "https://api.github.com/installation/repositories",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          params: {
            per_page: perPage,
            page,
          },
        }
      )
    );

    if (error || !response) {
      logger.error("Failed to fetch installation repos", {
        installationId,
        page,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { repos: [], totalCount: 0 };
    }

    return {
      repos: response.data.repositories,
      totalCount: response.data.total_count,
    };
  }

  async getAllInstallationRepos(installationId: number): Promise<Repository[]> {
    const allRepos: Repository[] = [];
    let page = 1;

    while (true) {
      const { repos } = await this.getInstallationRepos(installationId, page);
      allRepos.push(...repos);
      if (repos.length < 10) break;
      page++;
    }

    return allRepos;
  }

  async getInstallation(installationId: number): Promise<Installation | null> {
    const appJWT = this.generateAppJWT();

    const [response, error] = await tryCatch(
      axios.get<Installation>(
        `https://api.github.com/app/installations/${installationId}`,
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      )
    );

    if (error || !response) {
      logger.error("Failed to get installation", {
        installationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }

    return response.data;
  }

  async getRepository(
    installationId: number,
    repoId: number
  ): Promise<Repository | null> {
    const token = await this.getInstallationToken(installationId);

    const [response, error] = await tryCatch(
      axios.get<Repository>(`https://api.github.com/repositories/${repoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      })
    );

    if (error || !response) {
      return null;
    }

    return response.data;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    const hmac = crypto.createHmac("sha256", this.webhookSecret);
    const expectedSignature = `sha256=${hmac.update(payload).digest("hex")}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  verifyInstallState(state: string, userId: string): boolean {
    const parts = state.split(".");
    if (parts.length !== 3) return false;

    const [stateUserId, timestampStr, signature] = parts;

    if (stateUserId !== userId) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > INSTALL_STATE_EXPIRY_SECONDS) return false;

    const expectedSignature = crypto
      .createHmac("sha256", this.installStateSecret)
      .update(`${stateUserId}.${timestampStr}`)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  getInstallUrl(userId: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${userId}.${timestamp}`;
    const signature = crypto
      .createHmac("sha256", this.installStateSecret)
      .update(payload)
      .digest("hex");

    const state = `${payload}.${signature}`;
    return `https://github.com/apps/devexchange-local/installations/new?state=${encodeURIComponent(state)}`;
  }
}

export const githubAppService = new GitHubAppService();
