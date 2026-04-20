"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Influencer } from "@/types/api";

const LLM_PROVIDERS = [
  { value: "", label: "Default (from env)" },
  { value: "gemini", label: "Gemini" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "groq", label: "Groq" },
  { value: "mistral", label: "Mistral" },
  { value: "ollama", label: "Ollama (local)" },
];

const PROMPT_MAX = 4000;

interface InfluencerFormProps {
  influencer?: Influencer;
  token: string;
  onSaved: (influencer: Influencer) => void;
  onCancel: () => void;
}

export default function InfluencerForm({ influencer, token, onSaved, onCancel }: InfluencerFormProps) {
  const isEdit = Boolean(influencer);

  const [name, setName] = useState(influencer?.name ?? "");
  const [slug, setSlug] = useState(influencer?.slug ?? "");
  const [llmProvider, setLlmProvider] = useState(influencer?.llm_provider ?? "deepseek");
  const [prompt, setPrompt] = useState(influencer?.system_prompt_core ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!isEdit) {
      setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let saved: Influencer;
      if (isEdit && influencer) {
        saved = await apiFetch<Influencer>(`/influencers/${influencer.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify({
            name,
            llm_provider: llmProvider || null,
            system_prompt_core: prompt,
          }),
        });
      } else {
        saved = await apiFetch<Influencer>("/influencers/", {
          method: "POST",
          token,
          body: JSON.stringify({
            name,
            slug,
            llm_provider: llmProvider || null,
            system_prompt_core: prompt,
          }),
        });
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const promptChars = prompt.length;
  const promptNearLimit = promptChars > PROMPT_MAX * 0.85;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Nombre
        </label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="Ej: Luna García"
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>

      {/* Slug (only on create) */}
      {!isEdit && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Slug
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            placeholder="luna-garcia"
            pattern="[a-z0-9-]+"
            title="Solo minúsculas, números y guiones"
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/40 font-mono"
          />
          <p className="text-xs text-gray-400">Solo minúsculas, números y guiones. No se puede cambiar después.</p>
        </div>
      )}

      {/* LLM Provider */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          LLM Provider
        </label>
        <select
          value={llmProvider}
          onChange={(e) => setLlmProvider(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          {LLM_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* System Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            System Prompt
          </label>
          <span className={`text-xs tabular-nums ${promptNearLimit ? "text-amber-500" : "text-gray-400"}`}>
            {promptChars.toLocaleString()} / {PROMPT_MAX.toLocaleString()}
          </span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={10}
          maxLength={PROMPT_MAX}
          placeholder="Eres Luna García, una influencer de lifestyle en CDMX. Respondes siempre en español, con tono cercano y auténtico..."
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-brand/40 font-mono leading-relaxed"
        />
        <p className="text-xs text-gray-400">
          Define la personalidad, tono y restricciones del influencer. Este prompt se inyecta en cada respuesta generada.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear influencer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
