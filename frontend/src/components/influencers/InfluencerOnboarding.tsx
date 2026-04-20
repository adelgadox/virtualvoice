"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import SocialAccountsList from "@/components/influencers/SocialAccountsList";
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

interface Props {
  token: string;
  onDone: (influencer: Influencer) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

export default function InfluencerOnboarding({ token, onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [influencer, setInfluencer] = useState<Influencer | null>(null);

  // Step 1 state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving1, setSaving1] = useState(false);
  const [error1, setError1] = useState<string | null>(null);

  // Step 3 state
  const [llmProvider, setLlmProvider] = useState("deepseek");
  const [prompt, setPrompt] = useState("");
  const [saving3, setSaving3] = useState(false);
  const [error3, setError3] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setSaving1(true);
    setError1(null);
    try {
      const saved = await apiFetch<Influencer>("/influencers/", {
        method: "POST",
        token,
        body: JSON.stringify({ name, slug, system_prompt_core: "" }),
      });
      setInfluencer(saved);
      setStep(2);
    } catch (err: unknown) {
      setError1(err instanceof Error ? err.message : "Error al crear el influencer");
    } finally {
      setSaving1(false);
    }
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    if (!influencer) return;
    setSaving3(true);
    setError3(null);
    try {
      const saved = await apiFetch<Influencer>(`/influencers/${influencer.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          system_prompt_core: prompt,
          llm_provider: llmProvider || null,
        }),
      });
      onDone(saved);
    } catch (err: unknown) {
      setError3(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving3(false);
    }
  }

  const promptChars = prompt.length;
  const promptNearLimit = promptChars > PROMPT_MAX * 0.85;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              step === s
                ? "bg-brand text-white"
                : step > s
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800"
            }`}>
              {step > s ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : s}
            </div>
            <span className={`text-xs ${step === s ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400"}`}>
              {s === 1 ? "Datos básicos" : s === 2 ? "Conectar Instagram" : "Personalidad"}
            </span>
            {s < 3 && <div className="w-6 h-px bg-gray-200 dark:bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Name + slug */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Nombre del influencer
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Ej: Luna García"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
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
          {error1 && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error1}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving1}
              className="flex-1 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {saving1 ? "Creando…" : "Continuar"}
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Connect Instagram */}
      {step === 2 && influencer && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Conecta la cuenta de Instagram de <strong>{influencer.name}</strong> para recibir comentarios automáticamente.
          </p>
          <SocialAccountsList influencerId={influencer.id} token={token} />
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors"
            >
              Continuar
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      )}

      {/* Step 3: System prompt + LLM */}
      {step === 3 && influencer && (
        <form onSubmit={handleStep3} className="space-y-5">
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
              Define la personalidad, tono y restricciones. Este prompt se inyecta en cada respuesta generada.
            </p>
          </div>
          {error3 && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error3}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving3}
              className="flex-1 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {saving3 ? "Guardando…" : "Finalizar"}
            </button>
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Atrás
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
