/**
 * Covers the derived-loading refactor on the history page, including the
 * cancellation guard added with it: a slow request for the previous filter
 * must not mark the new filter as loaded.
 */
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "@/app/dashboard/history/page";
import type { Influencer, PendingResponse } from "@/types/api";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { accessToken: "tok" } }),
}));

function makeResponse(overrides: Partial<PendingResponse> = {}): PendingResponse {
  return {
    id: "resp-1",
    comment_id: "comment-1",
    influencer_id: "inf-1",
    suggested_text: "Thanks for asking!",
    final_text: null,
    llm_provider_used: "gemini",
    status: "approved",
    approved_by: "admin",
    approved_at: "2026-04-19T11:00:00Z",
    published_at: null,
    created_at: "2026-04-19T10:00:00Z",
    comment_content: "A question",
    comment_author: "user123",
    ...overrides,
  };
}

function makeInfluencer(overrides: Partial<Influencer> = {}): Influencer {
  return {
    id: "inf-1",
    name: "Luna García",
    slug: "luna-garcia",
    llm_provider: "gemini",
    system_prompt_core: "You are Luna.",
    current_context: null,
    is_active: true,
    created_at: "2026-04-19T10:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

function mockEndpoints(history: PendingResponse[]) {
  mockApiFetch.mockImplementation((path: string) =>
    path.startsWith("/influencers")
      ? Promise.resolve([makeInfluencer()])
      : Promise.resolve(history)
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const skeleton = (container: HTMLElement) => container.querySelector(".animate-pulse");

beforeEach(() => {
  mockApiFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("shows the skeleton until the first fetch resolves", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    const { container } = render(<HistoryPage />);

    expect(skeleton(container)).toBeInTheDocument();
  });

  it("clears the skeleton when history arrives", async () => {
    mockEndpoints([makeResponse()]);

    const { container } = render(<HistoryPage />);

    await waitFor(() => expect(skeleton(container)).not.toBeInTheDocument());
  });

  it("clears the skeleton on an empty history", async () => {
    mockEndpoints([]);

    render(<HistoryPage />);

    expect(await screen.findByText("No history yet")).toBeInTheDocument();
  });

  it("clears the skeleton when the fetch fails", async () => {
    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : Promise.reject(new Error("history is down"))
    );

    const { container } = render(<HistoryPage />);

    await waitFor(() => expect(screen.getByText("history is down")).toBeInTheDocument());
    expect(skeleton(container)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe("filtering", () => {
  it("requests history scoped to the selected influencer", async () => {
    mockEndpoints([makeResponse()]);

    render(<HistoryPage />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/responses/history?influencer_id=inf-1",
        { token: "tok" }
      )
    );
  });

  it("shows the skeleton again while the new filter loads", async () => {
    mockEndpoints([makeResponse()]);

    const { container } = render(<HistoryPage />);
    await waitFor(() => expect(skeleton(container)).not.toBeInTheDocument());

    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : new Promise(() => {})
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    expect(skeleton(container)).toBeInTheDocument();
  });

  it("keeps showing the skeleton when the previous filter's request lands late", async () => {
    const slow = deferred<PendingResponse[]>();
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/influencers")) return Promise.resolve([makeInfluencer()]);
      return slow.promise;
    });

    const { container } = render(<HistoryPage />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());

    // Switch filter while the first request is still in flight, then let the
    // stale one land. It must not mark the new filter as loaded.
    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : new Promise(() => {})
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    slow.resolve([makeResponse()]);
    // Flush the stale promise's continuations before asserting — otherwise the
    // assertion would pass simply because they had not run yet.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(skeleton(container)).toBeInTheDocument();
  });
});
