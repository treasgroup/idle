import{c,u as k,l as d,bf as v,j as a,i as w,b6 as m,ag as M,b5 as A,P as I}from"./app-CiE0PsKz.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=c("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=c("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=c("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);function T({recipeId:p,servings:u,onClose:o}){const{s:x,update:y,toast:f,profile:h}=k(),i=d(p);if(!i)return null;const g=v(x.menu),b=e=>{y(n=>{const s=[...n.menu],r=s.findIndex(t=>t.date===e),l={recipeId:i.id,servings:M(i,u??h.eaters)};return r>=0?s[r]={...s[r],items:[...s[r].items,l].slice(0,6)}:s.push({date:e,items:[l]}),{...n,menu:s.filter(t=>t.date>=A(new Date)).sort((t,j)=>t.date.localeCompare(j.date)).slice(0,31)}}),I(i,"plan"),f("Добавлено в план: "+m(e).toLowerCase()),o()};return a.jsx(w,{open:!0,title:"Добавить в план",onClose:o,children:a.jsx("div",{className:"grid gap-2",children:g.map(e=>a.jsxs("button",{className:"flex min-h-[52px] items-center justify-between rounded-input border border-line bg-card px-4 text-left hover:border-line-strong/60",onClick:()=>b(e.date),children:[a.jsx("span",{className:"font-semibold",children:m(e.date)}),a.jsx("span",{className:"text-caption text-ink-soft",children:e.items.length?e.items.map(n=>{var s;return(s=d(n.recipeId))==null?void 0:s.title}).filter(Boolean).join(", ").slice(0,40):"пусто"})]},e.date))})})}export{L as A,N as M,S as T,T as a};
