import { AppHeader } from "@/components/ui/AppHeader";

// Public screens (Member 1): logo only, no bottom navigation.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <AppHeader minimal />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
