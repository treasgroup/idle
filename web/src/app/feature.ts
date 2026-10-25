// «Новые функции» in the admin («Как идут дела»): which of the newer parts are used. Only the part's name is sent,
// like the other events — nothing about the person, never what they typed.
import { track } from "../engine";

export type FeatureKey = "party_create" | "party_answer" | "party_take" | "diary_add" | "fast_on" | "freezer_add" | "freezer_thaw" | "look_change" | "photo_set";
export const feature = (key: FeatureKey): void => track({ type: "feature", text: key });
