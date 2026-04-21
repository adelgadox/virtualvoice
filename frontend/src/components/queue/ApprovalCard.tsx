"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PendingResponse } from "@/types/api";

interface ApprovalCardProps {
  response: PendingResponse;
  influencerName: string;
  token: string;
  approvedBy: string;
  onDone: (id: string) => void;
}

export default function ApprovalCard({
  response,
  influencerName,
  token,
  approvedBy,
  onDone,
}: ApprovalCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(response.suggested_text);
  const [loading, setLoading] = useState<"approve" | "ignore" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regeneratedText, setRegeneratedText] = useState<string | null>(null);

  const currentText = regeneratedText ?? response.suggested_text;

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const finalText = editing ? editText : (regeneratedText ?? undefined);
      await apiFetch(`/responses/${response.id}/approve`, {
        method: "POST",
        token,
        body: JSON.stringify({
          approved_by: approvedBy,
          final_text: finalText ?? null,
        }),
      });
      onDone(response.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(null);
    }
  }

  async function handleIgnore() {
    setLoading("ignore");
    setError(null);
    try {
      await apiFetch(`/responses/${response.id}/ignore`, {
        method: "POST",
        token,
      });
      onDone(response.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to ignore");
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerate() {
    setLoading("regenerate");
    setError(null);
    setEditing(false);
    try {
      const updated = await apiFetch<PendingResponse>(`/responses/${response.id}/regenerate`, {
        method: "POST",
        token,
      });
      setRegeneratedText(updated.suggested_text);
      setEditText(updated.suggested_text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setLoading(null);
    }
  }

  const isLoading = loading !== null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-brand bg-brand-50 dark:bg-violet-950 dark:text-violet-300 px-2.5 py-1 rounded-full">
          {influencerName}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(response.created_at).toLocaleString()}
        </span>
      </div>

      {/* Comment */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Received comment
          {response.comment_author && (
            <span className="ml-1 normal-case font-normal text-gray-400">
              · @{response.comment_author}
            </span>
          )}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
          {response.comment_content ?? "—"}
        </p>
      </div>

      {/* Suggested response */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Suggested response
            {regeneratedText && (
              <span className="ml-2 text-brand normal-case font-normal">(regenerated)</span>
            )}
          </p>
          {!editing && (
            <button
              onClick={() => {
                setEditText(currentText);
                setEditing(true);
              }}
              disabled={isLoading}
              className="text-xs text-gray-400 hover:text-brand transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full text-sm rounded-lg border border-brand px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel edit
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
            {currentText}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 min-w-[100px] bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>

        <button
          onClick={handleRegenerate}
          disabled={isLoading}
          className="flex-1 min-w-[100px] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading === "regenerate" ? "Generating…" : "Regenerate"}
        </button>

        <button
          onClick={handleIgnore}
          disabled={isLoading}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-2 disabled:opacity-50"
        >
          {loading === "ignore" ? "…" : "Ignore"}
        </button>
      </div>
    </div>
  );
}
