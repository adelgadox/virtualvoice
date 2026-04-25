import { auth } from "@/../auth";
import type { StudioStats } from "@/types/api";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getStats(token: string): Promise<StudioStats | null> {
  const res = await fetch(`${API_URL}/studio/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function StudioPage() {
  const session = await auth();
  const stats = session?.accessToken ? await getStats(session.accessToken) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Studio Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform health at a glance.</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.total_users} />
          <StatCard label="Active Users" value={stats.active_users} />
          <StatCard label="Influencers" value={stats.total_influencers} />
          <StatCard label="Active Influencers" value={stats.active_influencers} />
        </div>
      ) : (
        <p className="text-sm text-red-500">Failed to load stats.</p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  );
}
