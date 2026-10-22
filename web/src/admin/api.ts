// The admin page lives at /admin/: the server is one folder up.
const url = (route: string, params?: Record<string, string | number>) => "../api/index.php?r=" + encodeURIComponent(route)
  + (params ? Object.entries(params).map(([k, v]) => "&" + encodeURIComponent(k) + "=" + encodeURIComponent(String(v))).join("") : "");

async function answer<T>(r: Response): Promise<T> {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || "Сервер ответил ошибкой " + r.status + ".");
  return j as T;
}

export const get = <T>(route: string, params?: Record<string, string | number>): Promise<T> => fetch(url(route, params), { credentials: "same-origin" }).then((r) => answer<T>(r));
export const post = <T>(route: string, body: unknown): Promise<T> =>
  fetch(url(route), { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => answer<T>(r));
export const upload = <T>(route: string, form: FormData): Promise<T> =>
  fetch(url(route), { method: "POST", credentials: "same-origin", body: form }).then((r) => answer<T>(r));

/** A recipe's photo as the site shows it, or null without one. */
export const photo = (id: string, versions: Record<string, number>): string | null => (versions[id] ? "../photos/" + id + ".jpg?v=" + versions[id] : null);
