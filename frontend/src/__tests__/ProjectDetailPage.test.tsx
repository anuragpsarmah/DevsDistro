// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/apiQueries", () => ({
  useProjectDetailQuery: vi.fn(),
  useGetWishlistQuery: vi.fn(),
  useGetPurchasedProjectsQuery: vi.fn(),
}));

vi.mock("@/hooks/apiMutations", () => ({
  useToggleWishlistMutation: vi.fn(),
  useDownloadProjectMutation: vi.fn(),
  useDownloadReceiptMutation: vi.fn(),
}));

vi.mock("@/pages/buyerDashboard/hooks/usePurchaseFlow", () => ({
  usePurchaseFlow: vi.fn(() => ({
    initiate: vi.fn(),
    reset: vi.fn(),
    refreshQuote: vi.fn(),
    flowState: "idle",
    intent: null,
    countdown: null,
    error: null,
    isWalletConnected: false,
    walletPublicKey: null,
    failedAfterOnChain: false,
    executePurchase: vi.fn(),
    retryConfirm: vi.fn(),
  })),
}));

vi.mock("@/pages/buyerDashboard/sub-components/FileTree", () => ({
  default: () => <div data-testid="file-tree" />,
}));

vi.mock("@/pages/buyerDashboard/sub-components/PurchaseModal", () => ({
  default: () => <div data-testid="purchase-modal" />,
}));

vi.mock("@/pages/buyerDashboard/sub-components/ReviewSection", () => ({
  default: () => <div data-testid="review-section" />,
}));

vi.mock("@/components/ui/customToast", () => ({
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));

import {
  useProjectDetailQuery,
  useGetWishlistQuery,
  useGetPurchasedProjectsQuery,
} from "@/hooks/apiQueries";
import {
  useToggleWishlistMutation,
  useDownloadProjectMutation,
  useDownloadReceiptMutation,
} from "@/hooks/apiMutations";
import ProjectDetailPage from "@/pages/buyerDashboard/sub-components/ProjectDetailPage";

const mockProject = {
  _id: "507f1f77bcf86cd799439011",
  title: "Free Listing",
  description: "A stable cached project detail payload",
  project_type: "Web App",
  tech_stack: ["React"],
  price: 0,
  avgRating: 4.8,
  totalReviews: 3,
  live_link: "",
  createdAt: "2026-03-29T00:00:00.000Z",
  project_images: ["https://example.com/image.jpg"],
  project_images_detail: ["https://example.com/detail-image.jpg"],
  project_video: "",
  repo_tree: null,
  repo_tree_status: "SUCCESS",
  scheduled_deletion_at: null,
  downloadCount: 5,
  userid: {
    username: "seller",
    name: "Seller Name",
    profile_image_url: "",
    short_bio: "Builder",
    job_role: "Engineer",
    location: "Remote",
    website_url: "",
    x_username: "",
    profile_visibility: true,
  },
};

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGetWishlistQuery).mockReturnValue({
      data: [],
    } as any);

    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [],
    } as any);

    vi.mocked(useToggleWishlistMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDownloadProjectMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDownloadReceiptMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it("keeps rendering the cached project detail when a background refetch errors", () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      data: mockProject,
      isLoading: false,
      isError: true,
    } as any);

    render(
      <ProjectDetailPage
        projectId={mockProject._id}
        onBack={vi.fn()}
        logout={vi.fn()}
      />
    );

    expect(screen.getByText("Free Listing")).toBeInTheDocument();
    expect(screen.getByText("Download Free")).toBeInTheDocument();
    expect(
      screen.queryByText("System Error: Project Not Found")
    ).not.toBeInTheDocument();
  });

  it("shows the unavailable fallback when the project detail query has no data", () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<ProjectDetailPage projectId="missing-project" onBack={vi.fn()} />);

    expect(
      screen.getByText("System Error: Project Unavailable")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we could not refresh this project right now/i)
    ).toBeInTheDocument();
  });

  it("hides the latest download button when no live latest package is available", () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      data: { ...mockProject, price: 10 },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [
        {
          _id: "purchase-1",
          projectId: { ...mockProject, price: 10 },
          can_download_purchased: true,
          can_download_latest: false,
        },
      ],
    } as any);

    render(
      <ProjectDetailPage
        projectId={mockProject._id}
        onBack={vi.fn()}
        logout={vi.fn()}
      />
    );

    expect(screen.getByText("Download Purchased Version")).toBeInTheDocument();
    expect(
      screen.queryByText("Download Latest Version")
    ).not.toBeInTheDocument();
  });
});
