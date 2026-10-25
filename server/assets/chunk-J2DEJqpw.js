import{c as p,u as v,l,bO as k,j as a,i as w,bz as d,aH as M,by as A,a4 as I}from"./app-DNj-tds_.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=p("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=p("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);function S({recipeId:m,servings:u,onClose:o}){const{s:x,update:h,toast:f,profile:b}=v(),n=l(m);if(!n)return null;const g=k(x.menu),y=e=>{h(i=>{const s=[...i.menu],r=s.findIndex(t=>t.date===e),c={recipeId:n.id,servings:M(n,u??b.eaters)};return r>=0?s[r]={...s[r],items:[...s[r].items,c].slice(0,6)}:s.push({date:e,items:[c]}),{...i,menu:s.filter(t=>t.date>=A(new Date)).sort((t,j)=>t.date.localeCompare(j.date)).slice(0,31)}}),I(n,"plan"),f("Добавлено в план: "+d(e).toLowerCase()),o()};return a.jsx(w,{open:!0,title:"Добавить в план",onClose:o,children:a.jsx("div",{className:"grid gap-2",children:g.map(e=>a.jsxs("button",{className:"flex min-h-[52px] items-center justify-between rounded-input border border-line bg-card px-4 text-left hover:border-line-strong/60",onClick:()=>y(e.date),children:[a.jsx("span",{className:"font-semibold",children:d(e.date)}),a.jsx("span",{className:"text-caption text-ink-soft",children:e.items.length?e.items.map(i=>{var s;return(s=l(i.recipeId))==null?void 0:s.title}).filter(Boolean).join(", ").slice(0,40):"пусто"})]},e.date))})})}export{L as A,N as M,S as a};
