// Arayüz: rapor kartları, kontrol ekranı, alt özet çubuğu; kart üzerindeki tıklama ve düzenlemeler; metin yapıştırma penceresi
// ---- Arama ve süzgeç (yalnız listeyi süzer; Luca dosyası etkilenmez) ----
const FLT={q:'',f:'tum'};
const SUZ={tum:r=>true,kontrol:r=>isBad(r),yeni:r=>!r.akt,akt:r=>!!r.akt};
function araUyar(r,q){if(!q)return true;const d=r.d,t=[d.firma,d.tarih,d.evrak_no,d.aciklama,fm(d.toplam),fm(d.kart),fm(d.nakit),fm(d.cek),d.not].join(' ').toLocaleLowerCase('tr-TR');
  return q.toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean).every(w=>t.includes(w)||t.replace(/\./g,'').includes(w.replace(/\./g,'')))}
const gorunur=r=>r.status!=='done'||(SUZ[FLT.f](r)&&araUyar(r,FLT.q));
function filtreUI(){const done=rows.filter(r=>r.status==='done'),el=$('#filtre');if(!el)return;el.hidden=done.length<3;
  for(const b of el.querySelectorAll('[data-f]')){const k=b.dataset.f;b.classList.toggle('on',FLT.f===k);b.querySelector('b').textContent=done.filter(SUZ[k]).length}}
const aktTarih=(t,uzun)=>{const d=new Date(t);return uzun?d.toLocaleDateString('tr-TR'):`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`};
// Okuma hatası bildirimi: okunan ↔ şimdiki farkı
function duzeltilen(r){if(!r.oku)return [];const n=v=>v==null||v===''?null:typeof v==='number'?Math.round(v*100):String(v).trim();
  return Object.keys(r.oku).filter(k=>n(r.oku[k])!==n(r.d[k])&&!(r.auto||[]).includes(k))}
// Okuma hatası bildirimi: tek kutu. Alan düzeltildiyse kendiliğinden açık durur (not + Gönder tek dokunuş);
// düzeltme yoksa gizlidir, kartın altındaki "Hata bildir" ile açılır.
const duzBaslik=r=>{const k=duzeltilen(r),ad=x=>(FIELDS.find(f=>f.k===x)||{}).l||x;
  return k.length?`${ik('kalem')}Düzelttiğin alanlar: <b>${k.map(x=>esc(ad(x))).join(', ')}</b><div class="hint">Okuyucu bunları yanlış okumuş. Gönderirsen bu makbuz test arşivine eklenir ve aynı hata bir daha tekrarlanmaz.</div>`
    :`${ik('uyari')}<b>Okuma hatası bildir</b><div class="hint">Yanlış alanı önce yukarıda düzeltirsen doğru değer de bildirime girer.</div>`};
const duzDurum=r=>r.bildirildi?`<span class="hint">✓ ${new Date(r.bildirildi).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}’de gönderildi</span>`:'';
function bildirKutuHTML(r){return `<div class="duz bildirkutu" id="bk-${r.id}" ${duzeltilen(r).length?'':'hidden'}><div class="dzb">${duzBaslik(r)}</div>
  <textarea rows="2" id="bn-${r.id}" placeholder="Not (isteğe bağlı) — örn. tutar 4.230,00 olmalı"></textarea>
  <div class="hint">${S.ghKey?'Makbuz, fotoğrafıyla birlikte doğrudan gizli test gelen kutusuna gönderilir.':'Bildirim dosyası oluşturulur; sohbete gönder. (Ayarlar’a gelen kutusu anahtarı girersen doğrudan gönderilir.)'}</div>
  <div class="set-row" style="justify-content:flex-end"><span class="dzd">${duzDurum(r)}</span><button class="btn small primary" data-bildir="${r.id}">${ik('paylas')}${r.bildirildi?'Yeniden gönder':'Gönder'}</button></div></div>`}
