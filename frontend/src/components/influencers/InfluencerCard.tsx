"use client";

import type { Influencer } from "@/types/api";

interface InfluencerCardProps {
  influencer: Influencer;
  profilePictureUrl?: string | null;
  instagramUsername?: string | null;
  onEdit: (influencer: Influencer) => void;
  onManageAccounts?: (influencer: Influencer) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  groq: "Groq",
  mistral: "Mistral",
  ollama: "Ollama",
};

export default function InfluencerCard({ influencer, profilePictureUrl, instagramUsername, onEdit, onManageAccounts }: InfluencerCardProps) {
  const provider = influencer.llm_provider
    ? (PROVIDER_LABELS[influencer.llm_provider] ?? influencer.llm_provider)
    : "Default";

  const promptPreview = influencer.system_prompt_core
    ? influencer.system_prompt_core.slice(0, 120) + (influencer.system_prompt_core.length > 120 ? "…" : "")
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt={influencer.name}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shrink-0 text-white font-semibold text-sm">
              {influencer.name.charAt(0).toUpperCase()}
            </div>
          )}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {influencer.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                influencer.is_active
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              }`}
            >
              {influencer.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 font-mono">/{influencer.slug}</p>
            {instagramUsername && (
              <span className="flex items-center gap-1 text-xs text-pink-500 dark:text-pink-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                @{instagramUsername}
              </span>
            )}
          </div>
        </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onManageAccounts && (
            <button
              onClick={() => onManageAccounts(influencer)}
              className="text-xs text-gray-400 hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-violet-950"
              title="Manage social accounts"
            >
              Accounts
            </button>
          )}
          <button
            onClick={() => onEdit(influencer)}
            className="text-xs text-gray-400 hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-violet-950"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">LLM:</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {provider}
        </span>
      </div>

      {promptPreview && (
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2">
          {promptPreview}
        </p>
      )}
    </div>
  );
}
