import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KnowledgeEntryRow from "@/components/knowledge/KnowledgeEntryRow";
import type { KnowledgeEntry } from "@/types/api";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

const baseEntry: KnowledgeEntry = {
  id: "entry-1",
  influencer_id: "inf-1",
  category: "biography",
  content: "Luna grew up in Mexico City and started her channel in 2020.",
  is_active: true,
  created_at: "2026-04-19T10:00:00Z",
  updated_at: null,
};

describe("KnowledgeEntryRow", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("renders category badge with correct label", () => {
    render(
      <KnowledgeEntryRow entry={baseEntry} token="tok" onEdit={jest.fn()} onDeleted={jest.fn()} />
    );
    expect(screen.getByText("Biography")).toBeInTheDocument();
  });

  it("renders content text", () => {
    render(
      <KnowledgeEntryRow entry={baseEntry} token="tok" onEdit={jest.fn()} onDeleted={jest.fn()} />
    );
    expect(screen.getByText(baseEntry.content)).toBeInTheDocument();
  });

  it("calls onEdit when Edit is clicked", () => {
    const onEdit = jest.fn();
    render(
      <KnowledgeEntryRow entry={baseEntry} token="tok" onEdit={onEdit} onDeleted={jest.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(onEdit).toHaveBeenCalledWith(baseEntry);
  });

  it("truncates long content and shows Show more button", () => {
    const longContent = "A".repeat(200);
    render(
      <KnowledgeEntryRow
        entry={{ ...baseEntry, content: longContent }}
        token="tok"
        onEdit={jest.fn()}
        onDeleted={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /show more/i })).toBeInTheDocument();
  });

  it("expands content on Show more click", async () => {
    const longContent = "B".repeat(200);
    render(
      <KnowledgeEntryRow
        entry={{ ...baseEntry, content: longContent }}
        token="tok"
        onEdit={jest.fn()}
        onDeleted={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
  });

  it("calls apiFetch DELETE and onDeleted after confirm", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    mockApiFetch.mockResolvedValueOnce(undefined);
    const onDeleted = jest.fn();

    render(
      <KnowledgeEntryRow entry={baseEntry} token="tok" onEdit={jest.fn()} onDeleted={onDeleted} />
    );
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/knowledge/entry-1",
        expect.objectContaining({ method: "DELETE" })
      );
      expect(onDeleted).toHaveBeenCalledWith("entry-1");
    });
  });

  it("does NOT delete when confirm is cancelled", async () => {
    window.confirm = jest.fn().mockReturnValue(false);
    const onDeleted = jest.fn();

    render(
      <KnowledgeEntryRow entry={baseEntry} token="tok" onEdit={jest.fn()} onDeleted={onDeleted} />
    );
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
