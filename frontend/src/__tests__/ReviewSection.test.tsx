// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ProjectReview } from "@/utils/types";

vi.mock("@/hooks/apiQueries", () => ({
  useGetProjectReviewsQuery: vi.fn(),
  useGetMyProjectReviewQuery: vi.fn(),
}));

vi.mock("@/hooks/apiMutations", () => ({
  useSubmitReviewMutation: vi.fn(),
  useUpdateReviewMutation: vi.fn(),
  useDeleteReviewMutation: vi.fn(),
}));

vi.mock("@/components/ui/customToast", () => ({
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));

import {
  useGetProjectReviewsQuery,
  useGetMyProjectReviewQuery,
} from "@/hooks/apiQueries";
import {
  useSubmitReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from "@/hooks/apiMutations";
import ReviewSection from "@/pages/buyerDashboard/sub-components/ReviewSection";

const makeReview = (overrides: Partial<ProjectReview> = {}): ProjectReview => ({
  _id: "review-1",
  projectId: "project-1",
  userId: {
    _id: "user-1",
    username: "buyer",
    name: "Buyer Name",
    profile_image_url: "",
  },
  rating: 4,
  review: "Legacy free review",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("ReviewSection", () => {
  let deleteMutateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    deleteMutateMock = vi.fn();

    vi.mocked(useGetProjectReviewsQuery).mockReturnValue({
      data: {
        reviews: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 0,
          hasNextPage: false,
        },
      },
      isLoading: false,
      isFetching: false,
    } as any);

    vi.mocked(useGetMyProjectReviewQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    vi.mocked(useSubmitReviewMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useUpdateReviewMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useDeleteReviewMutation).mockReturnValue({
      mutate: deleteMutateMock,
      isPending: false,
    } as any);
  });

  it("shows an existing review with delete only for a legacy free reviewer on a paid project", () => {
    vi.mocked(useGetMyProjectReviewQuery).mockReturnValue({
      data: makeReview(),
      isLoading: false,
    } as any);

    render(
      <ReviewSection
        projectId="project-1"
        canWriteReview={false}
        canFetchOwnReview={true}
      />
    );

    expect(screen.getByText("Your Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Leave a Review" })
    ).not.toBeInTheDocument();
  });

  it("requires confirmation and then calls delete mutation in the legacy delete-only state", () => {
    vi.mocked(useGetMyProjectReviewQuery).mockReturnValue({
      data: makeReview(),
      isLoading: false,
    } as any);

    render(
      <ReviewSection
        projectId="project-1"
        canWriteReview={false}
        canFetchOwnReview={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.queryByRole("button", { name: "Edit" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Delete" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

    expect(deleteMutateMock).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    );
  });

  it("keeps purchase-required empty-state messaging when there is no review and the buyer cannot write one", () => {
    render(
      <ReviewSection
        projectId="project-1"
        canWriteReview={false}
        canFetchOwnReview={true}
      />
    );

    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(
      screen.getByText("Purchase this project to leave the first review")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" })
    ).not.toBeInTheDocument();
  });

  it("shows the leave-review CTA when the buyer can write a review and has not written one yet", () => {
    render(
      <ReviewSection
        projectId="project-1"
        canWriteReview={true}
        canFetchOwnReview={true}
      />
    );

    expect(
      screen.getByRole("button", { name: "Leave a Review" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Purchase this project to leave the first review")
    ).not.toBeInTheDocument();
  });

  it("shows edit and delete for a free project review", () => {
    vi.mocked(useGetMyProjectReviewQuery).mockReturnValue({
      data: makeReview(),
      isLoading: false,
    } as any);

    render(
      <ReviewSection
        projectId="project-1"
        canWriteReview={true}
        canFetchOwnReview={true}
      />
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("keeps full edit and delete controls for a purchased paid project review", () => {
    vi.mocked(useGetMyProjectReviewQuery).mockReturnValue({
      data: makeReview(),
      isLoading: false,
    } as any);

    render(
      <ReviewSection
        projectId="project-1"
        canWriteReview={true}
        canFetchOwnReview={true}
      />
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(
      screen.queryByText("Purchase this project to leave the first review")
    ).not.toBeInTheDocument();
  });
});
