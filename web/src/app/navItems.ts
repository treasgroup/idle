// The places the bottom bar can hold (App's bar and Профиль → «Оформление» share them).
import { CalendarDays, ChefHat, GraduationCap, Heart, House, Refrigerator, Search, ShoppingCart, UserRound, type LucideIcon } from "lucide-react";
import type { Tab } from "./router";

export type NavItem = { tab: Tab; label: string; icon: LucideIcon };
export const NAV_ITEMS: Record<Tab, NavItem> = {
  home: { tab: "home", label: "Главная", icon: House },
  recipes: { tab: "recipes", label: "Поиск", icon: Search },
  chat: { tab: "chat", label: "Шеф", icon: ChefHat },
  favorites: { tab: "favorites", label: "Избранное", icon: Heart },
  shopping: { tab: "shopping", label: "Покупки", icon: ShoppingCart },
  menu: { tab: "menu", label: "План", icon: CalendarDays },
  pantry: { tab: "pantry", label: "Продукты", icon: Refrigerator },
  learn: { tab: "learn", label: "Школа", icon: GraduationCap },
  profile: { tab: "profile", label: "Профиль", icon: UserRound },
};
