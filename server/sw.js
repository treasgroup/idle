// Offline shell. Paths are relative to the service worker scope, so the site can live in a subfolder.
const CACHE="cook-shell-v6",IMAGES="cook-images-v2";
const SCOPE=new URL(self.registration.scope);
const local=path=>new URL(path,SCOPE).href;
const isApi=url=>url.pathname.startsWith(new URL("api/",SCOPE).pathname);
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["./","boot.js","manifest.webmanifest","favicon.svg","logo-round.svg","icons/icon-192.png","icons/icon-512.png"].map(local))).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("cook-")&&k!==CACHE&&k!==IMAGES&&k!==IMAGES.replace("images","catalog")).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("message",event=>{if(event.data?.type!=="CACHE_ASSETS"||!Array.isArray(event.data.urls))return;const urls=event.data.urls.filter(value=>{try{const u=new URL(value,self.location.origin);return u.origin===self.location.origin&&/\.(js|css|woff2?)(\?|$)/.test(u.pathname)&&!isApi(u);}catch{return false;}}).slice(0,80);event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)).then(()=>event.ports[0]?.postMessage({ready:true})).catch(()=>event.ports[0]?.postMessage({ready:false})));});
self.addEventListener("fetch",event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=="GET")return;
 // Recipe catalog: fresh from the network, the last copy when offline.
 if(url.origin===self.location.origin&&isApi(url)&&url.searchParams.get("r")==="catalog"){event.respondWith(fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(IMAGES.replace("images","catalog"));await cache.put(request,response.clone());}return response;}).catch(async()=>(await caches.match(request))||Response.error()));return;}
 if(url.origin===self.location.origin&&isApi(url))return;
 // The owner's admin panel is never cached and never replaces the app shell.
 if(url.origin===self.location.origin&&url.pathname.startsWith(new URL("admin/",SCOPE).pathname))return;
 if(url.origin===self.location.origin&&request.mode==="navigate"){
  event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(local("./"),response.clone());}return response;}catch{const cached=await caches.match(local("./"));return cached||new Response("Откройте сайт с интернетом один раз, чтобы включить автономный режим.",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});}})());return;
 }
 // Photos: show the cached copy at once, refresh it in the background (owner may replace a photo).
 if(url.origin===self.location.origin&&url.pathname.startsWith(new URL("photos/",SCOPE).pathname)){event.respondWith(caches.open(IMAGES).then(async cache=>{const cached=await cache.match(request);
  // Card copies carry their version in the name: once cached they never change.
  if(cached&&url.pathname.startsWith(new URL("photos/s/",SCOPE).pathname))return cached;const network=fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}).catch(()=>cached||Response.error());return cached||network;}));return;}
 // Files with a version in the name (app-…, chunk-…, fonts) never change: the cached copy. Everything else (icons,
 // the logo, Шеф's pictures, boot.js) is shown from the cache and refreshed in the background, so a replaced file
 // reaches people on the next visit instead of never.
 if(url.origin===self.location.origin){const fixed=/\/assets\/(app|chunk)-|\/fonts\//.test(url.pathname);event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(request);if(cached&&fixed)return cached;const network=fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}).catch(()=>cached||Response.error());return cached||network;}));return;}
});
// Reminders: the push itself is empty; what to show comes from the site's server.
self.addEventListener("push",event=>{event.waitUntil((async()=>{
 let msg={title:"Шефли",body:"Загляните — идея дня уже ждёт.",url:"./"};
 try{const sub=await self.registration.pushManager.getSubscription();if(sub){const r=await fetch(local("api/index.php?r=push.next"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});if(r.ok){const j=await r.json();if(j&&typeof j.body==="string")msg={title:String(j.title||msg.title).slice(0,80),body:j.body.slice(0,240),url:typeof j.url==="string"&&j.url.startsWith("./")?j.url:"./"};}}}catch{/* offline: the general text */}
 await self.registration.showNotification(msg.title,{body:msg.body,icon:local("icons/icon-192.png"),badge:local("icons/icon-192.png"),tag:"cook-reminder",lang:"ru",data:{url:local(msg.url)}});
})());});
self.addEventListener("notificationclick",event=>{event.notification.close();const focusOnly=!!event.notification.data?.focusOnly;const url=event.notification.data?.url||local("./");
 event.waitUntil((async()=>{const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const c of list){if(c.url.startsWith(SCOPE.href)&&"focus" in c){await c.focus();if(!focusOnly&&"navigate" in c)await c.navigate(url).catch(()=>{});return;}}await self.clients.openWindow(url);})());});
// The browser renewed the subscription: drop the old one on the server (the app subscribes again on the next visit).
self.addEventListener("pushsubscriptionchange",event=>{const old=event.oldSubscription;if(old)event.waitUntil(fetch(local("api/index.php?r=push.unsubscribe"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:old.endpoint})}).catch(()=>{}));});
