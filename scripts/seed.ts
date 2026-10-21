/**
 * Resets YOUR database (from MONGODB_URI in .env) and inserts demo data:
 * the persona Ahmed Benali and the 4 recipes from the mockup.
 *
 *   npm run db:seed
 *
 * Every collection is emptied first: only point this at your own mealmate_<firstname> database.
 */
import bcrypt from "bcryptjs";
import mongoose, { type Model, type Types } from "mongoose";
import { connectToDatabase } from "../lib/db";
import type { Unit } from "../models/enums";
import { Budget } from "../models/Budget";
import { Favorite } from "../models/Favorite";
import { ForumComment } from "../models/ForumComment";
import { ForumLike } from "../models/ForumLike";
import { ForumPost } from "../models/ForumPost";
import { ForumReport } from "../models/ForumReport";
import { Ingredient, type IIngredient } from "../models/Ingredient";
import { Inventory } from "../models/Inventory";
import { Meal } from "../models/Meal";
import { MealPlan } from "../models/MealPlan";
import { Notification } from "../models/Notification";
import { Recipe } from "../models/Recipe";
import { ShoppingItem } from "../models/ShoppingItem";
import { ShoppingList } from "../models/ShoppingList";
import { SportPlan } from "../models/SportPlan";
import { User } from "../models/User";
import { WorkoutSession } from "../models/WorkoutSession";

const allModels: Model<never>[] = [
  User,
  Ingredient,
  Recipe,
  Favorite,
  MealPlan,
  Meal,
  ShoppingList,
  ShoppingItem,
  Inventory,
  Budget,
  Notification,
  SportPlan,
  WorkoutSession,
  ForumPost,
  ForumComment,
  ForumLike,
  ForumReport,
] as unknown as Model<never>[];

type IngredientSeed = Omit<IIngredient, "createdAt" | "updatedAt">;

