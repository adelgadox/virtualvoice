"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface UserRoleSelectProps {
  userId: string;
  currentRole: string;
}

const ROLES = ["user", "admin", "superadmin"] as const;

const ROLE_STYLES: Record<string, string> = {
  superadmin: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
  admin: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  user: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

export default function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(role: string) {
    if (role === currentRole || !session?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/studio/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ role }),
        }
      );
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      defaultValue={currentRole}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer disabled:opacity-50 ${ROLE_STYLES[currentRole] ?? ROLE_STYLES.user}`}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
