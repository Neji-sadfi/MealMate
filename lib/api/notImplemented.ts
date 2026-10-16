import { NextResponse } from "next/server";

/** Placeholder response for API routes that a module owner has not built yet. */
export function notImplemented(owner: string, endpoint: string) {
  return NextResponse.json(
    { error: "Not implemented", todo: `${owner}: implement ${endpoint}` },
    { status: 501 },
  );
}
