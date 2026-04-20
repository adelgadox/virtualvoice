"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import InfluencerCard from "@/components/influencers/InfluencerCard";
import InfluencerForm from "@/components/influencers/InfluencerForm";
import InfluencerOnboarding from "@/components/influencers/InfluencerOnboarding";
import SocialAccountsList from "@/components/influencers/SocialAccountsList";
import type { Influencer, SocialAccount } from "@/types/api";

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; influencer: Influencer }
  | { type: "accounts"; influencer: Influencer };

export default function InfluencersPage() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;
  const searchParams = useSearchParams();

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Handle OAuth callback result
  useEffect(() => {
    const success = searchParams.get("oauth_success");
    const oauthError = searchParams.get("oauth_error");
    const influencerId = searchParams.get("influencer_id");

    if (success === "true") {
      setToast({ type: "success", message: "Cuenta de Instagram conectada correctamente" });
      if (influencerId) {
        const inf = influencers.find((i) => i.id === influencerId);
        if (inf) setModal({ type: "accounts", influencer: inf });
      }
      window.history.replaceState({}, "", "/dashboard/influencers");
    } else if (oauthError) {
      const messages: Record<string, string> = {
        no_instagram_account: "No se encontró cuenta Instagram Business vinculada a tus páginas de Facebook",
        token_exchange_failed: "Error al obtener el token. Intenta de nuevo.",
        invalid_state: "Error de seguridad en el flujo OAuth. Intenta de nuevo.",
        missing_params: "Respuesta incompleta de Meta. Intenta de nuevo.",
      };
      setToast({ type: "error", message: messages[oauthError] ?? `Error: ${oauthError}` });
      window.history.replaceState({}, "", "/dashboard/influencers");
    }
  }, [searchParams, influencers]);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<Influencer[]>("/influencers/", { token }),
      apiFetch<SocialAccount[]>("/social-accounts/", { token }),
    ])
      .then(([infs, accounts]) => {
        setInfluencers(infs);
        setSocialAccounts(accounts);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  function handleSaved(saved: Influencer) {
    setInfluencers((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved];
    });
    setModal({ type: "closed" });
  }

  const activeCount = influencers.filter((i) => i.is_active).length;

  return (
    <>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {toast.message}
          </div>
        )}

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
        {!loading && influencers.map((inf) => {
          const account = socialAccounts.find((a) => a.influencer_id === inf.id);
          return (
            <InfluencerCard
              key={inf.id}
              influencer={inf}
              profilePictureUrl={account?.profile_picture_url}
              instagramUsername={account?.username}
              onEdit={(i) => setModal({ type: "edit", influencer: i })}
              onManageAccounts={(i) => setModal({ type: "accounts", influencer: i })}
            />
          );
        })}
      </div>

      {/* Create modal — onboarding wizard */}
      {modal.type === "create" && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal({ type: "closed" })} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nuevo influencer</h2>
            </div>
            <div className="px-6 pb-6 pt-4">
              <InfluencerOnboarding
                token={token}
                onDone={handleSaved}
                onCancel={() => setModal({ type: "closed" })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal.type === "edit" && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal({ type: "closed" })} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Editar · {modal.influencer.name}
              </h2>
            </div>
            <div className="px-6 pb-6 pt-4">
              <InfluencerForm
                influencer={modal.influencer}
                token={token}
                onSaved={handleSaved}
                onCancel={() => setModal({ type: "closed" })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Social accounts modal */}
      {modal.type === "accounts" && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal({ type: "closed" })} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {modal.influencer.name} — Redes sociales
              </h2>
              <button onClick={() => setModal({ type: "closed" })} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 pt-4">
              <SocialAccountsList influencerId={modal.influencer.id} token={token} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
