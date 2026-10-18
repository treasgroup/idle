// Readable entry point to the recipe engine. The engine itself (core.js, services.js, helpers.js) is the
// previous build's logic ported as-is; this file gives it names and types. Import from here only.
import * as core from "./core.js";
import * as svc from "./services.js";
import * as help from "./helpers.js";
import type {
  BuiltCatalog, ChatMessage, ChatOption, Conditions, Cooking, EngineState, FridgeItem, Ingredient, Match, MenuDay, MenuItem,
  MenuPlan, Nutrients, Preferences, Recipe, RecipeIngredient, Reply, ShoppingItem, Taste,
} from "./types";

export * from "./types";

// ---------- Catalog ----------
/** All recipes currently loaded (live: replaced when the catalog arrives from the server). */
export const recipes = (): Recipe[] => core.F;
export const recipeById = (id: string): Recipe | undefined => core.F.find((r: Recipe) => r.id === id);
export const ingredient = (id: string): Ingredient | undefined => core.me(id);
export const allIngredients = (): Ingredient[] => core.Za();
/** Ingredients used by at least one recipe, sorted by name: what pickers offer. */
export const ingredientOptions = (): { id: string; name: string }[] => core.za;
export const catalogVersion = (): number => core.bt;
export const buildCatalog = (files: { name: string; data?: unknown; error?: string }[]): BuiltCatalog => core.Vb(files);
export const useCatalog = (built: BuiltCatalog): void => core.Gb(built);
/** Loads the catalog from the server (falls back to the last saved copy, then to the bundled base). */
export const loadCatalog = (timeoutMs = 5000, keepWaiting = false): Promise<{ built: BuiltCatalog; source: string; problem?: string }> =>
  svc.bm(timeoutMs, keepWaiting);
/** Window event fired when a late server catalog replaced the one in use. */
export const CATALOG_EVENT: string = svc.ym;
export const photoUrl = (recipeId: string): string | null => svc.pm(recipeId);
/** A smaller copy for cards and thumbnails (the full photo stays for the recipe page). */
export const photoSmallUrl = (recipeId: string): string | null => svc.pmSmall(recipeId);

// ---------- Labels & text ----------
export const LABELS: Record<string, string> = core.Oe;
export const AISLES: { key: string; label: string }[] = core.Wo;
export const normalize = (s: string): string => core._e(s);
export const formatMinutes = (min: number): string => core.mn(min);
export const formatAmount = (amount: number, unit: string): string => core.Zs(amount, unit);
export const plural = (n: number, one: string, few: string, many: string): string => core.Jb(n, one, few, many);
export const servingsWord = (n: number, accusative = false): string => core.Li(n, accusative);
export const shortName = (ingredientId: string): string => core.We(ingredientId);
export const displayName = (ingredientId: string, fallback: string): string => core._s(ingredientId, fallback);
export const conditionLabel = (key: string): string => core.tn(key);
export const dishLabel = (key: string): string => core.Ds(key);
export const yieldText = (recipe: Recipe, servings: number): string => core.Up(recipe, servings);
export const variantLabel = (recipe: Recipe): string => core.il(recipe);
export const conditionChips = (c: Conditions): string[] => core.qp(c);
export const dayLabel = (date: string, now?: Date): string => svc._r(date, now);
export const dateKey = (d: Date): string => svc.Tt(d);
export const MEAL_LABELS: Record<string, string> = svc.Nu;

// ---------- Recipe facts ----------
export const courseOf = (r: Recipe): string => core.Ne(r);
export const mealsOf = (r: Recipe): string[] => core.Zt(r);
export const mainIngredientOf = (r: Recipe): string | undefined => core.zi(r);
export const isLenten = (r: Recipe): boolean => core.Ar(r);
export const matchesDish = (r: Recipe, key: string): boolean => core.nt(r, key);
export const nutritionOf = (r: Recipe): { perServing: Nutrients; complete: boolean } => core.Yt(r);
export const ingredientGrams = (i: RecipeIngredient): number | null => core.Ip(i);
export const scaleIngredient = (i: RecipeIngredient, r: Recipe, servings: number): RecipeIngredient => core.Ui(i, r, servings);
export const variantsOf = (r: Recipe): Recipe[] => core.$p(r);
/** Other variants of the same dish, and similar dishes. */
export const similarRecipes = (r: Recipe, filter?: (x: Recipe) => boolean, n?: number): { variants: Recipe[]; similar: Recipe[] } => svc.OA(r, filter, n);
export const needsSide = (r: Recipe): boolean => core.zC(r);
export const suggestSides = (r: Recipe, exclude?: string[]): Recipe[] => core.ZC(r, exclude);
export const SIDES: Recipe[] = core.x0;
/** The dish with a side merged in: one ingredient list and one set of steps. */
export const withSide = (r: Recipe, side: Recipe): Recipe => core.UC(r, side);
export const CATALOG_SECTIONS: { key: string; label: string; group: string; test: (r: Recipe) => boolean; min?: number }[] = svc.R0;
export const searchRecipes = (query: string, list?: Recipe[]): Recipe[] => svc.fm(query, list);
export const searchIngredients = (query: string, ids: string[], limit?: number): string[] => core.a0(query, ids, limit);
export const ingredientMatches = (have: string, wanted: string): boolean => core.ia(have, wanted);
/** Staples that are assumed to be at home (water, salt, oil…). */
export const basics = (prefs?: Preferences): Set<string> => core.zs(prefs);

