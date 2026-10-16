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

// Signed-in screens: mobile-width column centred on desktop, header + bottom nav.
// Access is enforced in proxy.ts; this layout only reads the session for the avatar.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <AppHeader initials={initialsOf(session?.user?.name)} />
      <main className="flex-1 px-4 pt-2 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
