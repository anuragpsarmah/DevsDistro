export const REFRESH_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_DURATION_S = 7 * 24 * 60 * 60;

/**
 * After consuming a refresh token, if the same token is presented again within this
 * window, treat it as a client retry (response was lost in transit) rather than
 * a token theft.
 */
export const REUSE_DETECTION_GRACE_MS = 60_000;
