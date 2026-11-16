// El yazısı örnekleri: el yazılı (ya da elle düzeltilmiş) makbuzlarda tarih, tutar ve numara bölgesinin kırpıntısı
// ile senin onayladığın değer saklanır. Yeterince birikince gizli gelen kutusuna gönderilir; okuyucu ileride
// bu el yazılarıyla eğitilir. Toplama: "Hepsi doğru"ya basınca ve Luca'ya aktarılınca (o anki değerler doğru sayılır).
const ORN={ayar:{acik:true,gonderilen:0,son:null},mesgul:false,ESIK:20,SINIR:400};
try{Object.assign(ORN.ayar,JSON.parse(localStorage.getItem('th_ornek')||'{}')||{})}catch(e){}
const ornAyarKaydet=()=>{try{localStorage.setItem('th_ornek',JSON.stringify(ORN.ayar))}catch(e){}};
// Ayrı veritabanı: makbuz kayıtlarına dokunmaz
const ODB=(()=>{let p;const ac=()=>p||(p=new Promise((res,rej)=>{const q=indexedDB.open('tahsilat-ornek',1);q.onupgradeneeded=()=>q.result.createObjectStore('o');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}));
  const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const w=fn=>ac().then(d=>new Promise((res,rej)=>{const t=d.transaction('o','readwrite');fn(t.objectStore('o'));t.oncomplete=()=>res();t.onerror=()=>rej(t.error)}));
  return {put:(k,v)=>w(s=>s.put(v,k)),del:k=>w(s=>s.delete(k)),
    hepsi:()=>ac().then(d=>Promise.all([req(d.transaction('o').objectStore('o').getAllKeys()),req(d.transaction('o').objectStore('o').getAll())])).then(([k,v])=>k.map((x,i)=>[x,v[i]])),
    say:()=>ac().then(d=>req(d.transaction('o').objectStore('o').count()))}})();

const ORN_ALAN={tarih:'tarih',toplam:'tutar',evrak_no:'evrak_no'};
const ornDeger=(k,v)=>v==null||v===''?'':k==='toplam'?Number(v).toFixed(2):String(v).trim();
// v49: örnek, onaylanan değerin OCR'da bulunduğu kutudan kesilir (ank.sayi: rakamlı kutular). Etiketten tahmin edilen bölge
// tutarı kenardan kesebiliyordu ve çok genişti. Kutu: rakamları değere en çok benzeyen kutu + aynı satırdaki yakın rakamlı
// kutular (bölünmüş okumalar: "12 .22" "1.00"), etrafında pay (tutardan önce/sonra çizilen ≈ = # işaretleri de girsin).
function ornBenzer(a,b){if(!a||!b)return 0;const d=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}
  return 1-d[b.length]/Math.max(a.length,b.length)}
function degerKutusu(ank,k,deger){const L=ank&&ank.sayi;if(!L||!L.length||!deger)return null;
  const hedef=k==='toplam'?String(Math.round(+deger)):k==='tarih'?String(deger).replace(/\D/g,'').slice(0,4):String(deger).replace(/\D/g,'');
  if(hedef.length<2)return null;
  let en=null,ep=0;for(const b of L){const r=b[4],p=Math.max(ornBenzer(r,hedef),r.length>hedef.length?ornBenzer(r.slice(0,hedef.length),hedef)*.9:0);if(p>ep){ep=p;en=b}}
  if(!en||ep<.5)return null;
  let [x0,y0,x1,y1]=en;const h=y1-y0;
  for(const b of L){if(b===en||b[4].length>4)continue;const ust=Math.max(y0,b[1]),alt=Math.min(y1,b[3]);if(alt-ust<.5*Math.min(h,b[3]-b[1]))continue;   // aynı satır
    if(b[0]>x1+3*h||b[2]<x0-3*h)continue;x0=Math.min(x0,b[0]);x1=Math.max(x1,b[2]);y0=Math.min(y0,b[1]);y1=Math.max(y1,b[3])}
  return [x0-1.5*h,y0-.8*h,x1+1.5*h,y1+.8*h]}
// gönderilmiş örnekler (makbuz + alan + değer): aynı makbuz yeniden onaylanınca / Luca'ya aktarılınca tekrar gönderilmesin
const ORN_GIDEN='th_orngiden';
const ornGiden=()=>{try{return new Set(JSON.parse(localStorage.getItem(ORN_GIDEN)||'[]'))}catch(e){return new Set()}};
const ornGidenEkle=l=>{try{const s=[...ornGiden(),...l];localStorage.setItem(ORN_GIDEN,JSON.stringify(s.slice(-3000)))}catch(e){}};

