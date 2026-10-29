import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNav } from "@/components/ui/BottomNav";

function initialsOf(name?: string | null) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// Signed-in screens: responsive content width, header + adaptive navigation.
// Access is enforced in proxy.ts; this layout only reads the session for the avatar.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <AppHeader
        initials={initialsOf(session?.user?.name)}
        isAdmin={session?.user?.role === "ADMIN"}
      />
      <BottomNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 md:pb-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}
