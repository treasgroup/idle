// Kitchen words in recipe steps (app/glossary): quietly underlined; a tap shows a short sheet with what it means and,
// where there is one, the lesson from Школа готовки. The tap never turns the cooking step (it stops there).
import { useState, type ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { splitTerms, type Term } from "../app/glossary";
import { push } from "../app/router";
import { LESSONS } from "../screens/learn-data";
import { Sheet } from "./ui";

export function useTerms(): { render: (text: string) => ReactNode; sheet: ReactNode } {
  const [term, setTerm] = useState<Term | null>(null);
  const lesson = term?.lesson ? LESSONS.find((l) => l.id === term.lesson) : undefined;
  const render = (text: string) => splitTerms(text).map((p, i) => (typeof p === "string" ? p : (
    <button key={i} type="button" className="underline decoration-herb decoration-dotted decoration-2 underline-offset-[5px] hover:text-herb"
      onClick={(e) => { e.stopPropagation(); setTerm(p.term); }} aria-label={p.text + " — что это значит"}>{p.text}</button>
  )));
  const sheet = (
    <Sheet open={!!term} title={term?.title ?? ""} onClose={() => setTerm(null)}>
      <p className="text-body">{term?.text}</p>
      {lesson && (
        <button className="btn-outline mt-5 h-12 w-full" onClick={() => { setTerm(null); push("#/learn/" + lesson.id); }}>
          <GraduationCap size={20} aria-hidden />Урок «{lesson.title}»
        </button>
      )}
    </Sheet>
  );
  return { render, sheet };
}
