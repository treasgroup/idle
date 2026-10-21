// Tabs made of the older plain scripts (insights.js, vk.js, heal.js): the page gives them the blocks they look up
// by id, then runs them again each time the tab opens (each script binds to the blocks it finds when it starts).
// They draw with their own classes; ui.ts styles those inside `.ins` in the panel's look.
import { useEffect, useRef } from "react";

declare const __ADMIN_V__: string;

function run(scripts: string[]): () => void {
  const tags = scripts.map((src) => {
    const s = document.createElement("script");
    s.src = "./" + src + "?v=" + __ADMIN_V__;
    s.async = false;
    s.dataset.extra = "1";
    document.body.append(s);
    return s;
  });
  return () => tags.forEach((s) => s.remove());
}

function Page({ html, scripts }: { html: string; scripts: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    box.current.innerHTML = html;
    return run(scripts);
  }, [html, scripts]);
  return <div ref={box} />;
}

const DAYS = '<label class="adm-muted">За <select id="days"><option value="7">7 дней</option><option value="30" selected>30 дней</option><option value="90">90 дней</option></select></label>';
const MESSAGES_HTML = `
<div class="adm-toolbar"><div><h1 class="adm-title">Сообщения</h1><p class="adm-muted">Что пишут люди, где у них не получилось и как идут дела.</p></div><div class="adm-actions">${DAYS}</div></div>
<div class="ins" id="out"><p class="muted">Загружаю…</p></div>
<div class="ins"><h2>Каталог: вернуть дополнения</h2><div class="card" id="heal"><p class="muted" style="margin:0">Проверяю копии каталога…</p></div></div>`;
const MESSAGES_SCRIPTS = ["insights.js", "heal.js"];

const VK_HTML = `
<div class="adm-toolbar"><div><h1 class="adm-title">ВКонтакте</h1><p class="adm-muted">Посты «Рецепт дня» на неделю вперёд: скопировать текст и фото в отложенные записи сообщества.</p></div></div>
<div class="ins"><div class="card" id="vk"><p class="muted">Загружаю…</p></div></div>`;
const VK_SCRIPTS = ["vk.js"];

export const Messages = () => <Page html={MESSAGES_HTML} scripts={MESSAGES_SCRIPTS} />;
export const Vk = () => <Page html={VK_HTML} scripts={VK_SCRIPTS} />;
