// Shapes used by the engine (core.js / services.js). They mirror the zod schemas there.

export type Difficulty = "easy" | "medium" | "hard";
export type Course = "soup" | "main" | "side" | "salad" | "breakfast" | "baking" | "dessert" | "snack" | "sauce" | "drink";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Mood = "cozy" | "light" | "hearty" | "quick" | "comfort" | "fresh" | "spicy" | "sweet";
export type Budget = "low" | "medium" | "high";

export interface Nutrients { kcal: number; protein: number; fat: number; carbs: number }

export interface Ingredient {
  id: string;
  name: string;
  aliases: string[];
  groups: string[];
  per100g: Nutrients;
  gramsPerUnit?: Record<string, number>;
  aisle?: string;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  optional: boolean;
  swap?: string[];
}

export interface Step { text: string; timerSeconds?: number; uses?: string[] }

export interface Recipe {
  id: string;
  title: string;
  summary: string;
  aliases?: string[];
  servings: number;
  minServings: number;
  maxServings: number;
  totalMinutes: number;
  activeMinutes: number;
  difficulty: Difficulty;
  ingredients: RecipeIngredient[];
  appliances: string[];
  tags: string[];
  allergens: string[];
  steps: Step[];
  tips: string[];
  storageDays?: number;
  freezerDays?: number;
  cuisine?: string;
  dish?: string;
  variant?: string;
  course?: Course;
  meals?: Meal[];
  mainIngredient?: string;
  needsSide?: boolean;
  season?: string[];
  occasions?: string[];
  budget?: Budget;
  kids?: boolean;
  yields?: { amount: number; unit: string };
  cookware?: string[];
  look?: string;
  sources?: { title: string; url?: string }[];
  version: string;
}

export interface Conditions {
  maxMinutes: number | null;
  servings: number;
  mood: Mood | null;
  desired: string[];
  available: string[];
  absent: string[];
  excluded: string[];
  appliances: string[];
  strictPantry: boolean;
  vegetarian: boolean;
  maxKcal?: number | null;
  minProtein?: number | null;
  occasion?: "kids" | "guests" | "date" | null;
}

export interface Preferences { excluded: string[]; appliances: string[]; vegetarian: boolean; basics?: string[] }

export interface Match {
  recipe: Recipe;
  available: string[];
  missing: string[];
  unknown: string[];
  toBuy: string[];
  reason: string;
}

export interface ShoppingItem {
  key: string;
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  recipes?: string[];
}

export interface MenuItem { recipeId: string; servings: number; meal?: "breakfast" | "lunch" | "dinner"; leftover?: boolean }
export interface MenuDay { date: string; items: MenuItem[] }
export interface MenuPlan { meals: ("breakfast" | "lunch" | "dinner")[]; quickWeekdays: boolean; cookAhead: boolean }

export interface FridgeItem { id: string; at: number; until: number | null }

export interface Cooking {
  recipe: Recipe;
  servings: number;
  step: number;
  timerEnd: number | null;
  timerStep: number | null;
  startedAt: number;
  done: boolean;
}

export interface ChatOption { label: string; text?: string; relax?: string; open?: string; action?: "pantry" }
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  results?: { id: string; reason: string; note?: string }[];
  options?: ChatOption[];
  chips?: string[];
}

export interface Taste { liked: string[]; tooHard: string[]; disliked: string[]; notNow: { id: string; at: number }[] }
export interface BookEntry { id: string; recipeId: string; title: string; at: number; menu?: boolean; voice?: boolean }

/** Everything the app keeps on the device (IndexedDB) — the old app's state, unchanged. */
export interface EngineState {
  favorites: Recipe[];
  recent: Recipe[];
  shopping: ShoppingItem[];
  preferences: Preferences;
  cooking: Cooking | null;
  conversation: ChatMessage[];
  conditions: Conditions;
  feedbackQueue: unknown[];
  engaged: boolean;
  installDismissed: boolean;
  voiceUsed: boolean;
  readAloud: boolean;
  largeText: boolean;
  onboarding: "new" | "done" | "skipped";
  menu: MenuDay[];
  syncBase: unknown;
  taste: Taste;
  noticeOk: boolean;
  book: BookEntry[];
  notes: Record<string, string>;
  /** «Семейная книга»: own recipes in free text. */
  myRecipes: MyRecipe[];
  rewards: boolean;
  seenBadges: string[];
  reminders: { daily: string | null; weekly: boolean };
  today: { date: string; skip: string[] };
  fridge: FridgeItem[];
  polls: { token: string; day: string; at: number }[];
  voter: string;
  joined: string[];
  menuPlan: MenuPlan;
  tasteTest: { portrait: string; title: string; at: number; dismissed: boolean };
}

/** One assistant turn, as returned by the engine's respond(). */
export interface Reply {
  kind: "found" | "near" | "unclear" | "talk" | string;
  text: string;
  results: Match[];
  options?: ChatOption[];
  conditions: Conditions;
  open?: string;
}

export interface CatalogIssue { file: string; item: string; message: string }
export interface BuiltCatalog {
  recipes: Recipe[];
  ingredients: Ingredient[];
  errors: CatalogIssue[];
  warnings: CatalogIssue[];
  files: { name: string; recipes: number; ingredients: number }[];
}

export interface MyRecipe {
  id: string;
  title: string;
  /** Whose recipe it is: «от бабушки Нины». */
  from: string;
  people: number | null;
  minutes: number | null;
  /** One product per line. */
  ingredients: string;
  /** One step per line (or paragraphs). */
  steps: string;
  note: string;
  at: number;
}
