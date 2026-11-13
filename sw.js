// Uygulamayı internetsiz de açılabilir yapar. Sürüm değişince eski önbellek silinir.
const V='tahsilat-v27';
// PaddleOCR (paddle.js, ONNX Runtime, modeller) büyük dosyalar: ayrı önbellekte durur, uygulama sürümü değişince silinmez.
// Önbellek adı Z Raporu uygulamasıyla ortak (aynı adres: oguzhan297.github.io) → modeller iki uygulama için bir kez iner.
const OCR='zrapor-ocr-1';
const isOcr=u=>u.hostname==='paddle-model-ecology.bj.bcebos.com'||(u.hostname==='cdn.jsdelivr.net'&&u.pathname.startsWith('/npm/onnxruntime-web@'))||(u.origin===self.location.origin&&u.pathname.endsWith('/paddle.js'));
const SHELL=['./','./index.html','./css/uygulama.css?v=27','./js/parser.js?v=27','./js/goruntu.js?v=27','./js/paddle-worker.js?v=27','./js/temel.js?v=27','./js/kutu.js?v=27','./js/depo.js?v=27','./js/ayarlar.js?v=27','./js/kontrol.js?v=27','./js/kalite.js?v=27','./js/arayuz.js?v=27','./js/okuyucu-claude.js?v=27','./js/okuyucu-tesseract.js?v=27','./js/okuyucu-paddle.js?v=27','./js/okuma.js?v=27','./js/disari.js?v=27','./js/ornek.js?v=27','./js/firmalar.js?v=27','./js/baslat.js?v=27','./ikon.svg?v=27','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
// cache:'reload' → tarayıcının kendi önbelleğindeki eski kopyayı değil, sunucudaki güncel dosyayı al
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,u.startsWith('http')?{mode:'no-cors'}:{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k.startsWith('tahsilat-v')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname==='api.anthropic.com'||u.hostname==='api.github.com'||u.searchParams.has('surum'))return;   // sürüm denetimi önbelleğe girmesin
  // Modeller ve çalışma zamanı sayfa tarafından zrapor-ocr önbelleğine yazılır (indirme yüzdesi için); burada sadece önbellekten ver
  if(isOcr(u)){e.respondWith(caches.open(OCR).then(c=>c.match(r,{ignoreVary:true}).then(m=>m||fetch(r).then(res=>{if(res.ok&&!/\.(tar|wasm)$/.test(u.pathname)){const cl=res.clone();c.put(r,cl)}return res}))));return}
  // Sayfanın kendisi: önce internetten (güncelleme gelsin), yoksa önbellekten
  if(r.mode==='navigate'){e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{const c=res.clone();caches.open(V).then(ca=>ca.put('./index.html',c));return res}).catch(()=>caches.match('./index.html')));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(V).then(ca=>ca.put(r,c))}return res})));
});
