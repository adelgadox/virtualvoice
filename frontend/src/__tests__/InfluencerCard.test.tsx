import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InfluencerCard from "@/components/influencers/InfluencerCard";
import type { Influencer } from "@/types/api";

const baseInfluencer: Influencer = {
  id: "inf-1",
  name: "Luna García",
  slug: "luna-garcia",
  llm_provider: "gemini",
  system_prompt_core: "You are Luna, a lifestyle influencer from CDMX.",
  current_context: null,
  is_active: true,
  created_at: "2026-04-19T10:00:00Z",
  updated_at: null,
};

describe("InfluencerCard", () => {
  it("renders name and slug", () => {
    render(<InfluencerCard influencer={baseInfluencer} onEdit={jest.fn()} />);
    expect(screen.getByText("Luna García")).toBeInTheDocument();
    expect(screen.getByText("/luna-garcia")).toBeInTheDocument();
  });

  it("shows Active badge when is_active is true", () => {
    render(<InfluencerCard influencer={baseInfluencer} onEdit={jest.fn()} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows Inactive badge when is_active is false", () => {
    render(
      <InfluencerCard influencer={{ ...baseInfluencer, is_active: false }} onEdit={jest.fn()} />
    );
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows LLM provider label", () => {
    render(<InfluencerCard influencer={baseInfluencer} onEdit={jest.fn()} />);
    expect(screen.getByText("Gemini")).toBeInTheDocument();
  });

  it("shows Default when llm_provider is null", () => {
    render(
      <InfluencerCard influencer={{ ...baseInfluencer, llm_provider: null }} onEdit={jest.fn()} />
    );
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("truncates long system prompt to preview", () => {
    const longPrompt = "A".repeat(200);
    render(
      <InfluencerCard influencer={{ ...baseInfluencer, system_prompt_core: longPrompt }} onEdit={jest.fn()} />
    );
    const preview = screen.getByText(/A+…/);
    expect(preview.textContent!.length).toBeLessThan(200);
  });

  it("renders the initial fallback when there is no profile picture", () => {
    render(<InfluencerCard influencer={baseInfluencer} onEdit={jest.fn()} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("calls onEdit with influencer when Edit is clicked", () => {
    const onEdit = jest.fn();
    render(<InfluencerCard influencer={baseInfluencer} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(baseInfluencer);
  });
});

/**
 * The avatar goes through next/image with the Cloudinary loader. Two things
 * ride on that: Vercel's optimizer is never invoked (nothing billed), and the
 * image reaches the browser from res.cloudinary.com, which img-src allows —
 * a direct <img> to scontent-*.cdninstagram.com would be blocked.
 */
describe("InfluencerCard avatar", () => {
  const INSTAGRAM_URL =
    "https://scontent-mad1-1.cdninstagram.com/v/t51.2885-19/profile.jpg";

  function renderWithAvatar() {
    render(
      <InfluencerCard
        influencer={baseInfluencer}
        profilePictureUrl={INSTAGRAM_URL}
        onEdit={jest.fn()}
      />
    );
    return screen.getByRole("img", { name: "Luna García" });
  }

  it("uses the influencer name as alt text", () => {
    expect(renderWithAvatar()).toBeInTheDocument();
  });

  it("serves the image from Cloudinary, not Meta's CDN", () => {
    const src = renderWithAvatar().getAttribute("src") ?? "";

    expect(src.startsWith("https://res.cloudinary.com/")).toBe(true);
    expect(src.startsWith("https://scontent")).toBe(false);
  });

  it("never routes through Vercel's image optimizer", () => {
    const src = renderWithAvatar().getAttribute("src") ?? "";

    expect(src).not.toContain("/_next/image");
  });

  it("passes the original URL through to Cloudinary fetch", () => {
    const src = renderWithAvatar().getAttribute("src") ?? "";

    expect(src).toContain("/image/fetch/");
    expect(decodeURIComponent(src)).toContain(INSTAGRAM_URL);
  });

  it("offers a 2x candidate for retina screens", () => {
    const srcset = renderWithAvatar().getAttribute("srcset") ?? "";

    expect(srcset).toContain("w_40,h_40");
    expect(srcset).toContain("w_80,h_80");
    expect(srcset).toContain("2x");
  });

  it("reserves the 40px box so the card does not shift while loading", () => {
    const img = renderWithAvatar();

    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveAttribute("height", "40");
  });
});
