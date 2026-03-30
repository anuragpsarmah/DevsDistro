// @vitest-environment jsdom
/**
 * Unit tests for PurchaseLedgerTab.
 *
 * Exercises the key ledger-display logic:
 *   - Loading skeleton rows
 *   - Error state
 *   - Empty state ("No Purchases Found")
 *   - Renders rows with USD, SOL, seller, and project data
 *   - Uses project_snapshot.title for hard-deleted projects (null projectId)
 *   - "Terminated" badge for deleted projects
 *   - "Inspect TX" link href points to Solscan with correct cluster param
 *   - "Loaded N records" count badge
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/hooks/apiQueries", () => ({
  useGetPurchasedProjectsQuery: vi.fn(),
}));

vi.mock("@/components/wrappers/AnimatedLoadWrapper", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { useGetPurchasedProjectsQuery } from "@/hooks/apiQueries";
import PurchaseLedgerTab from "@/pages/buyerDashboard/tabs/PurchaseLedgerTab";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TX_SIG =
  "4CttUS628uKGA3tDSp45KrvoFDqckYaZkVmAEhWfMp6XxNwYF8ueq4xZyaFGVznoKDetwoLR8DnvQgUik4MhVgkr";

const mockActivePurchase = {
  _id: "507f1f77bcf86cd799439044",
  projectId: {
    _id: "507f1f77bcf86cd799439033",
    title: "Awesome Web App",
    project_type: "Web App",
  },
  price_usd: 150,
  price_sol_total: 1.5,
  buyer_wallet: "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK",
  tx_signature: TX_SIG,
  createdAt: "2024-06-15T12:00:00Z",
  project_snapshot: { title: "Awesome Web App", project_type: "Web App" },
  seller_snapshot: {
    name: "Alice Dev",
    username: "alicedev",
    profile_image_url: "",
  },
};

const mockDeletedPurchase = {
  ...mockActivePurchase,
  _id: "507f1f77bcf86cd799439099",
  projectId: null, // hard-deleted
  project_snapshot: { title: "Deleted Legacy App", project_type: "Mobile App" },
};

const mockRenamedPurchase = {
  ...mockActivePurchase,
  _id: "507f1f77bcf86cd799439055",
  projectId: {
    ...mockActivePurchase.projectId,
    title: "Awesome Web App 2.0",
  },
  project_snapshot: { title: "Awesome Web App", project_type: "Web App" },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PurchaseLedgerTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("renders skeleton rows while loading", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("does not render the records count badge while loading", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.queryByText(/Loaded/i)).not.toBeInTheDocument();
  });

  // ── Error state ──────────────────────────────────────────────────────────────

  it("renders error state when the query fails", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("Purchase Ledger Unavailable")).toBeInTheDocument();
  });

  it("does not render the records count badge when in error state", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.queryByText(/Loaded/i)).not.toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────────

  it("renders 'No Purchases Found' when the purchases array is empty", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("No Purchases Found")).toBeInTheDocument();
  });

  it("shows 'Loaded 0 records' count badge with empty purchases", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText(/Loaded 0 records/i)).toBeInTheDocument();
  });

  // ── Active purchase row ──────────────────────────────────────────────────────

  it("renders the project title from projectId.title for active purchases", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("Awesome Web App")).toBeInTheDocument();
  });

  it("renders USD and SOL amounts for each purchase", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("1.5000 SOL")).toBeInTheDocument();
  });

  it("renders seller name and @username for each purchase", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("Alice Dev")).toBeInTheDocument();
    expect(screen.getByText("@alicedev")).toBeInTheDocument();
  });

  it("does NOT render the 'Terminated' badge for active purchases", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.queryByText("Terminated")).not.toBeInTheDocument();
  });

  it("shows both current and purchase-time titles when an active project has been renamed", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockRenamedPurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("Awesome Web App 2.0")).toBeInTheDocument();
    expect(
      screen.getByText("At purchase: Awesome Web App")
    ).toBeInTheDocument();
  });

  // ── Deleted-project row ──────────────────────────────────────────────────────

  it("falls back to project_snapshot.title when projectId is null (hard-deleted)", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockDeletedPurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("Deleted Legacy App")).toBeInTheDocument();
  });

  it("renders a 'Terminated' badge when projectId is null (hard-deleted)", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockDeletedPurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText("Terminated")).toBeInTheDocument();
  });

  // ── Inspect TX link ──────────────────────────────────────────────────────────

  it("'Inspect TX' link includes ?cluster=devnet by default (no VITE_SOLANA_NETWORK set)", () => {
    // VITE_SOLANA_NETWORK not set → defaults to "devnet" → clusterParam = "?cluster=devnet"
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `https://solscan.io/tx/${TX_SIG}?cluster=devnet`
    );
  });

  it("'Inspect TX' link omits cluster param when VITE_SOLANA_NETWORK is 'mainnet'", () => {
    vi.stubEnv("VITE_SOLANA_NETWORK", "mainnet");

    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `https://solscan.io/tx/${TX_SIG}`);

    vi.unstubAllEnvs();
  });

  it("'Inspect TX' link omits cluster param when VITE_SOLANA_NETWORK is 'mainnet-beta'", () => {
    vi.stubEnv("VITE_SOLANA_NETWORK", "mainnet-beta");

    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `https://solscan.io/tx/${TX_SIG}`);

    vi.unstubAllEnvs();
  });

  it("'Inspect TX' link opens in a new tab with noopener noreferrer", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  // ── Records count badge ──────────────────────────────────────────────────────

  it("shows 'Loaded 1 record' (singular) when there is exactly 1 purchase", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText(/Loaded 1 record$/)).toBeInTheDocument();
  });

  it("shows 'Loaded 2 records' (plural) when there are 2 purchases", () => {
    vi.mocked(useGetPurchasedProjectsQuery).mockReturnValue({
      data: [mockActivePurchase, mockDeletedPurchase],
      isLoading: false,
      isError: false,
    } as any);

    render(<PurchaseLedgerTab logout={vi.fn()} />);
    expect(screen.getByText(/Loaded 2 records/)).toBeInTheDocument();
  });
});
