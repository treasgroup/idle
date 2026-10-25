// The legal documents (privacy, rules, terms, sources): their texts load with the screens that show them, not with
// the first page — the first visit downloads less.
import * as legal from "./legal.js";
import type { LegalInfo, LegalKey } from "./index";

export const LEGAL_TITLES: Record<LegalKey, string> = legal.Or;
export const legalInfo = (): Promise<LegalInfo> => legal.PO();
export const legalDoc = (key: LegalKey, info: LegalInfo): { key: string; title: string; sections: { h?: string; p: string[] }[] } => legal.YA(key, info);
