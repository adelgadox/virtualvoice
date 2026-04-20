"use client";

import type { Influencer } from "@/types/api";

interface InfluencerCardProps {
  influencer: Influencer;
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

export default function InfluencerCard({ influencer, onEdit, onManageAccounts }: InfluencerCardProps) {
  const provider = influencer.llm_provider
    ? (PROVIDER_LABELS[influencer.llm_provider] ?? influencer.llm_provider)
    : "Default";

  const promptPreview = influencer.system_prompt_core
    ? influencer.system_prompt_core.slice(0, 120) + (influencer.system_prompt_core.length > 120 ? "…" : "")
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
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
              {influencer.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono">/{influencer.slug}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onManageAccounts && (
            <button
              onClick={() => onManageAccounts(influencer)}
              className="text-xs text-gray-400 hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-violet-950"
              title="Gestionar redes sociales"
            >
              Redes
            </button>
          )}
          <button
            onClick={() => onEdit(influencer)}
            className="text-xs text-gray-400 hover:text-brand transition-colors px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-violet-950"
          >
            Editar
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
