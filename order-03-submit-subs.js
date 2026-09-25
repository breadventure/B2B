/* ============================================================
 * BreadVenture — кабинет партнёра — Отправка и регулярные поставки
 * Отправка заказа в облако; настройка регулярных поставок.
 * Файл #3 из 5. Общий scope, порядок подключения важен (01 первым).
 * ============================================================ */

/* ---------- отправка заказа ---------- */
function pointById(id){for(var i=0;i<POINTS.length;i++)if(POINTS[i].id===id)return POINTS[i];return null;}
function currentItems(){var items=[];catalog.forEach(function(it){var q=Math.max(0,Number(qtyMap[it.id])||0);if(!q)return;
    var disc=discountFor(it,q),unit=it.retail*(1-disc/100);
    items.push({name:it.name,weight:it.weight,qty:q,uom:itemUnit(it),sum:Math.round(unit*q*100)/100});});return items;}
function getDeliveryFields(){
  var contact=document.getElementById('fContact').value.trim();
  var phone=document.getElementById('fPhone').value.trim();
  if(!contact||!phone){alert(LANG==='sr'?'Popunite kontakt osobu i telefon.':'Заполните контактное лицо и телефон.');return null;}
  var pt=(selPoint&&selPoint!=='__new')?pointById(selPoint):null;
  var faEl=document.getElementById('fAddr');
  var addr=pt?((pt.name?pt.name+', ':'')+pt.address):(faEl?faEl.value.trim():'');
  try{localStorage.setItem('bv_p_contact',contact);localStorage.setItem('bv_p_phone',phone);localStorage.setItem('bv_p_addr',addr);}catch(e){}
  var c=compute();
  if(c.mode!=='need'&&c.mode!=='pickup'&&!addr){alert(L('needaddr'));return null;}
  var date=document.getElementById('fDate').value;
  if(!date){alert(L('needdate'));return null;}
  var dd=new Date(date+'T00:00:00');
  if(isBlockedDate(dd)){var na=nextAvailable();
    var why=isSunday(dd)?L('sundayoff'):(isHoliday(dd)?(LANG==='sr'?'Taj dan je neradni.':'Этот день нерабочий.'):cutoffText());
    alert(L('blocked')+' '+why+'\n\n'+L('nearest')+': '+fmtDate(na));
    document.getElementById('fDate').value=ymd(na);return null;}
  var time=document.getElementById('fTime').value;
  var comment=document.getElementById('fComment').value.trim();
  if(c.mode==='need'||c.mode==='pickup')comment=(comment?comment+' · ':'')+'Самовывоз';
  return {contact:contact,phone:phone,addr:addr,time:time||'',
    date:date?new Date(date).toLocaleDateString('ru-RU'):'не указана',comment:comment,
    items:currentItems(),total:Math.round(c.grand*100)/100};
}
function addDelivery(){
  var c=compute();
  if(c.count<1){alert(LANG==='sr'?'Dodajte stavke za ovu adresu.':'Добавьте позиции для этого адреса.');return;}
  var f=getDeliveryFields();if(!f)return;
  deliveries.push({address:f.addr,date:f.date,time:f.time,comment:f.comment,items:f.items,total:f.total});
  var copy=confirm(LANG==='sr'?'Adresa je dodata. Kopirati iste stavke u sledeću adresu?':'Адрес добавлен. Скопировать те же позиции в следующий адрес?');
  if(!copy)qtyMap={};
  selPoint='';
  renderNew();
  toast2(LANG==='sr'?'Adresa dodata':'Адрес добавлен');
}
function stagedPanelHtml(){
  if(!deliveries.length)return '';
  var sr=(LANG==='sr');
  var h='<div class="sec-title">'+(sr?('Adrese u ovoj porudžbini ('+deliveries.length+')'):('Адреса в этом заказе ('+deliveries.length+')'))+'</div>';
  deliveries.forEach(function(d,i){
    h+='<div class="ocard" style="margin-bottom:9px;"><div class="top"><span style="font-weight:600;">📍 '+esc(d.address||(sr?'Preuzimanje':'Самовывоз'))+'</span>'+
       '<span class="odate" style="margin-left:auto;">'+esc(d.date||'')+(d.time?', '+esc(d.time):'')+'</span></div>'+
       '<div class="hint" style="margin-top:4px;">'+(d.items||[]).length+' '+(sr?'stavki':'поз.')+' · '+fmt(d.total)+' '+cur()+'</div>'+
       '<div style="margin-top:9px;"><button class="btn btn-line del-deliv" data-i="'+i+'" style="padding:7px 13px;font-size:13px;color:#b3261e;">'+(sr?'Ukloni adresu':'Удалить адрес')+'</button></div></div>';
  });
  return h;
}
function sendOrder(){
  var c=compute();
  if(c.count<1&&!deliveries.length)return;
  var contact=document.getElementById('fContact').value.trim();
  var phone=document.getElementById('fPhone').value.trim();
  if(!contact||!phone){alert(LANG==='sr'?'Popunite kontakt osobu i telefon.':'Заполните контактное лицо и телефон.');return;}
  var ordersArr=[];
  deliveries.forEach(function(d){ordersArr.push({contact:contact,phone:phone,address:d.address,time:d.time,date:d.date,comment:d.comment,items:d.items,total:d.total});});
  if(c.count>0){
    var f=getDeliveryFields();if(!f)return;
    ordersArr.push({contact:contact,phone:phone,address:f.addr,time:f.time,date:f.date,comment:f.comment,items:f.items,total:f.total});
  }
  if(!ordersArr.length){alert(LANG==='sr'?'Dodajte stavke.':'Добавьте позиции.');return;}
  var btn=document.getElementById('sendBtn');btn.disabled=true;btn.textContent=(LANG==='sr'?'Šaljemo…':'Отправляем…');
  var body=(ordersArr.length===1)?{order:ordersArr[0],code:CODE}:{orderBatch:ordersArr,code:CODE};
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})
    .then(function(r){return r.json();})
    .then(function(j){if(j&&j.ok){qtyMap={};deliveries=[];refreshOrders(function(){showOk(j.order_id||(j.order_ids&&j.order_ids.join(', '))||'');});}else throw 'err';})
    .catch(function(){alert(LANG==='sr'?'Nije moguće poslati porudžbinu. Pokušajte ponovo.':'Не удалось отправить заказ. Проверьте интернет и попробуйте ещё раз.');btn.disabled=false;btn.textContent=L('submit');});
}
function refreshOrders(cb){
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({myOrders:CODE})})
    .then(function(r){return r.json();}).then(function(j){if(j&&j.ok){if(j.orders)ORDERS=j.orders;if(j.documents)DOCS=j.documents;}if(cb)cb();})
    .catch(function(){if(cb)cb();});
}
function showOk(orderId){
  document.getElementById('bar').style.display='none';
  document.getElementById('content').innerHTML=
    '<div class="ok-screen"><div class="ic">🥖</div><div class="big">Заказ принят</div>'+
    '<p style="color:#55544c;max-width:430px;margin:0 auto;">Номер заказа: <b>'+esc(orderId||'')+'</b>. Мы получили заявку и свяжемся для подтверждения. Статус можно отслеживать в разделе «Мои заказы».</p>'+
    '<button class="btn" style="margin-top:22px;" id="toOrders">Мои заказы</button></div>';
  document.getElementById('toOrders').addEventListener('click',function(){setView('orders');});
}
document.getElementById('sendBtn').addEventListener('click',sendOrder);

