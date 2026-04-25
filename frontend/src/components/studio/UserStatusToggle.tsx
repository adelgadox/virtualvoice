"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
  userRole: string;
  isSuperadmin: boolean;
  isCurrentUser: boolean;
}

export default function UserStatusToggle({
  userId,
  isActive,
  userRole,
  isSuperadmin,
  isCurrentUser,
}: UserStatusToggleProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Admins can't modify other admins/superadmins — only superadmin can
  const canToggle =
    !isCurrentUser &&
    session?.accessToken &&
    !(["admin", "superadmin"].includes(userRole) && !isSuperadmin);

  async function handleToggle() {
    if (!canToggle) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/studio/users/${userId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.accessToken}`,
          },
          body: JSON.stringify({ is_active: !isActive }),
        }
      );
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!canToggle) {
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isActive
            ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
            : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
        }`}
      >
        {isActive ? "active" : "suspended"}
      </span>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-opacity disabled:opacity-50 cursor-pointer ${
        isActive
          ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
          : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-green-100 dark:hover:bg-green-950 hover:text-green-700 dark:hover:text-green-300"
      }`}
    >
      {isActive ? "active" : "suspended"}
    </button>
  );
}
