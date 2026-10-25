// Parts of Главная and Профиль that are opened by a tap — «Праздничный стол», «Выбрать за меня» — load at that
// moment, not with the first page (the first visit downloads less).
import { Suspense, type ComponentProps } from "react";
import { lazyScreen } from "../app/lazy";
import type { FeastSheet as FeastType } from "./Feast";
import type { Deck as DeckType } from "./Deck";

const FeastLazy = lazyScreen(() => import("./Feast").then((m) => ({ default: m.FeastSheet })));
const DeckLazy = lazyScreen(() => import("./Deck").then((m) => ({ default: m.Deck })));

export function FeastSheet(props: ComponentProps<typeof FeastType>) {
  return props.open ? <Suspense fallback={null}><FeastLazy {...props} /></Suspense> : null;
}
export function Deck(props: ComponentProps<typeof DeckType>) {
  return <Suspense fallback={null}><DeckLazy {...props} /></Suspense>;
}
