import { auth } from "@/../auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">
        Bienvenido{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Selecciona un módulo desde el menú para comenzar.
      </p>
    </div>
  );
}
