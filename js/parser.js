// ===== TAHSİLAT MAKBUZU OKUYUCU (kural tabanlı) =====
// Girdi: makbuzun düz metni (yazı tanıma çıktısı ya da kopyalanan metin)
// Çıktı: { d: alanlar, unsure: [emin olunamayan alanlar], notes: [açıklamalar], found, el, cnt }
// Düzenler: termal yazıcı makbuzları (Dora, Erpiliç, Yazdoğan…), POS (kredi kartı) slipi, elle doldurulan matbu koçanlar.
// Elle doldurulan koçanlarda (el=true) yazı tanıma el yazısını her zaman okuyamaz: okunan tutar ancak makbuzda iki kez aynı
// okunduysa ya da okumalar birbirini tutuyorsa kesin sayılır; tarih her zaman kontrol edilmek üzere işaretlenir.
(function (root) {
  const TRU = s => String(s).toLocaleUpperCase('tr-TR');
  // Anahtar sözcük araması için: büyük harf + Türkçe harfleri sadeleştir (uzunluk değişmez → konumlar asıl satırla aynı)
  const FOLD = { 'İ': 'I', 'I': 'I', 'Ş': 'S', 'Ç': 'C', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Č': 'C', 'Â': 'A', 'Î': 'I', 'Û': 'U' };
  const fold = s => TRU(s).replace(/[İIŞÇĞÜÖČÂÎÛ]/g, c => FOLD[c] || c);
  const r2 = n => Math.round(n * 100) / 100;

  // ---- Tutarlar ----
  // "4.700,00" "745,17" | "2,070.00" "3.380.78" (kuruş noktayla) | "4,230" "5.700" (binlik) | "0.00" "1670.00" | "14700"
  const AMT = /(?<![\d.,])(?:\d{1,3}(?:[.,]\d{3})+\.\d{2}|\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d{1,3}(?:[.,]\d{3})+|\d+\.\d{2}|\d{2,7})(?![\d]|[.,]\d)/g;
  function amtVal(t) {
    if (/^\d{1,3}([.,]\d{3})+\.\d{2}$/.test(t)) return +t.replace(/[.,](?=\d{3})/g, '');   // 2,070.00 → 2070.00
    if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(t)) return +t.replace(/\./g, '').replace(',', '.');
    if (/^\d+,\d{2}$/.test(t)) return +t.replace(',', '.');
    if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return +t.replace(/[.,]/g, '');
    if (/^\d+\.\d{2}$/.test(t)) return +t;
    if (/^\d+$/.test(t)) return +t;
    return null;
  }
  // Tutar aranacak parçayı temizle: işaretler, para birimi, el yazısında ".00" yerine okunan harfler
  function amtClean(s) {
    return s.replace(/(\d)-(\d{2})(?!\d)/g, '$1,$2').replace(/(\d)([.,])(\d)[)\]}](?!\d)/g, '$1$2$30')
      .replace(/[|#*=≠₺€$«»"'“”]/g, ' ').replace(/(\d)\.(?:[CEOQ]{2}|[CEOQ]0|0[CEOQ])(?![A-Z0-9])/gi, '$1.00')
      .replace(/(\d)\s?[-–—]+(?=\s|$)/g, '$1 ').replace(/\bTL\b\.?/gi, ' ');
  }
  // Parçadaki tutarlar (sırayla). Uzun rakam dizileri (telefon, IBAN, makbuz no) ve baştaki sıfırlı numaralar tutar değildir.
  function amounts(s) {
    const out = [];
    for (const m of amtClean(s).matchAll(AMT)) {
      const t = m[0];
      if (/^0\d/.test(t) && !/[.,]/.test(t)) continue;      // 00005398, 004766
      if (/^\d+$/.test(t) && t.length > 6) continue;
      const v = amtVal(t); if (v != null) out.push(v);
    }
    return out;
  }

  // ---- Yazıyla tutar ("DortBinYediYuz TL", "ikiBinYirmiYedi TL Elli Kurus") ----
  const SAYI = { sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90 };
  const SOZ = /^(milyon|altmis|yetmis|seksen|doksan|turklirasi|yirmi|sekiz|dokuz|sifir|kurus|otuz|kirk|elli|alti|yedi|dort|lira|bin|yuz|bir|iki|bes|uc|on|tl|kr)/;
  function yaziyla(s) {
    let t = fold(s).toLowerCase().replace(/[^a-z]/g, ''); if (!t) return null;
    let total = 0, cur = 0, lira = null, kurus = null, any = false;
    while (t) {
      const m = t.match(SOZ); if (!m) return null;
      const w = m[1]; t = t.slice(w.length);
      if (w in SAYI) { cur += SAYI[w]; any = true; }
      else if (w === 'yuz') { if (cur >= 10) return null; cur = (cur || 1) * 100; any = true; }
      else if (w === 'bin') { total += (cur || 1) * 1000; cur = 0; any = true; }
      else if (w === 'milyon') { total += (cur || 1) * 1e6; cur = 0; any = true; }
      else if (w === 'kurus' || w === 'kr') { kurus = total + cur; total = cur = 0; }
      else { lira = total + cur; total = cur = 0; }       // tl / lira / türk lirası
    }
    if (!any) return null;
    if (lira == null) lira = total + cur; else if (kurus == null && total + cur > 0) kurus = total + cur;
    return r2(lira + (kurus || 0) / 100);
  }

  // ---- Tarih ----
  const gecerli = (g, a, y) => { const d = new Date(y, a - 1, g); return d.getDate() === g && d.getMonth() === a - 1 && y >= 2015 && d <= new Date(Date.now() + 864e5); };
  const trh = (g, a, y) => `${String(g).padStart(2, '0')}.${String(a).padStart(2, '0')}.${y}`;
  function tarihBul(lines, F) {
    lines = lines.map((l, i) => /TAR[I1]H/.test(F[i]) ? l.replace(/(?<=[:\s.]|^)[ZOolISB](?=\d[./-]|[./-]\d)|(?<=\d)[ZOolISB](?=[./-])/g, c => ({ Z: '2', O: '0', o: '0', l: '1', I: '1', S: '5', B: '8' }[c])) : l);
    const tam = /(?<![\d.])(\d{1,2})\s?[./-]\s?(\d{1,2})\s?[./-]\s?(20\d{2})(?!\d)/;
    let kesin = null;
    const sirali = lines.map((l, i) => i).sort((a, b) => (/TAR[I1]H/.test(F[b]) ? 1 : 0) - (/TAR[I1]H/.test(F[a]) ? 1 : 0));
    for (const i of sirali) { const m = lines[i].match(tam); if (m && gecerli(+m[1], +m[2], +m[3])) { kesin = trh(+m[1], +m[2], +m[3]); break; } }
    if (kesin) return { v: kesin, kesin: true };
    // El yazısı: "231.10./2026.." (eğik çizgi 1 okunmuş) gibi bozuk okumalar — yalnız TARİH satırında, her zaman işaretli
    for (let i = 0; i < lines.length; i++) {
      if (!/TAR[I1]H/.test(F[i])) continue;
      const s = lines[i].slice(F[i].search(/TAR[I1]H/));
      const m = s.match(/(\d{2})[1lI|\/]?\s?[./-]{1,2}\s?(\d{1,2})\s?[./-]{1,3}\s?\/?\s?(20\d{2})(?!\d)/);
      if (m && gecerli(+m[1], +m[2], +m[3])) return { v: trh(+m[1], +m[2], +m[3]), kesin: false };
    }
    return { v: null, kesin: false };
  }

  // ---- Firma ----
  const FIRMA_SOZ = /\b(GIDA|SUT|LOJISTIK|TICARET|PAZARLAMA|DAGITIM|TOPTAN|LTD|STI|A\.?S\.|SAN\.|TIC\.|PAZ\.|KAYNAK SULARI|ICECEK|UNLU MAMUL|TEMIZLIK|TEDARIK|MAMULLERI|URUNLERI)(?![A-Z])/;
  const GENEL_BAS = /^(TOPTAN|PAZ\.|SAN\.|VE |AMBALAJ|TARIM|IS MAKINALARI|DOGALGAZ|TIC\.)/;
  function firmaTemiz(s) {
    let t = TRU(s).replace(/Č/g, 'Ğ').replace(/\bGİDA\b/g, 'GIDA').replace(/\s+/g, ' ').trim();
    const f = fold(t);
    // başlık / etiket / numara artıkları
    const kes = [/TAHS[I1]LAT\s*MAKBUZU?/, /\bMAKBUZU?\b/, /\bS[I1]RA\b.*$/, /\bTEL\b.*$/, /\bTAR[I1]H\b.*$/, /\bMUSTER[I1]\b/, /\bNO\s?[:.].*$/];
    let lo = 0, hi = t.length;
    for (const re of kes) { const m = f.slice(lo, hi).match(re); if (!m) continue; const a = lo + m.index, b = a + m[0].length;
      if (/\$$/.test(re.source)) hi = a; else if (a - lo < hi - b) lo = b; else hi = a; }
    t = t.slice(lo, hi).replace(/^[\s\-–—:;,.]+|[\s\-–—:;,]+$/g, '').trim();
    return t;
  }
  // Hukuki ekleri at: "… GIDA PAZ. VE VET. HIZ. LTD. STI." → "… GIDA"
  function firmaKisalt(t) {
    const f = fold(t); const m = f.match(/\s(?:SAN\.?(?:AY[I1])?(?:\s|$|\.)|T[I1]C\.|T[I1]CARET\s(?:VE|L[I1]M|A\.?S)|PAZ\.|DAG\.|NAK\.|[I1]NS\.|MAD\.|MAM\.|MUH\.|LTD|L[I1]M[I1]TED|A\.S\.|VE\sT[I1]C)/);
    if (m && m.index >= 4) t = t.slice(0, m.index);
    return t.replace(/[\s\-–—:;,.]+$/g, '').trim();
  }
  function firmaBul(lines, F, pos) {
    if (pos) { for (const l of lines) { const t = firmaTemiz(l); if (t.length >= 4 && /[A-ZÇĞİÖŞÜ]{3}/.test(t)) return t; } return ''; }
    const musteri = i => /^(SAYIN|SN\s?[:.]|MUSTER[I1])/.test(F[i]) || (i > 0 && /MUSTER[I1]\b.*\b(ID|KOD)|^(SAYIN|SN)\s?[:.,]?\s*$/.test(F[i - 1]));
    for (let i = 0; i < lines.length; i++) { const m = F[i].match(/^UNVAN[I1]?\s?[:.]\s*(.{4,})$/); if (m && !musteri(i)) return firmaKisalt(lines[i].slice(lines[i].length - m[1].length).replace(/[-–]\s*$/, '').trim()); }
    for (let i = 0; i < lines.length; i++) {
      if (!FIRMA_SOZ.test(F[i]) || musteri(i)) continue;
      if (/BANKA|[I1]BAN|VERG[I1]\sDA[I1]RES[I1]|\bV\.?D\b\s?[:.]|\bMAH\b|\bCAD\b|\bSK\b|MERS[I1]S/.test(F[i]) && !/LTD|STI/.test(F[i])) continue;   // adres / banka satırı
      let t = firmaTemiz(lines[i]);
      // satır genel bir sözcükle başlıyorsa asıl ad bir üst satırdadır ("DORA DOGAL KAYNAK SULARI…" / "AMBALAJ NAK.INS…LTD.STI")
      if ((GENEL_BAS.test(fold(t)) || t.length < 4) && i > 0 && !musteri(i - 1)) {
        const ust = firmaTemiz(lines[i - 1]);
        if (ust.length >= 3 && /[A-ZÇĞİÖŞÜ]{3}/.test(ust) && !/^\d/.test(ust)) t = FIRMA_SOZ.test(F[i - 1]) ? ust : (ust + ' ' + t).trim();
      }
      t = firmaKisalt(t);
      // yalnız ekten ibaret ad ("PAZ", "LTD STI") firma değildir: logodaki ad okunamamış — boş bırak, kullanıcı yazar
      if (t.length >= 3 && fold(t).replace(/\b(PAZ|DAG|TIC|SAN|VE|LTD|STI|A\.?S|GIDA|TOPTAN|PAZARLAMA)\b|[^A-Z]/g, '').length >= 3) return t;
    }
    return '';
  }

  // ---- Evrak no ----
  function evrakBul(lines, F, pos) {
    const tok = (s, kisa) => { const m = String(s).trim().match(kisa ? /^[:.\s]*([A-Z0-9][A-Z0-9\-\/]*)/ : /^[:.\s]*([A-Z0-9][A-Z0-9\-\/]{2,})/); return m && (kisa ? /\d/ : /\d{3}/).test(m[1]) ? m[1] : null; };
    const diger = [];
    // 1) "Evrak No: T59-2026000804", "Makbuz No: 123"
    for (let i = 0; i < F.length; i++) { const m = F[i].match(/(?:EVRAK|MAKBUZ|BELGE|F[I1]S)\s?(?:NO|NUMARASI)\s?[:.]?\s*(.*)$/); if (m) { const t = tok(m[1], true); if (t) return { v: t, diger }; } }
    // 2) "MAKBUZ NO" sütunu: alt satırlardaki 6-10 haneli numaralar
    for (let i = 0; i < F.length; i++) if (/MAKBUZ\s?NO/.test(F[i])) {
      const ns = []; for (let j = i + 1; j < Math.min(F.length, i + 12); j++) { if (/TOPLAM|YALN[I1]Z/.test(F[j])) break; const m = F[j].match(/(?<!\d)(\d{6,10})(?!\d)(?:\s\d)?\s*$/); if (m) ns.push(m[1]); }
      if (ns.length) return { v: ns[0], diger: ns.slice(1) };
    }
    // 3) satır başında "No: F3528102026017"
    for (let i = 0; i < F.length; i++) { const m = F[i].match(/^(?:N[O0°º]|№)\s?[:.]\s*(.*)$/); if (m) { const t = tok(m[1]); if (t) return { v: t, diger }; } }
    // 4) "SIRA No 005185", "SIRA 004766", POS: "SIRA NO: IA000010"
    for (let i = 0; i < F.length; i++) { const m = F[i].match(/\bS[I1]RA\s?(?:N[O0°º2])?\s?[:.]?\s*([A-Z]{0,3}\d{3,})/); if (m) return { v: pos ? m[1] : m[1].replace(/^0+(?=\d)/, ''), diger }; }
    if (pos) return { v: null, diger };
    // 5) koçan seri numarası: "N 100953", "№ 000330" ya da tek başına / satır sonunda baştan sıfırlı 4-6 hane
    const seri = v => v.replace(/^1(?=0{2,})/, '0').replace(/^0+(?=\d)/, '');
    for (let i = 0; i < F.length; i++) { const m = F[i].match(/(?:^|\s)(?:N[O0°º2]?|№)\s(\d{4,6})$/); if (m) return { v: seri(m[1]), diger, zayif: true }; }
    for (let i = 0; i < F.length; i++) { const m = F[i].match(/(?:^|\s)(0\d{3,5})$/); if (m && !/TEL|GSM|FAX|IBAN/.test(F[i].slice(Math.max(0, F[i].length - m[1].length - 14)))) return { v: seri(m[1]), diger, zayif: true }; }
    return { v: null, diger };
  }

  // ---- Ana ayrıştırıcı ----
  const BAKIYE = /BAK[I1][YV]E|KALAN|BORC|ALACAK/;
  const K = {
    nakit: /\bNAK[I1]T\b/,
    kart: /\bPOS\b|KRED[I1]\s?KART[I1]?|\bK\.?\s?KART[I1]\b|\bV[I1]SA\b|\bKART\s?[I1]LE\b/,
    cek: /\bCEK\b/,
    diger: /\bHAVALE\b|\bEFT\b|\bSENET\b/,
    toplam: /TOPLAM\s?(?:TAHS[I1]LAT|TUTAR)?|\bYEKUN\b|TAHS[I1]L\s?ED[I1]LM[I1]ST[I1]R|\bTUTAR\b|L[I1]RAS[I1]\b/
  };
  function parse(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l && !/^—— \d+\. okuma ——$/.test(l));
    const F = lines.map(fold), all = F.join('\n');
    const d = { firma: '', tarih: '', evrak_no: '', toplam: null, cek: null, kart: null, nakit: null, diger: null, yazi: null };
    const unsure = [], notes = [], cnt = {};
    const pos = /ONAY\sKODU|KART\sHAM[I1]L[I1]|[I1]SYER[I1]\sNO|\bTERM\.?\s?NO/.test(all);
    const cekTablo = F.some(l => /BANKA/.test(l) && /(CEK\s?NO|HESAP\s?NO|[I1]BAN|NUMARASI)/.test(l) && /(VADE|V\.\s?TAR[I1]H|TAR[I1]H[I1])/.test(l)) || /TAHS[I1]L\s?SARTI\s?[I1]LE/.test(all);
    const el = !pos && (cekTablo || (/\bSAY[I1]N\b/.test(all) && /(YAZ[I1]YLA|TAHS[I1]L\s?EDEN|ODEYEN)/.test(all)));

    d.firma = firmaBul(lines, F, pos);
    const t = tarihBul(lines, F); d.tarih = t.v || '';
    const ev = evrakBul(lines, F, pos); d.evrak_no = ev.v || '';
    if (ev.diger.length) notes.push('Diğer makbuz no: ' + ev.diger.join(', '));

    // tutarlar
    const ekle = (k, v) => { d[k] = r2((d[k] || 0) + v); };
    const gor = v => { const c = Math.round(v * 100); cnt[c] = (cnt[c] || 0) + 1; };
    if (pos) {
      // POS slipi: "6.330,32 TL" — tutar satırı
      for (let i = 0; i < lines.length; i++) { if (!/\bTL\b/.test(F[i]) || BAKIYE.test(F[i])) continue; const a = amounts(lines[i]).filter(v => v > 0); if (a.length) { d.kart = d.toplam = a[0]; gor(a[0]); gor(a[0]); break; } }
    } else {
      const tablo = [], topAday = [];   // yalnız başlık olan ödeme satırları ("NAKİT ÇEK KREDİ KARTI TOPLAM") — tutarlar alt satırda
      for (let i = 0; i < lines.length; i++) {
        const f = F[i];
        if (BAKIYE.test(f) || /CEK\s?NO|CEK\s?VEYA|CEK\s?-?\s?SENET|HESAP\s?NO|TOPLAM\s?CAR[I1]/.test(f)) continue;   // bakiye satırları ve çek tablosu başlıkları
        const bulunan = [];
        for (const k of ['nakit', 'kart', 'cek', 'diger', 'toplam']) { const m = f.match(K[k]); if (m) bulunan.push({ k, at: m.index, son: m.index + m[0].length }); }
        if (!bulunan.length) continue;
        bulunan.sort((a, b) => a.at - b.at);
        let okunan = 0;
        for (let j = 0; j < bulunan.length; j++) {
          const b = bulunan[j], bitis = j + 1 < bulunan.length ? bulunan[j + 1].at : lines[i].length;
          const kes = F[i].slice(b.son, bitis).search(/\b(TEL|FAX|GSM|MERS[I1]S|VERG[I1]|V\.\s?D|MERKE[ZS]?|ADRES|[I1]BAN|NO\s?:)\b/);
          const a = amounts(lines[i].slice(b.son, kes >= 0 ? b.son + kes : bitis));   // tutar anahtar sözcükten sonra ("Nakit Tahsilat : 4.700,00", "|16650 TL.")
          if (!a.length) continue;
          okunan++;
          if (b.k === 'toplam') { topAday.push(a[0]); if (d.toplam == null || a[0] > 0) d.toplam = a[0]; } else ekle(b.k, a[0]);
          gor(a[0]);
        }
        if (!okunan && bulunan.length >= 2 && bulunan.some(b => b.k !== 'toplam')) tablo.push({ i, bulunan });
      }
      // başlık satırının altındaki tutarlar: sonuncusu TOPLAM (başlıkta varsa), öncekiler ödeme — hangi sütun olduğu metinden
      // anlaşılmaz; tek tutar varsa ya da hepsi aynıysa toplam kabul edilir (ödeme türü kontrol ekranında nakit varsayılır)
      { const p = (d.nakit || 0) + (d.kart || 0) + (d.cek || 0) + (d.diger || 0), fark = [...new Set(topAday.filter(v => v > 0))];
        if (fark.length > 1) { const es = fark.find(v => Math.abs(v - p) < 0.005); if (es != null) d.toplam = es; notes.push('Birden çok TOPLAM okundu: ' + fark.join(' / ')); } }
      for (const tb of tablo) {
        if (d.toplam != null || d.nakit != null || d.kart != null || d.cek != null) break;
        const alt = lines[tb.i + 1] || ''; if (BAKIYE.test(F[tb.i + 1] || '')) continue;
        const a = amounts(alt).filter(v => v > 0); if (!a.length) continue;
        a.forEach(gor);
        d.toplam = a[a.length - 1];
        if (a.length > 1 && !a.every(v => Math.abs(v - a[0]) < 0.005)) notes.push('Ödeme sütunları ayrılamadı: ' + a.join(' / '));
      }
    }
    for (const k of ['cek', 'kart', 'nakit', 'diger', 'toplam']) if (d[k] === 0) d[k] = null;

    // yazıyla tutar
    for (let i = 0; i < lines.length; i++) {
      const m = F[i].match(/YALN[I1]Z\s?[:.,]?\s*(.+)$/) || F[i].match(/YAZ[I1]YLA\s?[:.,]?\s*(.+)$/); if (!m) continue;
      const v = yaziyla(m[1].replace(/TAHS[I1]L\s?ED[I1]LM[I1]ST[I1]R.*$/, '').replace(/\.{2,}/g, ' '));
      if (v != null && v > 0) { d.yazi = v; notes.push('Yazıyla: ' + lines[i].slice(F[i].search(/YALN[I1]Z|YAZ[I1]YLA/)).replace(/^[^:.,\s]+\s?[:.,]?\s*/, '').trim()); break; }
    }

    if (d.yazi == null) for (let i = 0; i < lines.length; i++) {
      if (/\d/.test(lines[i]) || !/B[I1]N|YUZ/.test(F[i])) continue;
      const v = yaziyla(lines[i]); if (v != null && v >= 10) { d.yazi = v; notes.push('Yazıyla: ' + lines[i]); break; }
    }

    // ---- emin olunamayan alanlar ----
    const pay = (d.nakit || 0) + (d.kart || 0) + (d.cek || 0) + (d.diger || 0);
    const top = d.toplam != null ? d.toplam : (pay > 0 ? r2(pay) : null);
    if (!d.tarih || !t.kesin || el) unsure.push('tarih');
    if (!d.evrak_no || ev.zayif) unsure.push('evrak_no');
    if (top == null) unsure.push('toplam', 'nakit');   // tutar hiç okunamadı: toplam da ödeme de boş
    else if (d.toplam != null && pay > 0 && Math.abs(pay - d.toplam) > 0.005) unsure.push('toplam', ...['nakit', 'kart', 'cek'].filter(k => d[k] != null));
    else if (d.yazi != null && Math.abs(d.yazi - top) > 0.005) unsure.push('toplam');
    else if (el) {
      // el yazısı: tutar makbuzda en az iki yerde aynı okunmadıysa (ya da yazıyla tutarla doğrulanmadıysa) işaretle
      const kez = cnt[Math.round(top * 100)] || 0, yaziOk = d.yazi != null && Math.abs(d.yazi - top) < 0.005;
      if (kez < 2 && !yaziOk) unsure.push(d.toplam != null ? 'toplam' : (['nakit', 'kart', 'cek'].find(k => d[k] != null) || 'toplam'));
    }
    if (!d.firma) unsure.push('firma');
    const found = (d.firma ? 1 : 0) + (d.tarih ? 1 : 0) + (d.evrak_no ? 1 : 0) + (top != null ? 1 : 0);
    const makbuz = pos || /TAHS[I1]LAT|MAKBUZ|TAHS[I1]L\sED/.test(all);
    return { d, unsure: [...new Set(unsure)], notes, found, el, pos, makbuz, cnt, tarihKesin: t.kesin };
  }

  // Okuma ne kadar güvenilir: 6 ve üzeri "tam" (matbu makbuzda tek okuma yeter)
  function consistency(res) {
    const d = res.d; let s = 0;
    if (d.tarih && res.tarihKesin) s += 2;
    if (d.evrak_no) s += 1;
    if (d.firma) s += 1;
    const pay = (d.nakit || 0) + (d.kart || 0) + (d.cek || 0) + (d.diger || 0);
    const top = d.toplam != null ? d.toplam : (pay > 0 ? pay : null);
    if (top != null) { s += 2; if (d.toplam == null || pay === 0 || Math.abs(pay - d.toplam) < 0.006) s += 1; }
    if (d.yazi != null && top != null) s += Math.abs(d.yazi - top) < 0.006 ? 1 : -3;
    if (res.unsure.some(k => k !== 'firma')) s = Math.min(s, 5);
    return s;
  }

  // Birden çok okumayı alan alan birleştir: en çok tekrarlanan değer; okumalar çelişiyorsa ya da (el yazısında) değer tek
  // okumada görüldüyse alan işaretlenir.
  function merge(list) {
    const el = list.some(r => r.el), en = list.slice().sort((a, b) => consistency(b) - consistency(a))[0];
    const d = { ...en.d }, unsure = new Set(), notes = [...en.notes];
    const anahtar = (k, v) => v == null || v === '' ? null : typeof v === 'number' ? String(Math.round(v * 100)) : k === 'evrak_no' ? String(v).replace(/^0+(?=\d)/, '') : String(v);
    for (const k of ['tarih', 'evrak_no', 'toplam', 'nakit', 'kart', 'cek', 'diger', 'yazi']) {
      const say = new Map();
      for (const r of list) { const a = anahtar(k, r.d[k]); if (a == null) continue; const o = say.get(a) || { n: 0, v: r.d[k], isaretsiz: 0 }; o.n++; if (!r.unsure.includes(k)) o.isaretsiz++; say.set(a, o); }
      if (!say.size) { d[k] = typeof en.d[k] === 'string' ? '' : null; continue; }
      const sira = [...say.values()].sort((a, b) => b.n - a.n || b.isaretsiz - a.isaretsiz), ilk = sira[0];
      d[k] = ilk.v;
      const celiski = sira.length > 1;
      if (k === 'yazi' || k === 'diger') continue;
      // kesin: çelişki yok ve en az bir okuma kendi içinde emin (aynı el yazısını iki kez aynı okumak kanıt sayılmaz)
      const kesin = !celiski && ilk.isaretsiz >= 1 && !(el && k === 'tarih');
      if (!kesin) unsure.add(k);
      if (celiski) notes.push(`Okumalar farklı (${k}): ${sira.map(o => o.v).join(' / ')}`);
    }
    const pay = (d.nakit || 0) + (d.kart || 0) + (d.cek || 0) + (d.diger || 0), top = d.toplam != null ? d.toplam : (pay > 0 ? pay : null);
    for (const k of ['tarih', 'evrak_no']) if (!d[k]) unsure.add(k);
    if (top == null) { unsure.add('toplam'); unsure.add('nakit'); }
    else { if (d.nakit == null) unsure.delete('nakit'); if (d.toplam != null && pay > 0 && Math.abs(pay - d.toplam) > 0.005) unsure.add('toplam'); if (d.yazi != null && Math.abs(d.yazi - top) > 0.005) unsure.add('toplam'); }
    if (!d.firma) { const f = list.map(r => r.d.firma).find(Boolean); if (f) d.firma = f; else unsure.add('firma'); }
    // ödeme alanı işaretliyse ama toplam yoksa işaret ödeme alanında kalsın; toplam varsa tek işaret yeter
    const cnt = {}; for (const r of list) for (const [c, n] of Object.entries(r.cnt || {})) cnt[c] = Math.max(cnt[c] || 0, n);
    return { d, unsure: [...unsure], notes: [...new Set(notes)], found: Math.max(...list.map(r => r.found)), el, pos: en.pos, makbuz: list.some(r => r.makbuz), cnt, tarihKesin: !unsure.has('tarih') };
  }

  root.TParse = { version: 7, parse, consistency, merge, amounts, yaziyla, fold };
})(typeof window !== 'undefined' ? window : globalThis);
