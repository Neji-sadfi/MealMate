import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AuthToken } from "@/models/AuthToken";
import { Avatar } from "@/models/Avatar";
import { CoachMessage } from "@/models/CoachMessage";
import { User } from "@/models/User";

/**
 * Deletes the user and everything this module stores about them.
 * Other team modules (meal plans, shopping, sport...) must add their own cleanup here
 * when they are merged, so no orphan data is left behind.
 */
export async function deleteUserData(userId: Types.ObjectId): Promise<void> {
  await connectToDatabase();
  await Promise.all([
    CoachMessage.deleteMany({ userId }),
    AuthToken.deleteMany({ userId }),
    Avatar.deleteOne({ userId }),
  ]);
  await User.deleteOne({ _id: userId });
}
