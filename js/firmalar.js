// Firmalar ekranı: uygulamanın tanıdığı firmaları görme, düzeltme, birleştirme, silme.
// Bir firma iki yoldan tanınır: makbuzdaki basılı telefon numarası ve okuyucunun okuduğu yazılış.
// Hazır tanımlar (FIRMA0 / FIRMA_TEL0) koddadır; onlara yapılan değişiklikler FIRMA_EK'te saklanır.
const FM={acik:null,ara:''};

function telTemiz(s){let n=String(s||'').replace(/\D/g,'').replace(/^90(?=\d{10}$)/,'');if(/^[2-5]\d{9}$/.test(n))n='0'+n;return /^0[2-5]\d{8,9}$/.test(n)?n:null}
const telGoster=t=>t.length===11?`${t.slice(0,4)} ${t.slice(4,7)} ${t.slice(7,9)} ${t.slice(9)}`:t;

// Tüm firmalar: ad → {tel:[{t,hazir}], yaz:[{k,hazir}], kart}
function firmaTablo(){const m=new Map(),al=ad=>{if(!m.has(ad))m.set(ad,{ad,tel:[],yaz:[],kart:0});return m.get(ad)};
  for(const [T,h] of [[FIRMA_TEL,false],[FIRMA_TEL0,true]])for(const t in T){const f=al(T[t]);if(!f.tel.some(x=>x.t===t))f.tel.push({t,hazir:h&&!(t in FIRMA_TEL)})}
  for(const [T,h] of [[FIRMA,false],[FIRMA0,true]])for(const k in T){const f=al(T[k]);if(k!==nkey(f.ad)&&!f.yaz.some(x=>x.k===k))f.yaz.push({k,hazir:h&&!(k in FIRMA)})}
  for(const r of rows){const a=r.d&&r.d.firma;if(a)al(a).kart++}
  for(const f of m.values()){const k=nkey(f.ad);f.bilinen=!!(f.tel.length||f.yaz.length||FIRMA[k]===f.ad||FIRMA0[k]===f.ad)}
  return [...m.values()].sort((a,b)=>a.ad.localeCompare(b.ad,'tr'))}

// Kartlardaki adı değiştir (Luca'ya aktarılmış kartlara dokunma). Açıklama firmadan üretildiyse o da yenilenir.
function kartAdDegis(eski,yeni){let n=0;
  for(const r of rows){const d=r.d;if(!d||r.akt||d.firma!==eski)continue;
    const ack=!d.aciklama||d.aciklama===r._ack,ayni=d.aciklama===eski;d.firma=yeni;if(r.oku&&r.oku.firma===eski)r.oku.firma=yeni;
    if(ack){d.aciklama=mkAck(d);r._ack=d.aciklama}else if(ayni)d.aciklama=yeni;save(r);n++}
  return n}

// eski adı yeni adla değiştir; yeni ad zaten varsa ikisi birleşir
function firmaYeniAd(eski,yeni){
  for(const T of [FIRMA,FIRMA_TEL])for(const k in T)if(T[k]===eski)T[k]=yeni;
  for(const k in FIRMA0)if(FIRMA0[k]===eski){FIRMA0[k]=yeni;FIRMA_EK.n[k]=yeni}
  for(const k in FIRMA_TEL0)if(FIRMA_TEL0[k]===eski){FIRMA_TEL0[k]=yeni;FIRMA_EK.t[k]=yeni}
  const ke=nkey(eski);if(ke&&ke!==nkey(yeni))FIRMA[ke]=yeni;   // okuyucu eski yazılışı okursa yine yeni ada gitsin
  firmaKaydet();return kartAdDegis(eski,yeni)}

function telSil(t){delete FIRMA_TEL[t];if(t in FIRMA_TEL0){delete FIRMA_TEL0[t];FIRMA_EK.sil.push('t:'+t)}firmaKaydet()}
function yazSil(k){delete FIRMA[k];if(k in FIRMA0){delete FIRMA0[k];FIRMA_EK.sil.push('n:'+k)}firmaKaydet()}
function firmaSil(ad){const f=firmaTablo().find(x=>x.ad===ad);if(!f)return;
  for(const x of f.tel)telSil(x.t);for(const x of f.yaz)yazSil(x.k);
  const k=nkey(ad);if(FIRMA[k]===ad||FIRMA0[k]===ad)yazSil(k)}
function telEkle(ad,t){FIRMA_TEL[t]=ad;FIRMA_EK.sil=FIRMA_EK.sil.filter(x=>x!=='t:'+t);firmaKaydet()}

