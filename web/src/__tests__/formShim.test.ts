// The hosting blocks multipart forms: a form to our API must leave as JSON with its files in base64 (app/formShim).
import { afterAll, describe, expect, it } from "vitest";

const sent: { url: string; init?: RequestInit }[] = [];
const g = globalThis as unknown as { window: typeof globalThis; fetch: typeof fetch };
const realWindow = g.window;
g.window = globalThis;
const realFetch = g.fetch;
g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { sent.push({ url: String(input), init }); return new Response("{}"); }) as typeof fetch;
const { installFormShim } = await import("../app/formShim");
installFormShim();
afterAll(() => { g.fetch = realFetch; g.window = realWindow; });

describe("forms with files go as JSON", () => {
  it("packs the fields and the files of a form sent to the API", async () => {
    const f = new FormData();
    f.append("key", "knife-board-2");
    f.append("photos[]", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    f.append("photos[]", new File([new Uint8Array([4, 5])], "b.jpg", { type: "image/jpeg" }));
    await fetch("../api/index.php?r=admin.school.image", { method: "POST", body: f });
    const { init } = sent[sent.length - 1];
    const h = new Headers(init?.headers);
    expect(h.get("X-Cook-Form")).toBe("1");
    expect(h.get("Content-Type")).toBe("application/json");
    const body = JSON.parse(String(init?.body));
    expect(body.fields).toEqual({ key: "knife-board-2" });
    expect(body.files["photos[]"].map((x: { name: string; data: string }) => [x.name, x.data])).toEqual([["a.jpg", "AQID"], ["b.jpg", "BAU="]]);
  });
  it("leaves every other request alone", async () => {
    await fetch("../api/index.php?r=catalog");
    expect(sent[sent.length - 1].init).toBeUndefined();
    const f = new FormData(); f.append("x", "1");
    await fetch("https://example.org/upload", { method: "POST", body: f });
    expect(sent[sent.length - 1].init?.body).toBeInstanceOf(FormData);
  });
});
