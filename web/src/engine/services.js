// @ts-nocheck
/* eslint-disable */
// Services: voice, PWA, catalog loading, analytics, sync, menu planner, reviews API.
// Ported as-is from the previous build of the site (minified names kept for now).
// Readable names live in ./index.ts — import from there, not from this file.
import * as React from "react";
import {
  rn,
  Vb,
  F,
  Za,
  Gb,
  Kb,
  Qa,
  _e,
  Xe,
  pt,
  Fa,
  Yb,
  nt,
  Ne,
  zi,
  Qb,
  Zt,
  Ar,
  Jb,
  Lp,
  Bp,
  We,
  Qe,
  Zs,
  fu,
  Vp,
  gn,
  $p,
  Us,
  im,
  mt,
  hu,
  wt,
  bu,
  T0,
  lm,
  S0,
  C0,
  MyR,
  vu,
} from "./core.js";

var Nt = React;
function PC() {
  if (typeof window > "u") return null;
  let e = window;
  return e.SpeechRecognition || e.webkitSpeechRecognition || null;
}
function J_() {
  return !!PC();
}
var LC = 60,
  $_ = 3500,
  W_ = () =>
    typeof navigator < "u" && /iphone|ipad|ipod/i.test(navigator.userAgent),
  BC = () =>
    mt()
      ? "Нет доступа к микрофону. Откройте «Настройки» телефона → «Приложения» → «Что приготовить?» → «Разрешения» → «Микрофон» → «Разрешить», затем нажмите на микрофон ещё раз."
      : W_()
        ? "Нет доступа к микрофону. Откройте «Настройки» → «Safari» → «Микрофон» → «Разрешить», затем вернитесь сюда и нажмите на микрофон ещё раз."
        : "Нет доступа к микрофону. Нажмите на значок слева от адреса сайта (замок или настройки) → «Разрешения» → «Микрофон» → «Разрешить», затем нажмите на микрофон ещё раз.";
var eO = () => typeof navigator < "u" && /android/i.test(navigator.userAgent);
function jC(e, t, n, a) {
  let [i, s] = (0, Nt.useState)("idle"),
    [r, o] = (0, Nt.useState)(0),
    [l, u] = (0, Nt.useState)(""),
    [f, p] = (0, Nt.useState)(!1),
    m = (0, Nt.useRef)(!1),
    y = (0, Nt.useRef)(null),
    S = (0, Nt.useRef)(""),
    w = (0, Nt.useRef)(""),
    v = (0, Nt.useRef)(null),
    b = (0, Nt.useRef)(null),
    g = (0, Nt.useRef)(null),
    x = (0, Nt.useRef)([]),
    N = (0, Nt.useRef)(0),
    _ = (0, Nt.useRef)(!1),
    B = (0, Nt.useRef)(null),
    R = (0, Nt.useRef)(null);
  (0, Nt.useEffect)(() => {
    queueMicrotask(() => p(J_()));
  }, []);
  let T = () => {
      B.current && clearInterval(B.current),
        (B.current = null),
        v.current && clearTimeout(v.current),
        (v.current = null);
    },
    C = () => {
      g.current?.getTracks().forEach((Q) => Q.stop()), (g.current = null);
    },
    M = (Q) => {
      (N.current = Date.now()),
        o(0),
        (B.current = setInterval(() => {
          let ne = Math.floor((Date.now() - N.current) / 1e3);
          o(ne), ne >= LC && Q();
        }, 250));
    };
  function Z() {
    (_.current = !0),
      R.current?.abort(),
      y.current?.abort(),
      (y.current = null),
      b.current?.state === "recording" && b.current.stop(),
      C(),
      T(),
      (x.current = []),
      (S.current = ""),
      u(""),
      s("idle"),
      o(0);
  }
  function V() {
    let Q = PC();
    if (!Q) return !1;
    let ne = new Q();
    (y.current = ne),
      (_.current = !1),
      (S.current = ""),
      (w.current = ""),
      u(""),
      (ne.lang = "ru-RU"),
      (ne.continuous = !eO()),
      (ne.interimResults = !0),
      (ne.maxAlternatives = 1);
    let ke = !1,
      P = null,
      vt = !1,
      He = () => {
        v.current && clearTimeout(v.current),
          (v.current = setTimeout(() => ne.stop(), $_));
      };
    (ne.onstart = () => {
      (vt = !0), He();
    }),
      (ne.onresult = (ze) => {
        ke = !0;
        let W = [],
          le = [];
        for (let Ze = 0; Ze < ze.results.length; Ze++) {
          let Mt = ze.results[Ze];
          (Mt.isFinal ? W : le).push(Mt[0].transcript);
        }
        (S.current = Yb(W).slice(0, 2e3)),
          (w.current = Yb([...W, ...le]).slice(0, 2e3)),
          u(w.current),
          He();
      }),
      (ne.onerror = (ze) => {
        (P && ze.error === "aborted") || (P = ze.error);
      }),
      (ne.onend = () => {
        T(), (y.current = null);
        let ze = (S.current || w.current).trim();
        if (((w.current = ""), u(""), s("idle"), o(0), !_.current)) {
          if (ze) {
            e(ze.slice(0, 2e3));
            return;
          }
          if (P === "not-allowed") t(BC());
          else if (
            P &&
            [
              "network",
              "service-not-allowed",
              "language-not-supported",
              "audio-capture",
            ].includes(P)
          ) {
            if (((m.current = !0), a)) {
              k();
              return;
            }
            t(
              P === "audio-capture"
                ? "Микрофон не найден. Напишите запрос текстом."
                : "Голосовой ввод в этом браузере сейчас недоступен. Попробуйте Chrome или Safari, либо напишите текст.",
            );
          } else {
            if (P === "aborted") return;
            ke ||
              t("Не услышал речь. Нажмите на микрофон и скажите, что хочется.");
          }
        }
      });
    try {
      ne.start();
    } catch {
      return (y.current = null), !1;
    }
    return (
      s("recording"),
      M(() => ne.stop()),
      mt() ||
        setTimeout(() => {
          !vt &&
            y.current === ne &&
            !_.current &&
            ((P = "service-not-allowed"), ne.abort());
        }, 4e3),
      !0
    );
  }
  async function k() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      t(
        "В этом браузере запись недоступна. Попробуйте Safari или Chrome либо напишите текст.",
      );
      return;
    }
    try {
      await n(),
        (_.current = !1),
        (g.current = await navigator.mediaDevices.getUserMedia({ audio: !0 }));
      let Q = [
          "audio/webm;codecs=opus",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((ke) => MediaRecorder.isTypeSupported(ke)),
        ne = new MediaRecorder(g.current, Q ? { mimeType: Q } : void 0);
      (b.current = ne),
        (x.current = []),
        (ne.ondataavailable = (ke) => {
          ke.data.size && x.current.push(ke.data);
        }),
        (ne.onerror = () => {
          Z(), t("Запись прервалась. Попробуйте снова.");
        }),
        (ne.onstop = async () => {
          if ((C(), T(), _.current)) return;
          let ke = Math.min(LC, (Date.now() - N.current) / 1e3),
            P = ne.mimeType,
            vt = new Blob(x.current, { type: P });
          if (((x.current = []), !vt.size || ke < 0.2)) {
            s("idle"), t("Запись слишком короткая.");
            return;
          }
          if (vt.size > 5 * 1024 * 1024) {
            s("idle"), t("Запись слишком большая. Попробуйте короче.");
            return;
          }
          s("transcribing");
          let He = new AbortController();
          R.current = He;
          let ze = setTimeout(() => He.abort(), 35e3);
          try {
            let W = new FormData(),
              le = P.includes("mp4")
                ? "m4a"
                : P.includes("ogg")
                  ? "ogg"
                  : "webm";
            W.append("audio", vt, "voice." + le),
              W.append("operationId", crypto.randomUUID()),
              W.append("duration", ke.toFixed(2));
            let Ze = await fetch(wt("transcriptions"), {
                method: "POST",
                body: W,
                signal: He.signal,
              }),
              Mt = await Ze.json();
            if (!Ze.ok)
              throw new Error(Mt.error || "Не удалось распознать запись.");
            _.current || e(Mt.text);
          } catch (W) {
            _.current ||
              t(
                W instanceof Error && W.name !== "AbortError"
                  ? W.message
                  : "Распознавание не ответило вовремя. Попробуйте ещё раз.",
              );
          } finally {
            clearTimeout(ze), (R.current = null), _.current || s("idle");
          }
        }),
        ne.start(250),
        s("recording"),
        M(() => {
          ne.state === "recording" && ne.stop();
        });
    } catch (Q) {
      C(),
        T(),
        s("idle"),
        t(
          Q instanceof DOMException && Q.name === "NotAllowedError"
            ? BC()
            : Q instanceof Error
              ? Q.message
              : "Не удалось начать запись.",
        );
    }
  }
  let U = (f && !m.current) || a;
  async function Y() {
    if (i === "idle" && !(f && !m.current && V())) {
      if (a) {
        await k();
        return;
      }
      t(
        "Голосовой ввод в этом браузере недоступен. Попробуйте Chrome или Safari, либо напишите текст.",
      );
    }
  }
  function G() {
    if (y.current) {
      y.current.stop();
      return;
    }
    b.current?.state === "recording" && b.current.stop();
  }
  return (
    (0, Nt.useEffect)(
      () => () => {
        (_.current = !0),
          R.current?.abort(),
          y.current?.abort(),
          b.current?.state === "recording" && b.current.stop(),
          C(),
          T();
      },
      [],
    ),
    {
      state: i,
      seconds: r,
      interim: l,
      available: U,
      start: Y,
      stop: G,
      cancel: Z,
    }
  );
}
var Pi = React;
function HC(e) {
  let [t, n] = (0, Pi.useState)(!1),
    [a, i] = (0, Pi.useState)(!1),
    [s, r] = (0, Pi.useState)(!1),
    [o, l] = (0, Pi.useState)(!1),
    u = (0, Pi.useRef)(null);
  (0, Pi.useEffect)(() => {
    if (mt()) {
      queueMicrotask(() => {
        n(!0), l(!0);
      });
      return;
    }
    let p = window.matchMedia("(display-mode: standalone)"),
      m = () => n(p.matches || navigator.standalone === !0);
    queueMicrotask(() => {
      m(),
        r(
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
        );
    });
    let y = (w) => {
        w.preventDefault(), (u.current = w), i(!0);
      },
      S = () => {
        (u.current = null), n(!0), i(!1);
      };
    return (
      window.addEventListener("beforeinstallprompt", y),
      window.addEventListener("appinstalled", S),
      p.addEventListener("change", m),
      "serviceWorker" in navigator &&
        navigator.serviceWorker
          .register("./sw.js")
          .then(() => navigator.serviceWorker.ready)
          .then((w) => {
            let v = w.active;
            if (!v) return;
            let b = new MessageChannel();
            (b.port1.onmessage = (g) => l(g.data.ready === !0)),
              v.postMessage(
                {
                  type: "CACHE_ASSETS",
                  urls: performance
                    .getEntriesByType("resource")
                    .map((g) => g.name),
                },
                [b.port2],
              );
          })
          .catch(() =>
            e(
              "Автономный режим недоступен в этом браузере. Остальные функции работают.",
            ),
          ),
      () => {
        window.removeEventListener("beforeinstallprompt", y),
          window.removeEventListener("appinstalled", S),
          p.removeEventListener("change", m);
      }
    );
  }, [e]);
  async function f() {
    if (!u.current) return !1;
    try {
      await u.current.prompt();
      let p = await u.current.userChoice;
      return (u.current = null), i(!1), p.outcome === "accepted";
    } catch {
      return e("Браузер не смог показать установку."), !1;
    }
  }
  return { installed: t, canInstall: a, ios: s, offlineReady: o, install: f };
}
var ku = (e) =>
    pt(e)
      .filter((t) => !/^[,.;:!?]$/.test(t))
      .map(Xe),
  dm = (e) => e.replace(/о/g, "а"),
  tO = (e, t) =>
    t.startsWith(e) ||
    dm(t).startsWith(dm(e)) ||
    (e.length >= 4 && (Fa(e, t) || Fa(dm(e), dm(t))));
function nO(e, t, n = new Set()) {
  let a = ku(t),
    i = a.filter((f) => f.length >= 3),
    s = i.length ? i : a.filter((f) => f.length >= 2);
  if (!s.length) return 0;
  let r = ku([e.title, ...(e.aliases || [])].join(" ")),
    o = qC(e),
    l = (f, p) => (n.has(f) ? p.startsWith(f) : tO(f, p)),
    // «борщ»: dishes called so go first — the title's first word, then any word of the title, before an
    // «also called» name («Щи со щавелем» is «зелёный борщ» too).
    ti = ku(e.title),
    u = 0;
  for (let f of s)
    if (r.some((p) => l(f, p))) u += 2 + (ti[0] && l(f, ti[0]) ? 1.5 : ti.some((p) => l(f, p)) ? 1 : 0);
    else if (o.some((p) => p.startsWith(f))) u += 1;
    else return 0;
  return u;
}
function qC(e) {
  let t = new Map(Za().map((i) => [i.id, i])),
    n = Qa.groupAliases,
    a = (i) => ku(i)[0];
  return e.ingredients
    .flatMap((i) => {
      let s = t.get(i.id);
      return [
        i.name,
        ...(s?.aliases || []),
        ...(s?.groups || []).flatMap((r) =>
          (n[r] || []).filter((o) => !o.startsWith("без ")),
        ),
      ].map(a);
    })
    .filter((i) => !!i);
}
function fm(e, t = F) {
  let n = new Set(
      F.flatMap((i) => [
        ...ku([i.title, ...(i.aliases || [])].join(" ")),
        ...qC(i),
      ]),
    ),
    a = new Set(ku(e).filter((i) => [...n].some((s) => s.startsWith(i))));
  return t
    .map((i) => ({ r: i, s: nO(i, e, a) }))
    .filter((i) => i.s > 0)
    .sort((i, s) => s.s - i.s)
    .map((i) => i.r);
}
var GC = [
    { key: "dish", label: "Блюда" },
    { key: "situation", label: "Ситуации" },
    { key: "pref", label: "Предпочтения" },
  ],
  VC = (e) => (e.storageDays ?? 0) >= 2 && ["main", "soup"].includes(Ne(e)),
  R0 = [
    {
      key: "soup",
      label: "Супы",
      group: "dish",
      test: (e) => nt(e, "dish:soup"),
    },
    {
      key: "main",
      label: "Вторые блюда",
      group: "dish",
      test: (e) => Ne(e) === "main" && !nt(e, "dish:soup"),
      min: 3,
    },
    {
      key: "salad",
      label: "Салаты",
      group: "dish",
      test: (e) => nt(e, "dish:salad"),
    },
    {
      key: "breakfast",
      label: "Завтраки",
      group: "dish",
      test: (e) => nt(e, "dish:breakfast"),
    },
    {
      key: "baking",
      label: "Выпечка",
      group: "dish",
      test: (e) => nt(e, "dish:baking"),
    },
    {
      key: "sweet",
      label: "Сладкое",
      group: "dish",
      test: (e) => e.tags.includes("sweet"),
    },
    {
      key: "quick",
      label: "Быстро",
      group: "situation",
      test: (e) => e.totalMinutes <= 25,
    },
    {
      key: "budget",
      label: "Бюджетно",
      group: "situation",
      test: (e) => e.budget === "low",
      min: 3,
    },
    {
      key: "guests",
      label: "Для гостей",
      group: "situation",
      test: (e) =>
        !!e.occasions?.some((t) => t !== "everyday" && t !== "picnic"),
      min: 3,
    },
    {
      key: "kids",
      label: "Детям",
      group: "situation",
      test: (e) => e.kids === !0,
      min: 3,
    },
    {
      key: "days",
      label: "На несколько дней",
      group: "situation",
      test: (e) => VC(e) && (e.storageDays ?? 0) >= 3 && e.maxServings >= 6,
      min: 3,
    },
    {
      key: "reheat",
      label: "Хорошо разогревается",
      group: "situation",
      test: VC,
      min: 3,
    },
    {
      key: "freezer",
      label: "Можно заморозить",
      group: "situation",
      test: (e) => !!e.freezerDays,
      min: 3,
    },
    {
      key: "vegetarian",
      label: "Без мяса",
      group: "pref",
      test: (e) => e.tags.includes("vegetarian"),
    },
    { key: "lenten", label: "Постное", group: "pref", test: Ar, min: 3 },
    {
      key: "hearty",
      label: "Сытное",
      group: "pref",
      test: (e) => e.tags.includes("hearty"),
    },
    {
      key: "light",
      label: "Лёгкое",
      group: "pref",
      test: (e) => e.tags.includes("light"),
      min: 3,
    },
  ];
