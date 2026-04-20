"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { SocialAccount } from "@/types/api";

interface Props {
  influencerId: string;
  token: string;
}

export default function SocialAccountsList({ influencerId, token }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<SocialAccount[]>(
        `/social-accounts/?influencer_id=${influencerId}`,
        { token }
      );
      setAccounts(data);
    } catch {
      setError("Error al cargar cuentas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [influencerId]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/social-accounts/instagram/authorize?influencer_id=${influencerId}`,
        { token }
      );
      window.location.href = url;
    } catch {
      setError("No se pudo iniciar la conexión con Instagram");
      setConnecting(false);
    }
  }

  async function handleDisconnect(accountId: string) {
    setDisconnecting(accountId);
    try {
      await apiFetch(`/social-accounts/${accountId}`, { token, method: "DELETE" });
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {
      setError("Error al desconectar la cuenta");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Cuentas conectadas
        </h3>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          {connecting ? "Conectando..." : "Conectar Instagram"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {loading ? (
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      ) : accounts.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          No hay cuentas conectadas
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  @{account.username ?? account.account_id}
                </span>
                <span className="text-xs text-gray-400 capitalize">{account.platform}</span>
              </div>
              <button
                onClick={() => handleDisconnect(account.id)}
                disabled={disconnecting === account.id}
                className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {disconnecting === account.id ? "..." : "Desconectar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
