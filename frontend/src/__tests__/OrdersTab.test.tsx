// @vitest-environment jsdom
/**
 * Unit tests for OrdersTab.
 *
 * Exercises the key purchase-path logic:
 *   - Renders purchased project cards
 *   - Filters out purchases where projectId is null (hard-deleted projects)
 *   - Correct empty states (no purchases vs all deleted)
 *   - Download and Receipt button callbacks
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDownloadMutate = vi.fn();
const mockReceiptMutate = vi.fn();

vi.mock("@/hooks/apiQueries", () => ({
  useGetPurchasedProjectsInfiniteQuery: vi.fn(),
}));

vi.mock("@/hooks/apiMutations", () => ({
  useDownloadProjectMutation: vi.fn(() => ({ mutate: mockDownloadMutate })),
  useDownloadReceiptMutation: vi.fn(() => ({ mutate: mockReceiptMutate })),
}));

// Lightweight stubs for sub-components that are out of scope here
vi.mock(
  "../pages/buyerDashboard/sub-components/MarketplaceProjectCard",
  () => ({
    default: ({ project, footerContent }: any) => (
      <div data-testid="project-card">
        <span>{project?.title}</span>
        {footerContent}
      </div>
    ),
  })
);

vi.mock(
  "../pages/buyerDashboard/sub-components/MarketplaceCardSkeleton",
  () => ({
    default: () => <div data-testid="skeleton" />,
  })
);

vi.mock("../pages/buyerDashboard/sub-components/TransitionWrapper", () => ({
  TransitionWrapper: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("../pages/buyerDashboard/sub-components/ProjectDetailPage", () => ({
  default: () => <div data-testid="project-detail" />,
}));

// Mock IntersectionObserver — not available in jsdom
beforeAll(() => {
  (global as any).IntersectionObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_cb: any, _opts?: any) {}
  };
});

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { useGetPurchasedProjectsInfiniteQuery } from "@/hooks/apiQueries";
import OrdersTab from "@/pages/buyerDashboard/tabs/OrdersTab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPagination = {
  totalCount: 1,
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  limit: 12,
  offset: 0,
};

/** Wrap purchases into the InfiniteQuery data shape the component expects */
function makeInfiniteData(purchases: any[]) {
  return {
    pages: [
      {
        purchases,
        pagination: { ...mockPagination, totalCount: purchases.length },
      },
    ],
    pageParams: [0],
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROJECT_ID = "507f1f77bcf86cd799439033";
const PURCHASE_ID = "507f1f77bcf86cd799439044";

const mockActivePurchase = {
  _id: PURCHASE_ID,
  projectId: {
    _id: PROJECT_ID,
    title: "Awesome Web App",
    project_type: "Web App",
    project_images: "img1.jpg",
    repo_zip_status: "SUCCESS",
    scheduled_deletion_at: null,
  },
  price_usd: 10,
  price_sol_total: 0.1,
  buyer_wallet: "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK",
  tx_signature:
    "4CttUS628uKGA3tDSp45KrvoFDqckYaZkVmAEhWfMp6XxNwYF8ueq4xZyaFGVznoKDetwoLR8DnvQgUik4MhVgkr",
  createdAt: "2024-06-15T12:00:00Z",
  project_snapshot: { title: "Awesome Web App", project_type: "Web App" },
  seller_snapshot: {
    name: "Seller",
    username: "seller",
    profile_image_url: "",
  },
};

const mockDeletedPurchase = {
  ...mockActivePurchase,
  _id: "507f1f77bcf86cd799439099",
  projectId: null, // hard-deleted
};

const baseInfiniteReturn = {
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrdersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton cards while loading", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders a project card for each active purchase (non-null projectId)", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([mockActivePurchase]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    expect(screen.getAllByTestId("project-card")).toHaveLength(1);
    expect(screen.getByText("Awesome Web App")).toBeInTheDocument();
  });

  it("filters out purchases where projectId is null (hard-deleted) from the card grid", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([mockActivePurchase, mockDeletedPurchase]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    // Only 1 card rendered (the deleted purchase is filtered out)
    expect(screen.getAllByTestId("project-card")).toHaveLength(1);
  });

  it("shows 'No Active Purchases' state when all projects are deleted (purchases exist but all null)", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([mockDeletedPurchase]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    expect(screen.getByText("No Active Purchases")).toBeInTheDocument();
    expect(screen.queryByTestId("project-card")).not.toBeInTheDocument();
  });

  it("shows 'No Purchases Yet' state when there are no purchases at all", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    expect(screen.getByText("No Purchases Yet")).toBeInTheDocument();
  });

  it("shows an error state when the query fails", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("calls downloadMutation.mutate with the project _id when Download is clicked", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([mockActivePurchase]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    fireEvent.click(screen.getByText("Download"));
    expect(mockDownloadMutate).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.any(Object)
    );
  });

  it("calls receiptMutation.mutate with the purchase _id when Receipt is clicked", () => {
    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([mockActivePurchase]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    fireEvent.click(screen.getByText("Receipt"));
    expect(mockReceiptMutate).toHaveBeenCalledWith(
      PURCHASE_ID,
      expect.any(Object)
    );
  });

  it("shows a deletion warning badge when scheduled_deletion_at is set", () => {
    const scheduledPurchase = {
      ...mockActivePurchase,
      projectId: {
        ...mockActivePurchase.projectId,
        scheduled_deletion_at: "2025-12-31T00:00:00Z",
      },
    };

    vi.mocked(useGetPurchasedProjectsInfiniteQuery).mockReturnValue({
      ...baseInfiniteReturn,
      data: makeInfiniteData([scheduledPurchase]),
      isLoading: false,
      isError: false,
    } as any);

    render(<OrdersTab logout={vi.fn()} />);
    expect(screen.getByText(/scheduled for deletion/i)).toBeInTheDocument();
  });
});
