"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import ApprovalCard from "@/components/queue/ApprovalCard";
import type { Influencer, PendingResponse } from "@/types/api";

const POLL_INTERVAL_MS = 30_000;

export default function QueuePage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const [responses, setResponses] = useState<PendingResponse[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [filterInfluencer, setFilterInfluencer] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = useCallback(async () => {
    if (!token) return;
    try {
      const params = filterInfluencer !== "all" ? `?influencer_id=${filterInfluencer}` : "";
      const data = await apiFetch<PendingResponse[]>(`/responses/pending${params}`, { token });
      setResponses(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar la cola");
    }
  }, [token, filterInfluencer]);

  // Fetch influencers once
  useEffect(() => {
    if (!token) return;
    apiFetch<Influencer[]>("/influencers/", { token })
      .then(setInfluencers)
      .catch(() => {/* non-critical */});
  }, [token]);

  // Fetch responses + polling
  useEffect(() => {
    setLoading(true);
    fetchResponses().finally(() => setLoading(false));
    const interval = setInterval(fetchResponses, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchResponses]);

  function handleDone(id: string) {
    setResponses((prev) => prev.filter((r) => r.id !== id));
  }

  const influencerMap = Object.fromEntries(influencers.map((i) => [i.id, i.name]));
  const approvedBy = session?.user?.email ?? "unknown";

  return (
    <div className="space-y-6">
      {/* Title + filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Cola de aprobación
          </h1>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {responses.length} {responses.length === 1 ? "respuesta pendiente" : "respuestas pendientes"}
            </p>
          )}
        </div>

        {influencers.length > 0 && (
          <select
            value={filterInfluencer}
            onChange={(e) => setFilterInfluencer(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="all">Todos los influencers</option>
            {influencers.map((inf) => (
              <option key={inf.id} value={inf.id}>
                {inf.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4 mb-4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && responses.length === 0 && (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No hay respuestas pendientes</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Se actualiza cada 30 segundos</p>
        </div>
      )}

      {!loading && responses.map((resp) => (
        <ApprovalCard
          key={resp.id}
          response={resp}
          influencerName={influencerMap[resp.influencer_id] ?? "Influencer"}
          token={token ?? ""}
          approvedBy={approvedBy}
          onDone={handleDone}
        />
      ))}
    </div>
  );
}
