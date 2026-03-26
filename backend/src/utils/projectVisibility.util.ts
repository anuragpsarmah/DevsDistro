export const MARKETPLACE_VISIBLE_FILTER = {
  isActive: true,
  github_access_revoked: false,
  repo_zip_status: "SUCCESS",
  scheduled_deletion_at: null,
} as const;

type MarketplaceVisibilityCandidate = {
  isActive?: boolean;
  github_access_revoked?: boolean;
  repo_zip_status?: string | null;
  scheduled_deletion_at?: Date | string | null;
};

export function isProjectMarketplaceVisible(
  project: MarketplaceVisibilityCandidate | null | undefined
): boolean {
  return (
    project?.isActive === true &&
    project.github_access_revoked === false &&
    project.repo_zip_status === "SUCCESS" &&
    project.scheduled_deletion_at == null
  );
}
