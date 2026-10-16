import{c as m}from"./app-CUEiBD2p.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=m("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]),n=e=>e.replace(/[&<>"]/g,i=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[i]);function d(e,i,c){const a=i.map(t=>{var p;return(t.title?`<h2>${n(t.title)}</h2>`:"")+(t.text?`<p>${n(t.text).replace(/\n/g,"<br>")}</p>`:"")+((p=t.items)!=null&&p.length?`<${t.ordered?"ol":"ul"}>${t.items.map(l=>`<li>${n(l)}</li>`).join("")}</${t.ordered?"ol":"ul"}>`:"")}).join(""),r=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${n(e)}</title><style>
    body{font:15px/1.5 Georgia,"Times New Roman",serif;color:#000;margin:24px auto;max-width:720px;padding:0 16px}
    h1{font-size:26px;margin:0 0 6px}h2{font-size:18px;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
    ul,ol{margin:0;padding-left:22px}li{margin:4px 0}p{margin:6px 0}.note{color:#555;font-size:12px;margin-top:28px}
    @media print{body{margin:0 auto}}</style></head><body><h1>${n(e)}</h1>${a}
    <p class="note">${n(c??"Что приготовить? — "+location.host+location.pathname)}</p>
    <script>window.onload=function(){window.print()}<\/script></body></html>`,o=window.open("","_blank");o&&(o.document.open(),o.document.write(r),o.document.close())}function g(e,i){var r;const c=i.split(`
`).map(o=>o.trim()).filter(Boolean),a=((r=c[0])==null?void 0:r.replace(/[:：]$/,""))===e?c.slice(1):c;d(e,[{text:a.join(`
`)}])}export{s as S,g as a,d as p};
