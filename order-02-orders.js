/* ============================================================
 * BreadVenture — кабинет партнёра — Заказы
 * Оформление нового заказа и просмотр своих заказов.
 * Файл #2 из 5. Общий scope, порядок подключения важен (01 первым).
 * ============================================================ */

/* ---------- новый заказ ---------- */
function renderNew(){
  document.getElementById('hTitle').textContent=L('neworder');
  var c=document.getElementById('content');
  if(!catalog.length){c.innerHTML=navHtml('new')+'<div class="empty">Прайс пока не заполнен. Свяжитесь с пекарней.</div>';bindNav();document.getElementById('bar').style.display='none';return;}
  var h=navHtml('new');
  h+='<div class="note">'+(LANG==='sr'?'Izaberite stavke i količinu, navedite datum isporuke — dole će se prikazati ukupan iznos. Cene su sa PDV; popust po količini se računa automatski. Dostava po Beogradu 350 din. (besplatno od 7000 din. bez PDV), ispod 2500 din. — samo preuzimanje. Porudžbina najkasnije 48h pre isporuke, nedeljom se ne isporučuje.':'Выберите позиции и количество, укажите дату доставки — внизу появится итог. Цены с учётом PDV; скидка по объёму считается автоматически. Доставка по Белграду 350 дин. (бесплатно от 7000 дин. без PDV), менее 2500 дин. — только самовывоз. Заказ не позднее 48 ч до поставки, по воскресеньям отгрузки нет.')+'</div>';
  h+=announceBannerHtml();
  h+=holidayBannerHtml();
  if(pendingCount()){h+='<div class="holiday-banner" style="background:#E8F4FC;border-color:#9fcdeb;color:#1a5a85;cursor:pointer;" id="subRemind">🔁 '+(LANG==='sr'?('Imate isporuke koje čekaju potvrdu ('+pendingCount()+'). Otvorite „Redovno".'):('Есть регулярные поставки, ожидающие подтверждения ('+pendingCount()+'). Откройте «Регулярно».'))+'</div>';}
  catList().forEach(function(cat){
    h+='<div class="cat">'+esc(catName(cat))+'</div>';
    catalog.filter(function(it){return (it.cat||'Без категории')===cat;}).forEach(function(it){
      var q=Math.max(0,Number(qtyMap[it.id])||0),disc=discountFor(it,q),unit=it.retail*(1-disc/100),u=itemUnit(it);
      h+='<div class="row" data-id="'+it.id+'"><div class="info">'+
         '<div class="nm">'+esc(it.name)+(it.weight?'<span class="w">'+esc(it.weight)+'</span>':'')+'</div>'+
         '<div class="pr">'+(q>0?'<b>'+fmt(unit)+' '+cur()+'/'+esc(uName(u))+'</b>'+(disc>0?' (−'+fmt(disc)+'%)':'')+' · '+fmt(unit*q)+' '+cur():'<b>'+fmt(it.retail)+' '+cur()+'/'+esc(uName(u))+'</b>')+'</div>'+
         '<div class="hint tierhint" style="color:var(--blue-d);margin-top:3px;min-height:1px;">'+nextTierHint(it,q)+'</div>'+
         '</div><div class="qty"><button data-act="m">−</button>'+
         '<input type="number" min="0" step="1" value="'+q+'" class="qi"><button data-act="p">+</button></div></div>';
    });
  });
  h+='<div id="totalsWrap"></div>';
  h+='<div class="sec-title">'+L('deliv')+'</div><div class="form-card">'+
     '<div class="field"><label class="lbl">'+L('contact')+' <span class="req">*</span></label><input class="inp" id="fContact"></div>'+
     '<div class="field"><label class="lbl">'+L('phone')+' <span class="req">*</span></label><input class="inp" id="fPhone" placeholder="+381 …" inputmode="tel"></div>'+
     '<div class="field"><label class="lbl">'+(LANG==='sr'?'Kuda dostaviti':'Куда везти')+' <span class="req">*</span></label>'+
       (POINTS.length?
         '<select class="inp" id="fPoint"><option value="">'+(LANG==='sr'?'— izaberite tačku —':'— выберите точку —')+'</option>'+
           POINTS.map(function(pt){return '<option value="'+esc(pt.id)+'"'+(selPoint===pt.id?' selected':'')+'>'+esc(pt.name?pt.name+' — ':'')+esc(pt.address)+'</option>';}).join('')+
           '<option value="__new"'+(selPoint==='__new'?' selected':'')+'>'+(LANG==='sr'?'+ Druga adresa':'+ Другой адрес')+'</option></select>'+
           '<div id="fAddrWrap" style="display:none;margin-top:8px;"><input class="inp" id="fAddr" placeholder="'+(LANG==='sr'?'Ulica, broj, grad':'Улица, дом, город')+'"></div>'+
           '<div class="hint" style="margin-top:4px;">'+(LANG==='sr'?'Adrese se uređuju u kartici „Adrese".':'Адреса редактируются во вкладке «Адреса».')+'</div>'
       :
         '<input class="inp" id="fAddr" placeholder="'+(LANG==='sr'?'Ulica, broj, grad':'Улица, дом, город')+'">'+
           '<div class="hint" style="margin-top:4px;">'+(LANG==='sr'?'Možete sačuvati adrese tačaka u kartici „Adrese" i birati ih ovde.':'Можно сохранить адреса точек во вкладке «Адреса» и выбирать их здесь.')+'</div>'
       )+'</div>'+
     '<div style="display:flex;gap:12px;flex-wrap:wrap;">'+
       '<div class="field" style="flex:1;min-width:150px;"><label class="lbl">'+L('ddate')+' <span class="req">*</span></label><input class="inp" id="fDate" type="date"><div class="hint" id="dateHint"></div></div>'+
       '<div class="field" style="flex:1;min-width:120px;"><label class="lbl">'+L('dtime')+'</label><select class="inp" id="fTime">'+timeSlotOptions('')+'</select><div class="hint" style="margin-top:4px;">'+(LANG==='sr'?'8:00–16:00. Drugo vreme — upišite u komentar, potvrdićemo.':'8:00–16:00. Другое время — впишите в комментарий, мы согласуем.')+'</div></div>'+
     '</div>'+
     '<div class="field" style="margin-top:13px;"><label class="lbl">'+L('comment')+'</label><textarea class="inp" id="fComment"></textarea></div>'+
     '<div class="hint" style="margin-top:8px;">'+(LANG==='sr'?'Podaci se pamte iz prethodne porudžbine — proverite i po potrebi izmenite.':'Данные подставляются из прошлого заказа — проверьте и при необходимости измените.')+'</div>'+
     '</div>';
  h+=stagedPanelHtml();
  h+='<button class="btn btn-line" id="addDeliv" style="width:100%;margin-top:10px;">+ '+(LANG==='sr'?'Dodaj još jednu adresu':'Добавить ещё адрес')+'</button>';
  h+='<p class="hint" style="margin-top:6px;text-align:center;">'+(LANG==='sr'?'Možete poslati jednu porudžbinu na više adresa.':'Можно отправить один заказ на несколько адресов.')+'</p>';
  c.innerHTML=h;bindNav();bindRows();
  var _ad=document.getElementById('addDeliv');if(_ad)_ad.addEventListener('click',addDelivery);
  document.querySelectorAll('.del-deliv').forEach(function(b){b.addEventListener('click',function(){var i=Number(this.dataset.i);if(i>=0&&i<deliveries.length){deliveries.splice(i,1);renderNew();}});});
  var _sr=document.getElementById('subRemind');if(_sr)_sr.addEventListener('click',function(){setView('subs');});
  var na=nextAvailable();document.getElementById('fDate').min=ymd(na);
  document.getElementById('dateHint').textContent=L('earliest')+': '+fmtDate(na)+'. '+L('cutoff')+' '+L('sundayoff');
  var fp=document.getElementById('fPoint');
  if(fp){fp.addEventListener('change',function(){selPoint=this.value;
    var w=document.getElementById('fAddrWrap');if(w)w.style.display=(this.value==='__new')?'block':'none';
    if(this.value==='__new'){var fa=document.getElementById('fAddr');if(fa)fa.focus();}});
    if(selPoint){var w0=document.getElementById('fAddrWrap');if(w0)w0.style.display=(selPoint==='__new')?'block':'none';}
  }
  var sc='',sp='',sa='';try{sc=localStorage.getItem('bv_p_contact')||'';sp=localStorage.getItem('bv_p_phone')||'';sa=localStorage.getItem('bv_p_addr')||'';}catch(e){}
  if(sc)document.getElementById('fContact').value=sc;
  if(sp)document.getElementById('fPhone').value=sp;
  var faEl=document.getElementById('fAddr');if(faEl&&sa&&!POINTS.length)faEl.value=sa;
  renderTotals();
}
function bindRows(){
  document.querySelectorAll('.row').forEach(function(row){
    var id=row.dataset.id,inp=row.querySelector('.qi');
    row.querySelectorAll('.qty button').forEach(function(b){
      b.addEventListener('click',function(){var v=Math.max(0,Number(qtyMap[id])||0);v=this.dataset.act==='p'?v+1:Math.max(0,v-1);
        qtyMap[id]=v;inp.value=v;updateRow(row,id);renderTotals();});});
    inp.addEventListener('input',function(){qtyMap[id]=Math.max(0,Number(this.value)||0);updateRow(row,id);renderTotals();});
  });
}
function updateRow(row,id){var it=itemByIdLocal(id);if(!it)return;
  var q=Math.max(0,Number(qtyMap[id])||0),disc=discountFor(it,q),unit=it.retail*(1-disc/100),u=itemUnit(it);
  row.querySelector('.pr').innerHTML=q>0?'<b>'+fmt(unit)+' '+cur()+'/'+esc(uName(u))+'</b>'+(disc>0?' (−'+fmt(disc)+'%)':'')+' · '+fmt(unit*q)+' '+cur():'<b>'+fmt(it.retail)+' '+cur()+'/'+esc(uName(u))+'</b>';
  var th=row.querySelector('.tierhint');if(th)th.textContent=nextTierHint(it,q);}