async function hataBildir(r,not='',dugme){
  const k=duzeltilen(r);let foto=null,asil=[];try{foto=r.thumb&&r.thumb.startsWith('data:')?r.thumb:await IDB.get('imgs',r.id)}catch(e){}
  // fotoğrafın aslı saklıysa onu da ekle (test arşivi için en değerlisi)
  try{const o=r.hasOrig?await IDB.get('orig',r.id):null;for(const b of o||[])asil.push(await new Promise((a,h)=>{const f=new FileReader();f.onload=()=>a(f.result);f.onerror=h;f.readAsDataURL(b)}))}catch(e){}
  const paket={tur:'tahsilat-okuma-hatasi',surum:APP_VER,okuyucu:S.mode,olusturma:new Date().toISOString(),tarih:r.d.tarih,evrak_no:r.d.evrak_no,firma:r.d.firma,el:!!r.el,not:not||'',
    duzeltilen:Object.fromEntries(k.map(x=>[x,{okunan:r.oku&&r.oku[x],dogru:r.d[x]}])),dogru_degerler:okunanAnlik(r.d),okunan_degerler:r.oku||null,
    okunan_metin:r.ocr||'',kalite:r.q||null,foto_asil:asil,foto_kucuk:asil.length?null:foto||null};
  const ad=`tahsilat_${(r.d.tarih||'tarihsiz').replace(/\./g,'-')}_${String(r.d.evrak_no||'-').replace(/[^0-9A-Za-z-]/g,'')}`;
  if(S.ghKey){
    // Doğrudan gelen kutusuna: bildirim.json (fotoğrafsız) + fotoğraflar ayrı jpg
    const klasor=`${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}_${ad}_${Math.random().toString(36).slice(2,6)}`;
    const fotolar=(asil.length?asil:foto&&foto.startsWith('data:')?[foto]:[]).map((u,i)=>({ad:`foto-${i+1}${asil.length?'':'-kucuk'}.jpg`,b64:u.slice(u.indexOf(',')+1)}));
    const govde={...paket,foto_asil:undefined,foto_kucuk:undefined,fotolar:fotolar.map(f=>f.ad)};
    const eski=dugme&&dugme.innerHTML;if(dugme){dugme.disabled=true;dugme.textContent='Gönderiliyor…'}
    try{await ghGonder(klasor,[{ad:'bildirim.json',b64:b64Metin(JSON.stringify(govde,null,1))},...fotolar]);
      r.bildirildi=Date.now();save(r);toast('✓ Bildirim gönderildi, teşekkürler');return true}
    catch(e){toast('Gönderilemedi ('+(e.message==='Failed to fetch'?'bağlantı yok':e.message)+'); dosya olarak paylaşılıyor')}
    finally{if(dugme){dugme.disabled=false;dugme.innerHTML=eski}}
  }
  const ok=await offer(`okuma-hatasi_${ad}.json`,JSON.stringify(paket,null,1));
  if(ok){r.bildirildi=Date.now();save(r);toast(asil.length?'Dosyada makbuzun fotoğrafı da var; sohbete göndermen yeterli':'Dosyayı makbuzun asıl fotoğrafıyla birlikte gönder')}
  return ok;
}

function render(){return ckToplu(render0)}
function render0(){
  const L=$('#list');filtreUI();
  const goster=rows.filter(gorunur);
  if(!rows.length){L.innerHTML='<div class="empty-state">Henüz makbuz yok.<br>Yukarıdan fotoğraf çekerek başla.</div>'}
  else if(!goster.length){L.innerHTML='<div class="empty-state">Bu aramaya / süzgece uyan makbuz yok.</div>'}
  else L.innerHTML=goster.map(r=>{
    if(r.status==='work'||r.status==='queued') return `<div class="card" id="c_${r.id}"><div class="head">${r.thumb?`<img class="thumb" src="${r.thumb}">`:'<div class="thumb empty"></div>'}<div class="meta"><div class="t1">${r.status==='work'?'Okunuyor…':'Sırada…'}</div><div class="t2">${esc(r.prog||'Makbuz inceleniyor')}</div></div><div class="spin"></div></div></div>`;
    if(r.status==='error') return `<div class="card"><div class="head">${r.thumb?`<img class="thumb" src="${r.thumb}">`:'<div class="thumb empty"></div>'}<div class="meta"><div class="t1" style="color:var(--err)">Okunamadı</div><div class="t2">${esc(r.err)}</div></div><button class="btn small" data-retry="${r.id}" ${r.blob||r.file?'':'disabled'}>Tekrar</button><button class="btn small danger" data-del="${r.id}">Sil</button></div></div>`;
    let g='',inSec=false;
    for(const f of FIELDS){
      if(f.sec){if(inSec)g+='</div></section>';g+=`<section class="grp${f.x?' grp-x':''}"><div class="grp-h">${secHTML(f.sec)}</div><div class="grid">`;inSec=true}
      g+=`<div class="f${f.full?' full':''}${f.t==='num'?' num':''}"><label>${shortL(f)}</label><input data-id="${r.id}" data-k="${f.k}" ${f.t!=='text'?'inputmode="decimal"':''} class="${fcls(r,f)}" value="${esc(fv(f,r.d[f.k]))}" ${f.t==='num'?'placeholder="—"':''} aria-label="${esc(f.l)}"></div>`;
    }
    if(inSec)g+='</div></section>';
    return `<div class="card${r.open?' open':''}" id="c_${r.id}">
      <div class="head" data-tog="${r.id}">${headHTML(r)}</div>
      <div class="body">${r.open?`
        ${hizliHTML(r)}
        ${r.thumb?`<img class="big" src="${r.thumb}" data-zoom="${r.id}" alt="Makbuz fotoğrafı (dokun: büyüt)">`:''}
        ${r.src==='foto'||r.hasImg?`<div class="devam">${(r.sayfa||1)>1?`${ik('sayfa')}${r.sayfa} fotoğraftan birlikte okundu · `:''}<button class="lnk" data-devam="${r.id}">${ik('arti')}Makbuz uzunsa devamını ekle</button>${S.key&&S.mode!=='api'?` · <button class="lnk" data-claude="${r.id}">${ik('kalem')}Claude ile oku</button>`:''}</div>`:''}
        ${kaliteHTML(r)}
        <div class="checks">${checksHTML(r)}</div>
        <div class="grps">${g}</div>
        ${r.ocr!=null?`<details class="ocr"><summary>Okunan metin (düzeltip yeniden okutabilirsin)</summary><textarea rows="10" data-ocr="${r.id}">${esc(r.ocr)}</textarea><div class="set-row"><button class="btn small" data-copyocr="${r.id}">${ik('kopya')}Kopyala</button><button class="btn small" data-reparse="${r.id}">Metne göre yeniden oku</button></div></details>`:''}
        ${r.akt?`<div class="aktbar">✓ ${aktTarih(r.akt,1)} tarihinde Luca dosyasına aktarıldı. <button class="btn small" data-aktsil="${r.id}">Aktarılmadı yap</button></div>`:''}
        ${bildirKutuHTML(r)}
        <div class="cardfoot"><button class="btn small danger" data-del="${r.id}">Sil</button><button class="lnk bildirlnk" data-bildirac="${r.id}">${ik('uyari')}${r.bildirildi?'Bildirildi':'Hata bildir'}</button><button class="btn small" data-tog="${r.id}">Kapat</button></div>`:''}
      </div></div>`;
  }).join('');
  renderSum();
  for(const r of rows)if(r.open&&r.status==='done')kirpDoldur(r);
}
function payKinds(d){const a=[];if(d.nakit)a.push('Nakit');if(d.kart)a.push('Kart');if(d.cek)a.push('Çek');if(d.diger)a.push('Diğer');return a.join(' + ')}
function headHTML(r){const bad=isBad(r),d=r.d;return `${r.thumb?`<img class="thumb" src="${r.thumb}">`:`<div class="thumb empty">${ik(r.src==='foto'?'kamera':r.src==='metin'?'metin':'kalem')}</div>`}
        <div class="meta"><div class="t1"><span class="tt">${esc(d.firma||'Firma yok')}</span></div>
        <div class="t2">${r.akt?`<span class="akt" title="Luca dosyasına aktarıldı">✓ Luca ${aktTarih(r.akt)}</span> `:''}${r.el?'<span class="elrozet">El yazısı</span> ':''}${esc(d.tarih||'Tarih yok')} · No ${esc(d.evrak_no||'—')}${payKinds(d)?' · '+payKinds(d):''}</div></div>
        <div class="amt">${fm(d.toplam)||'—'}<span class="badge ${bad?'b-warn':'b-ok'}">${bad?'Kontrol et':'Tamam'}</span></div>`}
