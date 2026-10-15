// Grey placeholders in the shape of what is coming: the page does not jump and never looks empty or broken.
import { cx } from "./ui";

export const Bone = ({ className }: { className?: string }) => <span aria-hidden className={cx("skeleton block", className)} />;

/** A screen while saved data is being read: a title, a big card and a few rows. */
export function ScreenSkeleton({ home }: { home?: boolean }) {
  return (
    <div className="pt-3 sm:pt-6" role="status" aria-label="Загрузка">
      {home && <Bone className="h-4 w-28 rounded-full" />}
      <Bone className="mt-2 h-8 w-2/3 rounded-input" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Bone className="aspect-[4/3] w-full rounded-card" />
        <div className="grid content-start gap-3">
          <Bone className="h-16 rounded-card" />
          <Bone className="h-16 rounded-card" />
        </div>
      </div>
      <Bone className="mt-8 h-5 w-40 rounded-full" />
      <div className="mt-3 flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => <Bone key={i} className="aspect-[3/4] w-[44%] shrink-0 rounded-card sm:w-48" />)}
      </div>
    </div>
  );
}
