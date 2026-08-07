/**
 * Covers the derived-loading refactor on the knowledge page. `loading` is keyed
 * to the selected influencer filter, so it must clear on both success and
 * failure, and return while a new filter loads.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KnowledgePage from "@/app/dashboard/knowledge/page";
import type { Influencer, KnowledgeEntry } from "@/types/api";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { accessToken: "tok" } }),
}));

// Only the form component is stubbed — CATEGORIES must stay real, since
// KnowledgeEntryRow imports it from the same module to label the badge.
jest.mock("@/components/knowledge/KnowledgeEntryForm", () => ({
  ...jest.requireActual("@/components/knowledge/KnowledgeEntryForm"),
  __esModule: true,
  default: () => <div data-testid="knowledge-form" />,
}));

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

function makeEntry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: "entry-1",
    influencer_id: "inf-1",
    category: "biography",
    content: "Born in CDMX, moved to Madrid in 2020.",
    created_at: "2026-04-19T10:00:00Z",
    is_active: true,
    updated_at: null,
    ...overrides,
  };
}

function mockEndpoints(entries: KnowledgeEntry[], influencers = [makeInfluencer()]) {
  mockApiFetch.mockImplementation((path: string) =>
    path.startsWith("/influencers")
      ? Promise.resolve(influencers)
      : Promise.resolve(entries)
  );
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

    const { container } = render(<KnowledgePage />);

    expect(skeleton(container)).toBeInTheDocument();
  });

  it("clears the skeleton once entries arrive", async () => {
    mockEndpoints([makeEntry()]);

    const { container } = render(<KnowledgePage />);

    await waitFor(() => expect(skeleton(container)).not.toBeInTheDocument());
    expect(screen.getByText(/Born in CDMX/)).toBeInTheDocument();
  });

  it("clears the skeleton on an empty knowledge base", async () => {
    mockEndpoints([]);

    render(<KnowledgePage />);

    expect(await screen.findByText("No entries in the knowledge base")).toBeInTheDocument();
  });

  it("clears the skeleton when the fetch fails", async () => {
    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : Promise.reject(new Error("knowledge is down"))
    );

    const { container } = render(<KnowledgePage />);

    await waitFor(() => expect(screen.getByText("knowledge is down")).toBeInTheDocument());
    expect(skeleton(container)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe("filtering", () => {
  it("requests all entries by default", async () => {
    mockEndpoints([makeEntry()]);

    render(<KnowledgePage />);

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/knowledge/", { token: "tok" })
    );
  });

  it("scopes the request to the selected influencer", async () => {
    mockEndpoints([makeEntry()]);

    const { container } = render(<KnowledgePage />);
    await waitFor(() => expect(skeleton(container)).not.toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/knowledge/?influencer_id=inf-1", {
        token: "tok",
      })
    );
  });

  it("shows the skeleton again while the new filter loads", async () => {
    mockEndpoints([makeEntry()]);

    const { container } = render(<KnowledgePage />);
    await waitFor(() => expect(skeleton(container)).not.toBeInTheDocument());

    mockApiFetch.mockImplementation((path: string) =>
      path.startsWith("/influencers")
        ? Promise.resolve([makeInfluencer()])
        : new Promise(() => {})
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "inf-1");

    expect(skeleton(container)).toBeInTheDocument();
  });
});
