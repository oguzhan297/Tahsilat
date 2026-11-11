// Kontroller: tarih, evrak no, ödeme kalemleri = toplam, rakam = yazıyla tutar, çift kayıt
// Her satır: {ok:true} tuttu · {ok:false} uyarı (kart "Kontrol et" olur) · {ok:true,info:true} bilgi notu
function checks(r){
  const d=r.d,out=[];
  if(d.makbuz_mu===false)out.push({ok:false,m:'Bu görüntü tahsilat makbuzuna benzemiyor; değerleri dikkatle kontrol et.'});
  if(!d.tarih)out.push({ok:false,m:r.el?'Tarih okunamadı (el yazısı) — fotoğraftan bakıp yaz. Yalnız gün.ay yazman yeter.':'Tarih boş'});
  else if(!dateOk(d.tarih))out.push({ok:false,m:`Tarih geçersiz, ileri tarihli ya da GG.AA.YYYY biçiminde değil: “${d.tarih}”`});
  if(!d.evrak_no)out.push({ok:false,m:'Evrak No boş'});
  else if(rows.some(x=>x!==r&&x.status==='done'&&x.d.evrak_no&&nno(x.d.evrak_no)===nno(d.evrak_no)&&nkey(x.d.firma)===nkey(d.firma)&&x.d.tarih===d.tarih&&Math.round((x.d.toplam||0)*100)===Math.round((d.toplam||0)*100)))out.push({ok:false,m:'Aynı firma, tarih, evrak no ve tutarla listede başka bir makbuz var — iki kez eklenmiş olabilir'});
  if(!d.toplam)out.push({ok:false,m:r.el?'Tutar okunamadı (el yazısı) — fotoğraftan bakıp yaz.':'Toplam tutar yok'});
  else{
    const s=r2(paySum(d)+(d.diger||0)),df=Math.abs(s-d.toplam);
    out.push(df<0.006?{ok:true,m:'Çek + Kredi kartı + Nakit = Toplam ✓'}:{ok:false,m:`Ödeme kalemlerinin toplamı (${fm(s)}) makbuz toplamıyla (${fm(d.toplam)}) tutmuyor, fark ${fm(df)}`});
    if(d.yazi!=null){const dy=Math.abs(d.yazi-d.toplam);out.push(dy<0.006?{ok:true,m:'Rakamla tutar = yazıyla tutar ✓'}:{ok:false,m:`Rakamla tutar (${fm(d.toplam)}) yazıyla tutarla (${fm(d.yazi)}) tutmuyor — fotoğraftan kontrol et`})}
  }
  if(d.diger)out.push({ok:false,m:`Havale / senet / diğer: ${fm(d.diger)} — şablonda bu ödeme türünün sütunu yok. Hangi sütuna yazılacaksa oraya taşı ve bu alanı boşalt.`});
  if((r.auto||[]).includes('nakit'))out.push({ok:true,info:true,m:'Makbuzda ödeme türü yazmıyor (ya da okunamadı); nakit varsayıldı. Kart veya çekse tutarı o alana taşı.'});
  if(r.el&&!r.onay)out.push({ok:true,info:true,m:'Elle doldurulmuş makbuz: el yazısı her zaman doğru okunamaz. Turuncu alanları fotoğrafla karşılaştır.'});
  return out;
}
const isBad=r=>checks(r).some(c=>!c.ok)||(r.unsure&&r.unsure.length>0);
const dnum=s=>{const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);return m?Math.round(Date.UTC(+m[3],+m[2]-1,+m[1])/864e5):null};
// Z raporu uygulamasından kalan çağrılar (Z no sırası): bu uygulamada iş yapmaz
function autoZ(){}
function guessZ(){}