// Kontrol ekranı: bölüm başlığı (oran rozeti), bölüm içinde kısa etiketler, alan durumu (şüpheli / hesaplandı)
function secHTML(t){const m=t.match(/^%(\d+)\s+KDV(.*)$/);if(m)return `<span class="rate">%${m[1]}</span>KDV${esc(m[2])}`;
  const p=t.match(/^Poşet\s*\((%\d+)\)$/);if(p)return `<span class="rate">${p[1]}</span>Poşet`;
  const k=t.match(/^Kontrol\s*—\s*(.*)$/);if(k)return `Kontrol<span class="grp-note">${esc(k[1])}</span>`;return esc(t)}
const SHORT={kart:'Kredi kartı',yazi:'Yazıyla tutar',diger:'Havale / senet / diğer',not:'Not'};
const shortL=f=>SHORT[f.k]||f.l;
const fcls=(r,f)=>[(r.unsure||[]).includes(f.k)?'unsure':'',(r.auto||[]).includes(f.k)?'calc':''].filter(Boolean).join(' ');
function checksHTML(r){const L=checks(r),bad=L.filter(c=>!c.ok).length,un=(r.unsure||[]).length,inf=L.filter(c=>c.info).length;
  const head=bad||un?`<div class="ck-h bad">${bad?`${bad} uyarı`:''}${bad&&un?' · ':''}${un?`${un} şüpheli alan`:''}<span>kontrol et</span></div>`:`<div class="ck-h ok">Tüm kontroller tamam${inf?` · ${inf} not`:''}</div>`;
  return head+L.map(c=>`<div class="ck ${c.info?'info':c.ok?'ok':'bad'}"><i>${c.info?'i':c.ok?'✓':'!'}</i><span>${esc(c.m.replace(/\s*✓$/,''))}${c.act?`<button class="btn small ck-btn" ${c.act.a}>${c.act.l}</button>`:''}</span></div>`).join('')+(un?`<div class="ck bad"><i>!</i><span>Emin olunamayan alanlar turuncu işaretli. Fotoğrafla karşılaştır; yanlışsa düzelt, hepsi doğruysa onayla.<button class="btn small ck-btn" data-onay="${r.id}">Kontrol ettim, doğru</button></span></div>`:'')}
