import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.accessToken) redirect("/login");

  const email = session.user?.email ?? "";
  const role = session.role ?? "user";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between">
          <span className="text-sm font-bold text-brand">VirtualVoice</span>
          <span className="text-sm text-gray-500 hidden sm:block">{email}</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar email={email} role={role} />
        <main className="flex-1 overflow-y-auto px-4 py-8 pb-24 md:pb-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
