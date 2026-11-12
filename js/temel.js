// Temel: alan tanımları, tutar tamamlama, sayı-tarih biçimleri, küçük yardımcılar (her dosya bunlara dayanır)
// Uygulama sürümü: arac/surum.mjs ile değiştir (index.html, sw.js, parser.js, işçi aynı anda güncellenir)
const APP_VER=25;
// Her sürümde kullanıcıya gösterilecek kısa notlar (güncellemeden sonra bir kez gösterilir). Yeni sürümde buraya ekle.
const YENILIK={
  25:['Kara kutu: uygulama okurken kendiliğinden kapanırsa, yeniden açılışta nedenini bulmamız için kısa bir kayıt (adımlar, fotoğraf boyutları; tutarlar değil) gizli gelen kutusuna gider'],
  24:['Okurken kaydırınca uygulamanın kapanması: listede küçük resimler, okunan fotoğraflar bellekten bırakılıyor, büyük fotoğraflar küçültülüyor','Uygulama okurken kapanırsa çektiğin fotoğraflar kaybolmaz; yeniden açınca okuma sürer','Kartta Hata bildir düğme olarak'],
  23:['Hata bildirimi daha hızlı gider','Alt çubuk (Luca CSV) artık kaybolmaz','Tarih alanında sayı klavyesi (2310 → 23.10)'],
  22:['Okuyucu (PaddleOCR) kendiliğinden iner; ekran kapanıp yarıda kalırsa uygulamaya dönünce kaldığı yerden sürer, indirirken ekran açık tutulur','Arka arkaya çekimde sol alttaki küçük resme dokununca uygulama kapanmaz; kamera kapanıp listeye döner','Okunan makbuzların kartları kapalı gelir; görmek istediğine dokunup açarsın','Çok makbuzla daha hızlı açılış; uzun seride makbuzlar arasında kısa ara (telefon daha az ısınır)'],
  21:['Deklanşöre basınca çekildiği artık hep belli: beyaz parlama, çerçeve ve düğme nabzı; iPhone’da (iOS 18 ve sonrası) hafif titreşim. “Fotoğraf çek”te parlama önceden hiç görünmüyordu, düzeltildi.','Arka arkaya taramada deklanşör önceki fotoğraf kaydedilirken kilitlenmiyor; hızlı basışlar kaçmıyor.'],
  20:['El yazısı örnekleri (Ayarlar): “Hepsi doğru”ya basınca ya da Luca’ya aktarınca, el yazılı makbuzların tarih, tutar ve numara bölgesi onayladığın değerle saklanır; 20 örnek birikince gelen kutusuna kendiliğinden gider. Okuyucu ileride bunlarla, makbuzları yazanların el yazısını tanıyacak şekilde eğitilecek. İstersen Ayarlar’dan kapatabilirsin.'],
  19:['Yeni “Firmalar” ekranı (ana ekrandaki düğme): uygulamanın tanıdığı firmaları görebilir, adını düzeltebilir, iki firmayı birleştirebilir, telefon ekleyip yanlış öğrenilmiş telefon ya da yazılışı silebilirsin. Ad değişince Luca’ya aktarılmamış makbuzlar da güncellenir.','Öğrenilen firmalar artık yedeğe de giriyor; yedekten yükleyince geri gelir.'],
  18:['Toplam ile nakit (tek ödeme türü) artık hep aynı: biri değişince öteki de değişir; okumada biri eksik okunduysa (62,25 ↔ 3.062,25 · 200 ↔ 6.200) büyüğü alınır','Eksik alanlarda firma da var: bilinen firmalardan seçebilirsin','6 aydan eski tarihte uyarı (yıl yanlış okunmuş olabilir)','Yeniden çekilen fotoğrafta eski kırpma görüntüleri kalmaz; yedekten yükleme tüm bilgileri geri getirir'],
  17:['Fotoğrafa dokununca tam ekran görüntüleyici: iki parmakla yakınlaştır, kaydır, çift dokun. Eksik alanlardaki küçük görüntüye dokununca o bölge büyütülmüş açılır','Eksik alanlardaki görüntüler daha geniş bölge gösterir','Bir-iki harfi yanlış okunan firma adı da tanınır; Ebru Avcı → “Ebru avcı”'],
  16:['El yazısı makbuzlarda “Eksik alanlar”: turuncu tarih / evrak no / tutar kartın en üstünde, yanında makbuzun o kısmı büyütülmüş','Kısa yazım: 2310 → 23.10.2026; dokununca okunan değer seçili gelir, “ileri” sonraki alana geçer','Telefon numarasından tanınan firma artık şüpheli sayılmaz'],
  15:['Koçan makbuzlarda bitişik okunan seri no (N000321) ve el yazısı tarih (Tarih 12/10/2026) okunur','“Yalnız” satırı bozuk okunsa da tutarın yazılışıyla karşılaştırılır; uyuşursa tutar turuncu gelmez'],
  14:['“Seri A 884435” gibi seri + sıra numaraları evrak no olarak okunur','Ayraçları bozuk okunan tarihler (13,1012026 · 27.10.12026) okunur','“Yalnız: TL. 10530.00” satırındaki rakam tutar olarak kullanılır; ondalığı kaybolan okuma (105300) düzeltilir'],
  12:['Kamerada çerçeve Dikey / Yatay seçilebilir (üstteki düğme; seçimin hatırlanır). Yatay: koçan makbuzlar için ekran genişliğinde çerçeve','Fotoğraf yalnız çerçevenin içinden alınır: yandaki makbuz, masa, klavye okumaya karışmaz'],
  11:['Evrak no 6 haneden uzunsa yalnız son 6 hanesi yazılır','Okunan firma adları Türkçe harflerle yazılır (HEKİMOĞLU, TİCARET, DOĞAL…)'],
  10:['İs ra firmasının adı “is ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi” olarak düzeltildi'],
  9:['Firma adı tanımları eski kartlara da uygulanır (elle değiştirmediğin ve Luca’ya aktarılmamış kartlar)'],
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
  if(/^\d{3,8}$/.test(s)){const y0=new Date().getFullYear(),g=s.length%2?'0'+s:s;   // yalnız rakam: "2310" → 23.10.<bu yıl> (ileri tarih olursa geçen yıl)
    if(g.length===4){const t=new Date(y0,+g.slice(2,4)-1,+g.slice(0,2));return `${g.slice(0,2)}.${g.slice(2,4)}.${t>new Date(Date.now()+864e5)?y0-1:y0}`}
    if(g.length===6)return `${g.slice(0,2)}.${g.slice(2,4)}.20${g.slice(4,6)}`;if(g.length===8)return `${g.slice(0,2)}.${g.slice(2,4)}.${g.slice(4)}`}
  s=s.replace(/\s+/g,'.');
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
const FIRMA_TEL0={"03722664400":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","03722661053":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","03722664181":"Melih bilgin","03722100060":"Melih bilgin","03722536014":"Seda gıda iş makinaları mühendislik inşaat petrol ürünleri doğalgaz sanayi ve ticaret ltd.şti.","03724000261":"Yenigün ihtiyaç maddeleri gıda tarım ve hayvancılık turizm inşaat sanayi ticaret limited şirketi","03782681095":"Hasgülay gıda ve temizlik maddeleri pazarlama dağıtım ticaret ve sanayi limited şirketi","05355188779":"Sinan üstüntaş","03742180014":"Bolu er gıda hayvancılık nakliye sanayi ve ticaret limited şirketi","03722683886":"is ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi","03722561053":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","0378268095":"Hasgülay gıda ve temizlik maddeleri pazarlama dağıtım ticaret ve sanayi limited şirketi"};
const FIRMA0={"EBRUAVCIMIZAHTICARET":"Ebru avcı","EBRUAVCIMİZAHTİCARET":"Ebru avcı","AVCILARGIDATEKSTIL":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","SEDAGIDA":"Seda gıda iş makinaları mühendislik inşaat petrol ürünleri doğalgaz sanayi ve ticaret ltd.şti.","IHT":"Yenigün ihtiyaç maddeleri gıda tarım ve hayvancılık turizm inşaat sanayi ticaret limited şirketi","INT":"Yenigün ihtiyaç maddeleri gıda tarım ve hayvancılık turizm inşaat sanayi ticaret limited şirketi","SİNANÜSTÜNTAŞMÜSTERLTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş","UGTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş","ERHAYV":"Bolu er gıda hayvancılık nakliye sanayi ve ticaret limited şirketi","GIDAVEIHTIYAÇ":"is ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi","AVCILARGIDATEKSTILAVCILAR":"Avcılar tekstil turizm gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret limited şirketi","UZAYTICARET":"Mf uzay ticaret toptan satış san. tic. ltd. şti.","GÜNESIBRAHIMMUHAMMETYUSUFAYDOG":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GÜNEŞIBRAHIMMUHAMMETYUSUFAYDO":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GÜNEIBRAHİMMUHAMMETYUSUFAYDO":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GUNESIBRAHIMAYDOGANMUHAMMETAYDOGANY":"Güneş ibrahim aydoğan muhammet aydoğan yusuf aydoğan kollektif şirketi","GULAY":"Hasgülay gıda ve temizlik maddeleri pazarlama dağıtım ticaret ve sanayi limited şirketi","SİNANÜSTÜNTASTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş","SUGTOPTANGIDAVETEMİZLİK":"Sinan üstüntaş"};
// Satırlarda "Tel/GSM/Fax" geçen numaralar (yalnız rakamlar, en az 9 hane). Müşterinin vergi no'su vb. karışmasın diye yalnız telefon.
function telNolar(text){const out=new Set();for(const l of String(text||'').split(/\n/)){if(!/\b(TEL|GSM|FAX|TELEFON)\b/i.test(l))continue;
  for(const m of l.replace(/(?<=\d)[\s.()\-\/]+(?=\d)/g,'').matchAll(/\d{9,11}/g)){const n=m[0].replace(/^90(?=\d{10}$)/,'').replace(/^(?=[2-5]\d{9}$)/,'0');if(/^0[2-5]\d{8,9}$/.test(n))out.add(n)}}   // yalnız telefon biçimi (tarih, vergi no değil)
  return [...out]}
// Okuyucu bir rakamı atlayabilir ya da fazla okuyabilir ("268 0 95" / "268 10 95"): tek hane farkı da eşleşir
// Kullanıcının sonradan düzelttiği firma yazımları: eski yazım → doğru yazım (öğrenilmiş adlarda ve kartlarda da değişir)
const FIRMA_YENIAD={'İs ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi':'is ra gıda ve ihtiyaç maddeleri pazarlama sanayi ve ticaret anonim şirketi'};
// Firmalar ekranında hazır tanımlara yapılan değişiklikler: n/t = yeni ad (yazılış / telefon), sil = kaldırılanlar ('n:ANAHTAR' / 't:telefon')
let FIRMA_EK={n:{},t:{},sil:[]};
try{FIRMA_EK=Object.assign(FIRMA_EK,JSON.parse(localStorage.getItem('th_firma_ek')||'{}')||{})}catch(e){}
function firmaEkUygula(){for(const k in FIRMA_EK.n)if(k in FIRMA0)FIRMA0[k]=FIRMA_EK.n[k];for(const k in FIRMA_EK.t)if(k in FIRMA_TEL0)FIRMA_TEL0[k]=FIRMA_EK.t[k];
  for(const x of FIRMA_EK.sil){const k=x.slice(2);if(x[0]==='n')delete FIRMA0[k];else delete FIRMA_TEL0[k]}}
firmaEkUygula();
function firmaKaydet(){try{localStorage.setItem('th_firma',JSON.stringify(FIRMA));localStorage.setItem('th_firma_tel',JSON.stringify(FIRMA_TEL));localStorage.setItem('th_firma_ek',JSON.stringify(FIRMA_EK))}catch(e){}}
{let d=false;for(const T of [FIRMA,FIRMA_TEL])for(const k in T)if(FIRMA_YENIAD[T[k]]){T[k]=FIRMA_YENIAD[T[k]];d=true}
  if(d)firmaKaydet()}
function birFark(a,b){if(a===b)return true;if(Math.abs(a.length-b.length)>1||Math.min(a.length,b.length)<10)return false;let i=0,j=0,f=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++f>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}
  return f+(a.length-i)+(b.length-j)<=1}
// Okuyucu Türkçe harfleri çoğu zaman düz okur (HEKIMOGLU, TICARET): firma adını Türkçe yazımına çevir.
// Önce sözlük (sık geçen ticari sözcükler ve firma adları), sonra ünlü uyumu: ince ünlüden (E, İ, Ö, Ü) sonra gelen I → İ.
const TR_SOZ=Object.fromEntries(('HEKİMOĞLU SÜT ÜRÜNLERİ ÜRÜN ÜRÜNLER TİCARET TİC SANAYİ SANAYİİ SAN LİMİTED ŞİRKETİ ŞTİ İHTİYAÇ MADDELERİ GIDA LOJİSTİK '+
  'YAZDOĞAN AYDOĞAN DOĞAN DOĞAL TÜTÜN MAMÜLLERİ MAMULLERİ MİZAH TEMİZLİK DAĞITIM DAĞ PAZARLAMA HAYVANCILIK İNŞAAT TURİZM NAKLİYE TEKSTİL '+
  'GÜNEŞ İBRAHİM MÜHENDİSLİK PETROL DOĞALGAZ YENİGÜN ÜSTÜNTAŞ ÇAYCUMA ZONGULDAK KİLİMLİ BİLGİN MELİH İÇECEK ÜRETİM KOLLEKTİF ŞİRKET '+
  'VETERİNER HİZMETLERİ HİZ VET İTHALAT İHRACAT ELEKTRİK ELEKTRONİK TOPTAN ÇİÇEK GÜLAY HASGÜLAY KARABÜK BARTIN').split(' ').map(w=>[w.replace(/[İIŞÇĞÜÖ]/g,c=>({İ:'I',I:'I',Ş:'S',Ç:'C',Ğ:'G',Ü:'U',Ö:'O'}[c])),w]));
function trFirma(ad){if(!ad)return ad;
  return String(ad).replace(/[A-Za-zÇĞİÖŞÜçğıöşüČ]+/g,w=>{if(/i/.test(w)&&w.replace(/i/g,'')===w.replace(/i/g,'').toUpperCase())w=w.replace(/i/g,'İ');   // okuyucu İ'yi küçük i okur: "iHTIYAC"
    const W=w.toLocaleUpperCase('tr-TR').replace(/Č/g,'Ğ');
    // yalnız büyük harfli (okuyucudan gelen) sözcükler; kullanıcının küçük harfle yazdığı ada dokunma
    if(w!==w.toLocaleUpperCase('tr-TR')&&w!==w.toUpperCase())return w;
    const k=W.replace(/[İIŞÇĞÜÖ]/g,c=>({İ:'I',I:'I',Ş:'S',Ç:'C',Ğ:'G',Ü:'U',Ö:'O'}[c]));
    if(TR_SOZ[k])return TR_SOZ[k];
    let on=null,o='';for(const c of W){if(c==='I'&&on==='ince')o+='İ';else o+=c;if(/[EİÖÜ]/.test(c)||(c==='I'&&on==='ince'))on='ince';else if(/[AIOU]/.test(c))on='kalin'}
    return o})}
function firmaAd(okunan,text){const tel=telNolar(text);
  for(const T of [FIRMA_TEL,FIRMA_TEL0])for(const t of tel){if(T[t])return T[t]}
  for(const T of [FIRMA_TEL,FIRMA_TEL0])for(const t of tel)for(const k in T)if(birFark(t,k))return T[k];
  const k=nkey(okunan);if(FIRMA[k]||FIRMA0[k])return FIRMA[k]||FIRMA0[k];
  if(k.length>=8)for(const T of [FIRMA,FIRMA0])for(const a in T){if(Math.abs(a.length-k.length)>3)continue;let d=0;{const p=Array.from({length:a.length+1},(_,j)=>j);for(let i=1;i<=k.length;i++){let q=p[0];p[0]=i;for(let j=1;j<=a.length;j++){const t=p[j];p[j]=Math.min(p[j]+1,p[j-1]+1,q+(k[i-1]===a[j-1]?0:1));q=t}}d=p[a.length]}
    if(d<=Math.max(1,Math.floor(Math.max(a.length,k.length)*.12)))return T[a]}   // tek-iki harf farkı (EERU AVCI ↔ EBRU AVCI)
  return trFirma(okunan)}
function firmaOgren(okunan,dogru,text){if(!dogru)return false;let ok=false;
  if(okunan&&nkey(okunan)!==nkey(dogru)){FIRMA[nkey(okunan)]=dogru;ok=true}
  for(const t of telNolar(text)){FIRMA_TEL[t]=dogru;ok=true}
  firmaKaydet()
  return ok}
// Evrak no: 6 haneden uzunsa yalnız son 6 karakter (harf/rakam; tire, boşluk sayılmaz). "F3528102026017" → "026017"
function evrakKisa(v){const s=String(v??'').trim();const a=s.replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g,'');return a.length>6?a.slice(-6):s}
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
