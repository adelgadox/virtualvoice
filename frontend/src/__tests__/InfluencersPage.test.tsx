/**
 * Covers the OAuth-return refactor on the influencers page.
 *
 * The redirect params used to be read in an effect that pushed `toast` and
 * `modal` state. They are now read once through a lazy useState initializer,
 * and the accounts modal is derived from the influencer list as it arrives.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InfluencersPage from "@/app/dashboard/influencers/page";
import type { Influencer, SocialAccount } from "@/types/api";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { accessToken: "tok" } }),
}));

let searchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

// The page's child components pull in heavier trees than these tests need.
jest.mock("@/components/influencers/InfluencerForm", () => ({
  __esModule: true,
  default: () => <div data-testid="influencer-form" />,
}));
jest.mock("@/components/influencers/InfluencerOnboarding", () => ({
  __esModule: true,
  default: () => <div data-testid="influencer-onboarding" />,
}));
jest.mock("@/components/influencers/SocialAccountsList", () => ({
  __esModule: true,
  default: ({ influencerId }: { influencerId: string }) => (
    <div data-testid="social-accounts-list">{influencerId}</div>
  ),
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

/** The page fetches influencers and social accounts together via Promise.all. */
function mockPageData(influencers: Influencer[], accounts: SocialAccount[] = []) {
  mockApiFetch.mockImplementation((path: string) =>
    path.startsWith("/influencers")
      ? Promise.resolve(influencers)
      : Promise.resolve(accounts)
  );
}

const replaceState = jest.fn();

beforeEach(() => {
  mockApiFetch.mockReset();
  replaceState.mockReset();
  searchParams = new URLSearchParams();
  window.history.replaceState = replaceState;
});

// ---------------------------------------------------------------------------
// Baseline — no OAuth params
// ---------------------------------------------------------------------------

describe("without OAuth params", () => {
  it("renders the influencer list and no toast", async () => {
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    expect(await screen.findByText("Luna García")).toBeInTheDocument();
    expect(screen.queryByText(/Instagram account connected/)).not.toBeInTheDocument();
  });

  it("leaves the URL alone", async () => {
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await screen.findByText("Luna García");
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("does not open a modal on its own", async () => {
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await screen.findByText("Luna García");
    expect(screen.queryByTestId("social-accounts-list")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OAuth success
// ---------------------------------------------------------------------------

describe("OAuth success", () => {
  it("shows the success toast on the first render, before data loads", () => {
    searchParams = new URLSearchParams("oauth_success=true");
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    render(<InfluencersPage />);

    expect(screen.getByText("Instagram account connected successfully")).toBeInTheDocument();
  });

  it("strips the consumed params from the URL", async () => {
    searchParams = new URLSearchParams("oauth_success=true");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await waitFor(() =>
      expect(replaceState).toHaveBeenCalledWith({}, "", "/dashboard/influencers")
    );
  });

  it("opens the accounts modal once the named influencer arrives", async () => {
    searchParams = new URLSearchParams("oauth_success=true&influencer_id=inf-1");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    const list = await screen.findByTestId("social-accounts-list");
    expect(list).toHaveTextContent("inf-1");
  });

  it("opens no modal when influencer_id is absent", async () => {
    searchParams = new URLSearchParams("oauth_success=true");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await screen.findByText("Luna García");
    expect(screen.queryByTestId("social-accounts-list")).not.toBeInTheDocument();
  });

  it("opens no modal when influencer_id matches nothing", async () => {
    searchParams = new URLSearchParams("oauth_success=true&influencer_id=ghost");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await screen.findByText("Luna García");
    expect(screen.queryByTestId("social-accounts-list")).not.toBeInTheDocument();
  });

  it("does not reopen the modal after it is closed", async () => {
    searchParams = new URLSearchParams("oauth_success=true&influencer_id=inf-1");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);
    await screen.findByTestId("social-accounts-list");

    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() =>
      expect(screen.queryByTestId("social-accounts-list")).not.toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// OAuth failure
// ---------------------------------------------------------------------------

describe("OAuth failure", () => {
  it("maps a known error code to its message", () => {
    searchParams = new URLSearchParams("oauth_error=no_instagram_account");
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    render(<InfluencersPage />);

    expect(
      screen.getByText("No Instagram Business account found linked to your Facebook pages")
    ).toBeInTheDocument();
  });

  it("falls back to a generic message for an unknown code", () => {
    searchParams = new URLSearchParams("oauth_error=something_new");
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    render(<InfluencersPage />);

    expect(
      screen.getByText("An unexpected error occurred. Please try again.")
    ).toBeInTheDocument();
  });

  it("strips the consumed params from the URL", async () => {
    searchParams = new URLSearchParams("oauth_error=invalid_state");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await waitFor(() =>
      expect(replaceState).toHaveBeenCalledWith({}, "", "/dashboard/influencers")
    );
  });

  it("opens no modal", async () => {
    searchParams = new URLSearchParams("oauth_error=invalid_state");
    mockPageData([makeInfluencer()]);

    render(<InfluencersPage />);

    await screen.findByText("Luna García");
    expect(screen.queryByTestId("social-accounts-list")).not.toBeInTheDocument();
  });
});
