// Temel: alan tanımları, tutar tamamlama, sayı-tarih biçimleri, küçük yardımcılar (her dosya bunlara dayanır)
// Uygulama sürümü: arac/surum.mjs ile değiştir (index.html, sw.js, parser.js, işçi aynı anda güncellenir)
const APP_VER=8;
// Her sürümde kullanıcıya gösterilecek kısa notlar (güncellemeden sonra bir kez gösterilir). Yeni sürümde buraya ekle.
const YENILIK={
  8:['Deklanşör basıldığı anda çeker; çekim sırasında uygulama artık kendini yenilemez (kamera açıkken okuma bekler, daha az bellek)','Gönderdiğin makbuzlardaki 16 firmanın adı senin yazdığın şekilde kendiliğinden gelir','El yazısı tutarlarda okunan ile toplam çelişirse ikisi de turuncu işaretlenir'],
  7:['Firma, makbuzdaki basılı telefon numarasından da tanınır: logodaki adı okunamayan firmanın adını bir kez yazarsan sonraki makbuzlarında kendiliğinden gelir (Has Gülay tanımlı)'],
  6:['Logodaki firma adı okunamayınca “PAZ” gibi anlamsız ad yazılmaz; firma boş gelir'],
  5:['Bir alanı düzeltince bildirim kutusu kartta kendiliğinden açılır: isteğe bağlı not yaz, tek dokunuşla Gönder'],
  4:['Kartta yazarken klavye artık kapanmıyor (“Kontrol et” süzgeci açıkken de) ve ekran kaymıyor','El yazısı koçanlarda: “1240-00” gibi tutarlar, kenarda yazılı seri no (baştaki sıfırlar atılır: 953), Z3/10 gibi okunan tarihler','Fotoğrafa yandaki makbuz girdiyse ödemelerle tutan TOPLAM seçilir'],
  3:['“2,070.00” / “3.380.78” gibi yazılan tutarlar, “Makbuz No: 1” gibi kısa numaralar, ayrı satırdaki “TUTAR:” ve “Türk Lirası … TL” satırları okunuyor','Bazı firmalar her makbuza aynı numarayı yazıyor: aynı numara artık tek başına “iki kez eklenmiş” uyarısı vermez'],
  2:['“Hata bildir” makbuzu kendi klasörüne gönderir (Z raporu bildirimleriyle karışmaz)'],
  1:['Tahsilat makbuzu okuyucu: matbu makbuzlar, POS slipleri ve elle doldurulan koçanlar']
};
const FIELDS=[
  {k:'firma',l:'Makbuzu kesen firma',t:'text',sec:'Genel',full:true,x:true},
  {k:'tarih',l:'Evrak Tarihi',c:'EVRAK TARİHİ',t:'text'},
  {k:'evrak_no',l:'Evrak No',c:'EVRAK NO',t:'text'},
  {k:'aciklama',l:'Açıklama',c:'AÇIKLAMA',t:'text',full:true},
  {k:'toplam',l:'Toplam',c:'TOPLAM',t:'num',sec:'Tahsilat',full:true},
  {k:'cek',l:'Çek',c:'ÇEK',t:'num'},
  {k:'kart',l:'Kredi Kartı',c:'KREDİ KARTI',t:'num'},
  {k:'nakit',l:'Nakit',c:'NAKİT',t:'num',full:true},
  {k:'yazi',l:'Yazıyla tutar (sayı olarak)',t:'num',sec:'Kontrol — Luca’ya aktarılmaz',x:true},
  {k:'diger',l:'Havale / senet / diğer',t:'num',x:true},
  {k:'not',l:'Not (aktarılmaz)',t:'text',full:true,x:true}
];
const OUT=FIELDS.filter(f=>!f.x);
const PAY=['cek','kart','nakit'];
const r2=n=>Math.round(n*100)/100;
const paySum=d=>PAY.reduce((a,k)=>a+(d[k]||0),0);
// Eksik tutarı tamamla: ödeme kalemleri varsa toplam = kalemlerin toplamı; yalnız toplam varsa (ödeme türü yazmıyor) nakit varsayılır
function fill(d,auto=[]){
  const any=PAY.some(k=>d[k]!=null);
  if(d.toplam==null&&(any||d.diger!=null)){d.toplam=r2(paySum(d)+(d.diger||0));auto.push('toplam')}
  else if(d.toplam!=null&&!any&&d.diger==null){d.nakit=d.toplam;auto.push('nakit')}
  return auto;
}
function refill(r,key){
  const a=(r.auto||[]).filter(k=>k!==key);
  for(const k of a)r.d[k]=null;
  r.auto=fill(r.d,[]);
}
function normDate(s){
  s=String(s||'').trim();let m;
  if(m=s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/))return `${m[3].padStart(2,'0')}.${m[2].padStart(2,'0')}.${m[1]}`;
  if(m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/))return `${m[1].padStart(2,'0')}.${m[2].padStart(2,'0')}.${m[3].length===2?'20'+m[3]:m[3]}`;
  if(m=s.match(/^(\d{1,2})[./-](\d{1,2})$/))return `${m[1].padStart(2,'0')}.${m[2].padStart(2,'0')}.${new Date().getFullYear()}`;   // "23.10" → bu yıl
  return s;
}
function dateOk(s){const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);if(!m)return false;const d=new Date(+m[3],+m[2]-1,+m[1]);return d.getDate()===+m[1]&&d.getMonth()===+m[2]-1&&+m[3]>=2000&&d<=new Date(Date.now()+864e5)}
const satis=d=>d.toplam||0;   // kartın büyük tutarı
let ACK='{firma}';
const nkey=s=>String(s||'').toLocaleUpperCase('tr-TR').replace(/[^0-9A-ZÇĞİÖŞÜ]/g,'');
const nno=s=>nkey(s).replace(/^0+/,'');
try{const a=localStorage.getItem('th_ack');if(a)ACK=a}catch(e){}
const mkAck=d=>ACK.split('{firma}').join(d.firma||'').split('{no}').join(d.evrak_no||'').split('{tarih}').join(d.tarih||'').replace(/\s+/g,' ').trim();
// Firma adı düzeltmeleri: bir kez düzeltirsin, sonraki makbuzlarda kendiliğinden gelir. İki yoldan tanınır:
//  1) okuyucunun okuduğu ad → senin yazdığın ad
//  2) makbuzdaki basılı TELEFON numarası → senin yazdığın ad (logodaki ad okunamasa da firma tanınır, ör. Has Gülay)
let FIRMA={},FIRMA_TEL={};
try{FIRMA=JSON.parse(localStorage.getItem('th_firma')||'{}')||{}}catch(e){}
try{FIRMA_TEL=JSON.parse(localStorage.getItem('th_firma_tel')||'{}')||{}}catch(e){}
// Önceden bilinenler (kullanıcının bildirimlerinden): telefon → firma
const FIRMA_TEL0={"03722664400":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","03722661053":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","03722664181":"Melih bilgin","03722100060":"Melih bilgin","03722536014":"Seda gıda iş makinaları mühendislik inşaat petrol ürünleri doğalgaz sanayi ve ticaret ltd.şti.","03724000261":"Yenigün ihtiyaç maddeleri gıda tarım ve hayvancılık turizm inşaat sanayi ticaret limited şirketi","03782681095":"Hasgülay gıda ve temizlik maddeleri pazarlama dağıtım ticaret ve sanayi limited şirketi","05355188779":"Sinan üstüntaş","03742180014":"Bolu er gıda hayvancılık nakliye sanayi ve ticaret limited şirketi","03722683886":"İs ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi","03722561053":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","0378268095":"Hasgülay gıda ve temizlik maddeleri pazarlama dağıtım ticaret ve sanayi limited şirketi"};
const FIRMA0={"AVCILARGIDATEKSTIL":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","SEDAGIDA":"Seda gıda iş makinaları mühendislik inşaat petrol ürünleri doğalgaz sanayi ve ticaret ltd.şti.","IHT":"Yenigün ihtiyaç maddeleri gıda tarım ve hayvancılık turizm inşaat sanayi ticaret limited şirketi","INT":"Yenigün ihtiyaç maddeleri gıda tarım ve hayvancılık turizm inşaat sanayi ticaret limited şirketi","SİNANÜSTÜNTAŞMÜSTERLTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş","UGTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş","ERHAYV":"Bolu er gıda hayvancılık nakliye sanayi ve ticaret limited şirketi","GIDAVEIHTIYAÇ":"İs ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi","AVCILARGIDATEKSTILAVCILAR":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","UZAYTICARET":"Mf uzay ticaret toptan satış san. tic. ltd. şti.","GÜNESIBRAHIMMUHAMMETYUSUFAYDOG":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GÜNEŞIBRAHIMMUHAMMETYUSUFAYDO":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GÜNEIBRAHİMMUHAMMETYUSUFAYDO":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GUNESIBRAHIMAYDOGANMUHAMMETAYDOGANY":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GULAY":"Hasgülay gıda ve temizlik maddeleri pazarlama dağıtım ticaret ve sanayi limited şirketi","SİNANÜSTÜNTASTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş","SUGTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş"};
// Satırlarda "Tel/GSM/Fax" geçen numaralar (yalnız rakamlar, en az 9 hane). Müşterinin vergi no'su vb. karışmasın diye yalnız telefon.
function telNolar(text){const out=new Set();for(const l of String(text||'').split(/\n/)){if(!/\b(TEL|GSM|FAX|TELEFON)\b/i.test(l))continue;
  for(const m of l.replace(/(?<=\d)[\s.()\-\/]+(?=\d)/g,'').matchAll(/\d{9,11}/g)){const n=m[0].replace(/^90(?=\d{10}$)/,'').replace(/^(?=[2-5]\d{9}$)/,'0');if(/^0[2-5]\d{8,9}$/.test(n))out.add(n)}}   // yalnız telefon biçimi (tarih, vergi no değil)
  return [...out]}
// Okuyucu bir rakamı atlayabilir ya da fazla okuyabilir ("268 0 95" / "268 10 95"): tek hane farkı da eşleşir
function birFark(a,b){if(a===b)return true;if(Math.abs(a.length-b.length)>1||Math.min(a.length,b.length)<10)return false;let i=0,j=0,f=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++f>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}
  return f+(a.length-i)+(b.length-j)<=1}
