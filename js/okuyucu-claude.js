// Okuyucu 3: Claude API (fotoğraf + talimat → JSON) — el yazısı makbuzlarda en isabetlisi
function PROMPT_METNI(){const t=new Date(),today=`${String(t.getDate()).padStart(2,'0')}.${String(t.getMonth()+1).padStart(2,'0')}.${t.getFullYear()}`;
return `Bu fotoğraf Türkiye'de bir toptancının / dağıtıcının müşterisine (bir markete) verdiği TAHSİLAT MAKBUZU ya da ödemeye ait bir POS (kredi kartı) slipidir. Makbuz matbu (yazıcı çıktısı) veya elle doldurulmuş olabilir. Belgeyi dikkatle oku ve YALNIZCA aşağıdaki JSON nesnesini döndür; başka hiçbir metin yazma.
{
 "makbuz_mu": true veya false (tahsilat makbuzu ya da POS slipi mi),
 "tur": "matbu" | "el_yazisi" | "pos"  (tutar veya tarih elle yazılmışsa "el_yazisi"),
 "firma": "makbuzu KESEN / tahsilatı YAPAN firmanın adı",
 "tarih": "GG.AA.YYYY",
 "evrak_no": "makbuz / evrak / sıra numarası, metin olarak",
 "toplam": tahsil edilen toplam tutar,
 "nakit": nakit tahsilat,
 "kart": kredi kartı / POS / Visa ile tahsilat,
 "cek": çek ile tahsilat,
 "diger": havale / EFT / senet gibi başka yolla tahsilat toplamı,
 "yazi_metin": "yazıyla yazılmış tutar, okuduğun haliyle (ör. \\"Dört bin iki yüz otuz TL\\")",
 "yazi": yazıyla yazılmış tutarın sayı karşılığı,
 "not": "kısa açıklama, yoksa boş metin",
 "belirsiz": [okuyamadığın veya emin olmadığın alan adları]
}
Bugünün tarihi ${today}. Makbuz büyük olasılıkla son haftalara aittir ve ileri tarihli olamaz.
Kurallar:
- Tutarları nokta ondalık ayırıcılı JSON sayısı olarak yaz (4.700,00 → 4700; 2.027,50 → 2027.5). Para birimi koyma. Belgede olmayan veya boş bırakılmış / üzeri çizgiyle kapatılmış alan için null yaz; tahmin etme.
- "firma": antetteki / kaşedeki satıcı firma. "Sayın", "Müşteri", "Sn:" yanında yazan ad ödeme yapan müşteridir, firma DEĞİLDİR. Adı BÜYÜK HARFLE ve doğru Türkçe karakterlerle, sondaki "SAN. VE TİC. LTD. ŞTİ." gibi ekleri atarak kısa yaz (ör. "HEKİMOĞLU SÜT VE SÜT ÜRÜNLERİ"). POS slipinde en üstteki işyeri adını yaz.
- "evrak_no": matbu makbuzlarda "No", "Evrak No", "Makbuz No"; el yazısı koçanlarda genelde kırmızı basılı "№ / Sıra No" seri numarası. Baştaki sıfırları koru. Birden fazla makbuz numarası listelenmişse ilkini yaz, diğerlerini "not" alanına ekle. POS slipinde "SIRA NO" değerini yaz.
- "tarih": yalnızca gün.ay.yıl; saati yazma. El yazısı koçanlarda yılın başı basılıdır ("202…" veya "20…") ve son rakam(lar) elle eklenir; basılı kısımla el yazısını birleştir.
- Ödeme türü belgede açıkça belirtilmişse (Nakit, Çek, Kredi Kartı / K.Kartı / Pos / Visa satırı veya kutusu) tutarı ilgili alana yaz. Belirtilmemişse yalnızca "toplam" yaz, nakit/kart/cek null kalsın. POS slipinde tutar "kart" alanına yazılır.
- Aynı ödeme türünden birden çok satır varsa topla.
- "Bakiye", "kalan borç", "eski bakiye", "kalan" gibi tutarlar tahsilat DEĞİLDİR; hiçbir tutar alanına yazma.
- EL YAZISI için: tutarlarda nokta veya virgülden sonra üç hane varsa bu binlik ayırıcıdır ("4,230" = 4230; "5.700" = 5700; "2.875" = 2875); iki hane varsa kuruştur ("1670.00" = 1670). Tutarın yanındaki #, =, –, /, ₺, TL gibi işaretleri yok say. Karalanmış / üstü çizilmiş rakamları yok say, yanındaki geçerli tutarı oku.
- Rakamla tutarı ve yazıyla tutarı BİRBİRİNDEN BAĞIMSIZ oku. Birini diğerine uydurmak için değiştirme. İkisi farklıysa ikisini de okuduğun gibi yaz ve "belirsiz" listesine "toplam" ekle.
- Bir rakamı iki farklı şekilde okumak mümkünse (ör. 1/7, 3/8, 4/9, 0/6) ilgili alanı "belirsiz" listesine ekle ve diğer olasılığı "not" alanına yaz.
- "belirsiz" listesinde yalnızca şu adları kullan: firma, tarih, evrak_no, toplam, nakit, kart, cek, diger, yazi.`}

const b64=blob=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(String(f.result).split(',')[1]);f.onerror=()=>rej(f.error);f.readAsDataURL(blob)});
async function callClaude(content,maxTokens,count=true){
  if(!S.key)throw new Error('API anahtarı girilmemiş — ⚙️ Ayarlar');
  let res;
  try{res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':S.key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:S.model,max_tokens:maxTokens,messages:[{role:'user',content}]})})}
  catch(e){throw new Error('İnternete bağlanılamadı. Bağlantını kontrol et.')}
  let j=null;try{j=await res.json()}catch(e){}
  if(!res.ok){const m=(j&&j.error&&j.error.message)||res.statusText||'';
    throw new Error(res.status===401?'API anahtarı geçersiz. ⚙️ Ayarlar’dan kontrol et.':res.status===403?'Bu anahtarın yetkisi yok: '+m:res.status===429?'Çok sık istek; biraz bekleyip tekrar dene.':res.status===529||res.status>=500?'Anthropic şu an yoğun; birazdan tekrar dene.':/credit|balance|billing/i.test(m)?'Anthropic hesabında kredi kalmamış. Panelden kredi yükle.':/model/i.test(m)?'Model kullanılamıyor: '+m:'API hatası ('+res.status+'): '+m)}
  track(j.usage,count);
  return (j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');
}
