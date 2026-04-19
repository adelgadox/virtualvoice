import { auth } from "@/../auth";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Welcome{name ? `, ${name}` : ""}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Select a module from the sidebar to get started.
      </p>
    </div>
  );
}
