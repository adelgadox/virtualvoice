import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)" }}
    >
      <div className="absolute top-5 left-5">
        <span className="text-white font-bold text-lg tracking-tight">VirtualVoice</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