// ---------- Matching & the assistant ----------
export const DEFAULT_CONDITIONS: Conditions = core.zp;
export const DEFAULT_PREFERENCES: Preferences = core.GE;
export const freshConditions = (base: { servings?: number; appliances: string[]; vegetarian: boolean }): Conditions => core.rn(base);
export const rankRecipes = (list: Recipe[], c: Conditions, p: Preferences, limit = 3, opts: { meal?: string } = {}): Match[] =>
  core.Qe(list, c, p, limit, opts);
export const applyPatch = (c: Conditions, patch: unknown): Conditions => core.pu(c, patch);
export const relaxCondition = (c: Conditions, key: string): Conditions => core.gu(c, key);
export const relaxOptions = (c: Conditions, p: Preferences): ChatOption[] => core.tm(c, p);
/** Taste profile → per-recipe score bonus used by rankRecipes. */
export const setTasteScorer = (fn: (r: Recipe) => number): void => core.LS(fn);
export const tasteScorer = (t: Taste, now?: number): ((r: Recipe) => number) => svc.Em(t, now);
/** One tap after cooking: «Понравилось» comes up more often, «Так себе» less (taste.liked / taste.disliked). */
export const rateDish = (t: Taste, recipeId: string, liked: boolean): Taste => svc.zA(t, recipeId, liked ? 5 : 2);
export const updateTaste = (t: Taste, recipeId: string, signal: "liked" | "cooked" | "too_hard" | "not_now" | "dislike", now?: number): Taste =>
  svc.B0(t, recipeId, signal, now);
/** Cleans a typed or spoken message ("скока", "чё-нить", filler words) before parsing. */
export const cleanMessage = (text: string): string => help.V0(text);
export const parseMessage = (text: string, c: Conditions): Record<string, unknown> & { reply: string } => core.tl(text, c, core.za);
export const loadIntentModel = (url?: string): Promise<unknown> => svc.JC(url);
export const classifyIntent = (text: string): unknown => svc.eA(text);
/** One assistant turn: what to say, which recipes to show, which conditions now apply. */
export const respond = (input: {
  message: string; patch: unknown; reply: string; local: boolean; conditions: Conditions; preferences: Preferences;
  conversation: ChatMessage[]; guess: unknown; focus: Recipe | null; focusServings?: number; voice: boolean;
}): Reply => core.bC(input);
export const patchSchema = core.kC;
/** Answers "сколько муки", "чем заменить сметану" about a given recipe; null if the question is not about it. */
export const answerRecipeQuestion = (text: string, list: Recipe[], servings?: number): { text: string } | null => core.Jp(text, list, servings);
/** General kitchen questions: how long to boil eggs, buckwheat ratio, defrosting… */
export const answerKitchenQuestion = (text: string, force?: boolean): { text: string } | null => core.nl(text, force);
export const LEFTOVERS: { key: string; label: string; icon: string; phrase: string; ids: string[]; tip: string }[] = core.Nr;
export const resultNote = (m: Match): string => help.z6(m);
export const toStoredResults = (list: Match[]): { id: string; reason: string; note?: string }[] => help.cv(list);

// ---------- Shopping ----------
export const addToShopping = (list: ShoppingItem[], items: RecipeIngredient[], recipeTitle?: string): ShoppingItem[] => core.fu(list, items, recipeTitle);
/** Recipe ingredients scaled to servings, without water and without what the person has. */
export const ingredientsToBuy = (r: Recipe, servings: number, have: string[]): RecipeIngredient[] => core.Vp(r, servings, have);
export const groupShopping = (list: ShoppingItem[]): { key: string; label: string; items: ShoppingItem[] }[] => core.Lp(list);
export const aisleOf = (item: { ingredientId: string; name: string }): string => core.Rr(item);
export const shoppingName = (ingredientId: string, name: string): string => core.Bp(ingredientId, name);
/** "Купите 2 упаковки по 400 г" — store package sizes, or null. */
export const packageHint = (ingredientId: string, amount: number, unit: string): string | null => svc.xm(ingredientId, amount, unit);
export const shoppingText = (list: ShoppingItem[], title?: string): string => svc.fA(list, title);
export const pantryGroups = (): { key: string; label: string; items: { id: string; label: string }[] }[] => core.Pp();

