import{c,u as k,h as d,b7 as v,j as a,o as w,a$ as m,aa as M,a_ as A}from"./app-KyHl37jF.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=c("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=c("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=c("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);function S({recipeId:p,servings:u,onClose:o}){const{s:x,update:y,toast:h,profile:f}=k(),n=d(p);if(!n)return null;const g=v(x.menu),b=e=>{y(i=>{const s=[...i.menu],r=s.findIndex(t=>t.date===e),l={recipeId:n.id,servings:M(n,u??f.eaters)};return r>=0?s[r]={...s[r],items:[...s[r].items,l].slice(0,6)}:s.push({date:e,items:[l]}),{...i,menu:s.filter(t=>t.date>=A(new Date)).sort((t,j)=>t.date.localeCompare(j.date)).slice(0,31)}}),h("Добавлено в план: "+m(e).toLowerCase()),o()};return a.jsx(w,{open:!0,title:"Добавить в план",onClose:o,children:a.jsx("div",{className:"grid gap-2",children:g.map(e=>a.jsxs("button",{className:"flex min-h-[52px] items-center justify-between rounded-input border border-line bg-card px-4 text-left hover:border-line-strong/60",onClick:()=>b(e.date),children:[a.jsx("span",{className:"font-semibold",children:m(e.date)}),a.jsx("span",{className:"text-caption text-ink-soft",children:e.items.length?e.items.map(i=>{var s;return(s=d(i.recipeId))==null?void 0:s.title}).filter(Boolean).join(", ").slice(0,40):"пусто"})]},e.date))})})}export{C as A,L as M,N as T,S as a};
