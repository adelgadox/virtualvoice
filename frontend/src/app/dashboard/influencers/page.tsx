"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import InfluencerCard from "@/components/influencers/InfluencerCard";
import InfluencerForm from "@/components/influencers/InfluencerForm";
import type { Influencer } from "@/types/api";

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; influencer: Influencer };

export default function InfluencersPage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });

  useEffect(() => {
    if (!token) return;
    apiFetch<Influencer[]>("/influencers/", { token })
      .then(setInfluencers)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  function handleSaved(saved: Influencer) {
    setInfluencers((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists
        ? prev.map((i) => (i.id === saved.id ? saved : i))
        : [...prev, saved];
    });
    setModal({ type: "closed" });
  }

  const activeCount = influencers.filter((i) => i.is_active).length;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Influencers</h1>
            {!loading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {activeCount} activo{activeCount !== 1 ? "s" : ""} · {influencers.length} total
              </p>
            )}
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-12" />
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && influencers.length === 0 && (
          <div className="text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No hay influencers todavía</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Crea el primero para empezar</p>
          </div>
        )}

        {/* List */}
        {!loading && influencers.map((inf) => (
          <InfluencerCard
            key={inf.id}
            influencer={inf}
            onEdit={(i) => setModal({ type: "edit", influencer: i })}
          />
        ))}
      </div>

      {/* Modal */}
      {modal.type !== "closed" && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal({ type: "closed" })} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {modal.type === "create" ? "Nuevo influencer" : `Editar · ${modal.influencer.name}`}
              </h2>
            </div>
            <div className="px-6 pb-6 pt-4">
              <InfluencerForm
                influencer={modal.type === "edit" ? modal.influencer : undefined}
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
