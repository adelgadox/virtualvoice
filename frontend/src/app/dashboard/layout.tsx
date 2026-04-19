import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import { signOut } from "@/../auth";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Cola de aprobación", href: "/dashboard/queue" },
  { label: "Influencers", href: "/dashboard/influencers" },
  { label: "Knowledge Base", href: "/dashboard/knowledge" },
  { label: "Historial", href: "/dashboard/history" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-sm font-bold text-gray-900">VirtualVoice</span>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">
            {session.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
