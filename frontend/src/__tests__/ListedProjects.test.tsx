// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ListedProjects from "@/pages/sellerDashboard/main-components/ListedProjects";
import type { ListedProjectsProps } from "@/pages/sellerDashboard/utils/types";

function createProps(
  overrides: Partial<ListedProjectsProps> = {}
): ListedProjectsProps {
  return {
    initialProjectData: [
      {
        _id: "project-1",
        github_repo_id: "repo-1",
        isActive: true,
        title: "Realtime Analytics Dashboard",
        description: "A polished seller project card for testing.",
        tech_stack: ["React", "TypeScript"],
        project_images: "https://cdn.example.com/project-1.png",
        repo_zip_status: "SUCCESS",
        repackage_status: "IDLE",
        price: 49,
        live_link: "https://example.com/demo",
        downloadCount: 7,
      },
    ],
    showWalletConnectionNotice: false,
    onNavigateToWallet: vi.fn(),
    isLoading: false,
    isError: false,
    handleToggleProjectListing: vi.fn().mockResolvedValue(true),
    handleDeleteProjectListing: vi.fn().mockResolvedValue(true),
    handleUIStateChange: vi.fn(),
    handleRetryRepoZipUpload: vi.fn().mockResolvedValue(undefined),
    handleRefreshRepoZipStatus: vi.fn().mockResolvedValue({
      repo_zip_status: "SUCCESS",
      repackage_status: "IDLE",
    }),
    handleRefreshRepoZip: vi.fn().mockResolvedValue(undefined),
    setFormProps: vi.fn(),
    onViewReviews: vi.fn(),
    ...overrides,
  };
}

function renderListedProjects(overrides: Partial<ListedProjectsProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const props = createProps(overrides);

  render(
    <QueryClientProvider client={queryClient}>
      <ListedProjects {...props} />
    </QueryClientProvider>
  );

  return props;
}

describe("ListedProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the wallet visibility warning when a wallet connection is required", async () => {
    const user = userEvent.setup();
    const props = renderListedProjects({ showWalletConnectionNotice: true });

    expect(screen.getByText(/wallet connection required/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /wallet connection is required for projects to be purchasable in the marketplace\./i
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    expect(props.onNavigateToWallet).toHaveBeenCalledTimes(1);
  });

  it("does not show the wallet visibility warning when a wallet is already connected", () => {
    renderListedProjects({ showWalletConnectionNotice: false });

    expect(
      screen.queryByText(/wallet connection required/i)
    ).not.toBeInTheDocument();
  });
});