function renderSum(){
  const done=rows.filter(r=>r.status==='done');
  const t=k=>done.reduce((a,r)=>a+(r.d[k]||0),0);
  const yeni=done.filter(r=>!r.akt).length;
  $('#sum').innerHTML=`<div class="s1"><b>${done.length}</b> makbuz · ${yeni===done.length?'hepsi yeni':yeni?`<b class="yeni">${yeni} yeni</b>`:'hepsi aktarıldı'}</div><div class="s2"><b>${fm(t('toplam'))}</b> <span>toplam</span></div>`;
  $('#xlsx').disabled=!done.length;$('#csv').disabled=!done.length;$('#copy').disabled=!done.length;
}
// ---- Eksik alanlar: turuncu tarih / evrak no / tutar kartın en üstünde, yanında makbuzun o kısmı büyütülmüş ----
const HZ_TUTAR=['toplam','nakit','kart','cek'];
function hizliAlanlar(r){const u=r.unsure||[],a=[];if(u.includes('firma')||!r.d.firma)a.push('firma');if(u.includes('tarih')||!r.d.tarih)a.push('tarih');if(u.includes('evrak_no')||!r.d.evrak_no)a.push('evrak_no');if(HZ_TUTAR.some(k=>u.includes(k))||!r.d.toplam)a.push('tutar');return a}
function hizliHTML(r){const a=hizliAlanlar(r);if(!a.length||r.src==='elle'&&!r.thumb&&!r.hasImg)return '';
  const ad={firma:'Firma (listeden seçebilir ya da yazabilirsin)',tarih:'Tarih',evrak_no:'Evrak no',tutar:'Tutar'},ank={tarih:'tarih',evrak_no:'no',tutar:'tutar'};firmaListesi();
  const giris=k=>k==='tutar'?`<input class="hz" data-hizli="tutar" data-id="${r.id}" inputmode="decimal" enterkeyhint="next" placeholder="ör. 4230" value="${esc(fm(r.d.toplam))}">`
    :k==='firma'?`<input class="hz" data-id="${r.id}" data-k="firma" list="firmalist" enterkeyhint="next" autocomplete="off" placeholder="makbuzu kesen firma" value="${esc(r.d.firma||'')}">`
    :k==='tarih'?`<input class="hz" data-id="${r.id}" data-k="tarih" inputmode="numeric" enterkeyhint="next" placeholder="ör. 2310 → 23.10" value="${esc(r.d.tarih||'')}">`
    :`<input class="hz" data-id="${r.id}" data-k="evrak_no" enterkeyhint="next" placeholder="makbuz no" value="${esc(r.d.evrak_no||'')}">`;
  return `<section class="hizli"><div class="hz-h">${ik('kalem')}Eksik alanlar <span>— fotoğrafa bakıp yaz, “ileri” ile sonrakine geç</span></div>
    ${a.map(k=>`<div class="hz-s" data-hzalan="${k}">${k!=='firma'&&r.ank&&(r.ank[ank[k]]||k==='evrak_no'&&r.ank.tarih)?`<img class="hz-k" data-kirp="${k}" alt="">`:''}<label>${ad[k]}</label>${giris(k)}</div>`).join('')}
    <div class="set-row" style="justify-content:flex-end"><button class="btn small" data-onay="${r.id}">Hepsi doğru</button></div></section>`}
// Firma seçme listesi: tanımlı ve öğrenilmiş adlar + listedeki makbuzların firmaları
function firmaListesi(){let dl=document.getElementById('firmalist');if(!dl){dl=document.createElement('datalist');dl.id='firmalist';document.body.appendChild(dl)}
  const ad=new Set([...Object.values(FIRMA_TEL0),...Object.values(FIRMA0),...Object.values(FIRMA),...Object.values(FIRMA_TEL),...rows.map(r=>r.d&&r.d.firma).filter(Boolean)]);
  const h=[...ad].sort((a,b)=>a.localeCompare(b,'tr')).map(a=>`<option value="${esc(a)}">`).join('');if(dl.innerHTML!==h)dl.innerHTML=h}
// Kırpma: makbuzun aslı (saklıysa) ya da küçük kopyası; etiketin sağı ve altı (değer çoğu formda sağda, bazılarında altta)
// Etiket kutusundan (0–1 kesirler) alanın görüneceği bölge: [x0,y0,x1,y1]
function kirpBolge(ank,k){const L=ank&&(ank[{tarih:'tarih',evrak_no:'no',tutar:'tutar'}[k]]||(k==='evrak_no'&&ank.tarih));if(!L)return null;const h=Math.max(.012,L[3]-L[1]);
  return k==='tutar'?[L[0]-.06,L[1]-h*2,1,L[3]+h*4]:k==='tarih'?[L[0]-.06,L[1]-h*2.5,Math.min(1,L[0]+Math.max(.55,(L[2]-L[0])*6)),L[3]+h*2.5]:[L[0]-.06,L[1]-h*2,Math.min(1,L[0]+.5),L[3]+h*2]}
