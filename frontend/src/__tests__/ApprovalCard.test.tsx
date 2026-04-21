import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApprovalCard from "@/components/queue/ApprovalCard";
import type { PendingResponse } from "@/types/api";

// Mock apiFetch
jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = apiFetch as jest.Mock;

const baseResponse: PendingResponse = {
  id: "resp-1",
  comment_id: "comment-1",
  influencer_id: "inf-1",
  suggested_text: "Great question! Thanks for asking.",
  final_text: null,
  llm_provider_used: "gemini",
  status: "pending",
  approved_by: null,
  approved_at: null,
  published_at: null,
  created_at: "2026-04-19T10:00:00Z",
  comment_content: "What's your morning routine?",
  comment_author: "user123",
};

function renderCard(overrides: Partial<PendingResponse> = {}, onDone = jest.fn()) {
  return render(
    <ApprovalCard
      response={{ ...baseResponse, ...overrides }}
      influencerName="Luna García"
      token="test-token"
      onDone={onDone}
    />
  );
}

describe("ApprovalCard", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  describe("rendering", () => {
    it("shows influencer name badge", () => {
      renderCard();
      expect(screen.getByText("Luna García")).toBeInTheDocument();
    });

    it("shows comment content", () => {
      renderCard();
      expect(screen.getByText("What's your morning routine?")).toBeInTheDocument();
    });

    it("shows comment author", () => {
      renderCard();
      expect(screen.getByText(/@user123/)).toBeInTheDocument();
    });

    it("shows suggested text", () => {
      renderCard();
      expect(screen.getByText("Great question! Thanks for asking.")).toBeInTheDocument();
    });

    it("shows action buttons", () => {
      renderCard();
      expect(screen.getByRole("button", { name: /aprobar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /regenerar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ignorar/i })).toBeInTheDocument();
    });

    it("shows fallback dash when comment content is null", () => {
      renderCard({ comment_content: null, comment_author: null });
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  describe("approve action", () => {
    it("calls approve endpoint and invokes onDone on success", async () => {
      const onDone = jest.fn();
      mockApiFetch.mockResolvedValueOnce({});
      renderCard({}, onDone);

      await userEvent.click(screen.getByRole("button", { name: /aprobar/i }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/responses/resp-1/approve",
          expect.objectContaining({ method: "POST" })
        );
        expect(onDone).toHaveBeenCalledWith("resp-1");
      });
    });

    it("shows error message when approve fails", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("Network error"));
      renderCard();

      await userEvent.click(screen.getByRole("button", { name: /aprobar/i }));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows loading state while approving", async () => {
      mockApiFetch.mockImplementation(() => new Promise(() => {})); // never resolves
      renderCard();

      fireEvent.click(screen.getByRole("button", { name: /aprobar/i }));

      expect(screen.getByRole("button", { name: /aprobando/i })).toBeDisabled();
    });
  });

  describe("ignore action", () => {
    it("calls ignore endpoint and invokes onDone", async () => {
      const onDone = jest.fn();
      mockApiFetch.mockResolvedValueOnce({});
      renderCard({}, onDone);

      await userEvent.click(screen.getByRole("button", { name: /ignorar/i }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/responses/resp-1/ignore",
          expect.objectContaining({ method: "POST" })
        );
        expect(onDone).toHaveBeenCalledWith("resp-1");
      });
    });
  });

  describe("regenerate action", () => {
    it("updates suggested text with regenerated response", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ...baseResponse,
        suggested_text: "Regenerated response text!",
      });
      renderCard();

      await userEvent.click(screen.getByRole("button", { name: /regenerar/i }));

      await waitFor(() => {
        expect(screen.getByText("Regenerated response text!")).toBeInTheDocument();
        expect(screen.getByText(/regenerada/i)).toBeInTheDocument();
      });
    });
  });

  describe("inline edit", () => {
    it("shows textarea when clicking Editar", async () => {
      renderCard();

      await userEvent.click(screen.getByRole("button", { name: /^editar$/i }));

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancelar edición/i })).toBeInTheDocument();
    });

    it("sends edited text on approve", async () => {
      mockApiFetch.mockResolvedValueOnce({});
      renderCard();

      await userEvent.click(screen.getByRole("button", { name: /^editar$/i }));
      const textarea = screen.getByRole("textbox");
      await userEvent.clear(textarea);
      await userEvent.type(textarea, "My edited response");
      await userEvent.click(screen.getByRole("button", { name: /aprobar/i }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/responses/resp-1/approve",
          expect.objectContaining({
            body: expect.stringContaining("My edited response"),
          })
        );
      });
    });

    it("cancels edit and restores original text", async () => {
      renderCard();

      await userEvent.click(screen.getByRole("button", { name: /^editar$/i }));
      await userEvent.click(screen.getByRole("button", { name: /cancelar edición/i }));

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Great question! Thanks for asking.")).toBeInTheDocument();
    });
  });
});