function firmaAd(okunan,text){const tel=telNolar(text);
  for(const T of [FIRMA_TEL,FIRMA_TEL0])for(const t of tel){if(T[t])return T[t]}
  for(const T of [FIRMA_TEL,FIRMA_TEL0])for(const t of tel)for(const k in T)if(birFark(t,k))return T[k];
  return FIRMA[nkey(okunan)]||FIRMA0[nkey(okunan)]||okunan}
function firmaOgren(okunan,dogru,text){if(!dogru)return false;let ok=false;
  if(okunan&&nkey(okunan)!==nkey(dogru)){FIRMA[nkey(okunan)]=dogru;ok=true}
  for(const t of telNolar(text)){FIRMA_TEL[t]=dogru;ok=true}
  try{localStorage.setItem('th_firma',JSON.stringify(FIRMA));localStorage.setItem('th_firma_tel',JSON.stringify(FIRMA_TEL))}catch(e){}
  return ok}
const NUMK=FIELDS.filter(f=>f.t!=='text').map(f=>f.k);
const LS='tahsilat_rows_v1';
let rows=[];let queue=[],busy=false;
const $=s=>document.querySelector(s);
const ik=a=>`<svg class="ik"><use href="#i-${a}"/></svg>`;   // ikon (index.html’deki SVG setinden)


