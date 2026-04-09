export const REFRESH_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_DURATION_S = 7 * 24 * 60 * 60;

// To treat same token as client retry rather than a token theft
export const REUSE_DETECTION_GRACE_MS = 60_000;