/* ---------- регулярные поставки ---------- */
function dowName(n){var ru=['','Пн','Вт','Ср','Чт','Пт','Сб','Вс'],sr=['','Pon','Uto','Sre','Čet','Pet','Sub','Ned'];return (LANG==='sr'?sr:ru)[n]||'';}
function toast2(m){var d=document.createElement('div');d.textContent=m;d.style.cssText='position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#1D1D1B;color:#fff;padding:11px 20px;border-radius:10px;font-size:14px;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,.25);';document.body.appendChild(d);setTimeout(function(){d.style.transition='opacity .4s';d.style.opacity='0';setTimeout(function(){d.remove();},400);},1900);}
function subNextDates(sub,limit){
  var res=[],d=earliestDate(),end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()+14);
  var conf=sub.confirmed||{};
  while(d<=end){var dow=d.getDay()===0?7:d.getDay(),key=ymd(d);
    if((sub.days||[]).indexOf(dow)>=0 && !isSunday(d) && !isHoliday(d) && !conf[key]){res.push(key);if(res.length>=limit)break;}
    d.setDate(d.getDate()+1);}
  return res;
}
function pendingList(){var out=[];SUBS.forEach(function(sub){if(!sub.active)return;var nx=subNextDates(sub,1);if(nx.length)out.push({sub:sub,date:nx[0]});});return out;}
function pendingCount(){try{return pendingList().length;}catch(e){return 0;}}
function cloudSubList(cb){
  if(!CODE){if(cb)cb();return;}
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({subList:CODE})})
    .then(function(r){return r.json();}).then(function(j){if(j&&j.ok&&Array.isArray(j.subscriptions))SUBS=j.subscriptions;if(cb)cb();else if(VIEW==='subs')renderSubs();else if(VIEW==='new')renderNew();})
    .catch(function(){if(cb)cb();});
}
function subItemsForSend(sub){
  var saved=qtyMap;qtyMap={};
  (sub.items||[]).forEach(function(si){var it=itemByIdLocal(si.id)||itemByNameWeight(si.name,si.weight);if(it)qtyMap[it.id]=Math.max(0,Number(si.qty)||0);});
  var c=compute(),items=[];
  catalog.forEach(function(it){var q=Math.max(0,Number(qtyMap[it.id])||0);if(!q)return;var disc=discountFor(it,q),unit=it.retail*(1-disc/100);items.push({name:it.name,weight:it.weight,qty:q,uom:itemUnit(it),sum:Math.round(unit*q*100)/100});});
  var total=Math.round(c.grand*100)/100;qtyMap=saved;
  return {items:items,total:total};
}
function confirmDelivery(subId,dateKey,action){
  if(window._subBusy)return;
  var sub=null;SUBS.forEach(function(x){if(x.id===subId)sub=x;});if(!sub)return;
  var body={subId:subId,date:dateKey,code:CODE,action:action};
  if(action==='order'){var built=subItemsForSend(sub);
    if(!built.items.length){alert(LANG==='sr'?'Pozicije iz pretplate trenutno nisu dostupne.':'Позиции из подписки сейчас недоступны.');return;}
    var dd=new Date(dateKey+'T00:00:00');
    body.order={contact:sub.contact||localStorage.getItem('bv_p_contact')||'',phone:sub.phone||localStorage.getItem('bv_p_phone')||'',
      address:sub.address||'',time:sub.time||'',date:dd.toLocaleDateString('ru-RU'),
      comment:(LANG==='sr'?'Redovna isporuka':'Регулярная поставка'),items:built.items,total:built.total};
  }
  window._subBusy=true;
  document.querySelectorAll('.pd-ok,.pd-skip,.pd-ed').forEach(function(b){b.disabled=true;b.style.opacity='.6';});
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})
    .then(function(r){return r.json();}).then(function(j){window._subBusy=false;if(j&&j.ok){if(Array.isArray(j.subscriptions))SUBS=j.subscriptions;
      var msg=j.already?(LANG==='sr'?'Već je obrađeno':'Уже обработано'):(action==='order'?(LANG==='sr'?'Isporuka potvrđena':'Поставка подтверждена'):(LANG==='sr'?'Isporuka preskočena':'Поставка пропущена'));
      if(action==='order'&&!j.already)refreshOrders(function(){renderSubs();toast2(msg);});
      else{renderSubs();toast2(msg);}
    }else{alert(LANG==='sr'?'Nije uspelo':'Не удалось');renderSubs();}}).catch(function(){window._subBusy=false;alert(LANG==='sr'?'Greška veze':'Ошибка соединения');renderSubs();});
}
function renderSubs(){
  document.getElementById('hTitle').textContent=(LANG==='sr'?'Redovne isporuke':'Регулярные поставки');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h=navHtml('subs');
  var pend=pendingList();
  if(pend.length){
    h+='<div class="cat">'+(LANG==='sr'?'Treba potvrditi':'Требуют подтверждения')+'</div>';
    pend.forEach(function(p){var dd=new Date(p.date+'T00:00:00'),dn=dowName(dd.getDay()===0?7:dd.getDay());
      h+='<div class="ocard" style="margin-bottom:10px;border:1px solid var(--blue);">'+
         '<div style="font-weight:600;margin-bottom:4px;">'+(LANG==='sr'?'Sledeća isporuka':'Следующая поставка')+': '+fmtDate(dd)+' <span class="hint">'+dn+'</span></div>'+
         '<div class="hint" style="margin-bottom:10px;">'+(LANG==='sr'?'Bez izmena? Potvrdite ili izmenite.':'Без изменений? Подтвердите или внесите изменения.')+'</div>'+
         '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
         '<button class="btn pd-ok" data-s="'+esc(p.sub.id)+'" data-d="'+esc(p.date)+'" style="padding:9px 16px;font-size:13.5px;">'+(LANG==='sr'?'Potvrdi':'Подтвердить')+'</button>'+
         '<button class="btn btn-line pd-ed" data-s="'+esc(p.sub.id)+'" style="padding:9px 16px;font-size:13.5px;">'+(LANG==='sr'?'Izmeni':'Изменить')+'</button>'+
         '<button class="btn btn-line pd-skip" data-s="'+esc(p.sub.id)+'" data-d="'+esc(p.date)+'" style="padding:9px 16px;font-size:13.5px;">'+(LANG==='sr'?'Preskoči':'Пропустить')+'</button>'+
         '</div></div>';});
  }
  h+='<div class="cat">'+(LANG==='sr'?'Moje redovne isporuke':'Мои регулярные поставки')+'</div>';
  if(!SUBS.length)h+='<div class="empty" style="margin-bottom:14px;">'+(LANG==='sr'?'Još nema redovnih isporuka.':'Регулярных поставок пока нет.')+'</div>';
  SUBS.forEach(function(sub){var days=(sub.days||[]).slice().sort().map(dowName).join(', ');
    h+='<div class="ocard" style="margin-bottom:10px;'+(sub.active?'':'opacity:.6;')+'">'+
       '<div class="top"><span style="font-weight:600;">'+(sub.active?'🔁 ':'⏸ ')+esc(days)+(sub.time?' · '+esc(sub.time):'')+'</span>'+
       '<span class="hint" style="margin-left:auto;">'+(sub.active?(LANG==='sr'?'aktivno':'активна'):(LANG==='sr'?'pauza':'на паузе'))+'</span></div>';
    (sub.items||[]).forEach(function(si){h+='<div style="font-size:13px;color:#55544c;padding:2px 0;">• '+esc(catName(si.name))+' — '+esc(si.qty)+' '+(LANG==='sr'?'kom':'шт')+'</div>';});
    if(sub.address)h+='<div class="hint" style="margin-top:6px;">'+(LANG==='sr'?'Adresa':'Адрес')+': '+esc(sub.address)+'</div>';
    h+='<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;">'+
       '<button class="btn btn-line sb-ed" data-s="'+esc(sub.id)+'" style="padding:8px 14px;font-size:13px;">'+(LANG==='sr'?'Izmeni':'Изменить')+'</button>'+
       '<button class="btn btn-line sb-tog" data-s="'+esc(sub.id)+'" style="padding:8px 14px;font-size:13px;">'+(sub.active?(LANG==='sr'?'Pauziraj':'Остановить'):(LANG==='sr'?'Nastavi':'Возобновить'))+'</button>'+
       '<button class="btn btn-line sb-del" data-s="'+esc(sub.id)+'" style="padding:8px 14px;font-size:13px;color:#b3261e;">'+(LANG==='sr'?'Obriši':'Удалить')+'</button>'+
       '</div></div>';});
  h+='<button class="btn" id="sbNew" style="margin-top:6px;">+ '+(LANG==='sr'?'Nova redovna isporuka':'Новая регулярная поставка')+'</button>';
  c.innerHTML=h;bindNav();
  c.querySelectorAll('.pd-ok').forEach(function(b){b.addEventListener('click',function(){confirmDelivery(this.dataset.s,this.dataset.d,'order');});});
  c.querySelectorAll('.pd-skip').forEach(function(b){b.addEventListener('click',function(){if(confirm(LANG==='sr'?'Preskočiti ovu isporuku?':'Пропустить эту поставку?'))confirmDelivery(this.dataset.s,this.dataset.d,'skip');});});
  c.querySelectorAll('.pd-ed').forEach(function(b){b.addEventListener('click',function(){openSubForm(this.dataset.s);});});
  c.querySelectorAll('.sb-ed').forEach(function(b){b.addEventListener('click',function(){openSubForm(this.dataset.s);});});
  c.querySelectorAll('.sb-tog').forEach(function(b){b.addEventListener('click',function(){var id=this.dataset.s,sub=null;SUBS.forEach(function(x){if(x.id===id)sub=x;});if(!sub)return;cloudSubUpdate(id,{active:!sub.active});});});
  c.querySelectorAll('.sb-del').forEach(function(b){b.addEventListener('click',function(){var id=this.dataset.s;if(confirm(LANG==='sr'?'Obrisati ovu redovnu isporuku?':'Удалить эту регулярную поставку?'))cloudSubDelete(id);});});
  var nb=document.getElementById('sbNew');if(nb)nb.addEventListener('click',function(){openSubForm('');});
}
function cloudSubUpdate(subId,patch){
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({subUpdate:patch,subId:subId,code:CODE})})
    .then(function(r){return r.json();}).then(function(j){if(j&&j.ok){if(Array.isArray(j.subscriptions))SUBS=j.subscriptions;renderSubs();}else alert(LANG==='sr'?'Nije uspelo':'Не удалось');}).catch(function(){alert(LANG==='sr'?'Greška':'Ошибка');});
}
function cloudSubDelete(subId){
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({subDelete:true,subId:subId,code:CODE})})
    .then(function(r){return r.json();}).then(function(j){if(j&&j.ok){if(Array.isArray(j.subscriptions))SUBS=j.subscriptions;renderSubs();}else alert(LANG==='sr'?'Nije uspelo':'Не удалось');}).catch(function(){alert(LANG==='sr'?'Greška':'Ошибка');});
}
function openSubForm(editId){
  subEditId=editId||'';subQty={};subDays=[];
  var sub=null;if(editId)SUBS.forEach(function(x){if(x.id===editId)sub=x;});
  if(sub){subDays=(sub.days||[]).slice();(sub.items||[]).forEach(function(si){var it=itemByIdLocal(si.id)||itemByNameWeight(si.name,si.weight);if(it)subQty[it.id]=Math.max(0,Number(si.qty)||0);});}
  renderSubForm(sub);
}
function renderSubForm(sub){
  document.getElementById('hTitle').textContent=(LANG==='sr'?'Redovna isporuka':'Регулярная поставка');
  document.getElementById('bar').style.display='none';
  var c=document.getElementById('content');var h='';
  h+='<div style="margin:4px 0 12px;"><a id="sbBack" style="color:var(--blue-d);cursor:pointer;">‹ '+(LANG==='sr'?'Nazad':'Назад')+'</a></div>';
  h+='<div class="form-card"><div class="sec-title" style="margin-top:0;">'+(LANG==='sr'?'Dani isporuke':'Дни поставки')+'</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">';
  for(var d=1;d<=6;d++)h+='<label class="dchk'+(subDays.indexOf(d)>=0?' on':'')+'" data-d="'+d+'">'+dowName(d)+'</label>';
  h+='</div>';
  h+='<div class="field"><label class="flab">'+(LANG==='sr'?'Vreme isporuke':'Время доставки')+'</label><select class="inp" id="sbTime">'+timeSlotOptions((sub&&sub.time)||'08:00')+'</select><div class="hint" style="margin-top:4px;">'+(LANG==='sr'?'8:00–16:00.':'8:00–16:00.')+'</div></div>';
  if(POINTS.length){
    var curAddr=(sub&&sub.address)||'';
    h+='<div class="field"><label class="flab">'+(LANG==='sr'?'Adresa (tačka)':'Адрес (точка)')+'</label><select class="inp" id="sbPoint"><option value="">'+(LANG==='sr'?'— izaberite —':'— выберите —')+'</option>'+
       POINTS.map(function(pt){var full=(pt.name?pt.name+', ':'')+pt.address;return '<option value="'+esc(full)+'"'+(curAddr===full?' selected':'')+'>'+esc(pt.name?pt.name+' — ':'')+esc(pt.address)+'</option>';}).join('')+
       '<option value="__new"'+((curAddr&&!POINTS.some(function(pt){return ((pt.name?pt.name+', ':'')+pt.address)===curAddr;}))?' selected':'')+'>'+(LANG==='sr'?'+ Druga adresa':'+ Другой адрес')+'</option></select>'+
       '<div id="sbAddrWrap" style="display:none;margin-top:8px;"><input class="inp" id="sbAddr" value="'+esc(curAddr)+'"></div></div>';
  }else{
    h+='<div class="field"><label class="flab">'+(LANG==='sr'?'Adresa':'Адрес')+'</label><input class="inp" id="sbAddr" value="'+esc((sub&&sub.address)||localStorage.getItem('bv_p_addr')||'')+'"></div>';
  }
  h+='<div class="field"><label class="flab">'+(LANG==='sr'?'Kontakt osoba':'Контактное лицо')+'</label><input class="inp" id="sbContact" value="'+esc((sub&&sub.contact)||localStorage.getItem('bv_p_contact')||'')+'"></div>';
  h+='<div class="field"><label class="flab">'+(LANG==='sr'?'Telefon':'Телефон')+'</label><input class="inp" id="sbPhone" value="'+esc((sub&&sub.phone)||localStorage.getItem('bv_p_phone')||'')+'"></div>';
  h+='</div>';
  h+='<div class="cat">'+(LANG==='sr'?'Pozicije':'Позиции')+'</div>';
  catalog.forEach(function(it){var q=Math.max(0,Number(subQty[it.id])||0);
    h+='<div class="ocard" style="margin-bottom:8px;display:flex;align-items:center;gap:10px;"><span style="flex:1;font-size:14px;">'+esc(catName(it.name))+(it.weight?' <span class="hint">('+esc(it.weight)+')</span>':'')+'</span>'+
       '<div class="qty" data-id="'+esc(it.id)+'"><button data-act="m">−</button><span class="sqv">'+q+'</span><button data-act="p">+</button></div></div>';});
  h+='<div id="subTotals" style="margin-top:14px;"></div>';
  h+='<button class="btn" id="sbSave" style="margin-top:12px;">'+(LANG==='sr'?'Sačuvaj':'Сохранить')+'</button>';
  c.innerHTML=h;
  document.getElementById('sbBack').addEventListener('click',function(){renderSubs();});
  var sbp=document.getElementById('sbPoint');
  if(sbp){sbp.addEventListener('change',function(){var w=document.getElementById('sbAddrWrap');if(w)w.style.display=(this.value==='__new')?'block':'none';});
    if(sbp.value==='__new'){var w2=document.getElementById('sbAddrWrap');if(w2)w2.style.display='block';}
  }
  c.querySelectorAll('.dchk').forEach(function(l){l.addEventListener('click',function(){var dd=Number(this.dataset.d),i=subDays.indexOf(dd);if(i>=0)subDays.splice(i,1);else subDays.push(dd);this.classList.toggle('on');});});
  c.querySelectorAll('.qty').forEach(function(row){var id=row.dataset.id;row.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){var v=Math.max(0,Number(subQty[id])||0);v=this.dataset.act==='p'?v+1:Math.max(0,v-1);subQty[id]=v;row.querySelector('.sqv').textContent=v;renderSubTotals();});});});
  document.getElementById('sbSave').addEventListener('click',saveSub);
  renderSubTotals();
}
function renderSubTotals(){
  var w=document.getElementById('subTotals');if(!w)return;
  var saved=qtyMap;qtyMap={};for(var k in subQty)qtyMap[k]=subQty[k];
  var c=compute();qtyMap=saved;
  if(c.count<1){w.innerHTML='';return;}
  var sr=(LANG==='sr'),rates=Object.keys(c.pdvByRate).map(Number).sort(function(a,b){return a-b;});
  var t='<div class="sec-title" style="margin-top:0;">'+(sr?'Procena porudžbine':'Расчёт поставки')+'</div><div class="totals">';
  t+='<div class="trow"><span>'+(sr?'Osnovna (sa PDV)':'Базовая (с PDV)')+'</span><span>'+fmt(c.base)+' '+cur()+'</span></div>';
  if(c.save>0)t+='<div class="trow"><span>'+(sr?'Popust po količini':'Скидка по объёму')+'</span><span>−'+fmt(c.save)+' '+cur()+'</span></div>';
  t+='<div class="trow"><span>'+(sr?'Iznos (sa PDV)':'Стоимость (с PDV)')+'</span><span>'+fmt(c.gross)+' '+cur()+'</span></div>';
  rates.forEach(function(rt){t+='<div class="trow"><span>'+(sr?'u tome PDV ':'в т.ч. PDV ')+rt+'%</span><span>'+fmt(c.pdvByRate[rt])+' '+cur()+'</span></div>';});
  t+='<div class="trow"><span>'+(sr?'bez PDV':'Без PDV')+'</span><span>'+fmt(c.net)+' '+cur()+'</span></div>';
  t+='<div class="trow"><span>'+(c.mode==='pickup'||c.mode==='need'?(sr?'Preuzimanje':'Самовывоз'):(sr?'Dostava':'Доставка'))+'</span><span>'+fmt(c.delivery)+' '+cur()+'</span></div>';
  t+='<div class="trow g"><span>'+(sr?'Ukupno po isporuci':'Итого за поставку')+'</span><span>'+fmt(c.grand)+' '+cur()+'</span></div></div>';
  var d='';
  if(c.mode==='need')d='<div class="deliv warn" style="margin-top:10px;"><span>⚠</span><div>'+(sr?'Iznos bez PDV manji od 2500 din. — dostupno samo preuzimanje.':'Сумма без PDV меньше 2500 дин. — доступен только самовывоз.')+'</div></div>';
  else if(c.mode==='free')d='<div class="deliv ok" style="margin-top:10px;"><span>✓</span><div>'+(sr?'Besplatna dostava.':'Бесплатная доставка.')+'</div></div>';
  else if(c.mode==='pay')d='<div class="deliv pay" style="margin-top:10px;"><span>🚲</span><div>'+(sr?'Dostava '+fmt(c.delivery)+' din. Do besplatne '+fmt(FREE_FROM-c.net)+' din.':'Доставка '+fmt(c.delivery)+' дин. До бесплатной '+fmt(FREE_FROM-c.net)+' дин.')+'</div></div>';
  w.innerHTML=t+d;
}
function saveSub(){
  if(!subDays.length){alert(LANG==='sr'?'Izaberite bar jedan dan.':'Выберите хотя бы один день недели.');return;}
  var items=[];catalog.forEach(function(it){var q=Math.max(0,Number(subQty[it.id])||0);if(q)items.push({id:it.id,name:it.name,weight:it.weight,uom:itemUnit(it),qty:q});});
  if(!items.length){alert(LANG==='sr'?'Dodajte bar jednu poziciju.':'Добавьте хотя бы одну позицию.');return;}
  var sbpEl=document.getElementById('sbPoint'),sbAddrEl=document.getElementById('sbAddr');
  var subAddr=(sbpEl&&sbpEl.value&&sbpEl.value!=='__new')?sbpEl.value:(sbAddrEl?sbAddrEl.value.trim():'');
  var payload={days:subDays.slice().sort(function(a,b){return a-b;}),time:document.getElementById('sbTime').value||'',
    address:subAddr,contact:document.getElementById('sbContact').value.trim(),
    phone:document.getElementById('sbPhone').value.trim(),items:items};
  var btn=document.getElementById('sbSave');btn.disabled=true;btn.textContent='…';
  var req=subEditId?{subUpdate:payload,subId:subEditId,code:CODE}:{subCreate:payload,code:CODE};
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(req)})
    .then(function(r){return r.json();}).then(function(j){if(j&&j.ok){if(Array.isArray(j.subscriptions))SUBS=j.subscriptions;renderSubs();toast2(LANG==='sr'?'Sačuvano':'Сохранено');}else{alert(LANG==='sr'?'Nije uspelo':'Не удалось');btn.disabled=false;btn.textContent=(LANG==='sr'?'Sačuvaj':'Сохранить');}})
    .catch(function(){alert(LANG==='sr'?'Greška':'Ошибка');btn.disabled=false;btn.textContent=(LANG==='sr'?'Sačuvaj':'Сохранить');});
}

