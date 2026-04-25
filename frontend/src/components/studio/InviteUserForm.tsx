"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function InviteUserForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.accessToken) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/studio/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ email, role }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(`${email} invited. They can now sign in with Google SSO.`);
      setEmail("");
      setRole("user");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.detail ?? "Failed to invite user.");
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Invite user</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "admin")}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-dark disabled:opacity-60 transition-colors"
        >
          {loading ? "Inviting…" : "Invite"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-xs text-green-600 dark:text-green-400">{success}</p>
      )}

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        The user will be able to sign in using Google SSO with this email address.
      </p>
    </div>
  );
}