var N0 = null;
function KC(e) {
  N0 = e;
}
function pm(e) {
  if (!N0) return hu() + "photos/" + e + ".jpg";
  let t = N0[e];
  return t ? hu() + "photos/" + e + ".jpg?v=" + t : null;
}
// The smaller copy for cards (server/api/_private/ops.php): the plain file once made, else the server makes it.
var pmT = new Set();
function pmSetThumbs(e) {
  pmT = new Set(e);
}
function pmSmall(e) {
  if (!N0) return pm(e);
  let t = N0[e];
  if (!t) return null;
  return pmT.has(e)
    ? hu() + "photos/s/" + e + "-" + t + ".jpg"
    : hu() + "api/index.php?r=thumb&id=" + encodeURIComponent(e) + "&v=" + t;
}
var YC = new Set();
function XC(e) {
  YC = new Set(e);
}
var QC = (e) => !YC.has(e);
var mm = new Set([
  "и",
  "в",
  "во",
  "на",
  "с",
  "со",
  "а",
  "но",
  "я",
  "мне",
  "меня",
  "у",
  "к",
  "по",
  "за",
  "из",
  "от",
  "до",
  "же",
  "бы",
  "ли",
  "ну",
  "это",
  "то",
  "так",
  "вот",
  "уже",
  "еще",
  "ещё",
  "там",
  "тут",
  "мой",
  "моя",
  "мои",
  "мы",
  "нас",
  "он",
  "она",
  "они",
  "его",
  "ее",
  "её",
  "для",
  "о",
  "об",
  "при",
  "про",
  "над",
  "под",
  "чтобы",
  "чтоб",
  "если",
  "или",
  "да",
  "просто",
  "очень",
  "совсем",
  "прям",
  "прямо",
  "вообще",
  "сегодня",
  "сейчас",
  "что",
  "что-то",
  "что-нибудь",
  "чего",
  "хочу",
  "хочется",
  "хоч",
  "хотел",
  "можно",
  "есть",
  "будет",
  "был",
  "была",
  "было",
]);
function gm(e) {
  return pt(_e(e))
    .filter((t) => !/^[,.;:!?-]$/.test(t))
    .map(Xe);
}
function aO(e) {
  let t = gm(e),
    n = new Set();
  for (let i of t)
    mm.has(i) ||
      (n.add("w:" + i), i.length >= 6 && n.add("p:" + i.slice(0, 5)));
  let a = t.filter((i) => !mm.has(i));
  for (let i = 0; i + 1 < a.length; i++) n.add("b:" + a[i] + "_" + a[i + 1]);
  return t.length <= 2 && n.add("short"), [...n];
}
var M0 = null;
function iO(e, t) {
  M0?.model !== e &&
    (M0 = {
      model: e,
      stems: Object.keys(e.weights)
        .filter((a) => a.startsWith("w:"))
        .map((a) => a.slice(2)),
    });
  let n = new Set(t);
  for (let a of t) {
    if (!a.startsWith("w:") || e.weights[a]) continue;
    let i = a.slice(2);
    if (i.length < 4) continue;
    let s = M0.stems.find((r) => Fa(i, r));
    s && (n.add("w:" + s), s.length >= 6 && n.add("p:" + s.slice(0, 5)));
  }
  return [...n];
}
function sO(e, t) {
  let n = [...e.bias];
  for (let r of iO(e, aO(t))) {
    let o = e.weights[r];
    if (o) for (let [l, u] of o) n[l] += u;
  }
  let a = Math.max(...n),
    i = n.map((r) => Math.exp(r - a)),
    s = i.reduce((r, o) => r + o, 0);
  return i.map((r) => r / s);
}
function rO(e, t) {
  if (!gm(t).length) return null;
  let a = sO(e, t)
      .map((l, u) => [l, u])
      .sort((l, u) => u[0] - l[0]),
    [i, s] = a[0],
    [r, o] = a[1] ?? [0, 0];
  return {
    label: e.labels[s],
    prob: i,
    second: { label: e.labels[o], prob: r },
    source: "model",
  };
}
function oO(e, t) {
  let n = new Set(gm(t).filter((i) => !mm.has(i)));
  if (!n.size) return null;
  let a = null;
  for (let i of e) {
    let s = new Set(gm(i.text).filter((l) => !mm.has(l)));
    if (!s.size) continue;
    let r = 0;
    for (let l of n)
      (s.has(l) || [...s].some((u) => u.length >= 4 && Fa(l, u))) && r++;
    let o = r / Math.sqrt(n.size * s.size);
    (!a || o > a.sim) && (a = { t: i, sim: o });
  }
  return a && a.sim >= 0.75
    ? { label: a.t.label, prob: Math.min(1, a.sim), source: "taught" }
    : null;
}
var hm = null,
  FC = null;
// eslint-disable-next-line no-undef
function JC(e = "intent-model.json?v=" + (typeof __INTENT_V__ !== "undefined" ? __INTENT_V__ : "0")) {
  return (
    FC ??
      (FC = fetch(e)
        .then((t) => (t.ok ? t.json() : null))
        .then(
          (t) => (t && Array.isArray(t.labels) && t.weights && (hm = t), hm),
        )
        .catch(() => null)),
    FC
  );
}
var $C = [];
function WC(e) {
  $C = e;
}
function eA(e) {
  return oO($C, e) ?? (hm ? rO(hm, e) : null);
}
var ym = "cook-catalog",
  lO = "cook-catalog-v1";
function nA() {
  return new Promise((e, t) => {
    let n = indexedDB.open(lO, 1);
    (n.onupgradeneeded = () => n.result.createObjectStore("catalog")),
      (n.onerror = () => t(n.error)),
      (n.onsuccess = () => e(n.result));
  });
}
async function cO(e, v = "") {
  try {
    let t = await nA(),
      n = t.transaction("catalog", "readwrite");
    n.objectStore("catalog").put({ at: Date.now(), body: e, v }, "last"),
      (n.oncomplete = () => {
        t.close();
        // boot.js starts the catalog download together with the page only while there is no saved copy.
        try { localStorage.setItem("cook-catalog-saved", "1"); } catch {}
      });
  } catch {}
}
// The saved copy with its version (null when there is none).
async function uOv() {
  try {
    let e = await nA();
    return await new Promise((t) => {
      let n = e.transaction("catalog", "readonly"),
        a = n.objectStore("catalog").get("last");
      (a.onsuccess = () => t(a.result || null)),
        (a.onerror = () => t(null)),
        (n.oncomplete = () => e.close());
    });
  } catch {
    return null;
  }
}
async function uO() {
  try {
    let e = await nA();
    return await new Promise((t) => {
      let n = e.transaction("catalog", "readonly"),
        a = n.objectStore("catalog").get("last");
      (a.onsuccess = () => t(a.result?.body || null)),
        (a.onerror = () => t(null)),
        (n.oncomplete = () => e.close());
    });
  } catch {
    return null;
  }
}
async function dO(e) {
  // First the catalog's version (a few bytes): when the saved copy is the same, it is used as is — no 5 MB download
  // on every start, which matters on a slow hosting and in the app.
  let v = "";
  try {
    let r = await fetch(wt("catalog.version"), { signal: e });
    if (r.ok) v = String((await r.json()).v || "");
  } catch (x) {
    if (e?.aborted) throw x;
  }
  if (v) {
    let saved = await uOv();
    if (saved && saved.v === v && saved.body)
      try {
        let a = aA(saved.body, "server");
        if (a.source === "server") return a;
      } catch {}
  }
  let t = await fetch(wt("catalog"), { signal: e });
  if (!t.ok) throw new Error("сервер ответил " + t.status);
  let n = await t.json(),
    a = aA(n, "server");
  return a.source === "server" && cO(n, v), a;
}
function aA(e, t) {
  if (!Array.isArray(e.files) || !e.files.length)
    throw new Error("на сервере нет файлов в папке data/catalog");
  let n = Vb(e.files),
    a = new Set(
      Array.isArray(e.hidden)
        ? e.hidden.filter((i) => typeof i == "string")
        : [],
    );
  return (
    a.size && (n.recipes = n.recipes.filter((i) => !a.has(i.id))),
    Array.isArray(e.taught) &&
      WC(
        e.taught
          .filter(
            (i) =>
              !!i && typeof i.text == "string" && typeof i.label == "string",
          )
          .slice(0, 2e3),
      ),
    Array.isArray(e.realPhotos) &&
      XC(e.realPhotos.filter((i) => typeof i == "string")),
    Array.isArray(e.thumbs) &&
      pmSetThumbs(e.thumbs.filter((i) => typeof i == "string")),
    e.photos &&
      typeof e.photos == "object" &&
      KC(
        Object.fromEntries(
          Object.entries(e.photos).filter(([, i]) => typeof i == "number"),
        ),
      ),
    n.recipes.length
      ? (Gb(n), { built: n, source: t })
      : {
          built: n,
          source: "bundled",
          problem: "ни один рецепт с сервера не прошёл проверку",
        }
  );
}
async function tA(e) {
  let t = await uO();
  if (t)
    try {
      let n = aA(t, "saved");
      if (n.source === "saved") return { ...n, problem: e };
    } catch {}
  return { built: Kb, source: "bundled", problem: e };
}
// A later visit: the saved copy is shown at once and the server is asked in the background whether it changed;
// a newer catalog replaces it a moment later (the "cook-catalog" event). No waiting for the network at start.
async function bmSaved() {
  let saved = await uOv();
  if (!saved || !saved.body || !saved.v) return null;
  let a;
  try {
    a = aA(saved.body, "server");
  } catch {
    return null;
  }
  if (a.source !== "server") return null;
  (async () => {
    try {
      let r = await fetch(wt("catalog.version"));
      if (!r.ok) return;
      let v = String((await r.json()).v || "");
      if (!v || v === saved.v) return;
      let t = await fetch(wt("catalog"));
      if (!t.ok) return;
      let n = await t.json(),
        b = aA(n, "server");
      if (b.source === "server") cO(n, v), window.dispatchEvent(new Event(ym));
    } catch {}
  })();
  return a;
}
async function bm(e = 5e3, t = !1) {
  let quick = await bmSaved();
  if (quick) return quick;
  let n = new AbortController(),
    a = dO(t ? void 0 : n.signal),
    i = 0,
    s = new Promise((r) => {
      i = window.setTimeout(() => r("timeout"), e);
    });
  try {
    let r = await Promise.race([a, s]);
    return r !== "timeout"
      ? r
      : (t
          ? a
              .then((o) => {
                o.source === "server" && window.dispatchEvent(new Event(ym));
              })
              .catch(() => {})
          : n.abort(),
        await tA("сервер не ответил вовремя"));
  } catch (r) {
    return await tA(r instanceof Error ? r.message : "нет связи");
  } finally {
    clearTimeout(i);
  }
}
var iA =
    typeof window > "u"
      ? { href: "", referrer: "" }
      : { href: location.href, referrer: document.referrer },
  fO =
    /bot\b|bot\/|crawl|spider|slurp|yandex(bot|images|metrika|renderresources|mobilebot|webmaster|favicons)|googlebot|google-inspectiontool|adsbot|mediapartners|lighthouse|pagespeed|headlesschrome|phantomjs|puppeteer|playwright|selenium|bingpreview|petalbot|ahrefs|semrush|bytespider|applebot|duckduckbot|baiduspider/i;
function pO() {
  try {
    return !!navigator.webdriver || fO.test(navigator.userAgent || "");
  } catch {
    return !1;
  }
}
var mO = [
  ["yandex", /(^|\.)(yandex\.[a-z.]+|ya\.ru)$/],
  ["google", /(^|\.)google\.[a-z.]+$/],
  ["bing", /(^|\.)bing\.com$/],
  ["mail", /(^|\.)mail\.ru$/],
  ["vk", /(^|\.)(vk\.com|vk\.ru|vkontakte\.ru)$/],
  ["telegram", /(^|\.)(t\.me|telegram\.org|telegram\.me)$/],
  ["ok", /(^|\.)ok\.ru$/],
  ["max", /(^|\.)max\.ru$/],
  ["whatsapp", /(^|\.)(whatsapp\.com|wa\.me)$/],
  ["dzen", /(^|\.)dzen\.ru$/],
  ["rustore", /(^|\.)rustore\.ru$/],
];
function sA(e = iA) {
  try {
    let t = new URL(e.href),
      n = (t.searchParams.get("utm_source") || "")
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, "")
        .slice(0, 60);
    if (n) return n;
    if (!e.referrer) return "direct";
    let a = new URL(e.referrer),
      i = a.hostname.toLowerCase().replace(/^(www|m|l)\./, "");
    for (let [s, r] of mO) if (r.test(i)) return s;
    return i === t.hostname.toLowerCase()
      ? /recipe\.php|\/recipes?\/|recipes\.php/.test(a.pathname)
        ? "recipe-page"
        : "treas"
      : i.replace(/[^a-z0-9.-]/g, "").slice(0, 60) || "direct";
  } catch {
    return "direct";
  }
}
function gO(e = iA) {
  try {
    let t = new URL(e.href),
      n = sA(e);
    return t.searchParams.has("recipe")
      ? n === "recipe-page"
        ? "recipe-page"
        : "recipe-link"
      : /^#poll=/.test(t.hash)
        ? "poll"
        : /^#family=/.test(t.hash)
          ? "family"
          : /^#login=/.test(t.hash)
            ? "login"
            : t.searchParams.has("tab")
              ? "tab"
              : "home";
  } catch {
    return "home";
  }
}
var Is = [],
  xu;