function itemByIdLocal(id){var r=null;catalog.forEach(function(x){if(x.id===id)r=x;});return r;}
function renderTotals(){
  var c=compute(),w=document.getElementById('totalsWrap');if(!w)return;
  if(c.count>0){
    var rates=Object.keys(c.pdvByRate).map(Number).sort(function(a,b){return a-b;});
    var sr=(LANG==='sr');
    var picked=[];catalog.forEach(function(it){var qq=Math.max(0,Number(qtyMap[it.id])||0);if(qq>0){var dd=discountFor(it,qq),uu=it.retail*(1-dd/100);picked.push({it:it,q:qq,disc:dd,unit:uu,sum:uu*qq});}});
    var lst='<hr class="order-divider"><div class="sec-title" style="margin-top:16px;">'+(sr?'Vaša porudžbina':'Ваш заказ')+'</div><div class="order-summary">';
    picked.forEach(function(p,pi){
      lst+='<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;'+(pi<picked.length-1?'border-bottom:1px solid var(--line);':'')+'font-size:13.5px;">'+
        '<div><div style="font-weight:600;">'+esc(p.it.name)+(p.it.weight?' <span class="hint">('+esc(p.it.weight)+')</span>':'')+'</div>'+
        '<div class="hint">'+p.q+' '+uName(itemUnit(p.it))+' × '+fmt(p.unit)+' '+cur()+(p.disc>0?' · −'+fmt(p.disc)+'%':'')+'</div></div>'+
        '<div style="font-weight:700;white-space:nowrap;">'+fmt(p.sum)+' '+cur()+'</div></div>';
    });
    lst+='</div>';
    var t='<div class="totals">';
    t+='<div class="trow"><span>'+(sr?'Osnovna (sa PDV)':'Базовая (с PDV)')+'</span><span>'+fmt(c.base)+' '+cur()+'</span></div>';
    if(c.save>0)t+='<div class="trow"><span>'+(sr?'Popust po količini':'Скидка по объёму')+'</span><span>−'+fmt(c.save)+' '+cur()+'</span></div>';
    t+='<div class="trow"><span>'+(sr?'Iznos porudžbine (sa PDV)':'Стоимость заказа (с PDV)')+'</span><span>'+fmt(c.gross)+' '+cur()+'</span></div>';
    rates.forEach(function(rt){t+='<div class="trow"><span>'+(sr?'u tome PDV ':'в т.ч. PDV ')+rt+'%</span><span>'+fmt(c.pdvByRate[rt])+' '+cur()+'</span></div>';});
    t+='<div class="trow"><span>'+(sr?'bez PDV':'Без PDV')+'</span><span>'+fmt(c.net)+' '+cur()+'</span></div>';
    t+='<div class="trow"><span>'+(c.mode==='pickup'||c.mode==='need'?(sr?'Preuzimanje':'Самовывоз'):(sr?'Dostava':'Доставка'))+'</span><span>'+fmt(c.delivery)+' '+cur()+'</span></div>';
    t+='<div class="trow g"><span>'+(sr?'Ukupno za plaćanje':'Итого к оплате')+'</span><span>'+fmt(c.grand)+' '+cur()+'</span></div></div>';
    var d='';
    var sd=(LANG==='sr');
    if(c.mode==='pickup')d='<div class="deliv ok"><span>🏠</span><div>'+(sd?'Preuzimanje u pekari — dostava se ne naplaćuje.':'Самовывоз из пекарни — доставка не начисляется.')+'</div></div>';
    else if(c.mode==='need')d='<div class="deliv warn"><span>⚠</span><div>'+(sd?'Iznos bez PDV manji od 2500 din. — dostupno samo preuzimanje. Do plative dostave nedostaje '+fmt(MIN_DELIVERY-c.net)+' din.':'Сумма без PDV меньше 2500 дин. — доступен только самовывоз. До платной доставки не хватает '+fmt(MIN_DELIVERY-c.net)+' дин.')+'</div></div>';
    else if(c.mode==='free')d='<div class="deliv ok"><span>✓</span><div>'+(sd?'Besplatna dostava po Beogradu (iznos bez PDV od 7000 din.).':'Бесплатная доставка по Белграду (сумма без PDV от 7000 дин.).')+'</div></div>';
    else d='<div class="deliv pay"><span>🚲</span><div>'+(sd?'Dostava 350 din. Do besplatne nedostaje '+fmt(FREE_FROM-c.net)+' din. (bez PDV).':'Доставка 350 дин. До бесплатной не хватает '+fmt(FREE_FROM-c.net)+' дин. (без PDV).')+'</div></div>';
    w.innerHTML=lst+t+d;
  }else w.innerHTML='';
  var stagedTotal=0;deliveries.forEach(function(d){stagedTotal+=Number(d.total)||0;});
  var addrCount=deliveries.length+(c.count>0?1:0);
  var grandAll=(c.count>0?c.grand:0)+stagedTotal;
  document.getElementById('barSum').textContent=fmt(grandAll)+' '+cur();
  if(deliveries.length){
    var srB=(LANG==='sr');
    document.getElementById('barSub').textContent=(srB?(addrCount+' adr.'):(addrCount+' адр.'))+(c.count<1?(srB?' · dodajte stavke ili pošaljite':' · добавьте позиции или отправьте'):(srB?(' · '+c.count+' stavki za novu'):(' · '+c.count+' поз. на новый')));
  }else{
    document.getElementById('barSub').textContent=c.count>0?(function(){
      var sr=(LANG==='sr'),dm;
      if(c.mode==='pickup'||c.mode==='need')dm=(sr?'preuzimanje':'самовывоз');
      else if(c.mode==='free')dm=(sr?'besplatna dostava':'бесплатная доставка');
      else dm=(sr?'dostava ':'доставка ')+fmt(c.delivery)+' '+cur()+(c.net<FREE_FROM?(sr?' · do besplatne '+fmt(FREE_FROM-c.net)+' din.':' · до бесплатной '+fmt(FREE_FROM-c.net)+' дин.'):'');
      return c.count+' '+L('pos')+' · '+dm;
    })():L('pick');
  }
  var _sb=document.getElementById('sendBtn');
  if(_sb&&!_sb.disabled&&_sb.textContent.indexOf('…')<0)_sb.textContent=(addrCount>1?L('submit')+' ('+addrCount+')':L('submit'));
  document.getElementById('sendBtn').disabled=(c.count<1&&deliveries.length<1);
  document.getElementById('bar').style.display=(VIEW==='new')?'block':'none';
}

