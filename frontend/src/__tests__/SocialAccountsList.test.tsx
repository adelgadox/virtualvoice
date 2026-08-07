/**
 * Covers the derived-loading refactor: `loading` comes from comparing
 * `loadedFor` against the current influencerId rather than a setState in the
 * effect body, and an in-flight fetch is discarded when the prop changes.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SocialAccountsList from "@/components/influencers/SocialAccountsList";
import type { SocialAccount } from "@/types/api";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

function makeAccount(overrides: Partial<SocialAccount> = {}): SocialAccount {
  return {
    id: "acc-1",
    influencer_id: "inf-1",
    platform: "instagram",
    account_id: "17841400000000000",
    page_id: null,
    username: "luna.garcia",
    profile_picture_url: null,
    is_active: true,
    created_at: "2026-04-19T10:00:00Z",
    ...overrides,
  };
}

/** A promise plus the handle to settle it, so a fetch can be held mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockApiFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("renders the skeleton before the first fetch resolves", () => {
    mockApiFetch.mockReturnValue(deferred<SocialAccount[]>().promise);

    const { container } = render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("No accounts connected")).not.toBeInTheDocument();
  });

  it("clears the skeleton once accounts arrive", async () => {
    mockApiFetch.mockResolvedValueOnce([makeAccount()]);

    const { container } = render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    await waitFor(() => expect(screen.getByText("@luna.garcia")).toBeInTheDocument());
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("clears the skeleton when the fetch fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("boom"));

    const { container } = render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    await waitFor(() => expect(screen.getByText("Failed to load accounts")).toBeInTheDocument());
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("returns to the skeleton in the same render the influencer changes", async () => {
    mockApiFetch.mockResolvedValueOnce([makeAccount()]);

    const { container, rerender } = render(
      <SocialAccountsList influencerId="inf-1" token="tok" />
    );
    await waitFor(() => expect(screen.getByText("@luna.garcia")).toBeInTheDocument());

    // Second influencer's fetch never settles — the skeleton must show
    // immediately, not one render later.
    mockApiFetch.mockReturnValue(deferred<SocialAccount[]>().promise);
    rerender(<SocialAccountsList influencerId="inf-2" token="tok" />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

describe("fetching", () => {
  it("requests accounts scoped to the influencer", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    render(<SocialAccountsList influencerId="inf-42" token="tok" />);

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/social-accounts/?influencer_id=inf-42",
        { token: "tok" }
      )
    );
  });

  it("refetches when the influencer changes", async () => {
    mockApiFetch.mockResolvedValue([]);

    const { rerender } = render(<SocialAccountsList influencerId="inf-1" token="tok" />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    rerender(<SocialAccountsList influencerId="inf-2" token="tok" />);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    expect(mockApiFetch).toHaveBeenLastCalledWith(
      "/social-accounts/?influencer_id=inf-2",
      { token: "tok" }
    );
  });

  it("renders the empty state when no accounts are connected", async () => {
    mockApiFetch.mockResolvedValueOnce([]);

    render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    expect(await screen.findByText("No accounts connected")).toBeInTheDocument();
  });

  it("falls back to account_id when username is null", async () => {
    mockApiFetch.mockResolvedValueOnce([makeAccount({ username: null })]);

    render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    expect(await screen.findByText("@17841400000000000")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Cancellation — the guard added alongside the derived-loading refactor
// ---------------------------------------------------------------------------

describe("cancellation", () => {
  it("ignores a stale response that resolves after the influencer changed", async () => {
    const first = deferred<SocialAccount[]>();
    mockApiFetch.mockReturnValueOnce(first.promise);

    const { rerender } = render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    mockApiFetch.mockResolvedValueOnce([makeAccount({ id: "acc-2", username: "second" })]);
    rerender(<SocialAccountsList influencerId="inf-2" token="tok" />);

    // inf-1's request lands late; its accounts must not be shown.
    first.resolve([makeAccount({ id: "acc-1", username: "first" })]);

    expect(await screen.findByText("@second")).toBeInTheDocument();
    expect(screen.queryByText("@first")).not.toBeInTheDocument();
  });

  it("ignores a stale error that rejects after the influencer changed", async () => {
    const first = deferred<SocialAccount[]>();
    mockApiFetch.mockReturnValueOnce(first.promise);

    const { rerender } = render(<SocialAccountsList influencerId="inf-1" token="tok" />);

    mockApiFetch.mockResolvedValueOnce([makeAccount({ username: "second" })]);
    rerender(<SocialAccountsList influencerId="inf-2" token="tok" />);

    first.reject(new Error("stale failure"));

    expect(await screen.findByText("@second")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load accounts")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

describe("disconnect", () => {
  it("removes the account from the list after a successful DELETE", async () => {
    mockApiFetch.mockResolvedValueOnce([makeAccount()]);
    render(<SocialAccountsList influencerId="inf-1" token="tok" />);
    await screen.findByText("@luna.garcia");

    mockApiFetch.mockResolvedValueOnce(undefined);
    await userEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenLastCalledWith("/social-accounts/acc-1", {
        token: "tok",
        method: "DELETE",
      })
    );
    await waitFor(() => expect(screen.queryByText("@luna.garcia")).not.toBeInTheDocument());
  });

  it("keeps the account and shows an error when the DELETE fails", async () => {
    mockApiFetch.mockResolvedValueOnce([makeAccount()]);
    render(<SocialAccountsList influencerId="inf-1" token="tok" />);
    await screen.findByText("@luna.garcia");

    mockApiFetch.mockRejectedValueOnce(new Error("nope"));
    await userEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    expect(await screen.findByText("Failed to disconnect account")).toBeInTheDocument();
    expect(screen.getByText("@luna.garcia")).toBeInTheDocument();
  });
});
