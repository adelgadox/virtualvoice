"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import KnowledgeEntryRow from "@/components/knowledge/KnowledgeEntryRow";
import KnowledgeEntryForm from "@/components/knowledge/KnowledgeEntryForm";
import type { Influencer, KnowledgeEntry } from "@/types/api";

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; entry: KnowledgeEntry };

export default function KnowledgePage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });

  // Load influencers once
  useEffect(() => {
    if (!token) return;
    apiFetch<Influencer[]>("/influencers/", { token }).then((data) => {
      setInfluencers(data);
    });
  }, [token]);

  // Load entries when filter changes
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = selectedInfluencer !== "all" ? `?influencer_id=${selectedInfluencer}` : "";
    apiFetch<KnowledgeEntry[]>(`/knowledge/${params}`, { token })
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, selectedInfluencer]);

  function handleSaved(saved: KnowledgeEntry) {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      return exists
        ? prev.map((e) => (e.id === saved.id ? saved : e))
        : [saved, ...prev];
    });
    setModal({ type: "closed" });
  }

  function handleDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // Group entries by influencer
  const grouped = influencers.reduce<Record<string, KnowledgeEntry[]>>((acc, inf) => {
    const infEntries = entries.filter((e) => e.influencer_id === inf.id);
    if (infEntries.length > 0) acc[inf.id] = infEntries;
    return acc;
  }, {});

  // Entries with unknown influencer (shouldn't happen, but safe fallback)
  const knownIds = new Set(influencers.map((i) => i.id));
  const ungrouped = entries.filter((e) => !knownIds.has(e.influencer_id));

  const defaultInfluencerId =
    selectedInfluencer !== "all" ? selectedInfluencer : influencers[0]?.id;

  // If there are no influencers yet, skip the API error and show guidance
  const noInfluencers = !loading && influencers.length === 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Knowledge Base</h1>
            {!loading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {influencers.length > 0 && (
              <select
                value={selectedInfluencer}
                onChange={(e) => setSelectedInfluencer(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                <option value="all">All influencers</option>
                {influencers.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setModal({ type: "create" })}
              disabled={influencers.length === 0}
              className="flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New entry
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4 mb-3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Error — only shown when influencers exist (otherwise show guidance below) */}
        {error && !loading && !noInfluencers && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load entries</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
          </div>
        )}

        {/* No influencers guidance */}
        {noInfluencers && (
          <div className="text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No knowledge entries yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Go to <span className="font-medium text-brand">Influencers</span> and create one first
            </p>
          </div>
        )}

        {/* Empty state — influencers exist but no entries */}
        {!loading && !error && !noInfluencers && entries.length === 0 && (
          <div className="text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No entries in the knowledge base</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first entry using the button above</p>
          </div>
        )}

        {/* Grouped by influencer */}
        {!loading && !error && Object.entries(grouped).map(([infId, infEntries]) => {
          const inf = influencers.find((i) => i.id === infId);
          return (
            <div key={infId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {inf?.name ?? "Influencer"}
                  </span>
                  <span className="text-xs text-gray-400">{infEntries.length} {infEntries.length === 1 ? "entry" : "entries"}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedInfluencer(infId);
                    setModal({ type: "create" });
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="px-5 divide-y divide-gray-100 dark:divide-gray-800">
                {infEntries.map((entry) => (
                  <KnowledgeEntryRow
                    key={entry.id}
                    entry={entry}
                    token={token ?? ""}
                    onEdit={(e) => setModal({ type: "edit", entry: e })}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Ungrouped fallback */}
        {!loading && ungrouped.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-500">No influencer</span>
            </div>
            <div className="px-5">
              {ungrouped.map((entry) => (
                <KnowledgeEntryRow
                  key={entry.id}
                  entry={entry}
                  token={token ?? ""}
                  onEdit={(e) => setModal({ type: "edit", entry: e })}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.type !== "closed" && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal({ type: "closed" })} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {modal.type === "create" ? "New entry" : "Edit entry"}
              </h2>
            </div>
            <div className="px-6 pb-6 pt-4">
              <KnowledgeEntryForm
                entry={modal.type === "edit" ? modal.entry : undefined}
                influencers={influencers}
                defaultInfluencerId={defaultInfluencerId}
                token={token}
                onSaved={handleSaved}
                onCancel={() => setModal({ type: "closed" })}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
