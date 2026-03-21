// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { MarketplaceProject } from "@/utils/types";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/hooks/apiQueries", () => ({
  useGetWishlistQuery: vi.fn(),
}));

vi.mock("@/hooks/apiMutations", () => ({
  useToggleWishlistMutation: vi.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { useGetWishlistQuery } from "@/hooks/apiQueries";
import { useToggleWishlistMutation } from "@/hooks/apiMutations";
import MarketplaceProjectCard from "@/pages/buyerDashboard/sub-components/MarketplaceProjectCard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeProject = (
  overrides: Partial<MarketplaceProject> = {}
): MarketplaceProject => ({
  _id: "project123",
  title: "Test Project",
  description: "A wonderful test project with many features for buyers",
  project_type: "Web Application",
  tech_stack: ["React", "Node.js", "MongoDB"],
  price: 50,
  avgRating: 4.5,
  totalReviews: 10,
  live_link: "",
  createdAt: "2025-01-01T00:00:00.000Z",
  project_images: "https://cdn.example.com/image.jpg",
  userid: {
    username: "testuser",
    name: "Test User",
    profile_image_url: "",
  },
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MarketplaceProjectCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetWishlistQuery).mockReturnValue({ data: [] } as any);
    vi.mocked(useToggleWishlistMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  // F1 ────────────────────────────────────────────────────────────────────────

  it("F1: renders project title, price, and description", () => {
    render(<MarketplaceProjectCard project={makeProject()} />);

    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("$ 50")).toBeInTheDocument();
    expect(screen.getByText(/A wonderful test project/)).toBeInTheDocument();
  });

  // F2 ────────────────────────────────────────────────────────────────────────

  it("F2: shows Free badge when price is 0", () => {
    render(<MarketplaceProjectCard project={makeProject({ price: 0 })} />);

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByText(/\$ /)).not.toBeInTheDocument();
  });

  // F3 ────────────────────────────────────────────────────────────────────────

  it("F3: shows New label when avgRating is 0", () => {
    render(
      <MarketplaceProjectCard
        project={makeProject({ avgRating: 0, totalReviews: 0 })}
      />
    );

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  // F4 ────────────────────────────────────────────────────────────────────────

  it("F4: renders numeric star rating when avgRating is greater than 0", () => {
    render(
      <MarketplaceProjectCard project={makeProject({ avgRating: 4.5 })} />
    );

    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  // F5 ────────────────────────────────────────────────────────────────────────

  it("F5: swaps to No preview placeholder when project image fails to load", async () => {
    render(<MarketplaceProjectCard project={makeProject()} />);

    const img = screen.getByRole("img", { name: "Test Project" });
    expect(img).toBeInTheDocument();

    // Simulate the browser reporting a broken image URL
    fireEvent.error(img);

    await waitFor(() => {
      expect(
        screen.queryByRole("img", { name: "Test Project" })
      ).not.toBeInTheDocument();
      expect(screen.getByText("No preview")).toBeInTheDocument();
    });
  });

  // F6 ────────────────────────────────────────────────────────────────────────

  it("F6: calls wishlist toggle mutation with project id when wishlist button is clicked", () => {
    const mutateMock = vi.fn();
    vi.mocked(useToggleWishlistMutation).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as any);

    render(<MarketplaceProjectCard project={makeProject()} />);

    // The wishlist heart button is the only <button> in a non-purchased card
    const wishlistBtn = screen.getByRole("button");
    fireEvent.click(wishlistBtn);

    expect(mutateMock).toHaveBeenCalledWith("project123");
  });

  // F7 ────────────────────────────────────────────────────────────────────────

  it("F7: live link anchor has target _blank and noopener noreferrer", () => {
    render(
      <MarketplaceProjectCard
        project={makeProject({ live_link: "https://example.com" })}
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("href", "https://example.com");
  });
});
