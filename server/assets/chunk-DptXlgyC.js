const p=t=>t.replace(/[&<>"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[o]),r=t=>{var o;return(t.title?`<h2>${p(t.title)}</h2>`:"")+(t.text?`<p>${p(t.text).replace(/\n/g,"<br>")}</p>`:"")+((o=t.items)!=null&&o.length?`<${t.ordered?"ol":"ul"}>${t.items.map(i=>`<li>${p(i)}</li>`).join("")}</${t.ordered?"ol":"ul"}>`:"")};function m(t,o,i,n){const a=n!=null&&n.length?`<div class="cols"><div>${n.map(r).join("")}</div><div>${o.map(r).join("")}</div></div>`:o.map(r).join(""),l=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${p(t)}</title><style>
    body{font:15px/1.5 Georgia,"Times New Roman",serif;color:#000;margin:24px auto;max-width:720px;padding:0 16px}
    h1{font-size:26px;margin:0 0 6px}h2{font-size:18px;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
    ul,ol{margin:0;padding-left:22px}li{margin:4px 0}p{margin:6px 0}.note{color:#555;font-size:12px;margin-top:28px}
    .big{font-size:19px;line-height:1.55;max-width:900px}.big h1{font-size:32px}.big h2{font-size:22px}.big li{margin:7px 0}
    .cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:32px}
    @media print{body{margin:0 auto}}</style></head><body${n!=null&&n.length?' class="big"':""}><h1>${p(t)}</h1>${a}
    <p class="note">${p(i??"Что приготовить? — "+location.host+location.pathname)}</p>
    <script>window.onload=function(){window.print()}<\/script></body></html>`,e=window.open("","_blank");e&&(e.document.open(),e.document.write(l),e.document.close())}function c(t,o){var a;const i=o.split(`
`).map(l=>l.trim()).filter(Boolean),n=((a=i[0])==null?void 0:a.replace(/[:：]$/,""))===t?i.slice(1):i;m(t,[{text:n.join(`
`)}])}export{c as a,m as p};
