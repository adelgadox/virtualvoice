/**
 * Covers the derived-loading refactor on the queue page: `loading` comes from
 * comparing `loadedFor` against the active filter rather than a setState in
 * the effect body, and the 30s poll must not flash the skeleton.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QueuePage from "@/app/dashboard/queue/page";
import type { Influencer, PendingResponse } from "@/types/api";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { accessToken: "tok" } }),
}));

jest.mock("@/components/queue/ApprovalCard", () => ({
  __esModule: true,
  default: ({ response }: { response: PendingResponse }) => (
    <div data-testid="approval-card">{response.suggested_text}</div>
  ),
}));

const POLL_INTERVAL_MS = 30_000;

function makeResponse(overrides: Partial<PendingResponse> = {}): PendingResponse {
  return {
    id: "resp-1",
    comment_id: "comment-1",
    influencer_id: "inf-1",
    suggested_text: "Thanks for asking!",
    final_text: null,
    llm_provider_used: "gemini",
    status: "pending",
    approved_by: null,
    approved_at: null,
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

/** Route each endpoint the page calls; `pending` may vary per call. */
function mockEndpoints(pending: PendingResponse[] | (() => Promise<PendingResponse[]>)) {
  mockApiFetch.mockImplementation((path: string) => {
    if (path.startsWith("/influencers")) return Promise.resolve([makeInfluencer()]);
    return typeof pending === "function" ? pending() : Promise.resolve(pending);
  });
}

const skeleton = (container: HTMLElement) => container.querySelector(".animate-pulse");

beforeEach(() => {
  mockApiFetch.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("shows the skeleton until the first fetch resolves", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    const { container } = render(<QueuePage />);

    expect(skeleton(container)).toBeInTheDocument();
  });

  it("clears the skeleton once responses arrive", async () => {
    mockEndpoints([makeResponse()]);

    const { container } = render(<QueuePage />);

    await waitFor(() => expect(screen.getByTestId("approval-card")).toBeInTheDocument());
    expect(skeleton(container)).not.toBeInTheDocument();
  });

  it("clears the skeleton when the queue comes back empty", async () => {
    mockEndpoints([]);

    const { container } = render(<QueuePage />);

    await waitFor(() => expect(skeleton(container)).not.toBeInTheDocument());
    expect(screen.getByText(/no pending responses/i)).toBeInTheDocument();
  });

  it("clears the skeleton when the fetch fails", async () => {
    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : Promise.reject(new Error("queue is down"))
    );

    const { container } = render(<QueuePage />);

    await waitFor(() => expect(screen.getByText("queue is down")).toBeInTheDocument());
    expect(skeleton(container)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe("filtering", () => {
  it("requests the queue scoped to the selected influencer", async () => {
    mockEndpoints([makeResponse()]);

    render(<QueuePage />);
    await screen.findByTestId("approval-card");

    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/responses/pending?influencer_id=inf-1",
        { token: "tok" }
      )
    );
  });

  it("shows the skeleton again while the new filter loads", async () => {
    mockEndpoints([makeResponse()]);

    const { container } = render(<QueuePage />);
    await screen.findByTestId("approval-card");

    // The filtered request never settles.
    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : new Promise(() => {})
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    expect(skeleton(container)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Polling — the reason `loading` is keyed to the filter, not to each request
// ---------------------------------------------------------------------------

describe("polling", () => {
  it("does not flash the skeleton on a poll tick", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    mockEndpoints([makeResponse()]);

    const { container } = render(<QueuePage />);
    await waitFor(() => expect(screen.getByTestId("approval-card")).toBeInTheDocument());

    const callsBefore = mockApiFetch.mock.calls.length;
    jest.advanceTimersByTime(POLL_INTERVAL_MS);

    await waitFor(() => expect(mockApiFetch.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(skeleton(container)).not.toBeInTheDocument();
  });

  it("stops polling after unmount", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    mockEndpoints([makeResponse()]);

    const { unmount } = render(<QueuePage />);
    await waitFor(() => expect(screen.getByTestId("approval-card")).toBeInTheDocument());

    unmount();
    const callsAfterUnmount = mockApiFetch.mock.calls.length;
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);

    expect(mockApiFetch.mock.calls.length).toBe(callsAfterUnmount);
  });
});