// ---------- Home pantry (fridge) ----------
export const shelfLifeDays = (ingredientId: string): number | null => help.v4(ingredientId);
export const isPerishable = (ingredientId: string): boolean => help.p6(ingredientId);
export const newFridgeItem = (ingredientId: string, now?: number): FridgeItem => help.k4(ingredientId, now);
export const daysLeft = (item: FridgeItem, now?: number): number | null => help.Gm(item, now);
export const expiryLabel = (item: FridgeItem, now?: number): string => help.Iu(item, now);
/** Items that expire today or tomorrow (or already did), soonest first. */
export const expiringSoon = (fridge: FridgeItem[], now?: number): FridgeItem[] => help.gl(fridge, now);
export const setExpiry = (item: FridgeItem, days: number | null, now?: number): FridgeItem => help.w4(item, days, now);
export const addToFridge = (fridge: FridgeItem[], ids: string[], now?: number): FridgeItem[] => help.J0(fridge, ids, now);
/** After cooking: perishables the recipe used up are taken off the home list. */
export const useUpFromFridge = <T extends { fridge: FridgeItem[] }>(state: T, r: Recipe): { data: T; removed: FridgeItem[] } => help.Lu(state, r);

// ---------- Week menu ----------
export const DEFAULT_MENU_PLAN: MenuPlan = svc.U0;
export const weekDays = (menu: MenuDay[], from?: Date): MenuDay[] => svc.Nm(menu, from);
export const generateMenu = (days: MenuDay[], prefs: Preferences, servings: number, seed?: number, plan?: MenuPlan): MenuDay[] =>
  svc.Mu(days, prefs, servings, seed, plan);
export const regenerateDay = (menu: MenuDay[], date: string, prefs: Preferences, servings: number, seed?: number, plan?: MenuPlan): MenuDay[] =>
  svc.NA(menu, date, prefs, servings, seed, plan);
export const removeMenuItem = (menu: MenuDay[], date: string, index: number, servings: number): MenuDay[] => svc.L0(menu, date, index, servings);
export const replaceMenuItem = (menu: MenuDay[], date: string, index: number, prefs: Preferences, servings: number, seed?: number, plan?: MenuPlan): MenuDay[] =>
  svc.MA(menu, date, index, prefs, servings, seed, plan);
export const menuEntries = (menu: MenuDay[]): { date: string; item: MenuItem; recipe: Recipe }[] => svc.cl(menu);
export const menuShopping = (menu: MenuDay[], list?: ShoppingItem[], have?: string[]): ShoppingItem[] => svc.EA(menu, list, have);
/** Perishables shared by 2+ dishes of the week: one pack covers several dinners. */
export const sharedPerishables = (menu: MenuDay[]): { id: string; name: string; dishes: number }[] => svc.DA(menu);
export const menuText = (menu: MenuDay[], now?: Date): string => svc._A(menu, now);
export const menuPlanSummary = (plan: MenuPlan): string => svc.I0(plan);
export const clampServings = (r: Recipe, n: number): number => svc.Eu(r, n);

// ---------- State on the device ----------
export const DEFAULT_STATE: EngineState = core.Es;
export const normalizeState = (raw: unknown): EngineState => core.vu(raw);
export const loadState = (): Promise<EngineState> => core.cm();
export const saveState = (s: EngineState): Promise<void> => core.um(s);
export const clearState = (): Promise<void> => core.IC();
export type { Cooking };

// ---------- Server, sharing, analytics ----------
export const apiUrl = (route: string): string => core.wt(route);
export const isNativeApp = (): boolean => core.mt();
export const initNativeBridge = (): void => core.CC();
export const siteBase = (): string => svc.Ua();
export const recipePageUrl = (id: string): string => svc.dA(id);
export const SHARE_TARGETS: { id: string; label: string }[] = svc.uA;
export const shareLink = (target: string, text: string): { url: string; copyFirst: boolean } => svc.pA(target, text);
export const copyText = (text: string): Promise<boolean> => svc.E0(text);
export const canShare = (): boolean => svc.mA();
export const track = (e: { type: string; recipeId?: string; text?: string; count?: number; source?: string }): void => svc.Pn(e);
export const deviceSource = (): string => svc.rA();
export const qrSvg = (text: string, size?: number): string => svc.TA(text, size);
export const compressPhoto = (file: File, maxSide?: number, quality?: number): Promise<Blob> => svc.ZA(file, maxSide, quality);

