// The hosting (reg.ru nginx) answers any multipart/form-data request on the whole domain with 403 (found 2026-10-22):
// recipe photos, covers, School pictures, review photos never reached the server. So a form sent to our API goes as
// JSON instead — its fields, and its files in base64 — with the header X-Cook-Form; the server turns it back into a
// form (server/api/_private/lib.php, cook_form_unpack). Installed once in the site and in the admin (the old admin
// bundle sends its photos with fetch too); every other request goes out untouched.

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

type Packed = { name: string; type: string; data: string };

export function installFormShim(): void {
  const w = window as Window & { __cookFormShim?: boolean };
  if (w.__cookFormShim || typeof window.fetch !== "function") return;
  w.__cookFormShim = true;
  const send = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!(init?.body instanceof FormData) || !/api\/index\.php/.test(url)) return send(input, init);
    const fields: Record<string, string | string[]> = {};
    const files: Record<string, Packed[]> = {};
    for (const [k, v] of init.body.entries()) {
      if (typeof v === "string") {
        const had = fields[k];
        fields[k] = had === undefined ? v : Array.isArray(had) ? [...had, v] : [had, v];
      } else (files[k] ??= []).push({ name: v.name, type: v.type, data: await toBase64(v) });
    }
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("X-Cook-Form", "1");
    return send(input, { ...init, headers, body: JSON.stringify({ fields, files }) });
  };
}