function vm() {
  try {
    let e = localStorage.getItem("cook-visitor");
    return (
      (!e || !/^[0-9a-f-]{16,40}$/.test(e)) &&
        ((e = crypto.randomUUID()), localStorage.setItem("cook-visitor", e)),
      e
    );
  } catch {
    return vm.fallback ?? (vm.fallback = crypto.randomUUID());
  }
}
function km() {
  if ((window.clearTimeout(xu), (xu = void 0), !Is.length || !navigator.onLine))
    return;
  let e = Is.splice(0, 20);
  try {
    fetch(wt("event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor: vm(), events: e }),
      keepalive: !0,
    }).catch(() => {});
  } catch {}
  Is.length && (xu = window.setTimeout(km, 500));
}
function Pn(e) {
  pO() ||
    (e.type === "visit" &&
      (e = { ...e, ref: mt() ? "app" : sA(), entry: mt() ? "app" : gO() }),
    e.text && (e = { ...e, text: e.text.trim().slice(0, 300) }),
    Is.push(e),
    Is.length > 60 && (Is = Is.slice(-60)),
    Is.length >= 20
      ? km()
      : xu === void 0 && (xu = window.setTimeout(km, 2e3)));
}
typeof window < "u" && window.addEventListener("pagehide", km);
function rA() {
  if (mt()) return "app";
  try {
    return matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone
      ? "pwa"
      : matchMedia("(pointer: coarse)").matches
        ? "mobile"
        : "desktop";
  } catch {
    return "";
  }
}
var jn = React;
var oA = {
  одну: 1,
  одна: 1,
  один: 1,
  две: 2,
  два: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  пятнадцать: 15,
  двадцать: 20,
  "двадцать пять": 25,
  тридцать: 30,
  сорок: 40,
  "сорок пять": 45,
  пятьдесят: 50,
  полчаса: 30,
  час: 60,
  "полтора часа": 90,
  минуту: 1,
  "пару минут": 2,
};
function hO(e) {
  let t = _e(e)
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  if (/(выключи микрофон|не слушай|перестань слушать|хватит слушать)/.test(t))
    return { type: "stopListening" };
  if (
    /(стоп|останови|сбрось|выключи|отмени|убери)\S* таймер|таймер (стоп|выключи|сбрось|отмени)/.test(
      t,
    )
  )
    return { type: "timerStop" };
  if (
    /(сколько (осталось|ещ[её]|времени|минут осталось)|когда будет готово)/.test(
      t,
    )
  )
    return { type: "timeLeft" };
  if (/(таймер|засеки|засечь|поставь на)/.test(t)) {
    let n = t.match(/(\d{1,3})\s*(час|ч\b)?/);
    if (n) return { type: "timer", minutes: Number(n[1]) * (n[2] ? 60 : 1) };
    let a = Object.keys(oA)
      .sort((i, s) => s.length - i.length)
      .find((i) => t.includes(i));
    return { type: "timer", minutes: a ? oA[a] : null };
  }
  return /^(а\s+)?(сколько|чем|можно|как|какой|какая|какое|на сколько|что если|если нет)\s/.test(
    t,
  ) &&
    !/^(сколько (нужно|надо|класть|положить)$|что делать$)/.test(t) &&
    !/(ингредиент|продукт|состав)/.test(t)
    ? { type: "ask", text: t }
    : /(ингредиент|продукт|состав|что нужно|что понадобится|сколько (нужно|надо|класть|положить))/.test(
          t,
        )
      ? { type: "ingredients" }
      : /(повтори|ещ[её] раз|не расслышал|не поняла|не понял|прочитай|читай|что делать)/.test(
            t,
          )
        ? { type: "repeat" }
        : /(назад|предыдущ|верни|обратно|прошлый шаг)/.test(t)
          ? { type: "back" }
          : /(дальше|далее|следующ|вперед|вперёд|продолж|сделал|сделала|готово|го дальше|поехали)/.test(
                t,
              )
            ? { type: "next" }
            : /(закрой|выход|выйти|закончить готовку|хватит готовить)/.test(t)
              ? { type: "close" }
              : /(помощь|какие команды|что ты умеешь|что можно сказать)/.test(t)
                ? { type: "help" }
                : null;
}
var lA = () => {
    if (typeof window > "u") return null;
    let e = window;
    return e.SpeechRecognition || e.webkitSpeechRecognition || null;
  },
  yO = () => !!lA();
function cA(e, t, n) {
  let [a, i] = (0, jn.useState)(!1),
    [s, r] = (0, jn.useState)(""),
    o = (0, jn.useRef)(null),
    l = (0, jn.useRef)(!1),
    u = (0, jn.useRef)(e),
    f = (0, jn.useRef)({ key: "", at: 0 }),
    p = (0, jn.useRef)(t),
    m = (0, jn.useRef)(n),
    y = (0, jn.useRef)(0);
  (p.current = t), (m.current = n), (u.current = e);
  function S() {
    let v = lA();
    if (!v || o.current || l.current || !u.current) return;
    let b = new v();
    (o.current = b),
      (b.lang = "ru-RU"),
      (b.continuous = !0),
      (b.interimResults = !1),
      (b.onresult = (g) => {
        y.current = 0;
        for (let x = g.resultIndex; x < g.results.length; x++) {
          let N = g.results[x];
          if (!N.isFinal) continue;
          let _ = N[0].transcript.trim(),
            B = hO(_);
          if ((r(_), !B)) continue;
          let R = JSON.stringify(B),
            T = Date.now();
          (f.current.key === R && T - f.current.at < 2500) ||
            ((f.current = { key: R, at: T }), p.current(B, _));
        }
      }),
      (b.onerror = (g) => {
        g.error === "not-allowed" || g.error === "service-not-allowed"
          ? ((u.current = !1),
            m.current(
              "Нет доступа к микрофону — голосовое управление выключено. Разрешите микрофон для сайта и включите снова.",
            ))
          : g.error !== "no-speech" && g.error !== "aborted" && y.current++;
      }),
      (b.onend = () => {
        (o.current = null),
          i(!1),
          u.current &&
            !l.current &&
            y.current < 5 &&
            setTimeout(S, y.current ? 800 : 250);
      });
    try {
      b.start(), i(!0);
    } catch {
      o.current = null;
    }
  }
  function w() {
    let v = o.current;
    if (((o.current = null), v)) {
      v.onend = null;
      try {
        v.abort();
      } catch {}
    }
    i(!1);
  }
  return (
    (0, jn.useEffect)(
      () => (
        e ? ((l.current = !1), (y.current = 0), S()) : w(),
        () => {
          u.current || w();
        }
      ),
      [e],
    ),
    (0, jn.useEffect)(
      () => () => {
        (u.current = !1), w();
      },
      [],
    ),
    {
      listening: a,
      heard: s,
      supported: yO(),
      pause() {
        (l.current = !0), w();
      },
      resume() {
        (l.current = !1), u.current && setTimeout(S, 300);
      },
    }
  );
}
var fe = (e, t, n = ["упаковка", "упаковки", "упаковок"]) => ({
    unit: e,
    sizes: t,
    word: n,
  }),
  bO = {
    "sour-cream": fe("г", [180, 300, 400]),
    "cottage-cheese": fe("г", [180, 200, 400]),
    cream: fe("мл", [200, 500]),
    milk: fe("мл", [900, 1e3], ["пакет", "пакета", "пакетов"]),
    kefir: fe("мл", [450, 900], ["пакет", "пакета", "пакетов"]),
    "plain-yogurt": fe("г", [130, 350]),
    butter: fe("г", [180]),
    "hard-cheese": fe("г", [200]),
    "processed-cheese": fe("г", [90, 200]),
    "feta-cheese": fe("г", [200]),
    egg: fe("шт.", [10], ["десяток", "десятка", "десятков"]),
    "wheat-flour": fe("г", [1e3, 2e3], ["пачка", "пачки", "пачек"]),
    sugar: fe("г", [1e3], ["пачка", "пачки", "пачек"]),
    semolina: fe("г", [800]),
    rice: fe("г", [800, 900]),
    buckwheat: fe("г", [800, 900]),
    millet: fe("г", [800]),
    "pearl-barley": fe("г", [800]),
    "oat-flakes": fe("г", [400, 500]),
    pasta: fe("г", [400, 450], ["пачка", "пачки", "пачек"]),
    "wheat-noodle": fe("г", [400]),
    "red-lentil": fe("г", [400, 450]),
    "split-pea": fe("г", [800]),
    couscous: fe("г", [400]),
    "tomato-paste": fe("г", [70, 140, 270], ["банка", "банки", "банок"]),
    "canned-tomato": fe("г", [400], ["банка", "банки", "банок"]),
    "canned-beans": fe("г", [400], ["банка", "банки", "банок"]),
    "canned-chickpea": fe("г", [400], ["банка", "банки", "банок"]),
    "canned-corn": fe("г", [340], ["банка", "банки", "банок"]),
    "canned-peas": fe("г", [400], ["банка", "банки", "банок"]),
    "canned-tuna": fe("г", [185], ["банка", "банки", "банок"]),
    "canned-pink-salmon": fe("г", [245], ["банка", "банки", "банок"]),
    "canned-beef-stew": fe("г", [325], ["банка", "банки", "банок"]),
    "black-olive": fe("г", [300], ["банка", "банки", "банок"]),
    mayonnaise: fe("г", [200, 400]),
    "soy-sauce": fe("мл", [150, 300], ["бутылка", "бутылки", "бутылок"]),
    "frozen-peas": fe("г", [400]),
    "frozen-dumplings": fe("г", [800]),
    "frozen-potato-dumplings": fe("г", [900]),
    "frozen-pitted-cherry": fe("г", [300]),
    "crab-sticks": fe("г", [200]),
    frankfurters: fe("г", [450]),
    ham: fe("г", [300]),
    "boiled-sausage": fe("г", [400]),
    lavash: fe("г", [100, 300]),
    "white-bread": fe("г", [400], ["батон", "батона", "батонов"]),
    breadcrumbs: fe("г", [200]),
    "minced-pork-beef": fe("г", [400, 500]),
    "minced-beef": fe("г", [400, 500]),
    "chicken-fillet": fe("г", [600, 900]),
    "instant-yeast": fe("г", [11], ["пакетик", "пакетика", "пакетиков"]),
    "vanilla-sugar": fe("г", [8, 10], ["пакетик", "пакетика", "пакетиков"]),
    raisins: fe("г", [150, 200]),
    "dried-apricot": fe("г", [200]),
    prunes: fe("г", [200]),
    walnut: fe("г", [100, 150]),
    "cocoa-powder": fe("г", [100]),
  };