// ---------- Reviews ----------
export interface Review {
  id: number; author: string; rating: number; text: string; photos: string[]; created: number; edited: boolean;
  likes: number; liked: boolean; mine: boolean; pending: boolean;
  replies: { id: number; author: string; text: string; created: number; mine: boolean; pending: boolean }[];
}
export interface ReviewList {
  summary: { avg: number; count: number; dist: number[] }; reviews: Review[]; more: boolean; mine: Review | null;
  author: string | null; consented: boolean;
}
export const reviewsApi = {
  list: (recipeId: string, sort = "new", offset = 0): Promise<ReviewList> => svc.zm(recipeId, sort, offset),
  ratings: (): Promise<Record<string, { avg: number; count: number }>> => svc.UA(),
  /** keep: photo URLs of the review to keep; files: new photos (compressed before upload). */
  save: (data: { recipeId: string; rating: number; text: string; author?: string; consent?: boolean; keep: string[]; files: File[] }) => svc.IA(data),
  remove: (id: number) => svc.LA(id),
  like: (id: number, on: boolean) => svc.BA(id, on),
  reply: (reviewId: number, text: string, author: string, consent: boolean) => svc.PA(reviewId, text, author, consent),
  removeReply: (id: number) => svc.jA(id),
  report: (kind: "review" | "reply", id: number, reason: "rude" | "spam" | "wrong" | "other") => svc.HA(kind, id, reason),
};
export const ratingText = (n: number): string => svc.ul(n);
export const reviewsWord = (n: number): string => svc.dl(n);

// ---------- React hooks from the old app ----------
export interface VoiceInput {
  state: "idle" | "recording" | "transcribing";
  seconds: number;
  interim: string;
  available: boolean;
  start: () => void;
  stop: () => void;
  cancel: () => void;
}
/** Voice input for the assistant (browser recognition, or recording sent to the server). */
export const useVoiceInput = (onText: (text: string) => void, notify: (msg: string) => void, ensureSession: () => Promise<void>, enabled: boolean): VoiceInput =>
  svc.jC(onText, notify, ensureSession, enabled);
export type VoiceCommand =
  | { type: "next" | "back" | "repeat" | "ingredients" | "timeLeft" | "timerStop" | "close" | "help" | "stopListening" }
  | { type: "timer"; seconds?: number }
  | { type: "ask"; text: string };
/** Hands-free cooking: continuous listening for "дальше", "таймер на 5 минут", "сколько муки"… */
export const useHandsFree = (active: boolean, onCommand: (c: VoiceCommand) => void, notify: (msg: string) => void): {
  listening: boolean; heard: string; supported: boolean; pause: () => void; resume: () => void;
} => svc.cA(active, onCommand, notify);
export const parseVoiceCommand = (text: string): VoiceCommand | null => svc.hO(text);
/** PWA: install prompt, standalone mode, offline cache. */
export const usePwa = (notify: (msg: string) => void): { installed: boolean; canInstall: boolean; ios: boolean; offlineReady: boolean; install: () => Promise<boolean> } =>
  svc.HC(notify);
export interface SyncApi {
  status: { state: "off" | "syncing" | "ok" | "error" | string; members: number; error?: string };
  code: () => Promise<string>;
  invite: () => Promise<string>;
  login: (code: string) => Promise<void>;
  join: (token: string) => Promise<void>;
  leave: () => Promise<void>;
  remove: () => Promise<void>;
  refresh: () => Promise<void>;
}
/** Anonymous account + family sync of favorites, menu, shopping list and home pantry. */
export const useAccountSync = (state: EngineState, ready: boolean, online: boolean, update: (fn: (s: EngineState) => EngineState) => void): SyncApi =>
  svc.bA(state, ready, online, update);

// ---------- Legal documents ----------
import * as legal from "./legal.js";
export interface LegalInfo { operator: string; email: string; site: string; serverAi: boolean; serverSpeech: boolean }
export type LegalKey = "privacy" | "rules" | "terms" | "info";
export const LEGAL_TITLES: Record<LegalKey, string> = legal.Or;
export const legalInfo = (): Promise<LegalInfo> => legal.PO();
export const legalDoc = (key: LegalKey, info: LegalInfo): { key: string; title: string; sections: { h?: string; p: string[] }[] } => legal.YA(key, info);

// ---------- Native app (Android shell) timers ----------
/** In the Android app the cooking timer is also scheduled as a system notification (works with the screen off). */
export const scheduleNativeTimer = (end: number, title: string, body: string): Promise<boolean> => core.RC(end, title, body);
export const cancelNativeTimer = (): void => core.NC();
/** Asks the phone for notifications (once; later calls only report the answer). */
export const askNativeNotifications = (): Promise<boolean> => core.yu(true);

/** The store package that covers `amount` with the least left over, e.g. 2 × 400 г; null if not sold in packs. */
export const packageFor = (ingredientId: string, amount: number, unit: string): { count: number; size: number; unit: string; word: string } | null =>
  svc.vO(ingredientId, amount, unit);