function pn(v){
  if(v===null||v===undefined)return null;
  if(typeof v==='number')return isFinite(v)?v:null;
  let s=String(v).trim().replace(/\s|₺|TL|\*|#/gi,'');
  if(!s)return null;
  if(/^\d{1,3}(,\d{3})+$/.test(s)) s=s.replace(/,/g,'');   // "4,230" → 4230 (el yazısı binlik)
  else if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  else if(/\.\d{3}$/.test(s)&&!/\.\d{3}\./.test(s)&&s.split('.').length>=2&&/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  const n=parseFloat(s);return isFinite(n)?n:null;
}
const fm=n=>n==null?'':n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fv=(f,v)=>v==null?'':(f.t==='num'?fm(v):f.t==='int'?String(v):String(v));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)}
function notice(m){const n=$('#notice');n.style.display=m?'block':'none';n.textContent=m||''}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Yazı tanıma aracı indirilemedi. İnternet bağlantını kontrol et.'));document.head.appendChild(s)})}
function openImage(src){return new Promise((res,rej)=>{const u=URL.createObjectURL(src),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Fotoğraf açılamadı'))};im.src=u})}
function setProg(r,txt){r.prog=txt;const el=document.querySelector(`#c_${r.id} .t2`);if(el)el.textContent=txt}