async function kirpDoldur(r){const c=document.getElementById('c_'+r.id);if(!c||!r.ank)return;const im=[...c.querySelectorAll('img[data-kirp]')].filter(i=>!i.src);if(!im.length)return;
  r._kirp=r._kirp||{};
  if(!r._kaynak){try{let b=null;if(r.hasOrig){const o=await IDB.get('orig',r.id);if(o&&o[0])b=o[0]}const src=b?URL.createObjectURL(b):r.thumb||(r.hasImg?await IDB.get('imgs',r.id):null);if(!src)return;
    r._kaynak=await new Promise((a,h)=>{const i=new Image();i.onload=()=>a(i);i.onerror=h;i.src=src});if(b)setTimeout(()=>URL.revokeObjectURL(src),60000)}catch(e){return}}
  const I=r._kaynak,W=I.naturalWidth,H=I.naturalHeight;
  for(const el of im){const k=el.dataset.kirp;if(!r._kirp[k]){const b=kirpBolge(r.ank,k);if(!b)continue;
      (r._bolge=r._bolge||{})[k]=b.map(v=>Math.max(0,Math.min(1,v))).join(',');
      const x0=Math.max(0,b[0])*W,y0=Math.max(0,b[1])*H,x1=Math.min(1,b[2])*W,y1=Math.min(1,b[3])*H;if(x1-x0<10||y1-y0<10)continue;
      const s=Math.min(1.5,800/(x1-x0)),cv=document.createElement('canvas');cv.width=Math.round((x1-x0)*s);cv.height=Math.round((y1-y0)*s);
      cv.getContext('2d').drawImage(I,x0,y0,x1-x0,y1-y0,0,0,cv.width,cv.height);r._kirp[k]=cv.toDataURL('image/jpeg',.85);cv.width=cv.height=1}
    if(r._kirp[k]){el.src=r._kirp[k];if(r._bolge&&r._bolge[k])el.dataset.bolge=r._bolge[k]}}}
// ---- Tam ekran fotoğraf görüntüleyici: iki parmakla yakınlaştır, tek parmakla kaydır, çift dokun: yakın/uzak ----
// Sayfanın kendisini yakınlaştırmak (iPhone) ağır katmanlarda görüntünün kaybolmasına yol açıyordu; burada yalnız fotoğraf büyür.
const GV={el:null,img:null,b:1,s:1,x:0,y:0,nw:0,nh:0};
function gvKur(){if(GV.el)return;const d=document.createElement('div');d.className='gv';d.hidden=true;
  d.innerHTML='<img alt=""><button class="btn small gv-kapat" type="button">Kapat</button><div class="gv-ipucu">İki parmakla yakınlaştır · çift dokun: yakın / uzak</div>';
  document.body.appendChild(d);GV.el=d;GV.img=d.querySelector('img');d.querySelector('.gv-kapat').onclick=gvKapat;
  let t0=null,son=0;const P=e=>[...e.touches].map(t=>[t.clientX,t.clientY]);
  d.addEventListener('touchstart',e=>{if(e.target.closest('.gv-kapat'))return;e.preventDefault();const p=P(e);
    if(p.length===1){const n=Date.now();if(n-son<280){const k=GV.s>1.5?1:3;gvOlcek(k,p[0][0],p[0][1]);son=0;t0=null;return}son=n}
    t0={p,s:GV.s,x:GV.x,y:GV.y}},{passive:false});
  d.addEventListener('touchmove',e=>{e.preventDefault();if(!t0)return;const p=P(e);
    if(p.length>=2&&t0.p.length>=2){const d0=Math.hypot(t0.p[0][0]-t0.p[1][0],t0.p[0][1]-t0.p[1][1]),d1=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);
      const m0=[(t0.p[0][0]+t0.p[1][0])/2,(t0.p[0][1]+t0.p[1][1])/2],m1=[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2];
      const s=Math.min(10,Math.max(1,t0.s*d1/d0)),k=s/t0.s;GV.s=s;GV.x=m1[0]-(m0[0]-t0.x)*k;GV.y=m1[1]-(m0[1]-t0.y)*k}
    else if(p.length===1){GV.x=t0.x+p[0][0]-t0.p[0][0];GV.y=t0.y+p[0][1]-t0.p[0][1]}
    gvUygula()},{passive:false});
  d.addEventListener('touchend',e=>{if(e.touches.length)t0={p:P(e),s:GV.s,x:GV.x,y:GV.y};else t0=null},{passive:false});
  d.addEventListener('wheel',e=>{e.preventDefault();gvOlcek(GV.s*(e.deltaY<0?1.2:1/1.2),e.clientX,e.clientY)},{passive:false});
  d.addEventListener('dblclick',e=>gvOlcek(GV.s>1.5?1:3,e.clientX,e.clientY));
  window.addEventListener('popstate',()=>{if(!GV.el.hidden)gvKapat(true)})}
function gvOlcek(s,cx,cy){s=Math.min(10,Math.max(1,s));const k=s/GV.s;GV.x=cx-(cx-GV.x)*k;GV.y=cy-(cy-GV.y)*k;GV.s=s;gvUygula()}
// fotoğraf ekrandan kaçmasın: büyükse kenarı ekranın dışında kalamaz, küçükse ortada durur
function gvUygula(){const W=innerWidth,H=innerHeight,w=GV.nw*GV.b*GV.s,h=GV.nh*GV.b*GV.s;
  GV.x=w<=W?(W-w)/2:Math.min(0,Math.max(W-w,GV.x));GV.y=h<=H?(H-h)/2:Math.min(0,Math.max(H-h,GV.y));
  GV.img.style.transform=`translate(${GV.x}px,${GV.y}px) scale(${GV.b*GV.s})`}
