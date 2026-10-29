// Skeleton shown while a signed-in screen loads. No text: it never needs a
// translation and it must not depend on the data that failed to load.
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-2/3 animate-pulse rounded-card bg-tint" />
      <div className="h-24 animate-pulse rounded-card bg-tint" />
      <div className="h-24 animate-pulse rounded-card bg-tint" />
      <div className="h-32 animate-pulse rounded-card bg-tint" />
    </div>
  );
}
