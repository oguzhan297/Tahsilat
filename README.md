# Tahsilat Makbuzu → Luca

Tahsilat makbuzlarını ve POS (kredi kartı) sliplerini telefonda fotoğraftan okuyup Luca'ya aktarılacak CSV / Excel dosyasına
çeviren web uygulaması (PWA). [Z Raporu → Luca](https://github.com/oguzhan297/Zraporu) uygulamasının iskeleti üzerine kuruludur.
Sunucu yok: fotoğraflar ve makbuzlar yalnızca kullanıcının telefonunda (IndexedDB) durur. Yayın: GitHub Pages (`main` dalı).

Luca şablonu (CSV, `;` ayraç, Windows-1254): `EVRAK TARİHİ;EVRAK NO;AÇIKLAMA;TOPLAM;ÇEK;KREDİ KARTI;NAKİT`

## Ne okur

| Makbuz türü | PaddleOCR (ücretsiz, telefonda) |
|---|---|
| Termal yazıcı makbuzları, POS slipleri | Tamamı okunur |
| Elle doldurulan matbu koçanlar | Basılı kısımlar (firma, seri no) okunur. El yazısı tutar bazen okunur, tarih çoğu zaman okunmaz |

El yazısı makbuzlarda okunamayan ya da doğrulanamayan her alan **turuncu** gelir; kullanıcı fotoğrafa bakıp yazar ya da
"Kontrol ettim, doğru" der. El yazısı bir tutar ancak makbuzda iki ayrı yerde aynı okunduysa (ör. NAKİT ve TOPLAM kutuları)
ya da yazıyla tutarla tuttuysa kesin sayılır. Ayarlar'a Claude API anahtarı girilirse kartta "Claude ile oku" çıkar
(el yazısını da okur; yalnız o makbuz için ücret alınır).

## Klasörler

```
index.html             sayfa iskeleti (yalnız HTML)
css/uygulama.css       stil
js/                    uygulama kodu — sırası index.html'deki gibi yüklenir
  temel.js             alan tanımları (FIELDS), sayı/tarih biçimleri, tutar tamamlama (fill), firma adı düzeltmeleri, APP_VER
  depo.js              IndexedDB ('tahsilat') kaydı, yedek indir/yükle
  ayarlar.js           okuma yöntemi, Claude API anahtarı/model, varsayılan açıklama ('th_settings')
  kontrol.js           tutarlılık kontrolleri (checks)
  kalite.js            fotoğraf kalitesi ölçümü ve uyarısı
  arayuz.js            makbuz kartları, kontrol ekranı, alt özet, tıklama/düzenleme olayları
  okuyucu-paddle.js    PaddleOCR (varsayılan)
  okuyucu-tesseract.js Tesseract
  okuyucu-claude.js    Claude API (talimat metni burada)
  okuma.js             fotoğraf/metin ekleme, sıra, okuyucu seçimi, sonucu karta yazma, "Claude ile oku", arka arkaya tarama
  disari.js            Luca CSV (Windows-1254), Excel, panoya kopyalama
  baslat.js            açılış: kayıtları yükle, sürüm kontrolü, service worker
  parser.js            makbuz metni ayrıştırıcısı (TParse) — düzenler, el yazısı kuralları, okumaları birleştirme
  goruntu.js           görüntü hazırlama — sayfa ve işçi ortak
  paddle-worker.js     PaddleOCR işçisi
vendor/paddle.js       derlenmiş PaddleOCR.js + ONNX Runtime (elle düzenlenmez)
paddle/                vendor/paddle.js'in kaynağı
sw.js                  service worker: çevrimdışı açılış
arac/surum.mjs         sürüm yükseltme
```

Z Raporu uygulamasıyla **aynı adreste** (`oguzhan297.github.io`) durduğu için tarayıcı deposu ortaktır; çakışmasın diye
bu uygulamanın anahtarları ayrıdır: IndexedDB `tahsilat`, localStorage `th_*`, önbellek `tahsilat-v*`. PaddleOCR modelleri
(`zrapor-ocr-1` önbelleği) bilerek ortaktır: bir uygulamada indiyse diğerinde yeniden inmez. İlk açılışta Z Raporu'ndaki
Claude API anahtarı ve gelen kutusu anahtarı buraya kopyalanır.

## Yayına alma

1. `node arac/surum.mjs +` — sürümü bir artırır. Unutulursa telefonlar eski dosyayı kullanır.
2. Test arşivini çalıştır (aşağıda).
3. `main`'e gönder. İlk kurulumda: depo **Settings → Pages → Branch: main / (root)**.

## Test

Gerçek makbuz fotoğrafları ve doğru değerleri gizli `oguzhan297/tahsilat-testler` deposunda. O depoda:

```
node calistir.mjs --uygulama ../Tahsilat --metin       # yalnız ayrıştırıcı, saniyeler
node calistir.mjs --uygulama ../Tahsilat --mod paddle   # fotoğraftan PaddleOCR
```

"Yanlış ve işaretsiz" sütunu sıfır olmalı (uygulama emin göründüğü hâlde yanlış değer).

## Kullanıcı kuralları (muhasebe)

- **Açıklama** = makbuzu kesen firmanın adı (Ayarlar'dan kalıp değişir: `{firma}`, `{no}`, `{tarih}`). Firma adı kartta
  düzeltilirse öğrenilir; aynı firmanın sonraki makbuzlarında düzeltilmiş ad gelir.
- Makbuzda ödeme türü yazmıyorsa tutar **nakit** sayılır (kartta bilgi notu çıkar).
- POS slipinde tutar **Kredi Kartı** sütununa, "SIRA NO" evrak no'ya yazılır.
- Birden fazla makbuz no listelenmişse ilki evrak no olur, diğerleri nota yazılır.
- Havale / senet tutarı şablonda sütunu olmadığı için aktarılmaz; kartta uyarı çıkar.
- Boş ödeme türleri CSV'de boş bırakılır (0,00 yazılmaz).