async function gvAc(r,bolge){gvKur();let src=null,url=null;
  try{if(r.hasOrig){const o=await IDB.get('orig',r.id);if(o&&o[0])src=url=URL.createObjectURL(o[0])}}catch(e){}
  if(!src)src=r.thumb||(r.hasImg?await IDB.get('imgs',r.id).catch(()=>null):null);if(!src)return;
  const I=GV.img;I.onload=()=>{GV.nw=I.naturalWidth;GV.nh=I.naturalHeight;I.style.width=GV.nw+'px';I.style.height=GV.nh+'px';
    GV.b=Math.min(innerWidth/GV.nw,innerHeight/GV.nh);GV.s=1;GV.x=GV.y=0;gvUygula();
    if(bolge){const [x0,y0,x1,y1]=bolge,zw=Math.min(x1-x0,.7),s=Math.min(10,Math.max(1.3,innerWidth*.98/(zw*GV.nw*GV.b)));GV.s=s;const T=GV.b*s;   // bölgenin ortasına yakınlaş (etiket ve değer birlikte görünsün)
      GV.x=innerWidth/2-(x0+x1)/2*GV.nw*T;GV.y=innerHeight/2-(y0+y1)/2*GV.nh*T;gvUygula()}};
  if(GV._url)URL.revokeObjectURL(GV._url);GV._url=url;I.src=src;GV.el.hidden=false;document.body.classList.add('gv-acik');
  try{history.pushState({gv:1},'')}catch(e){}}
function gvKapat(geri){if(!GV.el||GV.el.hidden)return;GV.el.hidden=true;document.body.classList.remove('gv-acik');GV.img.removeAttribute('src');
  if(!geri)try{if(history.state&&history.state.gv)history.back()}catch(e){}}
// "ileri" (Enter): sonraki eksik alana geç; sonuncudaysa klavyeyi kapat
// dokununca içindeki okunan değer seçili gelsin: yazınca yerine geçer
document.addEventListener('focusin',e=>{const i=e.target;if(i.classList&&i.classList.contains('hz'))setTimeout(()=>{try{i.select()}catch(x){}},0)});
document.addEventListener('keydown',e=>{const i=e.target;if(e.key!=='Enter'||!i.classList||!i.classList.contains('hz'))return;e.preventDefault();
  const hs=[...i.closest('.hizli').querySelectorAll('input.hz')],n=hs[hs.indexOf(i)+1];if(n){n.focus();try{n.select()}catch(x){}}else i.blur()});
function refreshCard(r){
  const c=document.getElementById('c_'+r.id);if(!c){renderSum();return}   // süzgeç yüzünden ekranda olmayan kart: baştan çizme (yazılan kutu silinir, klavye kapanır)
  c.querySelector('.head').innerHTML=headHTML(r);
  const ck=c.querySelector('.checks');if(ck)ck.innerHTML=checksHTML(r);   // kapalı kartın gövdesi çizilmez (açılınca çizilir)
  {const bk=c.querySelector('.bildirkutu');if(bk){bk.querySelector('.dzb').innerHTML=duzBaslik(r);bk.querySelector('.dzd').innerHTML=duzDurum(r);if(duzeltilen(r).length)bk.hidden=false}}
  {const hz=c.querySelector('.hizli');if(hz){const a=hizliAlanlar(r);hz.querySelectorAll('.hz-s').forEach(x=>x.classList.toggle('tamam',!a.includes(x.dataset.hzalan)));
    const t=hz.querySelector('input[data-hizli="tutar"]');if(t&&t!==document.activeElement)t.value=fm(r.d.toplam)}}
  c.querySelectorAll('input[data-k]').forEach(i=>{const f=FIELDS.find(x=>x.k===i.dataset.k);if(i!==document.activeElement)i.value=fv(f,r.d[f.k]);i.classList.toggle('unsure',!!(r.unsure&&r.unsure.includes(f.k)));i.classList.toggle('calc',!!(r.auto&&r.auto.includes(f.k)))});
  renderSum();
}

