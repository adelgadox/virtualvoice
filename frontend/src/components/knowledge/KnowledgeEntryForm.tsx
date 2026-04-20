"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { KnowledgeEntry, Influencer } from "@/types/api";

export const CATEGORIES = [
  { value: "biography", label: "Biografía" },
  { value: "opinions", label: "Opiniones" },
  { value: "voice_examples", label: "Ejemplos de voz" },
  { value: "off_limits", label: "Temas prohibidos" },
  { value: "faq", label: "FAQ" },
  { value: "brand_deals", label: "Marcas y colaboraciones" },
  { value: "other", label: "Otro" },
];

interface KnowledgeEntryFormProps {
  entry?: KnowledgeEntry;
  influencers: Influencer[];
  defaultInfluencerId?: string;
  token: string;
  onSaved: (entry: KnowledgeEntry) => void;
  onCancel: () => void;
}

export default function KnowledgeEntryForm({
  entry,
  influencers,
  defaultInfluencerId,
  token,
  onSaved,
  onCancel,
}: KnowledgeEntryFormProps) {
  const isEdit = Boolean(entry);

  const [influencerId, setInfluencerId] = useState(
    entry?.influencer_id ?? defaultInfluencerId ?? (influencers[0]?.id ?? "")
  );
  const [category, setCategory] = useState(entry?.category ?? "biography");
  const [content, setContent] = useState(entry?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let saved: KnowledgeEntry;
      if (isEdit && entry) {
        saved = await apiFetch<KnowledgeEntry>(`/knowledge/${entry.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify({ category, content }),
        });
      } else {
        saved = await apiFetch<KnowledgeEntry>("/knowledge/", {
          method: "POST",
          token,
          body: JSON.stringify({ influencer_id: influencerId, category, content }),
        });
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Influencer selector (only on create) */}
      {!isEdit && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Influencer
          </label>
          <select
            value={influencerId}
            onChange={(e) => setInfluencerId(e.target.value)}
            required
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            {influencers.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Categoría
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Contenido
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={5}
          placeholder="Escribe el fragmento de conocimiento aquí…"
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-brand/40 leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar entrada"}
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