async function ornekTopla(list){if(!ORN.ayar.acik)return;let n=0;
  for(const r of list){try{
    if(!r||r.status!=='done'||!r.ank||!r.hasOrig)continue;const d=r.d||{},o=r.oku||{};
    const alanlar=Object.keys(ORN_ALAN).filter(k=>{const v=ornDeger(k,d[k]);if(!v||(k==='toplam'&&+v<=0))return false;
      return r.el||ornDeger(k,o[k])!==v});   // el yazılı kart ya da okuyucunun yanlış/eksik okuduğu alan
    if(!alanlar.length)continue;
    const giden=ornGiden(),yeni=alanlar.filter(k=>!giden.has(`${r.id}_${k}:${ornDeger(k,d[k])}`));if(!yeni.length)continue;
    const pg=await IDB.get('orig',r.id);const b=pg&&pg[0];if(!b)continue;
    const bm=await createImageBitmap(b),W=bm.width,H=bm.height;
    for(const k of yeni){const dk=degerKutusu(r.ank,k,ornDeger(k,d[k])),bb=dk||kirpBolge(r.ank,ORN_ALAN[k]);if(!bb)continue;
      const x0=Math.max(0,bb[0])*W,y0=Math.max(0,bb[1])*H,x1=Math.min(1,bb[2])*W,y1=Math.min(1,bb[3])*H;if(x1-x0<20||y1-y0<20)continue;
      const s=Math.min(1,1200/Math.max(x1-x0,y1-y0)),cv=document.createElement('canvas');cv.width=Math.round((x1-x0)*s);cv.height=Math.round((y1-y0)*s);
      cv.getContext('2d').drawImage(bm,x0,y0,x1-x0,y1-y0,0,0,cv.width,cv.height);
      const boyut=[cv.width,cv.height],jpg=await new Promise(a=>cv.toBlob(a,'image/jpeg',.88));cv.width=cv.height=1;if(!jpg)continue;
      await ODB.put(`${r.id}_${k}`,{alan:k,deger:ornDeger(k,d[k]),okunan:ornDeger(k,o[k]),firma:d.firma||'',el:!!r.el,bolge:bb.map(v=>+v.toFixed(4)),kaynak:dk?'deger':'etiket',boyut,surum:APP_VER,zaman:new Date().toISOString(),jpg});n++}
    bm.close&&bm.close()}catch(e){}}
  if(n){ornSinirla().then(ornUI);ornGonder()}}

// telefonda en çok SINIR örnek: fazlası (en eskiler) silinir
async function ornSinirla(){try{const l=await ODB.hepsi();if(l.length<=ORN.SINIR)return;l.sort((a,b)=>String(a[1].zaman).localeCompare(String(b[1].zaman)));
  for(const [k] of l.slice(0,l.length-ORN.SINIR))await ODB.del(k)}catch(e){}}

const blobB64=b=>new Promise((a,h)=>{const f=new FileReader();f.onload=()=>a(String(f.result).split(',')[1]);f.onerror=h;f.readAsDataURL(b)});
// gelen kutusuna: tahsilat/ornekler/<zaman>/ — her örnek bir .jpg, değerler ornekler.json'da
async function ornGonder(zorla){if(ORN.mesgul||!S.ghKey||!navigator.onLine)return false;
  let l;try{l=await ODB.hepsi()}catch(e){return false}if(!l.length||(!zorla&&l.length<ORN.ESIK))return false;
  ORN.mesgul=true;ornUI();
  try{const parti=l.slice(0,60),kl='ornekler/'+new Date().toISOString().slice(0,19).replace(/:/g,'-')+'_'+Math.random().toString(36).slice(2,6),liste=[];
    const dosyalar=[];for(const [k,v] of parti){const ad=`${k.replace(/[^\w-]/g,'')}.jpg`;dosyalar.push({ad,b64:await blobB64(v.jpg)});const {jpg,...x}=v;liste.push({dosya:ad,...x})}
    dosyalar.push({ad:'ornekler.json',b64:b64Metin(JSON.stringify({tur:'tahsilat-el-yazisi-ornekleri',surum:APP_VER,adet:liste.length,ornekler:liste},null,1))});
    await ghGonder(kl,dosyalar);
    for(const [k] of parti)await ODB.del(k);
    ornGidenEkle(parti.map(([k,v])=>`${k}:${v.deger}`));
    ORN.ayar.gonderilen+=parti.length;ORN.ayar.son=new Date().toISOString();ornAyarKaydet();
    ORN.mesgul=false;ornUI();if(l.length>parti.length)setTimeout(()=>ornGonder(zorla),1500);return true}
  catch(e){ORN.mesgul=false;ornUI(e.message);return false}}

async function ornUI(hata){const el=$('#ornbilgi');if(!el)return;let n=0;try{n=await ODB.say()}catch(e){}
  $('#ornacik').checked=ORN.ayar.acik;
  el.textContent=ORN.mesgul?'Gönderiliyor…':`${n} örnek bekliyor · ${ORN.ayar.gonderilen} gönderildi`+(hata?` · gönderilemedi: ${hata}`:!S.ghKey&&n?' · gelen kutusu anahtarı girilince gönderilir':'');
  $('#orngonder').disabled=ORN.mesgul||!n}
$('#ornacik').addEventListener('change',e=>{ORN.ayar.acik=e.target.checked;ornAyarKaydet();toast(ORN.ayar.acik?'El yazısı örnekleri toplanacak':'El yazısı örnekleri toplanmayacak')});
$('#orngonder').onclick=async()=>{if(!S.ghKey){toast('Önce gelen kutusu anahtarını gir');return}if(await ornGonder(true))toast('Örnekler gönderildi')};
ornUI();setTimeout(()=>ornGonder(),8000);
window.addEventListener('online',()=>setTimeout(()=>ornGonder(),3000));
