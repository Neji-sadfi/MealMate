import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AuthToken } from "@/models/AuthToken";
import { Avatar } from "@/models/Avatar";
import { Budget } from "@/models/Budget";
import { CoachMessage } from "@/models/CoachMessage";
import { Favorite } from "@/models/Favorite";
import { ForumComment } from "@/models/ForumComment";
import { ForumLike } from "@/models/ForumLike";
import { ForumPost } from "@/models/ForumPost";
import { ForumReport } from "@/models/ForumReport";
import { Inventory } from "@/models/Inventory";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { Notification } from "@/models/Notification";
import { Recipe } from "@/models/Recipe";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import { SportPlan } from "@/models/SportPlan";
import { User } from "@/models/User";
import { WorkoutSession } from "@/models/WorkoutSession";

/** Removes the user's likes and comments from other people's posts, keeping the counters right. */
async function removeForumActivity(userId: Types.ObjectId, ownPosts: Types.ObjectId[]) {
  const [likes, comments] = await Promise.all([
    ForumLike.find({ user: userId, post: { $nin: ownPosts } })
      .select("post")
      .lean(),
    ForumComment.find({ author: userId, post: { $nin: ownPosts } })
      .select("post")
      .lean(),
  ]);
  const decrements = [
    ...likes.map(({ post }) => ({
      updateOne: {
        filter: { _id: post, likesCount: { $gt: 0 } },
        update: { $inc: { likesCount: -1 } },
      },
    })),
    ...comments.map(({ post }) => ({
      updateOne: {
        filter: { _id: post, commentsCount: { $gt: 0 } },
        update: { $inc: { commentsCount: -1 } },
      },
    })),
  ];
  if (decrements.length > 0) await ForumPost.bulkWrite(decrements);

  const ownComments = await ForumComment.find({ author: userId }).distinct("_id");
  await ForumReport.deleteMany({
    $or: [{ post: { $in: ownPosts } }, { reporter: userId }, { comment: { $in: ownComments } }],
  });
  await Promise.all([
    ForumLike.deleteMany({ $or: [{ user: userId }, { post: { $in: ownPosts } }] }),
    ForumComment.deleteMany({ $or: [{ author: userId }, { post: { $in: ownPosts } }] }),
  ]);
}

/**
 * Deletes the user and everything stored about them, in every module.
 * Recipes stay in the shared catalogue, without the link to their author.
 */
export async function deleteUserData(userId: Types.ObjectId): Promise<void> {
  await connectToDatabase();
  const [ownPosts, shoppingLists] = await Promise.all([
    ForumPost.find({ author: userId }).distinct("_id"),
    ShoppingList.find({ user: userId }).distinct("_id"),
  ]);

  await removeForumActivity(userId, ownPosts);
  await Promise.all([
    ForumPost.deleteMany({ author: userId }),
    ShoppingItem.deleteMany({ list: { $in: shoppingLists } }),
    ShoppingList.deleteMany({ user: userId }),
    Meal.deleteMany({ user: userId }),
    MealPlan.deleteMany({ user: userId }),
    Inventory.deleteMany({ user: userId }),
    Budget.deleteMany({ user: userId }),
    Favorite.deleteMany({ user: userId }),
    WorkoutSession.deleteMany({ user: userId }),
    SportPlan.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
    CoachMessage.deleteMany({ userId }),
    AuthToken.deleteMany({ userId }),
    Avatar.deleteOne({ userId }),
    Recipe.updateMany({ createdBy: userId }, { $unset: { createdBy: 1 } }),
  ]);
  await User.deleteOne({ _id: userId });
}
