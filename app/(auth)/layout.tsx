import { AppHeader } from "@/components/ui/AppHeader";

// Public screens (Member 1): logo only, no bottom navigation.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <AppHeader minimal />
      <main className="flex flex-1 flex-col px-4 pt-4 pb-8">{children}</main>
    </div>
  );
}