function firmaHTML(f){const ac=FM.acik===f.ad,ozet=[f.tel.length?`${f.tel.length} telefon`:'',f.yaz.length?`${f.yaz.length} yazılış`:'',f.kart?`${f.kart} makbuz`:''].filter(Boolean).join(' · ')||'yalnız ad';
  let h=`<div class="fm-f${ac?' ac':''}" data-ad="${esc(f.ad)}"><button class="fm-bas" type="button" data-fm="ac"><span class="fm-ad">${esc(f.ad)}</span><span class="fm-oz">${esc(ozet)}</span></button>`;
  if(ac){
    h+=`<div class="fm-ic"><label class="fm-l">Firma adı <span>(Luca'ya böyle gider)</span></label>
      <div class="keyrow"><input class="fm-adin" value="${esc(f.ad)}" list="firmalist" autocapitalize="off"><button class="btn small primary" type="button" data-fm="kaydet">Kaydet</button></div>
      <label class="fm-l">Telefonlar <span>(makbuzda basılı numaradan tanınır)</span></label>
      <div class="fm-cip">${f.tel.map(x=>`<span class="fm-c">${esc(telGoster(x.t))}<button type="button" data-fm="telsil" data-v="${esc(x.t)}" aria-label="Telefonu kaldır">×</button></span>`).join('')||'<span class="hint">Telefon yok</span>'}</div>
      <div class="keyrow"><input class="fm-telin" inputmode="tel" placeholder="0372 266 44 00"><button class="btn small" type="button" data-fm="telekle">Ekle</button></div>
      <label class="fm-l">Okunan yazılışlar <span>(okuyucu böyle okursa bu firma sayılır)</span></label>
      <div class="fm-cip">${f.yaz.map(x=>`<span class="fm-c">${esc(x.k)}<button type="button" data-fm="yazsil" data-v="${esc(x.k)}" aria-label="Yazılışı kaldır">×</button></span>`).join('')||'<span class="hint">Yok — ad tam okunursa yine tanınır</span>'}</div>
      ${f.bilinen?'<div class="set-row"><button class="btn small danger" type="button" data-fm="sil">Firmayı sil</button></div>':'<div class="hint">Bu ad yalnız makbuz kartlarında geçiyor; telefon eklersen uygulama firmayı tanımaya başlar.</div>'}</div>`}
  return h+'</div>'}

function firmaCiz(){const q=nkey(FM.ara),l=firmaTablo().filter(f=>!q||nkey(f.ad).includes(q)||f.tel.some(x=>x.t.includes(FM.ara.replace(/\D/g,'')||'#')));
  $('#fmsay').textContent=`${l.length} firma`;
  $('#fmliste').innerHTML=l.map(firmaHTML).join('')||'<div class="hint" style="padding:12px 2px">Firma bulunamadı.</div>'}

function firmaGuncel(){firmaListesi();firmaCiz();render()}

$('#firmalarac').onclick=()=>{FM.acik=null;FM.ara='';$('#fmara').value='';$('#fmyeni').hidden=true;firmaListesi();firmaCiz();$('#firmalar').hidden=false};
const fmKapat=()=>{$('#firmalar').hidden=true};
$('#fmkapat').onclick=fmKapat;
$('#firmalar').addEventListener('click',e=>{if(e.target.id==='firmalar')fmKapat()});
$('#fmara').addEventListener('input',e=>{FM.ara=e.target.value.trim();firmaCiz()});
$('#fmyeniac').onclick=()=>{const y=$('#fmyeni');y.hidden=!y.hidden;if(!y.hidden)$('#fmyad').focus()};
$('#fmyekle').onclick=()=>{const ad=$('#fmyad').value.trim().replace(/\s+/g,' '),tr=$('#fmytel').value.trim();
  if(!ad){toast('Firma adını yaz');return}
  const t=tr?telTemiz(tr):null;if(tr&&!t){toast('Telefon numarası geçersiz');return}
  if(firmaTablo().some(f=>f.ad===ad)&&!t){toast('Bu firma zaten var');return}
  FIRMA[nkey(ad)]=ad;if(t)telEkle(ad,t);else firmaKaydet();
  $('#fmyad').value=$('#fmytel').value='';$('#fmyeni').hidden=true;FM.acik=ad;FM.ara='';$('#fmara').value='';firmaGuncel();toast('Firma eklendi')};

$('#fmliste').addEventListener('click',e=>{const b=e.target.closest('[data-fm]');if(!b)return;const kutu=b.closest('.fm-f'),ad=kutu.dataset.ad,is=b.dataset.fm;
  if(is==='ac'){FM.acik=FM.acik===ad?null:ad;firmaCiz();return}
  if(is==='kaydet'){const yeni=kutu.querySelector('.fm-adin').value.trim().replace(/\s+/g,' ');if(!yeni||yeni===ad)return;
    const var_=firmaTablo().some(f=>f.ad===yeni);
    if(var_&&!confirm(`"${yeni}" zaten var. İki firma birleştirilsin mi?\n\nTelefonlar ve yazılışlar birleşir, aktarılmamış makbuzlardaki ad değişir.`))return;
    const n=firmaYeniAd(ad,yeni);FM.acik=yeni;firmaGuncel();toast((var_?'Firmalar birleştirildi':'Ad değiştirildi')+(n?` · ${n} makbuz güncellendi`:''));return}
  if(is==='telekle'){const i=kutu.querySelector('.fm-telin'),t=telTemiz(i.value);if(!t){toast('Telefon numarası geçersiz');return}
    const onceki=FIRMA_TEL[t]||FIRMA_TEL0[t];if(onceki&&onceki!==ad&&!confirm(`Bu numara "${onceki}" firmasına kayıtlı. Bu firmaya taşınsın mı?`))return;
    telEkle(ad,t);firmaGuncel();return}
  if(is==='telsil'){telSil(b.dataset.v);firmaGuncel();return}
  if(is==='yazsil'){yazSil(b.dataset.v);firmaGuncel();return}
  if(is==='sil'){if(!confirm(`"${ad}" silinsin mi?\n\nUygulama bu firmayı artık kendiliğinden tanımaz. Makbuz kartlarındaki ad değişmez.`))return;
    firmaSil(ad);FM.acik=null;firmaGuncel();toast('Firma silindi')}});
$('#fmliste').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const i=e.target;
  if(i.classList.contains('fm-telin')){e.preventDefault();i.closest('.fm-f').querySelector('[data-fm="telekle"]').click()}
  else if(i.classList.contains('fm-adin')){e.preventDefault();i.closest('.fm-f').querySelector('[data-fm="kaydet"]').click()}});
