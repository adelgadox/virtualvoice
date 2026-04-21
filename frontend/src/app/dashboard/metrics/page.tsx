"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { InfluencerMetrics } from "@/types/api";

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400 w-6 text-right">{value}</span>
    </div>
  );
}

function MetricCard({ m }: { m: InfluencerMetrics }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{m.influencer_name}</h3>
          <p className="text-xs text-gray-400 font-mono">/{m.influencer_slug}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{m.total}</p>
          <p className="text-xs text-gray-400">responses</p>
        </div>
      </div>

      {/* Approval rate highlight */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{m.approval_rate}%</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">approved</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 tabular-nums">{m.edit_rate}%</p>
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">edited</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-gray-600 dark:text-gray-300 tabular-nums">{m.ignore_rate}%</p>
          <p className="text-xs text-gray-500 mt-0.5">ignored</p>
        </div>
      </div>

      {/* Breakdown bars */}
      {m.total > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Approved</p>
            <StatBar value={m.approved} max={m.total} color="bg-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Edited</p>
            <StatBar value={m.edited} max={m.total} color="bg-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Ignored</p>
            <StatBar value={m.ignored} max={m.total} color="bg-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Published on Meta</p>
            <StatBar value={m.published} max={m.total} color="bg-violet-500" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const [metrics, setMetrics] = useState<InfluencerMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<InfluencerMetrics[]>("/metrics/", { token })
      .then(setMetrics)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load metrics"))
      .finally(() => setLoading(false));
  }, [token]);

  const totals = metrics.reduce(
    (acc, m) => ({
      total: acc.total + m.total,
      approved: acc.approved + m.approved,
      edited: acc.edited + m.edited,
      ignored: acc.ignored + m.ignored,
      published: acc.published + m.published,
    }),
    { total: 0, approved: 0, edited: 0, ignored: 0, published: 0 },
  );

  const globalApprovalRate =
    totals.total > 0 ? Math.round(((totals.approved + totals.edited) / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Metrics</h1>
        {!loading && metrics.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totals.total} responses · {globalApprovalRate}% global approval rate
          </p>
        )}
      </div>

      {/* Global summary */}
      {!loading && totals.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Approved", value: totals.approved, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Edited", value: totals.edited, color: "text-blue-600 dark:text-blue-400" },
            { label: "Ignored", value: totals.ignored, color: "text-gray-500 dark:text-gray-400" },
            { label: "Published", value: totals.published, color: "text-violet-600 dark:text-violet-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center">
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-12" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load metrics</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && metrics.length === 0 && (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No data yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Metrics will appear once responses have been processed</p>
        </div>
      )}

      {/* Per-influencer cards */}
      {!loading && !error && metrics.map((m) => (
        <MetricCard key={m.influencer_id} m={m} />
      ))}
    </div>
  );
}
