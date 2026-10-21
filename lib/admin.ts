import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";

export async function getCurrentAdminId(): Promise<Types.ObjectId | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (session?.user?.role !== "ADMIN" || !userId || !Types.ObjectId.isValid(userId)) {
    return null;
  }

  await connectToDatabase();
  return new Types.ObjectId(userId);
}
