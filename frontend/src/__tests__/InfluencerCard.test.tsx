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

  it("shows Activo badge when is_active is true", () => {
    render(<InfluencerCard influencer={baseInfluencer} onEdit={jest.fn()} />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("shows Inactivo badge when is_active is false", () => {
    render(
      <InfluencerCard influencer={{ ...baseInfluencer, is_active: false }} onEdit={jest.fn()} />
    );
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
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

  it("calls onEdit with influencer when Editar is clicked", () => {
    const onEdit = jest.fn();
    render(<InfluencerCard influencer={baseInfluencer} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledWith(baseInfluencer);
  });
});
