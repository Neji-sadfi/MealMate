import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { Avatar } from "@/models/Avatar";

const MAX_BYTES = 512 * 1024;

/** Checks the file's first bytes, so a renamed non-image file is refused. */
function imageTypeOf(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

// GET /api/users/me/avatar: the signed-in user's profile photo.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Not .lean(): a hydrated document gives `data` as a real Buffer (lean gives a BSON Binary).
  const avatar = await Avatar.findOne({ userId });
  if (!avatar) return NextResponse.json({ error: "No avatar" }, { status: 404 });
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.contentType,
      // The page adds ?v=<updatedAt> to the URL, so a new photo always gets a new URL.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

// PUT /api/users/me/avatar: multipart form with a "file" field (JPEG, PNG or WebP, max 512 KB).
export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "invalidFile" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = imageTypeOf(bytes);
  if (!contentType) return NextResponse.json({ error: "invalidFile" }, { status: 400 });

  const avatar = await Avatar.findOneAndUpdate(
    { userId },
    { $set: { data: bytes, contentType } },
    { upsert: true, returnDocument: "after", projection: { updatedAt: 1 } },
  );
  return NextResponse.json({ updatedAt: avatar?.updatedAt });
}

// DELETE /api/users/me/avatar: back to the initials.
export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await Avatar.deleteOne({ userId });
  return NextResponse.json({ ok: true });
}