/* ---------- мои заказы ---------- */
function orderLastEventTs(o){
  var t=0;
  (o.comments||[]).forEach(function(c){if(!c.internal){var x=+new Date(c.ts);if(x>t)t=x;}});
  (o.docs||[]).forEach(function(d){var x=+new Date(d.ts);if(x>t)t=x;});
  return t;
}
function orderSeenTs(id){return +(localStorage.getItem('bv_seen_'+id)||0);}
function orderUnread(o){var t=orderLastEventTs(o);return t>0&&t>orderSeenTs(o.order_id)&&(Date.now()-t<30*86400000);}
function unreadOrders(){return (ORDERS||[]).filter(orderUnread);}
function markOrderSeen(id){try{localStorage.setItem('bv_seen_'+id,String(Date.now()));}catch(e){}}
function payDueInfo(o){
  if(!o||o.paid||!o.dueDate)return null;
  var today=new Date();today.setHours(0,0,0,0);
  var d=new Date(o.dueDate+'T00:00:00');if(isNaN(+d))return null;
  return {days:Math.round((d-today)/86400000),date:d};
}
function fmtDay(d){try{return d.toLocaleDateString(LANG==='sr'?'sr-RS':'ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return '';}}
function ordersBannersHtml(){
  var h='';
  var unread=unreadOrders();
  if(unread.length){
    h+='<div class="ban ban-info">📣 '+(LANG==='sr'
      ?('Po '+unread.length+' '+(unread.length===1?'porudžbini':'porudžbina')+' ima nove poruke ili dokumente od pekare — otvorite porudžbinu da biste se upoznali.')
      :('По '+unread.length+' '+(unread.length===1?'заказу':'заказам')+' есть новые сообщения или документы от пекарни — раскройте заказ, чтобы ознакомиться.'))+'</div>';
  }
  var over=[],soon=[];
  (ORDERS||[]).forEach(function(o){var di=payDueInfo(o);if(!di)return;if(di.days<0)over.push({o:o,di:di});else if(di.days<=3)soon.push({o:o,di:di});});
  soon.forEach(function(x){
    var dd=fmtDay(x.di.date),n=x.di.days;
    var when=LANG==='sr'?(n===0?'danas':(n===1?'sutra':('za '+n+' dana'))):(n===0?'сегодня':(n===1?'завтра':('через '+n+' дн.')));
    h+='<div class="ban ban-warn">⏰ '+(LANG==='sr'
      ?('Podsećamo: rok plaćanja porudžbine <b>'+esc(x.o.order_id)+'</b> je '+dd+' ('+when+').')
      :('Напоминаем: срок оплаты заказа <b>'+esc(x.o.order_id)+'</b> — '+dd+' ('+when+').'))+'</div>';
  });
  over.forEach(function(x){
    var dd=fmtDay(x.di.date),late=Math.abs(x.di.days);
    var hard=late>7;
    h+='<div class="ban ban-over">⚠️ '+(LANG==='sr'
      ?('Plaćanje porudžbine <b>'+esc(x.o.order_id)+'</b> je kasnilo (rok je bio '+dd+'). '+(hard?'Molimo vas da se javite menadžeru radi provere.':'Molimo vas da izmirite račun. Ako ste već platili ili imate pitanja — javite se menadžeru.'))
      :('Оплата заказа <b>'+esc(x.o.order_id)+'</b> просрочена (срок был '+dd+'). '+(hard?'Пожалуйста, свяжитесь с менеджером для уточнения.':'Просьба оплатить счёт. Если уже оплатили или есть вопросы — свяжитесь с менеджером.')))+'</div>';
  });
  return h;
}
function buildMyStats(){
  var today=new Date();today.setHours(0,0,0,0);
  var os=ORDERS.filter(function(o){return (o.status||'')!=='cancelled';});
  if(!os.length)return {count:0};
  var dates=os.map(function(o){return new Date(o.created||o.date);}).filter(function(d){return !isNaN(d.getTime());}).sort(function(a,b){return a-b;});
  var first=dates[0],last=dates[dates.length-1];
  var totalSum=0,maxCheck=0,onTime=0,late=0,payDays=[],unpaid=0,overdue=0,debtSum=0,paidCount=0;
  os.forEach(function(o){
    var s=Number(o.total)||0;totalSum+=s;if(s>maxCheck)maxCheck=s;
    if(o.paid){paidCount++;
      if(o.paidAt&&o.created){var c=new Date(o.created),pa=new Date(o.paidAt);var dd=(pa-c)/86400000;if(dd>=0&&dd<400)payDays.push(dd);}
      if(o.paidAt&&o.dueDate){var pad=new Date(o.paidAt);pad.setHours(0,0,0,0);var due=new Date(o.dueDate+'T00:00:00');if(pad<=due)onTime++;else late++;}
    }else{unpaid++;debtSum+=s;if(o.dueDate){var d2=new Date(o.dueDate+'T00:00:00');if(d2<today)overdue++;}}
  });
  var avgCheck=Math.round(totalSum/os.length);
  var span=(last-first)/86400000;
  var freqDays=os.length>1?Math.round(span/(os.length-1)):null;
  var avgPay=payDays.length?Math.round(payDays.reduce(function(a,b){return a+b;},0)/payDays.length):null;
  var dL=new Date(last.getFullYear(),last.getMonth(),last.getDate());
  var daysSinceLast=Math.round((today-dL)/86400000);
  return {count:os.length,totalSum:totalSum,avgCheck:avgCheck,maxCheck:maxCheck,paidCount:paidCount,
    onTime:onTime,late:late,avgPay:avgPay,unpaid:unpaid,overdue:overdue,debtSum:debtSum,
    first:first,last:last,daysSinceLast:daysSinceLast,freqDays:freqDays};
}
function msCard(title,body,accent){
  return '<div class="form-card" style="margin-bottom:14px;border-left:4px solid '+(accent||'#47A2DA')+';">'+
    '<div style="font-weight:700;font-size:15px;margin-bottom:8px;">'+title+'</div>'+body+'</div>';
}
function msBar(frac,color){
  var w=Math.max(2,Math.min(100,Math.round(frac*100)));
  return '<div style="background:#eee;border-radius:8px;height:12px;overflow:hidden;margin:8px 0;"><div style="width:'+w+'%;height:100%;background:'+(color||'#47A2DA')+';"></div></div>';
}
function renderMyStats(){
  var T=function(ru,sr){return LANG==='sr'?sr:ru;};
  document.getElementById('hTitle').textContent=T('Моя статистика','Moja statistika');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h=navHtml('mystats');
  var s=buildMyStats();
  if(!s.count){h+='<div class="empty">'+T('Здесь появится ваша статистика после первых заказов.','Ovde će se prikazati statistika nakon prvih porudžbina.')+'</div>';c.innerHTML=h;bindNav();return;}
  var cur=(LANG==='sr'?'din.':'дин.');

  // 1) Платёжная репутация
  var payAccent='#3a8a3a',payBody='';
  if(s.overdue>0){
    payAccent='#d9534f';
    payBody='<div style="color:#c0392b;font-weight:600;margin-bottom:6px;">'+T('У вас есть просроченный счёт','Imate dospeli neplaćeni račun')+' ('+s.overdue+').</div>'+
      '<div>'+T('Оплатите как можно скорее — своевременная оплата открывает лучшие условия и приоритет в производстве.','Platite što pre — blagovremeno plaćanje donosi bolje uslove i prioritet u proizvodnji.')+'</div>';
  } else if(s.unpaid>0){
    payAccent='#e0a800';
    payBody='<div style="margin-bottom:6px;">'+T('Неоплаченных счетов: ','Neplaćenih računa: ')+'<b>'+s.unpaid+'</b>'+(s.debtSum?(' · '+fmt(s.debtSum)+' '+cur):'')+'.</div>'+
      '<div>'+T('Оплатите в срок — и сохраните репутацию надёжного партнёра.','Platite na vreme — i sačuvaćete reputaciju pouzdanog partnera.')+'</div>';
  } else if(s.paidCount>0){
    payBody='<div style="font-size:22px;margin-bottom:4px;">⭐ '+T('Надёжный плательщик','Pouzdan platilac')+'</div>'+
      '<div>'+T('Все счета оплачены','Svi računi su plaćeni')+(s.avgPay!=null?(', '+T('в среднем за ','u proseku za ')+s.avgPay+T(' дн.',' dana')):'')+'. '+T('Так держать — спасибо за дисциплину!','Samo tako nastavite — hvala na disciplini!')+'</div>';
  } else {
    payBody='<div>'+T('Оплачивайте счета в срок — это формирует вашу платёжную репутацию.','Plaćajte račune na vreme — to gradi vašu platnu reputaciju.')+'</div>';
  }
  if(s.onTime+s.late>0)payBody+='<div class="hint" style="margin-top:6px;">'+T('Вовремя оплачено: ','Na vreme plaćeno: ')+s.onTime+T(' из ',' od ')+(s.onTime+s.late)+'.</div>';
  h+=msCard('💳 '+T('Платёжная репутация','Platna reputacija'),payBody,payAccent);

  // 2) Средний заказ и бесплатная доставка
  var frac=s.avgCheck/FREE_FROM;
  var dBody='<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:4px;">'+
    '<div><div class="hint">'+T('Средний заказ','Prosečna porudžbina')+'</div><div style="font-size:20px;font-weight:700;">'+fmt(s.avgCheck)+' '+cur+'</div></div>'+
    '<div><div class="hint">'+T('Самый крупный','Najveća')+'</div><div style="font-size:20px;font-weight:700;">'+fmt(s.maxCheck)+' '+cur+'</div></div>'+
    '</div>'+msBar(frac, frac>=1?'#3a8a3a':'#47A2DA');
  if(s.avgCheck>=FREE_FROM){
    dBody+='<div style="color:#2c7a2c;font-weight:600;">🎉 '+T('Ваши заказы обычно проходят порог бесплатной доставки!','Vaše porudžbine obično prelaze prag besplatne dostave!')+'</div>';
  } else {
    var need=FREE_FROM-s.avgCheck;
    dBody+='<div>'+T('До бесплатной доставки в среднем не хватает ','Do besplatne dostave u proseku nedostaje ')+'<b>'+fmt(need)+' '+cur+'</b>. '+
      T('Добавьте пару позиций к заказу — и доставка будет бесплатной (от ','Dodajte par stavki — i dostava će biti besplatna (od ')+fmt(FREE_FROM)+T(' дин. без PDV).',' din. bez PDV-a).')+'</div>';
  }
  h+=msCard('🚚 '+T('Средний заказ и доставка','Prosečna porudžbina i dostava'),dBody,'#47A2DA');

  // 3) Ритм заказов
  var rBody='<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:6px;">'+
    '<div><div class="hint">'+T('Всего заказов','Ukupno porudžbina')+'</div><div style="font-size:20px;font-weight:700;">'+s.count+'</div></div>'+
    (s.freqDays!=null?'<div><div class="hint">'+T('Ваш ритм','Vaš ritam')+'</div><div style="font-size:20px;font-weight:700;">'+T('раз в ','na ')+s.freqDays+T(' дн.',' dana')+'</div></div>':'')+
    '<div><div class="hint">'+T('С последнего заказа','Od poslednje')+'</div><div style="font-size:20px;font-weight:700;">'+s.daysSinceLast+T(' дн.',' dana')+'</div></div>'+
    '</div>';
  var slow=s.freqDays!=null?(s.daysSinceLast>s.freqDays*1.3+1):(s.daysSinceLast>12);
  if(slow){
    rBody+='<div style="color:#b8860b;">'+T('Вы давно не заказывали — пополните запасы, чтобы у гостей всегда была свежая выпечка. ','Odavno niste poručivali — dopunite zalihe, da gosti uvek imaju svež pekarski program. ')+'</div>'+
      '<button class="btn-primary" id="msOrderNow" style="margin-top:8px;">'+T('Сделать заказ','Napravi porudžbinu')+'</button>';
  } else {
    rBody+='<div style="color:#2c7a2c;">'+T('Отличный ритм! Регулярные заказы — это всегда свежий ассортимент для ваших гостей.','Odličan ritam! Redovne porudžbine znače uvek svež asortiman za vaše goste.')+'</div>';
  }
  h+=msCard('📅 '+T('Ритм заказов','Ritam porudžbina'),rBody,'#c79a4b');

  c.innerHTML=h;bindNav();
  var ob=document.getElementById('msOrderNow');if(ob)ob.addEventListener('click',function(){setView('new');});
}
function renderOrders(){
  document.getElementById('hTitle').textContent=L('myorders');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h=navHtml('orders');
  h+=ordersBannersHtml();
  if(!ORDERS.length){h+='<div class="empty">'+L('noOrders')+'</div>';c.innerHTML=h;bindNav();return;}
  ORDERS.forEach(function(o){
    var st=o.status||'submitted';
    var items=(o.items||[]).map(function(it){return '• '+it.name+(it.weight?' ('+it.weight+')':'')+' — '+it.qty+' '+uName(it.uom||'шт');}).join('\n');
    var dt='';try{dt=new Date(o.created).toLocaleDateString('ru-RU');}catch(e){}
    var open=openOrder===o.order_id;
    h+='<div class="ocard"><div class="top"><span class="onum">'+esc(o.order_id||'')+'</span>'+
       (orderUnread(o)?'<span class="unread-tag">'+(LANG==='sr'?'novo':'новое')+'</span>':'')+
       '<span class="st st-'+st+'">'+esc(stName(st))+'</span>'+
       (o.paid?'<span class="paychip paid">'+(LANG==='sr'?'Plaćeno':'Оплачено')+' ✓</span>':(o.dueDate?'<span class="paychip due">'+(LANG==='sr'?'Rok':'Срок')+': '+esc(fmtDay(new Date(o.dueDate+'T00:00:00')))+'</span>':''))+
       '<span class="odate" style="margin-left:auto;">'+esc(dt)+'</span></div>'+
       (o.date?'<div class="odate" style="margin-top:6px;">'+L('ddate')+': '+esc(o.date)+(o.time?', '+esc(o.time):'')+'</div>':'')+
       (o.address?'<div class="hint" style="margin-top:2px;">'+L('address')+': '+esc(o.address)+'</div>':'')+
       '<div class="oitems">'+esc(items)+'</div>';
    if(open){
      h+='<div style="border-top:1px solid var(--line);margin-top:11px;padding-top:11px;">';
      var _due=o.dueDate?fmtDay(new Date(o.dueDate+'T00:00:00')):'';
      h+='<div style="font-size:13px;margin-bottom:9px;">'+(LANG==='sr'?'Plaćanje':'Оплата')+': '+(o.paid?'<b style="color:#2c7a4b;">'+(LANG==='sr'?'plaćeno':'оплачено')+'</b>':('<b style="color:#c05129;">'+(LANG==='sr'?'nije plaćeno':'не оплачено')+'</b>'+(_due?' · '+(LANG==='sr'?'rok':'срок')+' '+_due:'')))+'</div>';
      h+='<div class="lbl">'+L('statusHist')+'</div>';
      (o.events||[]).forEach(function(ev){var et='';try{et=new Date(ev.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){}
        h+='<div style="font-size:13px;color:#55544c;padding:2px 0;">'+esc(stName(ev.status))+' <span class="hint">· '+esc(et)+'</span></div>';});
      var ext=(o.comments||[]).filter(function(x){return !x.internal;});
      if(ext.length){h+='<div class="lbl" style="margin-top:10px;">'+L('bakeryComments')+'</div>';
        ext.forEach(function(cm){h+='<div style="font-size:13px;color:#55544c;padding:3px 0;">💬 '+esc(cm.text)+'</div>';});}
      if((o.docs||[]).length){h+='<div class="lbl" style="margin-top:10px;">'+(LANG==='sr'?'Dokumenti':'Документы')+'</div>';
        o.docs.forEach(function(dc){var dn=ORD_DOC_SR(dc.type);
          h+='<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;"><span style="flex:1;">'+esc(dn)+(dc.title?' · '+esc(dc.title):'')+(dc.name?' · <span style="color:var(--muted);">'+esc(dc.name)+'</span>':'')+'</span>'+
             (dc.url?'<a href="'+esc(dc.url)+'" rel="noopener" style="color:var(--blue-d);font-weight:600;white-space:nowrap;">⬇ '+(LANG==='sr'?'Preuzmi':'Скачать')+'</a>':'')+'</div>';});}
      h+='</div>';
    }
    h+='<div class="obottom"><span class="ototal">'+(o.total!==''&&o.total!=null?fmt(o.total)+' '+cur():'')+'</span>'+
       '<button class="btn btn-line det" data-id="'+esc(o.order_id)+'" style="padding:9px 14px;font-size:13px;">'+(open?L('collapse'):L('details'))+'</button>'+
       '<button class="btn btn-line repeat" data-id="'+esc(o.order_id)+'" style="padding:9px 16px;font-size:13.5px;">'+L('repeat')+'</button></div>'+
       (o.comment?'<div class="hint" style="margin-top:8px;">'+L('yourComment')+': '+esc(o.comment)+'</div>':'')+'</div>';
  });
  c.innerHTML=h;bindNav();
  c.querySelectorAll('.repeat').forEach(function(b){b.addEventListener('click',function(){repeatOrder(this.dataset.id);});});
  c.querySelectorAll('.det').forEach(function(b){b.addEventListener('click',function(){var id=this.dataset.id;var opening=(openOrder!==id);openOrder=(opening?id:'');if(opening)markOrderSeen(id);renderOrders();});});
}
function renderTerms(){
  document.getElementById('hTitle').textContent=L('info');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h=navHtml('info');
  // условия сотрудничества
  h+='<div class="sec-title">'+L('terms')+'</div>';
  if(TERMS.length){
    h+='<div class="form-card">';
    TERMS.forEach(function(t,i){
      var title=LANG==='sr'?(t.titleSr||t.titleRu||''):(t.titleRu||'');
      var body=LANG==='sr'?(t.bodySr||t.bodyRu||''):(t.bodyRu||'');
      h+='<div style="'+(i?'border-top:1px solid var(--line);margin-top:14px;padding-top:14px;':'')+'">'+
         '<div style="font-weight:700;color:var(--blue-d);font-size:14px;margin-bottom:6px;">'+esc(title)+'</div>'+
         '<div style="font-size:13.5px;color:#55544c;white-space:pre-line;">'+esc(body)+'</div></div>';
    });
    h+='</div>';
  }else h+='<div class="empty">—</div>';
  // контакты
  h+='<div class="sec-title">'+L('contacts')+'</div><div class="form-card">';
  var note=LANG==='sr'?(FOOT.noteSr||FOOT.noteRu||''):(FOOT.noteRu||'');
  var owner=LANG==='sr'?(FOOT.ownerSr||FOOT.ownerRu||''):(FOOT.ownerRu||'');
  if(note)h+='<div style="font-size:13.5px;color:#55544c;margin-bottom:10px;">'+esc(note)+'</div>';
  h+='<div style="font-size:14px;line-height:1.9;">'+
     '<b>'+esc(FOOT.brand||'BreadVenture')+'</b><br>'+
     (FOOT.email?'✉ <a href="mailto:'+esc(FOOT.email)+'" style="color:var(--blue-d);">'+esc(FOOT.email)+'</a><br>':'')+
     (FOOT.phone?'☎ <a href="tel:'+esc(FOOT.phone.replace(/\s/g,''))+'" style="color:var(--blue-d);">'+esc(FOOT.phone)+'</a><br>':'')+
     (owner?'<span class="hint">'+esc(owner)+'</span>':'')+'</div></div>';
  c.innerHTML=h;bindNav();
}
function renderPriceList(){
  document.getElementById('hTitle').textContent=L('pricetab');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h=navHtml('price');
  h+='<div class="sec-title">'+L('price')+'</div>';
  if(catalog.length){
    var pg={},po=[];
    catalog.forEach(function(it){var cc=it.cat||'';if(!pg[cc]){pg[cc]=[];po.push(cc);}pg[cc].push(it);});
    po.forEach(function(cc){
      if(cc)h+='<div class="cat">'+esc(catName(cc))+'</div>';
      pg[cc].forEach(function(it){
        var u=uName(itemUnit(it)),pdv=(it.pdv!=null&&it.pdv!=='')?Number(it.pdv):10;
        var sost=LANG==='sr'?(it.sostavSr||it.sostav||''):(it.sostav||'');
        var desc=LANG==='sr'?(it.descSr||it.desc||''):(it.desc||'');
        var tiers=(it.tiers||[]).slice().sort(function(a,b){return a.min-b.min;});
        h+='<div class="pcard">'+
           '<div class="ph">'+((it.photo||it.photoId)?'<img src="'+esc(it.photo||driveThumb(it.photoId))+'" alt="" loading="lazy">':'🥖')+'</div>'+
           '<div class="pbody">'+
           '<div class="ptitle">'+esc(it.name)+(it.weight?'<span class="w">'+esc(it.weight)+'</span>':'')+'</div>'+
           (it.photoId?'<a class="hint" href="'+driveDl(it.photoId)+'" rel="noopener" style="color:var(--blue-d);display:inline-block;margin:1px 0 5px;text-decoration:none;">⬇ '+(LANG==='sr'?'Preuzmi sliku':'Скачать фото')+'</a>':'')+
           (sost?'<div class="psost">'+(LANG==='sr'?'Sastav: ':'Состав: ')+esc(sost)+'</div>':'')+
           '<div class="pret">'+(LANG==='sr'?'Maloprodaja: ':'Розница: ')+fmt(it.retail)+' '+cur()+' · PDV '+pdv+'%</div>';
        if(tiers.length){
          var head='<tr><th>'+(LANG==='sr'?'Od, '+u:'От, '+u)+'</th>',
              rC='<tr><td>'+(LANG==='sr'?'Cena/'+u:'Цена/'+u)+'</td>',
              rN='<tr><td>'+(LANG==='sr'?'bez PDV':'без PDV')+'</td>',
              rD='<tr><td>'+(LANG==='sr'?'Popust':'Скидка')+'</td>';
          tiers.forEach(function(t){var d=Number(t.disc)||0,pw=it.retail*(1-d/100),pn=pw/(1+pdv/100);
            head+='<th>'+t.min+'+</th>';rC+='<td>'+fmt(pw)+'</td>';rN+='<td>'+fmt(pn)+'</td>';rD+='<td>'+fmt(d)+'%</td>';});
          h+='<table class="ptiers">'+head+'</tr>'+rC+'</tr>'+rN+'</tr>'+rD+'</tr></table>';
        }
        h+=(desc?'<div class="pdesc">'+esc(desc)+'</div>':'')+'</div></div>';
      });
    });
  }else h+='<div class="empty">'+(LANG==='sr'?'Cenovnik još nije popunjen.':'Прайс пока не заполнен.')+'</div>';
  c.innerHTML=h;bindNav();
}
function renderDocs(){
  document.getElementById('hTitle').textContent=L('docs');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h=navHtml('docs');
  if(!DOCS.length){h+='<div class="empty">'+L('noDocs')+'</div>';c.innerHTML=h;bindNav();return;}
  var groups={};DOCS.forEach(function(d){var t=d.type||'other';(groups[t]=groups[t]||[]).push(d);});
  Object.keys(groups).forEach(function(t){
    h+='<div class="cat">'+esc(docType(t))+'</div>';
    groups[t].forEach(function(d){var dt='';try{dt=new Date(d.created).toLocaleDateString('ru-RU');}catch(e){}
      h+='<div class="ocard" style="margin-bottom:9px;"><div class="top"><span style="font-weight:600;">'+esc(d.title||docType(t))+'</span>'+
         (d.version?'<span class="hint">v'+esc(d.version)+'</span>':'')+'<span class="hint" style="margin-left:auto;">'+esc(dt)+'</span></div>'+
         (d.url?'<div style="margin-top:10px;"><a class="btn" href="'+esc(d.url)+'" rel="noopener" style="display:inline-block;padding:9px 18px;font-size:13.5px;text-decoration:none;">⬇ '+(LANG==='sr'?'Preuzmi':'Скачать')+(d.name?' · '+esc(d.name):'')+'</a></div>':'<div class="hint" style="margin-top:6px;">'+(LANG==='sr'?'Datoteka nije priložena':'Файл не приложен')+'</div>')+'</div>';
    });
  });
  c.innerHTML=h;bindNav();
}
function repeatOrder(orderId){
  var o=null;ORDERS.forEach(function(x){if(x.order_id===orderId)o=x;});if(!o)return;
  qtyMap={};deliveries=[];var missing=0;
  (o.items||[]).forEach(function(it){var found=itemByNameWeight(it.name,it.weight);if(found)qtyMap[found.id]=Math.max(0,Number(it.qty)||0);else missing++;});
  setView('new');
  if(missing)alert('Часть позиций из того заказа сейчас недоступна и не добавлена ('+missing+'). Остальное перенесено в новый заказ.');
}