const ingredients: IngredientSeed[] = [
  {
    name: "Chicken breast",
    aisle: "fresh_protein",
    defaultUnit: "g",
    estimatedPrice: 12,
    nutritionPer100: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  },
  {
    name: "Rice",
    aisle: "grocery",
    defaultUnit: "g",
    estimatedPrice: 2.5,
    nutritionPer100: { calories: 360, protein: 7, carbs: 79, fat: 0.6 },
  },
  {
    name: "Tomatoes",
    aisle: "fruits_vegetables",
    defaultUnit: "g",
    estimatedPrice: 1.5,
    nutritionPer100: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  },
  {
    name: "Courgette",
    aisle: "fruits_vegetables",
    defaultUnit: "g",
    estimatedPrice: 2.4,
    nutritionPer100: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  },
  {
    name: "Lemon",
    aisle: "fruits_vegetables",
    defaultUnit: "piece",
    estimatedPrice: 0.9,
    nutritionPer100: { calories: 29, protein: 1.1, carbs: 9, fat: 0.3 },
  },
  {
    name: "Olive oil",
    aisle: "grocery",
    defaultUnit: "ml",
    estimatedPrice: 5,
    nutritionPer100: { calories: 884, protein: 0, carbs: 0, fat: 100 },
  },
  { name: "Parsley", aisle: "fruits_vegetables", defaultUnit: "bunch", estimatedPrice: 0.8 },
  {
    name: "Eggs",
    aisle: "fresh_protein",
    defaultUnit: "piece",
    estimatedPrice: 0.8,
    nutritionPer100: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  },
  {
    name: "Banana",
    aisle: "fruits_vegetables",
    defaultUnit: "piece",
    estimatedPrice: 0.6,
    nutritionPer100: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  },
  {
    name: "Rolled oats",
    aisle: "grocery",
    defaultUnit: "g",
    estimatedPrice: 4,
    nutritionPer100: { calories: 379, protein: 13, carbs: 68, fat: 6.5 },
  },
  {
    name: "Milk",
    aisle: "dairy",
    defaultUnit: "ml",
    estimatedPrice: 1.4,
    nutritionPer100: { calories: 46, protein: 3.4, carbs: 4.8, fat: 1.5 },
  },
  {
    name: "Almonds",
    aisle: "grocery",
    defaultUnit: "g",
    estimatedPrice: 5,
    nutritionPer100: { calories: 579, protein: 21, carbs: 22, fat: 50 },
  },
  {
    name: "Pasta",
    aisle: "grocery",
    defaultUnit: "g",
    estimatedPrice: 1.8,
    nutritionPer100: { calories: 371, protein: 13, carbs: 75, fat: 1.5 },
  },
  {
    name: "Chickpeas",
    aisle: "grocery",
    defaultUnit: "g",
    estimatedPrice: 3,
    nutritionPer100: { calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  },
  { name: "Basil", aisle: "fruits_vegetables", defaultUnit: "bunch", estimatedPrice: 1 },
];

type RecipeItem = [ingredientName: string, quantity: number | undefined, unit: Unit, note?: string];

function lines(ids: Map<string, Types.ObjectId>, items: RecipeItem[]) {
  return items.map(([name, quantity, unit, note]) => {
    const ingredient = ids.get(name);
    if (!ingredient) throw new Error(`Unknown ingredient in seed: ${name}`);
    return { ingredient, name, quantity, unit, note };
  });
}

async function main() {
  await connectToDatabase();
  console.log(`Seeding database "${mongoose.connection.name}"...`);

  await Promise.all(allModels.map((model) => model.deleteMany({})));
  await Promise.all(allModels.map((model) => model.syncIndexes()));

  const ahmed = await User.create({
    name: "Ahmed Benali",
    email: "ahmed.benali@mail.com",
    passwordHash: await bcrypt.hash("password123", 10),
    role: "ADMIN",
    age: 24,
    heightCm: 178,
    weightKg: 70,
    occupation: "Student",
    city: "Tunis",
    preferences: {
      diet: "none",
      allergies: [],
      intolerances: [],
      goal: "muscle_gain",
      activityLevel: "moderate",
      weeklyBudget: 80,
      currency: "TND",
      dailyCaloriesTarget: 2400,
      dailyProteinTarget: 130,
      sportGoal: "muscle_gain",
      level: "beginner",
      availableDays: ["mon", "wed", "fri"], // 3 workouts a week
      sessionDurationMinutes: 45,
      equipment: "gym",
    },
  });

  const createdIngredients = await Ingredient.insertMany(ingredients);
  const ids = new Map(createdIngredients.map((i) => [i.name, i._id as Types.ObjectId]));

  await Recipe.insertMany([
    {
      title: "Lemon chicken bowl",
      tagline: "Simple, fresh, filling",
      description:
        "Golden chicken, fluffy rice and sunny vegetables. A complete lunch made with what is in your cupboard.",
      diets: ["gluten_free", "lactose_free"],
      tags: ["from_stock"],
      difficulty: "easy",
      prepTimeMinutes: 25,
      servings: 1,
      costPerServing: 6.4,
      nutrition: { calories: 620, protein: 42, carbs: 68, fat: 20 },
      ingredients: lines(ids, [
        ["Chicken breast", 150, "g"],
        ["Rice", 80, "g", "uncooked"],
        ["Tomatoes", 150, "g"],
        ["Courgette", 100, "g"],
        ["Lemon", 0.5, "piece"],
        ["Olive oil", 10, "ml"],
        ["Parsley", undefined, "to_taste", "with salt and pepper"],
      ]),
      steps: [
        {
          order: 1,
          title: "Prepare the ingredients",
          description: "Rinse the rice. Cut the courgette and tomatoes. Slice the chicken.",
        },
        {
          order: 2,
          title: "Cook the rice",
          description: "Pour the rice into salted boiling water. Cook for 12 min, then drain.",
        },
        {
          order: 3,
          title: "Brown the chicken and vegetables",
          description:
            "In the olive oil, fry the chicken for 8 to 10 min until fully cooked. Add the vegetables and sauté for 5 min.",
        },
        {
          order: 4,
          title: "Assemble and enjoy",
          description: "Spread the rice and topping in a bowl. Add the lemon juice and parsley.",
        },
      ],
      createdBy: ahmed._id,
    },
    {
      title: "Tomato omelette",
      tagline: "Anti-waste dinner",
      description: "Use your ripe tomatoes before they spoil in a quick, protein-rich omelette.",
      diets: ["vegetarian", "gluten_free", "low_carb"],
      tags: ["anti_waste"],
      difficulty: "easy",
      prepTimeMinutes: 15,
      servings: 1,
      costPerServing: 3.2,
      nutrition: { calories: 560, protein: 30, carbs: 24, fat: 38 },
      ingredients: lines(ids, [
        ["Eggs", 4, "piece"],
        ["Tomatoes", 200, "g"],
        ["Olive oil", 10, "ml"],
        ["Parsley", undefined, "to_taste"],
      ]),
      steps: [
        {
          order: 1,
          title: "Prepare",
          description:
            "Dice the tomatoes and chop the parsley. Beat the eggs with salt and pepper.",
        },
        {
          order: 2,
          title: "Cook the tomatoes",
          description: "Soften the tomatoes in the olive oil for 4 min.",
        },
        {
          order: 3,
          title: "Cook the omelette",
          description:
            "Pour in the eggs and cook over low heat for 5 min. Fold and serve with parsley.",
        },
      ],
      createdBy: ahmed._id,
    },
    {
      title: "Banana almond porridge",
      tagline: "A gentle start",
      description: "Creamy oats with banana and crunchy almonds for a filling breakfast.",
      diets: ["vegetarian"],
      tags: ["vegetarian"],
      difficulty: "easy",
      prepTimeMinutes: 10,
      servings: 1,
      costPerServing: 2.8,
      nutrition: { calories: 480, protein: 22, carbs: 62, fat: 16 },
      ingredients: lines(ids, [
        ["Rolled oats", 70, "g"],
        ["Milk", 250, "ml"],
        ["Banana", 1, "piece"],
        ["Almonds", 20, "g"],
      ]),
      steps: [
        {
          order: 1,
          title: "Cook the oats",
          description: "Bring the milk and oats to a simmer and stir for 5 min.",
        },
        {
          order: 2,
          title: "Top and serve",
          description: "Slice the banana, chop the almonds and scatter them over the porridge.",
        },
      ],
      createdBy: ahmed._id,
    },
    {
      title: "Chickpea basil pasta",
      tagline: "Small budget, big flavour",
      description: "Pasta tossed with chickpeas, tomatoes and fresh basil.",
      diets: ["vegetarian", "vegan", "lactose_free"],
      tags: ["small_budget"],
      difficulty: "easy",
      prepTimeMinutes: 20,
      servings: 1,
      costPerServing: 4.5,
      nutrition: { calories: 650, protein: 24, carbs: 98, fat: 18 },
      ingredients: lines(ids, [
        ["Pasta", 100, "g"],
        ["Chickpeas", 120, "g", "cooked"],
        ["Tomatoes", 150, "g"],
        ["Olive oil", 10, "ml"],
        ["Basil", undefined, "to_taste"],
      ]),
      steps: [
        {
          order: 1,
          title: "Cook the pasta",
          description: "Cook the pasta in salted boiling water following the pack instructions.",
        },
        {
          order: 2,
          title: "Make the sauce",
          description: "Warm the chickpeas and diced tomatoes in the olive oil for 6 min.",
        },
        {
          order: 3,
          title: "Toss and serve",
          description: "Mix the drained pasta into the sauce and finish with torn basil.",
        },
      ],
      createdBy: ahmed._id,
    },
  ]);

  console.log("Done: 1 user (ahmed.benali@mail.com / password123), 15 ingredients, 4 recipes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
