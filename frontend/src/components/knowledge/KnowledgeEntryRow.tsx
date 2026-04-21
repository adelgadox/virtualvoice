"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { CATEGORIES } from "./KnowledgeEntryForm";
import type { KnowledgeEntry } from "@/types/api";

interface KnowledgeEntryRowProps {
  entry: KnowledgeEntry;
  token: string;
  onEdit: (entry: KnowledgeEntry) => void;
  onDeleted: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  biography: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  opinions: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  voice_examples: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  off_limits: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  faq: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
  brand_deals: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  other: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function KnowledgeEntryRow({ entry, token, onEdit, onDeleted }: KnowledgeEntryRowProps) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const categoryLabel = CATEGORIES.find((c) => c.value === entry.category)?.label ?? entry.category;
  const colorClass = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.other;
  const isLong = entry.content.length > 140;
  const preview = isLong && !expanded ? entry.content.slice(0, 140) + "…" : entry.content;

  async function handleDelete() {
    if (!confirm("Delete this entry?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/knowledge/${entry.id}`, { method: "DELETE", token });
      onDeleted(entry.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Category badge */}
      <div className="pt-0.5 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${colorClass}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">
          {preview}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-brand hover:underline mt-1"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 shrink-0">
        <button
          onClick={() => onEdit(entry)}
          className="text-xs text-gray-400 hover:text-brand transition-colors p-1 rounded"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1 rounded disabled:opacity-50"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