function vO(e, t, n) {
  let a = bO[e];
  if (!a || a.unit !== n.trim() || !(t > 0)) return null;
  let i = Math.min(...a.sizes);
  if (t < i * 0.2) return null;
  let r =
    a.sizes
      .map((o) => {
        let l = Math.ceil(t / o - 1e-9);
        return { count: l, size: o, waste: l * o - t };
      })
      .filter((o) => o.waste < i - 1e-9)
      .sort((o, l) => o.count - l.count || o.waste - l.waste)[0] ?? null;
  return r
    ? {
        count: r.count,
        size: r.size,
        unit: a.unit,
        word: Jb(r.count, ...a.word),
      }
    : null;
}
function xm(e, t, n) {
  let a = vO(e, t, n);
  if (!a || a.count * a.size === t) return null;
  let i =
    a.unit === "шт." && a.size === 10
      ? ""
      : a.size >= 1e3 && a.unit !== "шт."
        ? (a.size / 1e3).toLocaleString("ru") + (a.unit === "мл" ? " л" : " кг")
        : a.size + " " + a.unit;
  return a.count === 1
    ? a.word + (i ? " " + i : "")
    : a.count + " " + a.word + (i ? " по " + i : "");
}
var uA = [
  { id: "vk", label: "ВКонтакте" },
  { id: "max", label: "MAX" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
];
function dA(e) {
  return Ua() + "recipe.php?id=" + encodeURIComponent(e);
}
function Ua() {
  if (mt()) return im;
  try {
    return location.origin + location.pathname.replace(/[^/]*$/, "");
  } catch {
    return "";
  }
}
function fA(e, t = "Список покупок") {
  let a = Lp(e.filter((i) => !i.checked)).map(
    (i) =>
      i.label +
      `:
` +
      i.items.map((s) => {
        let r = xm(s.ingredientId, s.amount, s.unit);
        return (
          "• " +
          Bp(s.ingredientId, s.name) +
          " — " +
          Zs(s.amount, s.unit) +
          (r ? " (купить: " + r + ")" : "")
        );
      }).join(`
`),
  ).join(`

`);
  return (
    t +
    `

` +
    a +
    `

Собрано в «Что приготовить?» ` +
    Ua()
  );
}
function pA(e, t) {
  let n = encodeURIComponent(t);
  switch (e) {
    case "vk":
      return { url: "https://vk.com/im", copyFirst: !0 };
    case "max":
      return { url: "https://max.ru/:share?text=" + n, copyFirst: !1 };
    case "telegram":
      return {
        url:
          "https://t.me/share/url?url=" +
          encodeURIComponent(Ua()) +
          "&text=" +
          n,
        copyFirst: !1,
      };
    case "whatsapp":
      return { url: "https://wa.me/?text=" + n, copyFirst: !1 };
  }
}
async function E0(e) {
  try {
    return await navigator.clipboard.writeText(e), !0;
  } catch {
    try {
      let t = document.createElement("textarea");
      (t.value = e),
        (t.style.position = "fixed"),
        (t.style.opacity = "0"),
        document.body.appendChild(t),
        t.select();
      let n = document.execCommand("copy");
      return t.remove(), n;
    } catch {
      return !1;
    }
  }
}
var mA = () => typeof navigator < "u" && typeof navigator.share == "function";
var ra = React;
// Older app versions know only these four appliances and reset all preferences (with the food exclusions) when the
// synced list holds anything else. The newer appliances travel in their own field, which older versions ignore.
var Q0 = ["pan", "pot", "oven", "blender"];
function wm(e) {
  let ap = e.preferences.appliances || [];
  return {
    favorites: e.favorites.map((t) => t.id),
    recent: e.recent.map((t) => t.id).slice(0, 20),
    preferences: { ...e.preferences, appliances: ap.filter((a) => Q0.includes(a)) },
    appliancesExtra: ap.filter((a) => !Q0.includes(a)),
    largeText: e.largeText,
    onboarding: e.onboarding,
    voiceUsed: e.voiceUsed,
    readAloud: e.readAloud,
    liked: e.taste.liked,
    tooHard: e.taste.tooHard,
    disliked: e.taste.disliked || [],
    book: e.book,
    notes: e.notes,
    myRecipes: e.myRecipes || [],
    rewards: e.rewards,
    joined: e.joined,
  };
}
function Tm(e) {
  return { shopping: e.shopping, menu: e.menu, fridge: e.fridge };
}
var Sm = (e, t) => JSON.stringify(e) === JSON.stringify(t);
function Tu(e, t, n, a) {
  let i = new Map(e.map((o) => [a(o), o])),
    s = new Map(t.map((o) => [a(o), o])),
    r = new Map(n.map((o) => [a(o), o]));
  for (let [o] of i) s.has(o) || r.delete(o);
  for (let [o, l] of s) {
    let u = i.get(o);
    (!u || !Sm(u, l)) && r.set(o, l);
  }
  return [...r.values()];
}
function wu(e, t, n) {
  return Tu(e, t, n, (a) => a);
}
var rl = (e, t, n) => (Sm(e, t) ? n : t);
function kO(e, t, n) {
  let a = { ...n };
  for (let i of new Set([...Object.keys(e), ...Object.keys(t)]))
    e[i] !== t[i] && (t[i] === void 0 ? delete a[i] : (a[i] = t[i]));
  return a;
}
var D0 = (e) => [...e].sort((t, n) => t.at - n.at).slice(-bu);
function gA(e, t, n) {
  return n
    ? e
      ? {
          favorites: wu(e.favorites, t.favorites, n.favorites),
          recent: rl(e.recent, t.recent, n.recent),
          preferences: rl(e.preferences, t.preferences, n.preferences),
          appliancesExtra: rl(e.appliancesExtra, t.appliancesExtra, n.appliancesExtra),
          largeText: rl(e.largeText, t.largeText, n.largeText),
          onboarding: rl(e.onboarding, t.onboarding, n.onboarding),
          voiceUsed: t.voiceUsed || n.voiceUsed,
          readAloud: rl(e.readAloud, t.readAloud, n.readAloud),
          liked: wu(e.liked || [], t.liked || [], n.liked || []),
          tooHard: wu(e.tooHard || [], t.tooHard || [], n.tooHard || []),
          disliked: wu(e.disliked || [], t.disliked || [], n.disliked || []),
          book: D0(Tu(e.book || [], t.book || [], n.book || [], (a) => a.id)),
          notes: kO(e.notes || {}, t.notes || {}, n.notes || {}),
          myRecipes: Tu(e.myRecipes || [], t.myRecipes || [], n.myRecipes || [], (a) => a.id),
          rewards: rl(e.rewards, t.rewards, n.rewards),
          joined: wu(e.joined || [], t.joined || [], n.joined || []),
        }
      : {
          ...n,
          favorites: [...new Set([...n.favorites, ...t.favorites])],
          recent: [...new Set([...t.recent, ...n.recent])].slice(0, 20),
          largeText: n.largeText || t.largeText,
          onboarding: n.onboarding !== "new" ? n.onboarding : t.onboarding,
          voiceUsed: n.voiceUsed || t.voiceUsed,
          liked: [...new Set([...(n.liked || []), ...(t.liked || [])])],
          tooHard: [...new Set([...(n.tooHard || []), ...(t.tooHard || [])])],
          disliked: [
            ...new Set([...(n.disliked || []), ...(t.disliked || [])]),
          ],
          book: D0(Tu([], t.book || [], n.book || [], (a) => a.id)),
          notes: { ...(n.notes || {}), ...(t.notes || {}) },
          myRecipes: Tu([], t.myRecipes || [], n.myRecipes || [], (a) => a.id),
          rewards: n.rewards ?? t.rewards,
          joined: [...new Set([...(n.joined || []), ...(t.joined || [])])],
        }
    : t;
}
function hA(e, t, n) {
  if (!n) return t;
  let a = e ?? { shopping: [], menu: [] },
    i = Tu(a.shopping, t.shopping, n.shopping, (u) => u.key),
    s = Tu(a.fridge || [], t.fridge || [], n.fridge || [], (u) => u.id).slice(
      -lm,
    ),
    r = [
      ...new Set([...n.menu.map((u) => u.date), ...t.menu.map((u) => u.date)]),
    ].sort(),
    o = (u, f) => u.find((p) => p.date === f),
    l = r
      .map((u) => {
        let f = o(t.menu, u),
          p = o(a.menu, u),
          m = o(n.menu, u);
        return e
          ? Sm(f, p)
            ? (m ?? { date: u, items: [] })
            : (f ?? { date: u, items: [] })
          : {
              date: u,
              items: [
                ...(m?.items || []),
                ...(f?.items || []).filter(
                  (y) =>
                    !(m?.items || []).some((S) => S.recipeId === y.recipeId),
                ),
              ].slice(0, 6),
            };
      })
      .filter((u) => u.items.length);
  return { shopping: i, menu: l, fridge: s };
}
function _0(e, t) {
  let n = (f, p) => p.find((m) => m.id === f) ?? F.find((m) => m.id === f),
    a = t.favorites.map((f) => n(f, e.favorites)).filter((f) => !!f),
    i = t.recent.map((f) => n(f, e.recent)).filter((f) => !!f),
    // Newer appliances: from their own field; a document written by an older version has none — keep ours.
    ex = Array.isArray(t.appliancesExtra)
      ? t.appliancesExtra
      : (e.preferences.appliances || []).filter((x) => !Q0.includes(x)),
    s = vu({
      ...e,
      favorites: a,
      recent: i,
      preferences: t.preferences
        ? {
            ...t.preferences,
            appliances: [
              ...new Set([
                ...(t.preferences.appliances || []).filter((x) => Q0.includes(x) || !Array.isArray(t.appliancesExtra)),
                ...ex,
              ]),
            ],
          }
        : t.preferences,
      largeText: t.largeText,
      onboarding: t.onboarding,
      voiceUsed: t.voiceUsed,
      readAloud: t.readAloud,
    }),
    r = {
      ...e.taste,
      liked: (t.liked || e.taste.liked)
        .filter((f) => typeof f == "string")
        .slice(-60),
      tooHard: (t.tooHard || e.taste.tooHard)
        .filter((f) => typeof f == "string")
        .slice(-60),
      disliked: (t.disliked || e.taste.disliked || [])
        .filter((f) => typeof f == "string")
        .slice(-60),
    },
    o = Array.isArray(t.book)
      ? D0(
          t.book.flatMap((f) => {
            let p = T0.safeParse(f);
            return p.success ? [p.data] : [];
          }),
        )
      : e.book,
    l = t.notes ? C0(t.notes) : e.notes,
    mr = Array.isArray(t.myRecipes) ? MyR(t.myRecipes) : e.myRecipes || [],
    u = Array.isArray(t.joined)
      ? t.joined
          .filter((f) => typeof f == "string" && /^\d{4}-\d{2}$/.test(f))
          .slice(-24)
      : e.joined;
  return {
    ...e,
    book: o,
    notes: l,
    myRecipes: mr,
    joined: u,
    rewards: typeof t.rewards == "boolean" ? t.rewards : e.rewards,
    favorites: s.favorites,
    recent: s.recent,
    preferences: s.preferences,
    largeText: s.largeText,
    onboarding: s.onboarding,
    voiceUsed: s.voiceUsed,
    readAloud: s.readAloud,
    taste: r,
  };
}
function O0(e, t) {
  let n = vu({ ...e, shopping: t.shopping, menu: t.menu }),
    a = Array.isArray(t.fridge)
      ? t.fridge
          .flatMap((i) => {
            let s = S0.safeParse(i);
            return s.success ? [s.data] : [];
          })
          .slice(-lm)
      : e.fridge;
  return { ...e, shopping: n.shopping, menu: n.menu, fridge: a };
}
var yA = Sm;
var z0 = { p: { version: 0, doc: null }, h: { version: 0, doc: null } };
async function Su(e, t, n = "") {
  let a = await fetch(
      wt(e) + n,
      t === void 0
        ? { credentials: "same-origin" }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(t),
            credentials: "same-origin",
          },
    ),
    i = await a.json().catch(() => ({}));
  return { ok: a.ok, status: a.status, body: i };
}
var Cm = (e) => e?.error || "Не удалось связаться с сервером.";
function bA(e, t, n, a) {
  let [i, s] = (0, ra.useState)({ state: "off", members: 1 }),
    r = (0, ra.useRef)(e);
  r.current = e;
  let o = (0, ra.useRef)(Promise.resolve()),
    l = (0, ra.useRef)(!1),
    u = (0, ra.useRef)(!0),
    f = () => r.current.syncBase ?? z0,
    p = (0, ra.useCallback)(
      (x) => {
        // The queue keeps going after a failure, but the caller still sees it (to show the server's message).
        let run = o.current.then(x);
        return (
          (o.current = run.catch(() => {
            s((N) => ({ ...N, state: navigator.onLine ? "ready" : "offline" }));
          })),
          run
        );
      },
      [],
    ),
    m = (x) => {
      (r.current = { ...r.current, syncBase: x }),
        a((N) => ({ ...N, syncBase: x }));
    };
  async function y(x, N = 3) {
    let _ = f(),
      B = x === "personal" ? _.p : _.h,
      R = x === "personal" ? wm(r.current) : Tm(r.current);
    if (B.doc && yA(R, B.doc)) return;
    let T = await Su("account.save", {
      kind: x,
      baseVersion: B.version,
      data: R,
    });
    if (T.ok && typeof T.body.version == "number") {
      m(
        x === "personal"
          ? { ...f(), p: { version: T.body.version, doc: R } }
          : { ...f(), h: { version: T.body.version, doc: R } },
      );
      return;
    }
    if (T.status === 409 && T.body.current && N > 0)
      return S(x, T.body.current), y(x, N - 1);
    throw new Error(Cm(T.body));
  }
  function S(x, N) {
    if (N.unchanged) return;
    let _ = f(),
      B = N.data ?? null;
    if (x === "personal") {
      let R = gA(_.p.doc, wm(r.current), B);
      if (B || _.p.doc) {
        let T = _0(r.current, R);
        (r.current = T), a((C) => _0(C, R));
      }
      m({ ...f(), p: { version: N.version, doc: B } });
    } else {
      let R = hA(_.h.doc, Tm(r.current), B);
      if (B || _.h.doc) {
        let T = O0(r.current, R);
        (r.current = T), a((C) => O0(C, R));
      }
      m({ ...f(), h: { version: N.version, doc: B } });
    }
  }
  async function w(x) {
    s({ state: "ready", members: x.account.members }),
      S("personal", x.personal),
      S("household", x.household),
      await y("personal"),
      await y("household");
  }
  (0, ra.useEffect)(() => {
    !t ||
      !n ||
      l.current ||
      ((l.current = !0),
      p(async () => {
        s((N) => ({ ...N, state: "syncing" }));
        let x = await Su("account.init", {});
        if (!x.ok)
          throw ((u.current = x.status !== 404), new Error(Cm(x.body)));
        await w(x.body);
      }).catch(() => {}));
  }, [t, n, p]);
  let v = JSON.stringify(wm(e)),
    b = JSON.stringify(Tm(e));
  (0, ra.useEffect)(() => {
    if (!t || !l.current || !n) return;
    let x = setTimeout(() => {
      p(async () => {
        await y("personal"), await y("household");
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(x);
  }, [v, b, t, n, p]),
    (0, ra.useEffect)(() => {
      if (!t || !n) return;
      let x = () => {
          document.visibilityState !== "visible" ||
            !l.current ||
            !u.current ||
            p(async () => {
              let _ = f(),
                B = await Su(
                  "account.state",
                  void 0,
                  "&p=" + _.p.version + "&h=" + _.h.version,
                );
              if (B.status === 401) {
                l.current = !1;
                return;
              }
              if (!B.ok) throw new Error(Cm(B.body));
              await w(B.body);
            }).catch(() => {});
        },
        N = setInterval(x, 2e4);
      return (
        document.addEventListener("visibilitychange", x),
        window.addEventListener("focus", x),
        () => {
          clearInterval(N),
            document.removeEventListener("visibilitychange", x),
            window.removeEventListener("focus", x);
        }
      );
    }, [t, n, p]);
  let g = async (x, N = {}) => {
    let _ = await Su(x, N);
    if (!_.ok) throw new Error(Cm(_.body));
    return _.body;
  };
  return {
    status: i,
    code: () => g("account.code").then((x) => x.code),
    invite: () => g("household.invite").then((x) => x.token),
    login: (x) =>
      p(async () => {
        let N = await g("account.login", { code: x });
        m(z0), await w(N);
      }),
    join: (x) =>
      p(async () => {
        let N = await g("household.join", { token: x });
        m({ ...f(), h: { version: 0, doc: null } }), await w(N);
      }),
    leave: () =>
      p(async () => {
        let x = await g("household.leave");
        m({ ...f(), h: { version: 0, doc: null } }), await w(x);
      }),
    remove: () =>
      p(async () => {
        await g("account.delete"),
          m(z0),
          (l.current = !1),
          s({ state: "off", members: 1 });
      }),
    refresh: () =>
      p(async () => {
        let x = await Su("account.state", void 0, "");
        x.ok && (await w(x.body));
      }),
  };
}
var ol = function (e, t) {
  let i = e,
    s = Cu[t],
    r = null,
    o = 0,
    l = null,
    u = [],
    f = {},
    p = function (R, T) {
      (o = i * 4 + 17),
        (r = (function (C) {
          let M = new Array(C);
          for (let Z = 0; Z < C; Z += 1) {
            M[Z] = new Array(C);
            for (let V = 0; V < C; V += 1) M[Z][V] = null;
          }
          return M;
        })(o)),
        m(0, 0),
        m(o - 7, 0),
        m(0, o - 7),
        w(),
        S(),
        b(R, T),
        i >= 7 && v(R),
        l == null && (l = N(i, s, u)),
        g(l, T);
    },
    m = function (R, T) {
      for (let C = -1; C <= 7; C += 1)
        if (!(R + C <= -1 || o <= R + C))
          for (let M = -1; M <= 7; M += 1)
            T + M <= -1 ||
              o <= T + M ||
              ((0 <= C && C <= 6 && (M == 0 || M == 6)) ||
              (0 <= M && M <= 6 && (C == 0 || C == 6)) ||
              (2 <= C && C <= 4 && 2 <= M && M <= 4)
                ? (r[R + C][T + M] = !0)
                : (r[R + C][T + M] = !1));
    },
    y = function () {
      let R = 0,
        T = 0;
      for (let C = 0; C < 8; C += 1) {
        p(!0, C);
        let M = Bs.getLostPoint(f);
        (C == 0 || R > M) && ((R = M), (T = C));
      }
      return T;
    },
    S = function () {
      for (let R = 8; R < o - 8; R += 1)
        r[R][6] == null && (r[R][6] = R % 2 == 0);
      for (let R = 8; R < o - 8; R += 1)
        r[6][R] == null && (r[6][R] = R % 2 == 0);
    },
    w = function () {
      let R = Bs.getPatternPosition(i);
      for (let T = 0; T < R.length; T += 1)
        for (let C = 0; C < R.length; C += 1) {
          let M = R[T],
            Z = R[C];
          if (r[M][Z] == null)
            for (let V = -2; V <= 2; V += 1)
              for (let k = -2; k <= 2; k += 1)
                V == -2 || V == 2 || k == -2 || k == 2 || (V == 0 && k == 0)
                  ? (r[M + V][Z + k] = !0)
                  : (r[M + V][Z + k] = !1);
        }
    },
    v = function (R) {
      let T = Bs.getBCHTypeNumber(i);
      for (let C = 0; C < 18; C += 1) {
        let M = !R && ((T >> C) & 1) == 1;
        r[Math.floor(C / 3)][(C % 3) + o - 8 - 3] = M;
      }
      for (let C = 0; C < 18; C += 1) {
        let M = !R && ((T >> C) & 1) == 1;
        r[(C % 3) + o - 8 - 3][Math.floor(C / 3)] = M;
      }
    },
    b = function (R, T) {
      let C = (s << 3) | T,
        M = Bs.getBCHTypeInfo(C);
      for (let Z = 0; Z < 15; Z += 1) {
        let V = !R && ((M >> Z) & 1) == 1;
        Z < 6
          ? (r[Z][8] = V)
          : Z < 8
            ? (r[Z + 1][8] = V)
            : (r[o - 15 + Z][8] = V);
      }
      for (let Z = 0; Z < 15; Z += 1) {
        let V = !R && ((M >> Z) & 1) == 1;
        Z < 8
          ? (r[8][o - Z - 1] = V)
          : Z < 9
            ? (r[8][15 - Z - 1 + 1] = V)
            : (r[8][15 - Z - 1] = V);
      }
      r[o - 8][8] = !R;
    },
    g = function (R, T) {
      let C = -1,
        M = o - 1,
        Z = 7,
        V = 0,
        k = Bs.getMaskFunction(T);
      for (let U = o - 1; U > 0; U -= 2)
        for (U == 6 && (U -= 1); ; ) {
          for (let Y = 0; Y < 2; Y += 1)
            if (r[M][U - Y] == null) {
              let G = !1;
              V < R.length && (G = ((R[V] >>> Z) & 1) == 1),
                k(M, U - Y) && (G = !G),
                (r[M][U - Y] = G),
                (Z -= 1),
                Z == -1 && ((V += 1), (Z = 7));
            }
          if (((M += C), M < 0 || o <= M)) {
            (M -= C), (C = -C);
            break;
          }
        }
    },
    x = function (R, T) {
      let C = 0,
        M = 0,
        Z = 0,
        V = new Array(T.length),
        k = new Array(T.length);
      for (let Q = 0; Q < T.length; Q += 1) {
        let ne = T[Q].dataCount,
          ke = T[Q].totalCount - ne;
        (M = Math.max(M, ne)), (Z = Math.max(Z, ke)), (V[Q] = new Array(ne));
        for (let ze = 0; ze < V[Q].length; ze += 1)
          V[Q][ze] = 255 & R.getBuffer()[ze + C];
        C += ne;
        let P = Bs.getErrorCorrectPolynomial(ke),
          He = Au(V[Q], P.getLength() - 1).mod(P);
        k[Q] = new Array(P.getLength() - 1);
        for (let ze = 0; ze < k[Q].length; ze += 1) {
          let W = ze + He.getLength() - k[Q].length;
          k[Q][ze] = W >= 0 ? He.getAt(W) : 0;
        }
      }
      let U = 0;
      for (let Q = 0; Q < T.length; Q += 1) U += T[Q].totalCount;
      let Y = new Array(U),
        G = 0;
      for (let Q = 0; Q < M; Q += 1)
        for (let ne = 0; ne < T.length; ne += 1)
          Q < V[ne].length && ((Y[G] = V[ne][Q]), (G += 1));
      for (let Q = 0; Q < Z; Q += 1)
        for (let ne = 0; ne < T.length; ne += 1)
          Q < k[ne].length && ((Y[G] = k[ne][Q]), (G += 1));
      return Y;
    },
    N = function (R, T, C) {
      let M = vA.getRSBlocks(R, T),
        Z = kA();
      for (let k = 0; k < C.length; k += 1) {
        let U = C[k];
        Z.put(U.getMode(), 4),
          Z.put(U.getLength(), Bs.getLengthInBits(U.getMode(), R)),
          U.write(Z);
      }
      let V = 0;
      for (let k = 0; k < M.length; k += 1) V += M[k].dataCount;
      if (Z.getLengthInBits() > V * 8)
        throw (
          "code length overflow. (" + Z.getLengthInBits() + ">" + V * 8 + ")"
        );
      for (
        Z.getLengthInBits() + 4 <= V * 8 && Z.put(0, 4);
        Z.getLengthInBits() % 8 != 0;

      )
        Z.putBit(!1);
      for (
        ;
        !(
          Z.getLengthInBits() >= V * 8 ||
          (Z.put(236, 8), Z.getLengthInBits() >= V * 8)
        );

      )
        Z.put(17, 8);
      return x(Z, M);
    };
  (f.addData = function (R, T) {
    T = T || "Byte";
    let C = null;
    switch (T) {
      case "Numeric":
        C = xO(R);
        break;
      case "Alphanumeric":
        C = wO(R);
        break;
      case "Byte":
        C = TO(R);
        break;
      case "Kanji":
        C = SO(R);
        break;
      default:
        throw "mode:" + T;
    }
    u.push(C), (l = null);
  }),
    (f.isDark = function (R, T) {
      if (R < 0 || o <= R || T < 0 || o <= T) throw R + "," + T;
      return r[R][T];
    }),
    (f.getModuleCount = function () {
      return o;
    }),
    (f.make = function () {
      if (i < 1) {
        let R = 1;
        for (; R < 40; R++) {
          let T = vA.getRSBlocks(R, s),
            C = kA();
          for (let Z = 0; Z < u.length; Z++) {
            let V = u[Z];
            C.put(V.getMode(), 4),
              C.put(V.getLength(), Bs.getLengthInBits(V.getMode(), R)),
              V.write(C);
          }
          let M = 0;
          for (let Z = 0; Z < T.length; Z++) M += T[Z].dataCount;
          if (C.getLengthInBits() <= M * 8) break;
        }
        i = R;
      }
      p(!1, y());
    }),
    (f.createTableTag = function (R, T) {
      (R = R || 2), (T = typeof T > "u" ? R * 4 : T);
      let C = "";
      (C += '<table style="'),
        (C += " border-width: 0px; border-style: none;"),
        (C += " border-collapse: collapse;"),
        (C += " padding: 0px; margin: " + T + "px;"),
        (C += '">'),
        (C += "<tbody>");
      for (let M = 0; M < f.getModuleCount(); M += 1) {
        C += "<tr>";
        for (let Z = 0; Z < f.getModuleCount(); Z += 1)
          (C += '<td style="'),
            (C += " border-width: 0px; border-style: none;"),
            (C += " border-collapse: collapse;"),
            (C += " padding: 0px; margin: 0px;"),
            (C += " width: " + R + "px;"),
            (C += " height: " + R + "px;"),
            (C += " background-color: "),
            (C += f.isDark(M, Z) ? "#000000" : "#ffffff"),
            (C += ";"),
            (C += '"/>');
        C += "</tr>";
      }
      return (C += "</tbody>"), (C += "</table>"), C;
    }),
    (f.createSvgTag = function (R, T, C, M) {
      let Z = {};
      typeof arguments[0] == "object" &&
        ((Z = arguments[0]),
        (R = Z.cellSize),
        (T = Z.margin),
        (C = Z.alt),
        (M = Z.title)),
        (R = R || 2),
        (T = typeof T > "u" ? R * 4 : T),
        (C = typeof C == "string" ? { text: C } : C || {}),
        (C.text = C.text || null),
        (C.id = C.text ? C.id || "qrcode-description" : null),
        (M = typeof M == "string" ? { text: M } : M || {}),
        (M.text = M.text || null),
        (M.id = M.text ? M.id || "qrcode-title" : null);
      let V = f.getModuleCount() * R + T * 2,
        k,
        U,
        Y,
        G,
        Q = "",
        ne;
      for (
        ne = "l" + R + ",0 0," + R + " -" + R + ",0 0,-" + R + "z ",
          Q += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',
          Q += Z.scalable ? "" : ' width="' + V + 'px" height="' + V + 'px"',
          Q += ' viewBox="0 0 ' + V + " " + V + '" ',
          Q += ' preserveAspectRatio="xMinYMin meet"',
          Q +=
            M.text || C.text
              ? ' role="img" aria-labelledby="' +
                _([M.id, C.id].join(" ").trim()) +
                '"'
              : "",
          Q += ">",
          Q += M.text
            ? '<title id="' + _(M.id) + '">' + _(M.text) + "</title>"
            : "",
          Q += C.text
            ? '<description id="' +
              _(C.id) +
              '">' +
              _(C.text) +
              "</description>"
            : "",
          Q += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',
          Q += '<path d="',
          Y = 0;
        Y < f.getModuleCount();
        Y += 1
      )
        for (G = Y * R + T, k = 0; k < f.getModuleCount(); k += 1)
          f.isDark(Y, k) && ((U = k * R + T), (Q += "M" + U + "," + G + ne));
      return (Q += '" stroke="transparent" fill="black"/>'), (Q += "</svg>"), Q;
    }),
    (f.createDataURL = function (R, T) {
      (R = R || 2), (T = typeof T > "u" ? R * 4 : T);
      let C = f.getModuleCount() * R + T * 2,
        M = T,
        Z = C - T;
      return NO(C, C, function (V, k) {
        if (M <= V && V < Z && M <= k && k < Z) {
          let U = Math.floor((V - M) / R),
            Y = Math.floor((k - M) / R);
          return f.isDark(Y, U) ? 0 : 1;
        } else return 1;
      });
    }),
    (f.createImgTag = function (R, T, C) {
      (R = R || 2), (T = typeof T > "u" ? R * 4 : T);
      let M = f.getModuleCount() * R + T * 2,
        Z = "";
      return (
        (Z += "<img"),
        (Z += ' src="'),
        (Z += f.createDataURL(R, T)),
        (Z += '"'),
        (Z += ' width="'),
        (Z += M),
        (Z += '"'),
        (Z += ' height="'),
        (Z += M),
        (Z += '"'),
        C && ((Z += ' alt="'), (Z += _(C)), (Z += '"')),
        (Z += "/>"),
        Z
      );
    });
  let _ = function (R) {
      let T = "";
      for (let C = 0; C < R.length; C += 1) {
        let M = R.charAt(C);
        switch (M) {
          case "<":
            T += "&lt;";
            break;
          case ">":
            T += "&gt;";
            break;
          case "&":
            T += "&amp;";
            break;
          case '"':
            T += "&quot;";
            break;
          default:
            T += M;
            break;
        }
      }
      return T;
    },
    B = function (R) {
      R = typeof R > "u" ? 2 : R;
      let C = f.getModuleCount() * 1 + R * 2,
        M = R,
        Z = C - R,
        V,
        k,
        U,
        Y,
        G,
        Q = { "██": "█", "█ ": "▀", " █": "▄", "  ": " " },
        ne = { "██": "▀", "█ ": "▀", " █": " ", "  ": " " },
        ke = "";
      for (V = 0; V < C; V += 2) {
        for (
          U = Math.floor((V - M) / 1), Y = Math.floor((V + 1 - M) / 1), k = 0;
          k < C;
          k += 1
        )
          (G = "█"),
            M <= k &&
              k < Z &&
              M <= V &&
              V < Z &&
              f.isDark(U, Math.floor((k - M) / 1)) &&
              (G = " "),
            M <= k &&
            k < Z &&
            M <= V + 1 &&
            V + 1 < Z &&
            f.isDark(Y, Math.floor((k - M) / 1))
              ? (G += " ")
              : (G += "█"),
            (ke += R < 1 && V + 1 >= Z ? ne[G] : Q[G]);
        ke += `
`;
      }
      return C % 2 && R > 0
        ? ke.substring(0, ke.length - C - 1) + Array(C + 1).join("▀")
        : ke.substring(0, ke.length - 1);
    };
  return (
    (f.createASCII = function (R, T) {
      if (((R = R || 1), R < 2)) return B(T);
      (R -= 1), (T = typeof T > "u" ? R * 2 : T);
      let C = f.getModuleCount() * R + T * 2,
        M = T,
        Z = C - T,
        V,
        k,
        U,
        Y,
        G = Array(R + 1).join("██"),
        Q = Array(R + 1).join("  "),
        ne = "",
        ke = "";
      for (V = 0; V < C; V += 1) {
        for (U = Math.floor((V - M) / R), ke = "", k = 0; k < C; k += 1)
          (Y = 1),
            M <= k &&
              k < Z &&
              M <= V &&
              V < Z &&
              f.isDark(U, Math.floor((k - M) / R)) &&
              (Y = 0),
            (ke += Y ? G : Q);
        for (U = 0; U < R; U += 1)
          ne +=
            ke +
            `
`;
      }
      return ne.substring(0, ne.length - 1);
    }),
    (f.renderTo2dContext = function (R, T) {
      T = T || 2;
      let C = f.getModuleCount();
      for (let M = 0; M < C; M++)
        for (let Z = 0; Z < C; Z++)
          (R.fillStyle = f.isDark(M, Z) ? "black" : "white"),
            R.fillRect(Z * T, M * T, T, T);
    }),
    f
  );
};
ol.stringToBytes = function (e) {
  let t = [];
  for (let n = 0; n < e.length; n += 1) {
    let a = e.charCodeAt(n);
    t.push(a & 255);
  }
  return t;
};
ol.createStringToBytes = function (e, t) {
  let n = (function () {
      let i = AO(e),
        s = function () {
          let l = i.read();
          if (l == -1) throw "eof";
          return l;
        },
        r = 0,
        o = {};
      for (;;) {
        let l = i.read();
        if (l == -1) break;
        let u = s(),
          f = s(),
          p = s(),
          m = String.fromCharCode((l << 8) | u),
          y = (f << 8) | p;
        (o[m] = y), (r += 1);
      }
      if (r != t) throw r + " != " + t;
      return o;
    })(),
    a = 63;
  return function (i) {
    let s = [];
    for (let r = 0; r < i.length; r += 1) {
      let o = i.charCodeAt(r);
      if (o < 128) s.push(o);
      else {
        let l = n[i.charAt(r)];
        typeof l == "number"
          ? (l & 255) == l
            ? s.push(l)
            : (s.push(l >>> 8), s.push(l & 255))
          : s.push(a);
      }
    }
    return s;
  };
};
var on = {
    MODE_NUMBER: 1,
    MODE_ALPHA_NUM: 2,
    MODE_8BIT_BYTE: 4,
    MODE_KANJI: 8,
  },
  Cu = { L: 1, M: 0, Q: 3, H: 2 },
  Ls = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
  },
  Bs = (function () {
    let e = [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170],
      ],
      t = 1335,
      n = 7973,
      a = 21522,
      i = {},
      s = function (r) {
        let o = 0;
        for (; r != 0; ) (o += 1), (r >>>= 1);
        return o;
      };
    return (
      (i.getBCHTypeInfo = function (r) {
        let o = r << 10;
        for (; s(o) - s(t) >= 0; ) o ^= t << (s(o) - s(t));
        return ((r << 10) | o) ^ a;
      }),
      (i.getBCHTypeNumber = function (r) {
        let o = r << 12;
        for (; s(o) - s(n) >= 0; ) o ^= n << (s(o) - s(n));
        return (r << 12) | o;
      }),
      (i.getPatternPosition = function (r) {
        return e[r - 1];
      }),
      (i.getMaskFunction = function (r) {
        switch (r) {
          case Ls.PATTERN000:
            return function (o, l) {
              return (o + l) % 2 == 0;
            };
          case Ls.PATTERN001:
            return function (o, l) {
              return o % 2 == 0;
            };
          case Ls.PATTERN010:
            return function (o, l) {
              return l % 3 == 0;
            };
          case Ls.PATTERN011:
            return function (o, l) {
              return (o + l) % 3 == 0;
            };
          case Ls.PATTERN100:
            return function (o, l) {
              return (Math.floor(o / 2) + Math.floor(l / 3)) % 2 == 0;
            };
          case Ls.PATTERN101:
            return function (o, l) {
              return ((o * l) % 2) + ((o * l) % 3) == 0;
            };
          case Ls.PATTERN110:
            return function (o, l) {
              return (((o * l) % 2) + ((o * l) % 3)) % 2 == 0;
            };
          case Ls.PATTERN111:
            return function (o, l) {
              return (((o * l) % 3) + ((o + l) % 2)) % 2 == 0;
            };
          default:
            throw "bad maskPattern:" + r;
        }
      }),
      (i.getErrorCorrectPolynomial = function (r) {
        let o = Au([1], 0);
        for (let l = 0; l < r; l += 1) o = o.multiply(Au([1, Ps.gexp(l)], 0));
        return o;
      }),
      (i.getLengthInBits = function (r, o) {
        if (1 <= o && o < 10)
          switch (r) {
            case on.MODE_NUMBER:
              return 10;
            case on.MODE_ALPHA_NUM:
              return 9;
            case on.MODE_8BIT_BYTE:
              return 8;
            case on.MODE_KANJI:
              return 8;
            default:
              throw "mode:" + r;
          }
        else if (o < 27)
          switch (r) {
            case on.MODE_NUMBER:
              return 12;
            case on.MODE_ALPHA_NUM:
              return 11;
            case on.MODE_8BIT_BYTE:
              return 16;
            case on.MODE_KANJI:
              return 10;
            default:
              throw "mode:" + r;
          }
        else if (o < 41)
          switch (r) {
            case on.MODE_NUMBER:
              return 14;
            case on.MODE_ALPHA_NUM:
              return 13;
            case on.MODE_8BIT_BYTE:
              return 16;
            case on.MODE_KANJI:
              return 12;
            default:
              throw "mode:" + r;
          }
        else throw "type:" + o;
      }),
      (i.getLostPoint = function (r) {
        let o = r.getModuleCount(),
          l = 0;
        for (let p = 0; p < o; p += 1)
          for (let m = 0; m < o; m += 1) {
            let y = 0,
              S = r.isDark(p, m);
            for (let w = -1; w <= 1; w += 1)
              if (!(p + w < 0 || o <= p + w))
                for (let v = -1; v <= 1; v += 1)
                  m + v < 0 ||
                    o <= m + v ||
                    (w == 0 && v == 0) ||
                    (S == r.isDark(p + w, m + v) && (y += 1));
            y > 5 && (l += 3 + y - 5);
          }
        for (let p = 0; p < o - 1; p += 1)
          for (let m = 0; m < o - 1; m += 1) {
            let y = 0;
            r.isDark(p, m) && (y += 1),
              r.isDark(p + 1, m) && (y += 1),
              r.isDark(p, m + 1) && (y += 1),
              r.isDark(p + 1, m + 1) && (y += 1),
              (y == 0 || y == 4) && (l += 3);
          }
        for (let p = 0; p < o; p += 1)
          for (let m = 0; m < o - 6; m += 1)
            r.isDark(p, m) &&
              !r.isDark(p, m + 1) &&
              r.isDark(p, m + 2) &&
              r.isDark(p, m + 3) &&
              r.isDark(p, m + 4) &&
              !r.isDark(p, m + 5) &&
              r.isDark(p, m + 6) &&
              (l += 40);
        for (let p = 0; p < o; p += 1)
          for (let m = 0; m < o - 6; m += 1)
            r.isDark(m, p) &&
              !r.isDark(m + 1, p) &&
              r.isDark(m + 2, p) &&
              r.isDark(m + 3, p) &&
              r.isDark(m + 4, p) &&
              !r.isDark(m + 5, p) &&
              r.isDark(m + 6, p) &&
              (l += 40);
        let u = 0;
        for (let p = 0; p < o; p += 1)
          for (let m = 0; m < o; m += 1) r.isDark(m, p) && (u += 1);
        let f = Math.abs((100 * u) / o / o - 50) / 5;
        return (l += f * 10), l;
      }),
      i
    );
  })(),
  Ps = (function () {
    let e = new Array(256),
      t = new Array(256);
    for (let a = 0; a < 8; a += 1) e[a] = 1 << a;
    for (let a = 8; a < 256; a += 1)
      e[a] = e[a - 4] ^ e[a - 5] ^ e[a - 6] ^ e[a - 8];
    for (let a = 0; a < 255; a += 1) t[e[a]] = a;
    let n = {};
    return (
      (n.glog = function (a) {
        if (a < 1) throw "glog(" + a + ")";
        return t[a];
      }),
      (n.gexp = function (a) {
        for (; a < 0; ) a += 255;
        for (; a >= 256; ) a -= 255;
        return e[a];
      }),
      n
    );
  })(),
  Au = function (e, t) {
    if (typeof e.length > "u") throw e.length + "/" + t;
    let n = (function () {
        let i = 0;
        for (; i < e.length && e[i] == 0; ) i += 1;
        let s = new Array(e.length - i + t);
        for (let r = 0; r < e.length - i; r += 1) s[r] = e[r + i];
        return s;
      })(),
      a = {};
    return (
      (a.getAt = function (i) {
        return n[i];
      }),
      (a.getLength = function () {
        return n.length;
      }),
      (a.multiply = function (i) {
        let s = new Array(a.getLength() + i.getLength() - 1);
        for (let r = 0; r < a.getLength(); r += 1)
          for (let o = 0; o < i.getLength(); o += 1)
            s[r + o] ^= Ps.gexp(Ps.glog(a.getAt(r)) + Ps.glog(i.getAt(o)));
        return Au(s, 0);
      }),
      (a.mod = function (i) {
        if (a.getLength() - i.getLength() < 0) return a;
        let s = Ps.glog(a.getAt(0)) - Ps.glog(i.getAt(0)),
          r = new Array(a.getLength());
        for (let o = 0; o < a.getLength(); o += 1) r[o] = a.getAt(o);
        for (let o = 0; o < i.getLength(); o += 1)
          r[o] ^= Ps.gexp(Ps.glog(i.getAt(o)) + s);
        return Au(r, 0).mod(i);
      }),
      a
    );
  },
  vA = (function () {
    let e = [
        [1, 26, 19],
        [1, 26, 16],
        [1, 26, 13],
        [1, 26, 9],
        [1, 44, 34],
        [1, 44, 28],
        [1, 44, 22],
        [1, 44, 16],
        [1, 70, 55],
        [1, 70, 44],
        [2, 35, 17],
        [2, 35, 13],
        [1, 100, 80],
        [2, 50, 32],
        [2, 50, 24],
        [4, 25, 9],
        [1, 134, 108],
        [2, 67, 43],
        [2, 33, 15, 2, 34, 16],
        [2, 33, 11, 2, 34, 12],
        [2, 86, 68],
        [4, 43, 27],
        [4, 43, 19],
        [4, 43, 15],
        [2, 98, 78],
        [4, 49, 31],
        [2, 32, 14, 4, 33, 15],
        [4, 39, 13, 1, 40, 14],
        [2, 121, 97],
        [2, 60, 38, 2, 61, 39],
        [4, 40, 18, 2, 41, 19],
        [4, 40, 14, 2, 41, 15],
        [2, 146, 116],
        [3, 58, 36, 2, 59, 37],
        [4, 36, 16, 4, 37, 17],
        [4, 36, 12, 4, 37, 13],
        [2, 86, 68, 2, 87, 69],
        [4, 69, 43, 1, 70, 44],
        [6, 43, 19, 2, 44, 20],
        [6, 43, 15, 2, 44, 16],
        [4, 101, 81],
        [1, 80, 50, 4, 81, 51],
        [4, 50, 22, 4, 51, 23],
        [3, 36, 12, 8, 37, 13],
        [2, 116, 92, 2, 117, 93],
        [6, 58, 36, 2, 59, 37],
        [4, 46, 20, 6, 47, 21],
        [7, 42, 14, 4, 43, 15],
        [4, 133, 107],
        [8, 59, 37, 1, 60, 38],
        [8, 44, 20, 4, 45, 21],
        [12, 33, 11, 4, 34, 12],
        [3, 145, 115, 1, 146, 116],
        [4, 64, 40, 5, 65, 41],
        [11, 36, 16, 5, 37, 17],
        [11, 36, 12, 5, 37, 13],
        [5, 109, 87, 1, 110, 88],
        [5, 65, 41, 5, 66, 42],
        [5, 54, 24, 7, 55, 25],
        [11, 36, 12, 7, 37, 13],
        [5, 122, 98, 1, 123, 99],
        [7, 73, 45, 3, 74, 46],
        [15, 43, 19, 2, 44, 20],
        [3, 45, 15, 13, 46, 16],
        [1, 135, 107, 5, 136, 108],
        [10, 74, 46, 1, 75, 47],
        [1, 50, 22, 15, 51, 23],
        [2, 42, 14, 17, 43, 15],
        [5, 150, 120, 1, 151, 121],
        [9, 69, 43, 4, 70, 44],
        [17, 50, 22, 1, 51, 23],
        [2, 42, 14, 19, 43, 15],
        [3, 141, 113, 4, 142, 114],
        [3, 70, 44, 11, 71, 45],
        [17, 47, 21, 4, 48, 22],
        [9, 39, 13, 16, 40, 14],
        [3, 135, 107, 5, 136, 108],
        [3, 67, 41, 13, 68, 42],
        [15, 54, 24, 5, 55, 25],
        [15, 43, 15, 10, 44, 16],
        [4, 144, 116, 4, 145, 117],
        [17, 68, 42],
        [17, 50, 22, 6, 51, 23],
        [19, 46, 16, 6, 47, 17],
        [2, 139, 111, 7, 140, 112],
        [17, 74, 46],
        [7, 54, 24, 16, 55, 25],
        [34, 37, 13],
        [4, 151, 121, 5, 152, 122],
        [4, 75, 47, 14, 76, 48],
        [11, 54, 24, 14, 55, 25],
        [16, 45, 15, 14, 46, 16],
        [6, 147, 117, 4, 148, 118],
        [6, 73, 45, 14, 74, 46],
        [11, 54, 24, 16, 55, 25],
        [30, 46, 16, 2, 47, 17],
        [8, 132, 106, 4, 133, 107],
        [8, 75, 47, 13, 76, 48],
        [7, 54, 24, 22, 55, 25],
        [22, 45, 15, 13, 46, 16],
        [10, 142, 114, 2, 143, 115],
        [19, 74, 46, 4, 75, 47],
        [28, 50, 22, 6, 51, 23],
        [33, 46, 16, 4, 47, 17],
        [8, 152, 122, 4, 153, 123],
        [22, 73, 45, 3, 74, 46],
        [8, 53, 23, 26, 54, 24],
        [12, 45, 15, 28, 46, 16],
        [3, 147, 117, 10, 148, 118],
        [3, 73, 45, 23, 74, 46],
        [4, 54, 24, 31, 55, 25],
        [11, 45, 15, 31, 46, 16],
        [7, 146, 116, 7, 147, 117],
        [21, 73, 45, 7, 74, 46],
        [1, 53, 23, 37, 54, 24],
        [19, 45, 15, 26, 46, 16],
        [5, 145, 115, 10, 146, 116],
        [19, 75, 47, 10, 76, 48],
        [15, 54, 24, 25, 55, 25],
        [23, 45, 15, 25, 46, 16],
        [13, 145, 115, 3, 146, 116],
        [2, 74, 46, 29, 75, 47],
        [42, 54, 24, 1, 55, 25],
        [23, 45, 15, 28, 46, 16],
        [17, 145, 115],
        [10, 74, 46, 23, 75, 47],
        [10, 54, 24, 35, 55, 25],
        [19, 45, 15, 35, 46, 16],
        [17, 145, 115, 1, 146, 116],
        [14, 74, 46, 21, 75, 47],
        [29, 54, 24, 19, 55, 25],
        [11, 45, 15, 46, 46, 16],
        [13, 145, 115, 6, 146, 116],
        [14, 74, 46, 23, 75, 47],
        [44, 54, 24, 7, 55, 25],
        [59, 46, 16, 1, 47, 17],
        [12, 151, 121, 7, 152, 122],
        [12, 75, 47, 26, 76, 48],
        [39, 54, 24, 14, 55, 25],
        [22, 45, 15, 41, 46, 16],
        [6, 151, 121, 14, 152, 122],
        [6, 75, 47, 34, 76, 48],
        [46, 54, 24, 10, 55, 25],
        [2, 45, 15, 64, 46, 16],
        [17, 152, 122, 4, 153, 123],
        [29, 74, 46, 14, 75, 47],
        [49, 54, 24, 10, 55, 25],
        [24, 45, 15, 46, 46, 16],
        [4, 152, 122, 18, 153, 123],
        [13, 74, 46, 32, 75, 47],
        [48, 54, 24, 14, 55, 25],
        [42, 45, 15, 32, 46, 16],
        [20, 147, 117, 4, 148, 118],
        [40, 75, 47, 7, 76, 48],
        [43, 54, 24, 22, 55, 25],
        [10, 45, 15, 67, 46, 16],
        [19, 148, 118, 6, 149, 119],
        [18, 75, 47, 31, 76, 48],
        [34, 54, 24, 34, 55, 25],
        [20, 45, 15, 61, 46, 16],
      ],
      t = function (i, s) {
        let r = {};
        return (r.totalCount = i), (r.dataCount = s), r;
      },
      n = {},
      a = function (i, s) {
        switch (s) {
          case Cu.L:
            return e[(i - 1) * 4 + 0];
          case Cu.M:
            return e[(i - 1) * 4 + 1];
          case Cu.Q:
            return e[(i - 1) * 4 + 2];
          case Cu.H:
            return e[(i - 1) * 4 + 3];
          default:
            return;
        }
      };
    return (
      (n.getRSBlocks = function (i, s) {
        let r = a(i, s);
        if (typeof r > "u")
          throw "bad rs block @ typeNumber:" + i + "/errorCorrectionLevel:" + s;
        let o = r.length / 3,
          l = [];
        for (let u = 0; u < o; u += 1) {
          let f = r[u * 3 + 0],
            p = r[u * 3 + 1],
            m = r[u * 3 + 2];
          for (let y = 0; y < f; y += 1) l.push(t(p, m));
        }
        return l;
      }),
      n
    );
  })(),
  kA = function () {
    let e = [],
      t = 0,
      n = {};
    return (
      (n.getBuffer = function () {
        return e;
      }),
      (n.getAt = function (a) {
        let i = Math.floor(a / 8);
        return ((e[i] >>> (7 - (a % 8))) & 1) == 1;
      }),
      (n.put = function (a, i) {
        for (let s = 0; s < i; s += 1) n.putBit(((a >>> (i - s - 1)) & 1) == 1);
      }),
      (n.getLengthInBits = function () {
        return t;
      }),
      (n.putBit = function (a) {
        let i = Math.floor(t / 8);
        e.length <= i && e.push(0), a && (e[i] |= 128 >>> t % 8), (t += 1);
      }),
      n
    );
  },
  xO = function (e) {
    let t = on.MODE_NUMBER,
      n = e,
      a = {};
    (a.getMode = function () {
      return t;
    }),
      (a.getLength = function (r) {
        return n.length;
      }),
      (a.write = function (r) {
        let o = n,
          l = 0;
        for (; l + 2 < o.length; )
          r.put(i(o.substring(l, l + 3)), 10), (l += 3);
        l < o.length &&
          (o.length - l == 1
            ? r.put(i(o.substring(l, l + 1)), 4)
            : o.length - l == 2 && r.put(i(o.substring(l, l + 2)), 7));
      });
    let i = function (r) {
        let o = 0;
        for (let l = 0; l < r.length; l += 1) o = o * 10 + s(r.charAt(l));
        return o;
      },
      s = function (r) {
        if ("0" <= r && r <= "9") return r.charCodeAt(0) - 48;
        throw "illegal char :" + r;
      };
    return a;
  },
  wO = function (e) {
    let t = on.MODE_ALPHA_NUM,
      n = e,
      a = {};
    (a.getMode = function () {
      return t;
    }),
      (a.getLength = function (s) {
        return n.length;
      }),
      (a.write = function (s) {
        let r = n,
          o = 0;
        for (; o + 1 < r.length; )
          s.put(i(r.charAt(o)) * 45 + i(r.charAt(o + 1)), 11), (o += 2);
        o < r.length && s.put(i(r.charAt(o)), 6);
      });
    let i = function (s) {
      if ("0" <= s && s <= "9") return s.charCodeAt(0) - 48;
      if ("A" <= s && s <= "Z") return s.charCodeAt(0) - 65 + 10;
      switch (s) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + s;
      }
    };
    return a;
  },
  TO = function (e) {
    let t = on.MODE_8BIT_BYTE,
      n = e,
      a = ol.stringToBytes(e),
      i = {};
    return (
      (i.getMode = function () {
        return t;
      }),
      (i.getLength = function (s) {
        return a.length;
      }),
      (i.write = function (s) {
        for (let r = 0; r < a.length; r += 1) s.put(a[r], 8);
      }),
      i
    );
  },
  SO = function (e) {
    let t = on.MODE_KANJI,
      n = e,
      a = ol.stringToBytes;
    (function (r, o) {
      let l = a(r);
      if (l.length != 2 || ((l[0] << 8) | l[1]) != o)
        throw "sjis not supported.";
    })("友", 38726);
    let i = a(e),
      s = {};
    return (
      (s.getMode = function () {
        return t;
      }),
      (s.getLength = function (r) {
        return ~~(i.length / 2);
      }),
      (s.write = function (r) {
        let o = i,
          l = 0;
        for (; l + 1 < o.length; ) {
          let u = ((255 & o[l]) << 8) | (255 & o[l + 1]);
          if (33088 <= u && u <= 40956) u -= 33088;
          else if (57408 <= u && u <= 60351) u -= 49472;
          else throw "illegal char at " + (l + 1) + "/" + u;
          (u = ((u >>> 8) & 255) * 192 + (u & 255)), r.put(u, 13), (l += 2);
        }
        if (l < o.length) throw "illegal char at " + (l + 1);
      }),
      s
    );
  },
  xA = function () {
    let e = [],
      t = {};
    return (
      (t.writeByte = function (n) {
        e.push(n & 255);
      }),
      (t.writeShort = function (n) {
        t.writeByte(n), t.writeByte(n >>> 8);
      }),
      (t.writeBytes = function (n, a, i) {
        (a = a || 0), (i = i || n.length);
        for (let s = 0; s < i; s += 1) t.writeByte(n[s + a]);
      }),
      (t.writeString = function (n) {
        for (let a = 0; a < n.length; a += 1) t.writeByte(n.charCodeAt(a));
      }),
      (t.toByteArray = function () {
        return e;
      }),
      (t.toString = function () {
        let n = "";
        n += "[";
        for (let a = 0; a < e.length; a += 1) a > 0 && (n += ","), (n += e[a]);
        return (n += "]"), n;
      }),
      t
    );
  },
  CO = function () {
    let e = 0,
      t = 0,
      n = 0,
      a = "",
      i = {},
      s = function (o) {
        a += String.fromCharCode(r(o & 63));
      },
      r = function (o) {
        if (o < 0) throw "n:" + o;
        if (o < 26) return 65 + o;
        if (o < 52) return 97 + (o - 26);
        if (o < 62) return 48 + (o - 52);
        if (o == 62) return 43;
        if (o == 63) return 47;
        throw "n:" + o;
      };
    return (
      (i.writeByte = function (o) {
        for (e = (e << 8) | (o & 255), t += 8, n += 1; t >= 6; )
          s(e >>> (t - 6)), (t -= 6);
      }),
      (i.flush = function () {
        if ((t > 0 && (s(e << (6 - t)), (e = 0), (t = 0)), n % 3 != 0)) {
          let o = 3 - (n % 3);
          for (let l = 0; l < o; l += 1) a += "=";
        }
      }),
      (i.toString = function () {
        return a;
      }),
      i
    );
  },
  AO = function (e) {
    let t = e,
      n = 0,
      a = 0,
      i = 0,
      s = {};
    s.read = function () {
      for (; i < 8; ) {
        if (n >= t.length) {
          if (i == 0) return -1;
          throw "unexpected end of file./" + i;
        }
        let l = t.charAt(n);
        if (((n += 1), l == "=")) return (i = 0), -1;
        if (l.match(/^\s$/)) continue;
        (a = (a << 6) | r(l.charCodeAt(0))), (i += 6);
      }
      let o = (a >>> (i - 8)) & 255;
      return (i -= 8), o;
    };
    let r = function (o) {
      if (65 <= o && o <= 90) return o - 65;
      if (97 <= o && o <= 122) return o - 97 + 26;
      if (48 <= o && o <= 57) return o - 48 + 52;
      if (o == 43) return 62;
      if (o == 47) return 63;
      throw "c:" + o;
    };
    return s;
  },
  RO = function (e, t) {
    let n = e,
      a = t,
      i = new Array(e * t),
      s = {};
    (s.setPixel = function (u, f, p) {
      i[f * n + u] = p;
    }),
      (s.write = function (u) {
        u.writeString("GIF87a"),
          u.writeShort(n),
          u.writeShort(a),
          u.writeByte(128),
          u.writeByte(0),
          u.writeByte(0),
          u.writeByte(0),
          u.writeByte(0),
          u.writeByte(0),
          u.writeByte(255),
          u.writeByte(255),
          u.writeByte(255),
          u.writeString(","),
          u.writeShort(0),
          u.writeShort(0),
          u.writeShort(n),
          u.writeShort(a),
          u.writeByte(0);
        let f = 2,
          p = o(f);
        u.writeByte(f);
        let m = 0;
        for (; p.length - m > 255; )
          u.writeByte(255), u.writeBytes(p, m, 255), (m += 255);
        u.writeByte(p.length - m),
          u.writeBytes(p, m, p.length - m),
          u.writeByte(0),
          u.writeString(";");
      });
    let r = function (u) {
        let f = u,
          p = 0,
          m = 0,
          y = {};
        return (
          (y.write = function (S, w) {
            if (S >>> w) throw "length over";
            for (; p + w >= 8; )
              f.writeByte(255 & ((S << p) | m)),
                (w -= 8 - p),
                (S >>>= 8 - p),
                (m = 0),
                (p = 0);
            (m = (S << p) | m), (p = p + w);
          }),
          (y.flush = function () {
            p > 0 && f.writeByte(m);
          }),
          y
        );
      },
      o = function (u) {
        let f = 1 << u,
          p = (1 << u) + 1,
          m = u + 1,
          y = l();
        for (let g = 0; g < f; g += 1) y.add(String.fromCharCode(g));
        y.add(String.fromCharCode(f)), y.add(String.fromCharCode(p));
        let S = xA(),
          w = r(S);
        w.write(f, m);
        let v = 0,
          b = String.fromCharCode(i[v]);
        for (v += 1; v < i.length; ) {
          let g = String.fromCharCode(i[v]);
          (v += 1),
            y.contains(b + g)
              ? (b = b + g)
              : (w.write(y.indexOf(b), m),
                y.size() < 4095 &&
                  (y.size() == 1 << m && (m += 1), y.add(b + g)),
                (b = g));
        }
        return (
          w.write(y.indexOf(b), m), w.write(p, m), w.flush(), S.toByteArray()
        );
      },
      l = function () {
        let u = {},
          f = 0,
          p = {};
        return (
          (p.add = function (m) {
            if (p.contains(m)) throw "dup key:" + m;
            (u[m] = f), (f += 1);
          }),
          (p.size = function () {
            return f;
          }),
          (p.indexOf = function (m) {
            return u[m];
          }),
          (p.contains = function (m) {
            return typeof u[m] < "u";
          }),
          p
        );
      };
    return s;
  },
  NO = function (e, t, n) {
    let a = RO(e, t);
    for (let o = 0; o < t; o += 1)
      for (let l = 0; l < e; l += 1) a.setPixel(l, o, n(l, o));
    let i = xA();
    a.write(i);
    let s = CO(),
      r = i.toByteArray();
    for (let o = 0; o < r.length; o += 1) s.writeByte(r[o]);
    return s.flush(), "data:image/gif;base64," + s;
  },
  wA = ol,
  C9 = ol.stringToBytes;
function TA(e, t = 220) {
  let n = wA(0, "M");
  n.addData(e, "Byte"), n.make();
  let a = n.getModuleCount(),
    i = 2,
    s = a + i * 2,
    r = "";
  for (let o = 0; o < a; o++)
    for (let l = 0; l < a; l++)
      n.isDark(o, l) && (r += "M" + (l + i) + " " + (o + i) + "h1v1h-1z");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${t}" height="${t}" shape-rendering="crispEdges" role="img" aria-label="QR-код для входа"><rect width="${s}" height="${s}" fill="#fff"/><path d="${r}" fill="#000"/></svg>`;
}
var Tt = (e) =>
    e.getFullYear() +
    "-" +
    String(e.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(e.getDate()).padStart(2, "0"),
  MO = [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ],
  Rm = (e) => {
    let [t, n, a] = e.split("-").map(Number);
    return new Date(t, n - 1, a);
  },
  SA = (e, t) => {
    let n = Rm(e);
    return Tt(new Date(n.getFullYear(), n.getMonth(), n.getDate() + t));
  },
  EO = (e) => {
    let t = Rm(e).getDay();
    return t === 0 || t === 6;
  };
function _r(e, t = new Date()) {
  let n = Rm(e),
    a = Math.round(
      (n.getTime() -
        new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) /
        864e5,
    );
  return (
    (a === 0 ? "Сегодня" : a === 1 ? "Завтра" : MO[n.getDay()]) +
    ", " +
    n.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
  );
}
function Nm(e, t = new Date()) {
  let n = [];
  for (let a = 0; a < 7; a++) {
    let i = new Date(t.getFullYear(), t.getMonth(), t.getDate() + a),
      s = Tt(i);
    n.push(e.find((r) => r.date === s) ?? { date: s, items: [] });
  }
  return n;
}
var Z0 = ["breakfast", "lunch", "dinner"],
  Nu = { breakfast: "Завтрак", lunch: "Обед", dinner: "Ужин" };
var U0 = { meals: ["dinner"], quickWeekdays: !1, cookAhead: !1 },
  Hn = (e) => e.meal ?? "dinner",
  RA = (e) =>
    Ne(e) === "breakfast" ||
    (Zt(e).includes("breakfast") &&
      !Zt(e).some((t) => t === "dinner" || t === "lunch"))
      ? "breakfast"
      : "dinner";
function I0(e) {
  let t =
    e.meals.length === 3
      ? "завтрак, обед и ужин"
      : e.meals.map((n) => Nu[n].toLowerCase()).join(" и ") || "ужин";
  return [
    t.charAt(0).toUpperCase() + t.slice(1),
    e.quickWeekdays ? "в будни быстро" : "",
    e.cookAhead ? "готовим на 2 дня" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
var ll = (e) => F.find((t) => t.id === e),
  CA = (e) =>
    !["side", "sauce", "drink"].includes(Ne(e)) &&
    Zt(e).some((t) => t === "dinner" || t === "lunch"),
  AA = (e) => Ne(e) === "breakfast" || Zt(e).includes("breakfast"),
  Ru = (e) => nt(e, "dish:soup"),
  DO = (e) => (e.storageDays ?? 0) >= 2 && ["main", "soup"].includes(Ne(e)),
  _O = new Set(
    "sour-cream cream kefir milk cottage-cheese plain-yogurt processed-cheese feta-cheese mayonnaise tomato-paste canned-tomato cabbage dill parsley green-onion cilantro spinach sorrel mushroom zucchini pumpkin bell-pepper eggplant celery minced-pork-beef minced-beef".split(
      " ",
    ),
  ),
  Am = (e) => [
    ...new Set(e.ingredients.filter((t) => _O.has(t.id)).map((t) => t.id)),
  ],
  OO = { breakfast: 20, lunch: 40, dinner: 40 };
// Cold soups — окрошка, холодник, свекольник, гаспачо — belong to the warm months (May to September).
var COLD_SOUP = /окрошк|холодник|свекольник холодн|ботвин|гаспачо|таратор|холодн\S* суп/i;
// Dishes most home cooks have never made: miso, tofu, fish sauce, curry pastes, tortillas… One a week at most —
// a plan is familiar food first. «По-корейски» carrot and cucumbers are on every table, so the word alone does not count.
var UNUSUAL_ING = new Set(["nori", "miso-paste", "tofu", "oyster-sauce", "fish-sauce", "rice-noodles", "tamarind-paste", "canned-coconut-milk", "star-anise", "rice-paper", "gochujang", "glass-noodles", "corn-tortilla", "wheat-tortilla", "canned-black-beans", "green-curry-paste", "massaman-curry-paste", "tom-yum-paste", "udon-noodles", "soba-noodles", "lime-juice", "garam-masala", "tahini", "sumac", "dark-soy-sauce", "quinoa", "matcha-powder", "curry-powder"]),
  UNUSUAL_TITLE = /чапче|пад тай|том ям|рамен|фо бо|бибимбап|пибимпап|кимчи|ларб|терияки|карри|буррито|тако|кесадиль|гуакамоле|мисо|тайск|японск|вьетнам|индийск|мексикан|начос|фахитас|поке|суши|ролл/i;
function inSeason(e, t) {
  return !COLD_SOUP.test(e.title) || (t >= 4 && t <= 8);
}
// Pasta, risotto, lasagne, ravioli… familiar, but not every day: two a week at most. Home «макароны по-флотски» and
// «макароны с сыром» do not count.
var ITALIAN = /(?<![а-яё])паст[аыу](?![а-яё])|спагетти|аматричан|путтанеск|ризотто|аранчини|лазань|карбонар|болоньез|песто|ньокки|равиоли|пицц|фокачч|брускетт|минестроне|капрезе|альо-олио|пенне|фетучин|феттучин|фузилли|тальятел|каннеллони|кальцоне|оссобуко|салтимбокк|фриттат|итальян|пармиджан|каччатор|чиабатт/i;
function italian(e) {
  return ITALIAN.test(e.title) || e.ingredients.some((t) => !t.optional && t.id === "arborio-rice");
}
function unusual(e) {
  return UNUSUAL_TITLE.test(e.title) || e.ingredients.some((t) => !t.optional && UNUSUAL_ING.has(t.id));
}
function Mu(e, t, n, a = Date.now(), i = U0) {
  let s = a >>> 0 || 7,
    r = () => (
      (s ^= s << 13),
      (s >>>= 0),
      (s ^= s >> 17),
      (s ^= s << 5),
      (s >>>= 0),
      s / 4294967296
    ),
    o = { ...rn(t), servings: n },
    // plan.only: the person's goals (budget, light, protein) narrow the dishes the menu is made of.
    month = (e[0] ? Rm(e[0].date) : new Date()).getMonth(),
    l = Qe(i.only ? F.filter(i.only) : F, o, t, 1 / 0)
      .map((R) => R.recipe)
      .filter((R) => inSeason(R, month))
      .map((R) => ({ r: R, k: r() }))
      .sort((R, T) => R.k - T.k)
      .map((R) => R.r),
    u = l.filter((R) => CA(R) && ["main", "soup"].includes(Ne(R))),
    f = u.length >= 10 ? u : l.filter(CA),
    p = l.filter((R) => AA(R) && Ne(R) !== "baking"),
    m = { breakfast: p.length >= 5 ? p : l.filter(AA), lunch: f, dinner: f },
    y = e.map((R) => ({ ...R, items: [...R.items] })),
    S = y
      .flatMap((R) =>
        R.items.filter((T) => !T.leftover).map((T) => ll(T.recipeId)),
      )
      .filter((R) => !!R),
    w = new Set(S.map((R) => gn(R))),
    odd = S.filter(unusual).length,
    pasta = S.filter(italian).length,
    v = new Set(S.map((R) => Us(R))),
    b = new Set(S.flatMap(Am)),
    g = y
      .flatMap((R) => R.items.filter((T) => Hn(T) === "dinner"))
      .map((R) => ll(R.recipeId))
      .filter((R) => R && Ru(R)).length,
    x = (R) =>
      R.ingredients.find((T) => !/^(вода|соль|масло|растительн)/i.test(T.name))
        ?.id,
    N = {},
    _ = !1,
    B = i.meals.length > 1 || i.meals[0] !== "dinner";
  for (let R = 0; R < y.length; R++) {
    let T = y[R],
      C = y[R + 1];
    for (let M of Z0) {
      if (!i.meals.includes(M)) continue;
      let Z = T.items.find((W) => Hn(W) === M);
      if (Z) {
        let W = ll(Z.recipeId);
        (N[M] = W ? x(W) : void 0), M === "dinner" && (_ = !!W && Ru(W));
        continue;
      }
      let V = i.quickWeekdays && !EO(T.date) ? OO[M] : null,
        k =
          M === "dinner" && i.cookAhead && C
            ? i.meals.includes("lunch")
              ? "lunch"
              : Rm(T.date).getDay() === 0
                ? "dinner"
                : null
            : null,
        U = !!k && !C.items.some((W) => Hn(W) === k),
        Y = (W) => DO(W) && W.maxServings >= n * 2,
        G = (W) =>
          !w.has(gn(W)) &&
          !(odd >= 1 && unusual(W)) &&
          !(pasta >= 2 && italian(W)) &&
          !(M === "dinner" && Ru(W) && (g >= 2 || _)) &&
          x(W) !== N[M],
        Q = m[M],
        ne = Q.filter((W) => G(W) && (V === null || W.totalMinutes <= V));
      if (
        (ne.length ||
          (ne = Q.filter(G).sort((W, le) =>
            V === null ? 0 : W.totalMinutes - le.totalMinutes,
          )),
        ne.length || (ne = Q.filter((W) => !w.has(gn(W)))),
        !ne.length)
      )
        continue;
      let ke = ne.filter((W) => !v.has(Us(W))),
        P = (ke.length ? ke : ne).slice(0, 8),
        vt = (W) =>
          (U && Y(W) ? 3 : 0) +
          (M === "lunch" && Ru(W) ? 2 : 0) +
          Math.min(2, Am(W).filter((le) => b.has(le)).length),
        He = P[0];
      for (let W of P.slice(1)) vt(W) > vt(He) && (He = W);
      w.add(gn(He)), v.add(Us(He)), unusual(He) && odd++, italian(He) && pasta++;
      for (let W of Am(He)) b.add(W);
      M === "dinner" && ((_ = Ru(He)), _ && g++), (N[M] = x(He));
      let ze = U && Y(He);
      T.items.push({
        recipeId: He.id,
        servings: Eu(He, ze ? n * 2 : n),
        ...(B ? { meal: M } : {}),
      }),
        ze &&
          C.items.push({
            recipeId: He.id,
            servings: Math.min(12, n),
            meal: k,
            leftover: !0,
          });
    }
    T.items.sort((M, Z) => Z0.indexOf(Hn(M)) - Z0.indexOf(Hn(Z)));
  }
  return y;
}
var Eu = (e, t) => Math.min(e.maxServings, Math.max(e.minServings, t));
function NA(e, t, n, a, i = Date.now(), s = U0) {
  let r = Mu(e, n, a, i, { ...s, cookAhead: !1 }).find((o) => o.date === t);
  return r ? e.map((o) => (o.date === t ? r : o)) : e;
}
function L0(e, t, n, a) {
  let i = e.find((r) => r.date === t)?.items[n];
  if (!i) return e;
  let s = e.map((r) =>
    r.date === t ? { ...r, items: r.items.filter((o, l) => l !== n) } : r,
  );
  if (i.leftover) {
    let r = SA(t, -1),
      o = ll(i.recipeId);
    o &&
      (s = s.map((l) =>
        l.date === r
          ? {
              ...l,
              items: l.items.map((u) =>
                !u.leftover && u.recipeId === i.recipeId
                  ? { ...u, servings: Eu(o, a) }
                  : u,
              ),
            }
          : l,
      ));
  } else {
    let r = SA(t, 1);
    s = s.map((o) =>
      o.date === r
        ? {
            ...o,
            items: o.items.filter(
              (l) => !(l.leftover && l.recipeId === i.recipeId),
            ),
          }
        : o,
    );
  }
  return s;
}
function MA(e, t, n, a, i, s = Date.now(), r = U0) {
  let o = e.find((S) => S.date === t),
    l = o?.items[n];
  if (!o || !l) return e;
  let u = Hn(l),
    f = L0(e, t, n, i),
    p = f.find((S) => S.date === t).items,
    m = { ...r, meals: [u], cookAhead: !1 },
    y = l.meal || r.meals.length > 1 || u !== "dinner";
  for (let S = 0; S < 5; S++) {
    let w = Mu(
      f.map((b) => (b.date === t ? { ...b, items: [] } : b)),
      a,
      i,
      s + S,
      m,
    )
      .find((b) => b.date === t)
      .items.find((b) => Hn(b) === u);
    if (!w) break;
    if (w.recipeId === l.recipeId || p.some((b) => b.recipeId === w.recipeId))
      continue;
    let v = {
      recipeId: w.recipeId,
      servings: w.servings,
      ...(y ? { meal: u } : {}),
    };
    return f.map((b) =>
      b.date === t ? { ...b, items: [...p.slice(0, n), v, ...p.slice(n)] } : b,
    );
  }
  return f;
}
function cl(e) {
  return e
    .flatMap((t) =>
      t.items.map((n) => ({ date: t.date, item: n, recipe: ll(n.recipeId) })),
    )
    .filter((t) => !!t.recipe);
}
function EA(e, t = [], n = []) {
  let a = t;
  for (let { item: i, recipe: s } of cl(e))
    i.leftover || (a = fu(a, Vp(s, Eu(s, i.servings), n), s.title));
  return a;
}
function DA(e) {
  let t = new Map();
  for (let { item: n, recipe: a } of cl(e))
    if (!n.leftover)
      for (let i of Am(a)) t.has(i) || t.set(i, new Set()), t.get(i).add(a.id);
  return [...t.entries()]
    .filter(([, n]) => n.size >= 2)
    .sort((n, a) => a[1].size - n[1].size)
    .map(([n, a]) => ({ id: n, name: We(n), dishes: a.size }));
}
function _A(e, t = new Date()) {
  let n = e.some((i) => i.items.some((s) => s.meal && s.meal !== "dinner"));
  return (
    `Меню на неделю:

` +
    e
      .filter((i) => i.items.length)
      .map(
        (i) =>
          _r(i.date, t) +
          `:
` +
          i.items.map(
            (s) =>
              "• " +
              (n ? Nu[Hn(s)] + ": " : "") +
              (ll(s.recipeId)?.title || "?") +
              (s.leftover
                ? " — остатки со вчера"
                : " (" + s.servings + " порц.)"),
          ).join(`
`),
      ).join(`

`)
  );
}
function Mm(e, t) {
  if (e.id === t.id) return 0;
  let n = 0,
    a = Ne(e),
    i = Ne(t);
  a !== i && (a === "soup" || i === "soup") && (n -= 2),
    a === i
      ? (n += 4)
      : (a === "dessert" || a === "baking") !=
          (i === "dessert" || i === "baking") && (n -= 4),
    Us(e) === Us(t) && Us(e).length >= 3 && (n += 5);
  let s = zi(e),
    r = zi(t);
  s && s === r && (n += 4);
  let o = new Set(Qb(e)),
    l = Qb(t),
    u = l.filter((p) => o.has(p)).length,
    f = new Set([...o, ...l]).size;
  return (
    f && (n += (6 * u) / f),
    (n += e.tags.filter((p) => t.tags.includes(p)).length * 0.7),
    e.tags.includes("sweet") !== t.tags.includes("sweet") && (n -= 3),
    e.cuisine && e.cuisine === t.cuisine && (n += 0.5),
    Zt(e).some((p) => Zt(t).includes(p)) && (n += 0.5),
    Ar(e) && Ar(t) && (n += 0.3),
    Math.abs(e.totalMinutes - t.totalMinutes) <= 15 && (n += 0.5),
    e.occasions?.length &&
      t.occasions?.some((p) => p !== "everyday" && e.occasions.includes(p)) &&
      (n += 1),
    Math.max(0, n)
  );
}
function OA(e, t = () => !0, n = 6, a = F) {
  let i = $p(e).filter((f) => f.id !== e.id && t(f)),
    s = gn(e),
    r = new Set(i.map((f) => f.id)),
    o = a
      .filter((f) => f.id !== e.id && !r.has(f.id) && gn(f) !== s && t(f))
      .map((f) => ({ x: f, s: Mm(e, f) }))
      .filter((f) => f.s >= 4)
      .sort((f, p) => p.s - f.s || f.x.title.localeCompare(p.x.title, "ru")),
    l = new Map(),
    u = [];
  for (let { x: f } of o) {
    let p = gn(f),
      m = l.get(p) || 0;
    if (!(m >= 2) && (l.set(p, m + 1), u.push(f), u.length >= n)) break;
  }
  return { variants: i, similar: u };
}
var zO = 864e5;
function Em(e, t = Date.now()) {
  let n = e.liked
      .slice(-20)
      .map((l) => F.find((u) => u.id === l))
      .filter((l) => !!l),
    a = new Set(e.disliked || []),
    i = (e.disliked || [])
      .slice(-20)
      .map((l) => F.find((u) => u.id === l))
      .filter((l) => !!l),
    s = new Set(e.tooHard),
    r = new Map(e.notNow.map((l) => [l.id, l.at])),
    o = new Map();
  return (l) => {
    let u = o.get(l.id);
    if (u !== void 0) return u;
    let f = 0;
    e.liked.includes(l.id) && (f += 2);
    let p = 0;
    for (let S of n) S.id !== l.id && (p = Math.max(p, Mm(S, l)));
    (f += Math.min(3, p / 4)), s.has(l.id) && (f -= 6), a.has(l.id) && (f -= 8);
    let m = 0;
    for (let S of i) S.id !== l.id && (m = Math.max(m, Mm(S, l)));
    (f -= Math.min(2, m / 8)),
      s.size && l.difficulty !== "easy" && (f -= 1.5),
      s.size && l.activeMinutes > 40 && (f -= 1);
    let y = r.get(l.id);
    return y && t - y < 3 * zO && (f -= 8), o.set(l.id, f), f;
  };
}
function B0(e, t, n, a = Date.now()) {
  let i = {
    liked: e.liked.filter((s) => s !== t),
    tooHard: e.tooHard.filter((s) => s !== t),
    notNow: e.notNow.filter((s) => s.id !== t),
  };
  return n === "liked" || n === "cooked"
    ? {
        ...i,
        liked: [...i.liked, t].slice(-60),
        tooHard: n === "cooked" ? e.tooHard.filter((s) => s !== t) : i.tooHard,
      }
    : n === "too_hard"
      ? { ...i, tooHard: [...i.tooHard, t].slice(-60) }
      : n === "not_now"
        ? {
            ...i,
            liked: e.liked,
            notNow: [...i.notNow, { id: t, at: a }].slice(-30),
          }
        : e;
}
function zA(e, t, n) {
  let a = {
    ...e,
    liked: e.liked.filter((i) => i !== t),
    disliked: (e.disliked || []).filter((i) => i !== t),
  };
  return n >= 4
    ? { ...a, liked: [...a.liked, t].slice(-60) }
    : n <= 2
      ? { ...a, disliked: [...a.disliked, t].slice(-60) }
      : a;
}
var Ve = React;
async function ZA(e, t = 1600, n = 0.86) {
  let a = URL.createObjectURL(e);
  try {
    let i = new Image();
    i.src = a;
    try {
      await i.decode();
    } catch {
      throw new Error(
        "Браузер не смог открыть это фото. Сохраните его как JPG или PNG и попробуйте снова.",
      );
    }
    let s = Math.min(1, t / Math.max(i.naturalWidth, i.naturalHeight)),
      r = document.createElement("canvas");
    (r.width = Math.max(1, Math.round(i.naturalWidth * s))),
      (r.height = Math.max(1, Math.round(i.naturalHeight * s)));
    let o = r.getContext("2d");
    if (!o) throw new Error("Браузер не умеет обрабатывать фото.");
    return (
      (o.fillStyle = "#ffffff"),
      o.fillRect(0, 0, r.width, r.height),
      o.drawImage(i, 0, 0, r.width, r.height),
      await new Promise((l, u) =>
        r.toBlob(
          (f) => (f ? l(f) : u(new Error("Не удалось подготовить фото."))),
          "image/jpeg",
          n,
        ),
      )
    );
  } finally {
    URL.revokeObjectURL(a);
  }
}
var _m = 3,
  Dm = class extends Error {
    constructor(n, a) {
      super(n);
      this.status = a;
    }
  };
async function Om(e, t, n = "") {
  let a;
  try {
    a = await fetch(wt(e) + n, { credentials: "same-origin", ...t });
  } catch {
    throw new Dm("Нет связи с сервером. Проверьте интернет.", 0);
  }
  let i = await a.json().catch(() => ({}));
  if (!a.ok)
    throw new Dm(
      i.error ||
        (a.status === 404
          ? "Отзывы пока недоступны."
          : "Не получилось. Попробуйте ещё раз."),
      a.status,
    );
  return i;
}
var Du = (e, t) =>
    Om(e, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    }),
  zm = (e, t = "new", n = 0) =>
    Om(
      "reviews.list",
      void 0,
      "&recipe=" + encodeURIComponent(e) + "&sort=" + t + "&offset=" + n,
    ),
  UA = () => Om("reviews.ratings").then((e) => e.ratings);
async function IA(e) {
  let t = new FormData();
  t.append("recipeId", e.recipeId),
    t.append("rating", String(e.rating)),
    t.append("text", e.text),
    e.author && t.append("author", e.author),
    e.consent && t.append("consent", "1"),
    t.append(
      "keepPhotos",
      JSON.stringify(e.keep.map((n) => n.split("/").pop())),
    );
  for (let n of e.files)
    t.append("photos[]", await ZA(n, 1600, 0.85), "photo.jpg");
  return Om("reviews.save", { method: "POST", body: t });
}
var LA = (e) => Du("reviews.delete", { id: e }),
  BA = (e, t) => Du("reviews.like", { id: e, on: t }),
  PA = (e, t, n, a) =>
    Du("reviews.reply", { reviewId: e, text: t, author: n, consent: a }),
  jA = (e) => Du("reviews.reply.delete", { id: e }),
  HA = (e, t, n) => Du("reviews.report", { kind: e, id: t, reason: n }),
  ul = (e) => e.toFixed(1).replace(/\.0$/, "").replace(".", ",");
function dl(e) {
  let t = e % 10,
    n = e % 100;
  return (
    e +
    " " +
    (t === 1 && n !== 11
      ? "отзыв"
      : t >= 2 && t <= 4 && (n < 12 || n > 14)
        ? "отзыва"
        : "отзывов")
  );
}
function P0(e, t = Date.now()) {
  let n = new Date(e),
    a = Math.floor(
      (new Date(t).setHours(0, 0, 0, 0) - new Date(e).setHours(0, 0, 0, 0)) /
        864e5,
    );
  return a <= 0
    ? "сегодня"
    : a === 1
      ? "вчера"
      : n.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          ...(n.getFullYear() !== new Date(t).getFullYear()
            ? { year: "numeric" }
            : {}),
        });
}

export {
  Nt,
  PC,
  J_,
  LC,
  $_,
  W_,
  BC,
  eO,
  jC,
  Pi,
  HC,
  ku,
  dm,
  tO,
  nO,
  qC,
  fm,
  GC,
  VC,
  R0,
  N0,
  KC,
  pm,
  pmSmall,
  YC,
  XC,
  QC,
  mm,
  gm,
  aO,
  M0,
  iO,
  sO,
  rO,
  oO,
  hm,
  FC,
  JC,
  $C,
  WC,
  eA,
  ym,
  lO,
  nA,
  cO,
  uO,
  dO,
  aA,
  tA,
  bm,
  iA,
  fO,
  pO,
  mO,
  sA,
  gO,
  Is,
  xu,
  vm,
  km,
  Pn,
  rA,
  jn,
  oA,
  hO,
  lA,
  yO,
  cA,
  fe,
  bO,
  vO,
  xm,
  uA,
  dA,
  Ua,
  fA,
  pA,
  E0,
  mA,
  ra,
  wm,
  Tm,
  Sm,
  Tu,
  wu,
  rl,
  kO,
  D0,
  gA,
  hA,
  _0,
  O0,
  yA,
  z0,
  Su,
  Cm,
  bA,
  ol,
  on,
  Cu,
  Ls,
  Bs,
  Ps,
  Au,
  vA,
  kA,
  xO,
  wO,
  TO,
  SO,
  xA,
  CO,
  AO,
  RO,
  NO,
  wA,
  C9,
  TA,
  Tt,
  MO,
  Rm,
  SA,
  EO,
  _r,
  Nm,
  Z0,
  Nu,
  U0,
  Hn,
  RA,
  I0,
  ll,
  CA,
  AA,
  Ru,
  DO,
  _O,
  Am,
  OO,
  Mu,
  Eu,
  NA,
  L0,
  MA,
  cl,
  EA,
  DA,
  _A,
  Mm,
  OA,
  zO,
  Em,
  B0,
  zA,
  Ve,
  ZA,
  _m,
  Dm,
  Om,
  Du,
  zm,
  UA,
  IA,
  LA,
  BA,
  PA,
  jA,
  HA,
  ul,
  dl,
  P0,
  unusual,
  inSeason,
  italian,
};
