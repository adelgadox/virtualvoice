import { auth } from "@/../auth";
import type { StudioUser } from "@/types/api";
import UserRoleSelect from "@/components/studio/UserRoleSelect";
import UserStatusToggle from "@/components/studio/UserStatusToggle";
import InviteUserForm from "@/components/studio/InviteUserForm";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getUsers(token: string): Promise<StudioUser[]> {
  const res = await fetch(`${API_URL}/studio/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function StudioUsersPage() {
  const session = await auth();
  const users = session?.accessToken ? await getUsers(session.accessToken) : [];
  const isSuperadmin = session?.role === "superadmin";
  const currentUserId = (session as any)?.user?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Users</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{users.length} registered accounts.</p>
      </div>

      {isSuperadmin && <InviteUserForm />}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Provider</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{user.email}</p>
                  {user.full_name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.full_name}</p>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{user.auth_provider}</span>
                </td>
                <td className="px-4 py-3">
                  {isSuperadmin && user.id !== currentUserId ? (
                    <UserRoleSelect userId={user.id} currentRole={user.role} />
                  ) : (
                    <RoleBadge role={user.role} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <UserStatusToggle
                    userId={user.id}
                    isActive={user.is_active}
                    userRole={user.role}
                    isSuperadmin={isSuperadmin}
                    isCurrentUser={user.id === currentUserId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No users found.</div>
        )}
      </div>
    </div>
  );

}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    superadmin: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
    admin: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    user: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[role] ?? styles.user}`}>
      {role}
    </span>
  );
}
