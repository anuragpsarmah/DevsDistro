const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PROJECT_LISTING_LIMIT_FALLBACK = 2;

const getParsedDefaultProjectListingLimit = () =>
  Number.parseInt(process.env.DEFAULT_PROJECT_LISTING_LIMIT ?? "", 10);

export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

export const AUTH_COOKIE_NAMES = {
  oauthState: "oauth_state",
  oauthNext: "oauth_next",
  refreshToken: "refresh_token",
} as const;

export const authCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

export const githubAuthConfig = {
  get clientId() {
    return process.env.GITHUB_CLIENT_ID;
  },
  get clientSecret() {
    return process.env.GITHUB_CLIENT_SECRET;
  },
  get redirectUri() {
    return process.env.GITHUB_REDIRECT_URI;
  },
  get encryptionKey() {
    return process.env.ENCRYPTION_KEY_32;
  },
  oauthScope: "read:user",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  accessTokenUrl: "https://github.com/login/oauth/access_token",
  userApiUrl: "https://api.github.com/user",
  requestTimeoutMs: 10_000,
  tokenExchangeHeaders: {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  } as const,
  userApiHeaders: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  } as const,
};

export const authUserDefaults = {
  get projectListingLimit() {
    const parsedDefaultProjectListingLimit =
      getParsedDefaultProjectListingLimit();

    return Number.isNaN(parsedDefaultProjectListingLimit)
      ? DEFAULT_PROJECT_LISTING_LIMIT_FALLBACK
      : parsedDefaultProjectListingLimit;
  },
};

export const authRetentionConfig = {
  accountDeletionCooldownMs: 15 * DAY_IN_MS,
  projectSoftDeleteGracePeriodMs: 7 * DAY_IN_MS,
  deletedAccountRejoinDateLocale: "en-US",
  deletedAccountRejoinDateTimeZone: "UTC",
};

export const authPurchaseConfig = {
  confirmedStatus: "CONFIRMED",
} as const;
