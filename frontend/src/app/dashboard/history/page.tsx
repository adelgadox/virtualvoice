"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { Influencer, PendingResponse } from "@/types/api";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  edited: {
    label: "Edited",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
  ignored: {
    label: "Ignored",
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function HistoryCard({ response, influencerName }: { response: PendingResponse; influencerName: string }) {
  const statusCfg = STATUS_CONFIG[response.status] ?? {
    label: response.status,
    className: "bg-gray-100 text-gray-500",
  };

  const displayText = response.final_text ?? response.suggested_text;
  const wasEdited = response.status === "edited" && response.final_text && response.final_text !== response.suggested_text;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {influencerName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            {response.published_at && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                Published
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(response.approved_at ?? response.created_at)}
            {response.approved_by ? ` · ${response.approved_by}` : ""}
          </p>
        </div>
      </div>

      {/* Comment */}
      {response.comment_content && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {response.comment_author ? `@${response.comment_author}` : "Comment"}
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
            {response.comment_content}
          </p>
        </div>
      )}

      {/* Response text */}
      <div className="space-y-2">
        {wasEdited && (
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Original</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 line-through line-clamp-2">
              {response.suggested_text}
            </p>
          </div>
        )}
        <div>
          {wasEdited && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Edited</p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const [responses, setResponses] = useState<PendingResponse[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [filterInfluencer, setFilterInfluencer] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const params = filterInfluencer !== "all" ? `?influencer_id=${filterInfluencer}` : "";
      const data = await apiFetch<PendingResponse[]>(`/responses/history${params}`, { token });
      setResponses(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  }, [token, filterInfluencer]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Influencer[]>("/influencers/", { token })
      .then(setInfluencers)
      .catch(() => {/* non-critical */});
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchHistory().finally(() => setLoading(false));
  }, [fetchHistory]);

  const influencerMap = Object.fromEntries(influencers.map((i) => [i.id, i.name]));

  const statusCounts = responses.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Title + filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">History</h1>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {responses.length} {responses.length === 1 ? "response" : "responses"}
              {statusCounts.approved ? ` · ${statusCounts.approved} approved` : ""}
              {statusCounts.edited ? ` · ${statusCounts.edited} edited` : ""}
              {statusCounts.ignored ? ` · ${statusCounts.ignored} ignored` : ""}
            </p>
          )}
        </div>

        {influencers.length > 0 && (
          <select
            value={filterInfluencer}
            onChange={(e) => setFilterInfluencer(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="all">All influencers</option>
            {influencers.map((inf) => (
              <option key={inf.id} value={inf.id}>
                {inf.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-16" />
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load history</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && responses.length === 0 && (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No history yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Approved, edited, and ignored responses will appear here</p>
        </div>
      )}

      {/* List */}
      {!loading && !error && responses.map((resp) => (
        <HistoryCard
          key={resp.id}
          response={resp}
          influencerName={influencerMap[resp.influencer_id] ?? "Influencer"}
        />
      ))}
    </div>
  );
}
