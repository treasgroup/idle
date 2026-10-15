import{c as n,j as a,by as p,bz as h,bA as o,bj as d}from"./app-4ZptqBeV.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=n("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=n("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);function k({text:e,title:l,url:t,onDone:i,onPrint:c}){return a.jsxs("div",{className:"grid gap-2",children:[p()&&a.jsxs("button",{className:"btn-primary btn-bar",onClick:()=>navigator.share({title:l,text:e,...t?{url:t}:{}}).then(()=>i()).catch(()=>{}),children:[a.jsx(b,{size:18}),"Отправить…"]}),a.jsx("div",{className:"grid grid-cols-2 gap-2",children:h.map(s=>a.jsxs("button",{className:"btn-outline",onClick:async()=>{const r=o(s.id,e);r.copyFirst&&await d(e),window.open(r.url,"_blank","noopener"),i()},children:[s.label,s.id==="whatsapp"&&"*"]},s.id))}),a.jsxs("div",{className:"flex flex-wrap justify-center",children:[a.jsxs("button",{className:"btn-ghost",onClick:async()=>{await d(t??e),i(!0)},children:[a.jsx(x,{size:18}),t?"Скопировать ссылку":"Скопировать текст"]}),c!==void 0&&a.jsxs("button",{className:"btn-ghost",onClick:()=>{c(),i()},children:[a.jsx(y,{size:18}),"Распечатать"]})]}),h.some(s=>s.id==="whatsapp")&&a.jsx("p",{className:"text-center text-caption text-ink-faint",children:"*WhatsApp принадлежит компании Meta, которая признана экстремистской и запрещена на территории РФ."})]})}export{x as L,k as S};