document.addEventListener('click',e=>{
  const kz=e.target.closest('img[data-kirp]');if(kz&&kz.dataset.bolge){const c=kz.closest('.card'),r=c&&rows.find(x=>'c_'+x.id===c.id);if(r)gvAc(r,kz.dataset.bolge.split(',').map(Number));return}
  const t=e.target.closest('[data-tog],[data-del],[data-retry],[data-zoom],[data-reparse],[data-copyocr],[data-recam],[data-regal],[data-f],[data-aktsil],[data-bildir],[data-bildirac],[data-devam],[data-claude],[data-onay]');if(!t)return;
  if(t.dataset.claude){const r=rows.find(x=>x.id===t.dataset.claude);if(r)claudeOku(r);return}
  if(t.dataset.onay){const r=rows.find(x=>x.id===t.dataset.onay);if(r){r.unsure=[];r.onay=true;save(r);refreshCard(r);ornekTopla([r]);const k=checks(r).find(c=>!c.ok&&!c.info);toast(k?'Onaylandı, ama bir uyarı kaldı: '+k.m:'Onaylandı')}return}
  if(t.dataset.devam){devId=t.dataset.devam;const i=$('#devam');i.value='';i.click();return}
  if(t.dataset.f){FLT.f=t.dataset.f;render();return}
  if(t.dataset.aktsil){const r=rows.find(x=>x.id===t.dataset.aktsil);r.akt=null;save(r);render();toast('Bir sonraki Luca dosyasına yeniden girecek');return}
  if(t.dataset.bildirac){const k=$('#bk-'+t.dataset.bildirac);if(k){k.hidden=duzeltilen(rows.find(x=>x.id===t.dataset.bildirac)||{}).length?false:!k.hidden;if(!k.hidden){k.scrollIntoView({behavior:'smooth',block:'center'});$('#bn-'+t.dataset.bildirac).focus({preventScroll:true})}}return}
  if(t.dataset.bildir){const id=t.dataset.bildir,r=rows.find(x=>x.id===id);if(!r)return;const n=$('#bn-'+id);
    hataBildir(r,n?n.value.trim():'',t).then(ok=>{if(ok){render()}});return}
  if(t.dataset.recam||t.dataset.regal){reId=t.dataset.recam||t.dataset.regal;const i=$(t.dataset.recam?'#recam':'#regal');i.value='';i.click();return}
  if(t.dataset.copyocr){const ta=document.querySelector(`[data-ocr="${t.dataset.copyocr}"]`);const txt=ta?ta.value:'';
    (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Okunan metin kopyalandı')).catch(()=>{try{ta.focus();ta.select();ta.setSelectionRange(0,txt.length);const ok=document.execCommand('copy');toast(ok?'Okunan metin kopyalandı':'Kopyalanamadı — metne uzun basıp “Tümünü Seç”')}catch(x){toast('Kopyalanamadı')}});return}
  if(t.dataset.reparse){const r=rows.find(x=>x.id===t.dataset.reparse);const ta=document.querySelector(`[data-ocr="${r.id}"]`);applyParse(r,ta.value);r.open=true;save(r);render();toast('Metin yeniden okundu');return}
  if(t.dataset.zoom!==undefined){const r=rows.find(x=>x.id===t.dataset.zoom);if(r)gvAc(r);return}
  if(t.dataset.tog){const r=rows.find(x=>x.id===t.dataset.tog);r.open=!r.open;if(r.open)loadImg(r);render();if(r.open)document.getElementById('c_'+r.id)?.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(t.dataset.del){
    if(t.dataset.armed!=='1'){t.dataset.armed='1';t.textContent='Emin misin?';setTimeout(()=>{if(t.isConnected){t.dataset.armed='';t.textContent='Sil'}},3000);return}
    removeRows(rows.filter(x=>x.id===t.dataset.del));return}
  if(t.dataset.retry){const r=rows.find(x=>x.id===t.dataset.retry);r.status='queued';queue.push(r);render();pump()}
});
document.addEventListener('change',e=>{
  const i=e.target;
  if(i.dataset&&i.dataset.hizli==='tutar'){const r=rows.find(x=>x.id===i.dataset.id);if(!r)return;const v=pn(i.value);
    if(i.value.trim()&&v==null){toast('Sayı anlaşılamadı: '+i.value);return}
    const y0=i.getBoundingClientRect().top,p=PAY.filter(k=>r.d[k]!=null&&!(r.auto||[]).includes(k));
    r.d.toplam=v||null;for(const k of PAY)if((r.auto||[]).includes(k))r.d[k]=null;if(p.length===1)r.d[p[0]]=v||null;r.auto=fill(r.d,[]);
    r.unsure=(r.unsure||[]).filter(k=>!HZ_TUTAR.includes(k));i.value=fm(r.d.toplam);
    if(r.akt){r.akt=null;toast('Makbuz değişti: bir sonraki Luca dosyasına yeniden girecek')}
    save(r);ckToplu(()=>{rows.forEach(x=>{if(x.status==='done')refreshCard(x)});filtreUI()});
    const dy=i.getBoundingClientRect().top-y0;if(Math.abs(dy)>1)window.scrollBy(0,dy);return}
  if(!i.dataset||!i.dataset.k)return;
  const r=rows.find(x=>x.id===i.dataset.id);const f=FIELDS.find(x=>x.k===i.dataset.k);
  if(!r||!f)return;
  r.d[f.k]=f.t==='text'?i.value.trim():pn(i.value);
  if(f.k==='tarih')r.d.tarih=normDate(r.d.tarih);
  if(f.k==='evrak_no')r.d.evrak_no=evrakKisa(r.d.evrak_no);
  if(f.k==='firma'&&r.d.firma&&nkey(r.okuFirma||'')!==nkey(r.d.firma)&&firmaOgren(r.okuFirma,r.d.firma,r.ocr)){toast('Firma adı öğrenildi; sonraki makbuzlarda kendiliğinden gelir')}
  if(f.t==='num'&&r.d[f.k]===0&&f.k!=='yazi')r.d[f.k]=null;
  if(f.t==='num'&&i.value.trim()!==''&&r.d[f.k]==null)toast('Sayı anlaşılamadı: '+i.value);
  if(r.unsure)r.unsure=r.unsure.filter(k=>k!==f.k);
  if(f.t==='num'){refill(r,f.k);if(r.unsure&&(r.auto||[]).length)r.unsure=r.unsure.filter(k=>!r.auto.includes(k))}   // kendiliğinden hesaplanan alan artık şüpheli değil
  // Tek ödeme türü varsa toplam ile o alan hep aynı kalsın: biri değişince öteki de değişir (iki ayrı yerde düzeltmek gerekmesin)
  if(f.t==='num'&&(f.k==='toplam'||PAY.includes(f.k))&&!r.d.diger){const p=PAY.filter(k=>r.d[k]!=null);
    if(p.length===1&&r.d.toplam!=null&&Math.abs(r.d.toplam-r.d[p[0]])>0.005){
      if(f.k==='toplam')r.d[p[0]]=r.d.toplam;else{r.d.toplam=r.d[p[0]];r.auto=(r.auto||[]).filter(k=>k!=='toplam')}
      r.unsure=(r.unsure||[]).filter(k=>k!=='toplam'&&k!==p[0])}}
  if(['firma','evrak_no','tarih'].includes(f.k)&&(!r.d.aciklama||r.d.aciklama===r._ack)){r.d.aciklama=mkAck(r.d);r._ack=r.d.aciklama}
  i.value=fv(f,r.d[f.k]);
  // uyarı listesi alanların üstünde: kısalıp uzayınca ekran kaymasın — odaktaki (ya da değişen) kutu aynı yerde kalsın
  const tut=document.activeElement&&document.activeElement.matches&&document.activeElement.matches('input,textarea')?document.activeElement:i,y0=tut.getBoundingClientRect().top;
  if(r.akt){r.akt=null;toast('Makbuz değişti: bir sonraki Luca dosyasına yeniden girecek')}
  save(r);
  ckToplu(()=>{rows.forEach(x=>{if(x.status==='done')refreshCard(x)});filtreUI()});
  if(tut.isConnected){const dy=tut.getBoundingClientRect().top-y0;if(Math.abs(dy)>1)window.scrollBy(0,dy)}
});

const pm=$('#pm');
$('#paste').onclick=()=>{pm.hidden=false;$('#pmt').value='';setTimeout(()=>$('#pmt').focus(),50)};
$('#pmc').onclick=()=>{pm.hidden=true};
pm.addEventListener('click',e=>{if(e.target===pm)pm.hidden=true});
// Toplu metin: "Z Tara" kestirmesi her fişin metninden önce "#ZR#" satırı koyar
$('#pmo').onclick=()=>{const t=$('#pmt').value.trim();if(!t){toast('Önce metni yapıştır');return}addTexts(t)};
$('#pmclip').onclick=async()=>{try{const t=(await navigator.clipboard.readText()||'').trim();if(!t){toast('Pano boş — önce kestirmeyi çalıştır');return}addTexts(t)}
  catch(e){toast('Panoya erişilemedi — kutuya uzun basıp “Yapıştır” de, sonra Oku ve ekle');$('#pmt').focus()}};
if(/^#(toplu|tara)/.test(location.hash)){history.replaceState(null,'',location.pathname);setTimeout(()=>$('#paste').click(),300)}
$('#ara').addEventListener('input',e=>{FLT.q=e.target.value.trim();render()});

// ---- Klavye açıkken: alt çubuğu gizle. Kaydırmayı iOS kendisi yapar (biz karışırsak sayfa iner-çıkar);
// yalnız "Hata bildir" kutusunda düğmeler klavyenin altında kalırsa, klavye yerleştikten sonra BİR KEZ aşağı kaydır.
(()=>{
  const yazilir=el=>!!el&&el.matches&&(el.matches('textarea,select,[contenteditable]')||el.matches('input')&&!/^(checkbox|radio|button|submit|file|range|color|reset)$/.test(el.type));
  let zm;
  document.addEventListener('focusin',e=>{const el=e.target;if(!yazilir(el))return;document.body.classList.add('klavye');clearTimeout(zm);
    const kutu=el.closest('.bildirkutu');if(!kutu)return;
    zm=setTimeout(()=>{if(document.activeElement!==el)return;const vv=window.visualViewport;if(!vv)return;
      const alt=vv.offsetTop+vv.height-8,dib=kutu.getBoundingClientRect().bottom,ust=el.getBoundingClientRect().top,d=Math.min(dib-alt,ust-vv.offsetTop-16);
      if(d>4)window.scrollBy(0,d)},650)});
  document.addEventListener('focusout',()=>setTimeout(()=>{if(!yazilir(document.activeElement))document.body.classList.remove('klavye')},80));
})();
