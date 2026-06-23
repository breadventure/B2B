/* ============================================================
 * BreadVenture B2B — Загрузка заказов и партнёры
 * Загрузка заказов из облака, журнал действий, управление партнёрами и их реквизитами.
 * Файл #8 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

function loadAdminOrders(){
  var w=document.getElementById('ordersView');if(w)w.innerHTML='<div class="empty">Загрузка…</div>';
  return cloudOrders().then(function(list){adminOrders=list;renderAdminOrders();
    var pd=document.getElementById('prodDate');renderProdSummary(pd&&pd.value);})
    .catch(function(e){if(w)w.innerHTML='<div class="empty">'+(e==='auth'?'Неверный мастер-ключ.':'Не удалось загрузить. Проверьте подключение к облаку.')+'</div>';});
}
document.getElementById('ordersRefresh').addEventListener('click',loadAdminOrders);
(function(){var pd=document.getElementById('prodDate');if(pd){if(!pd.value)pd.value=new Date().toISOString().slice(0,10);pd.addEventListener('change',function(){renderProdSummary(pd.value);});}})();
document.querySelector('.tab[data-tab="orders"]').addEventListener('click',function(){
  var pd=document.getElementById('prodDate');if(pd&&!pd.value)pd.value=new Date().toISOString().slice(0,10);
  if(!adminOrders.length)loadAdminOrders();else renderProdSummary();
});

/* ---------- журнал действий ---------- */
function loadAudit(){
  var w=document.getElementById('auditView');if(!w)return;w.innerHTML='<div class="empty">Загрузка…</div>';
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,audit:true})})
    .then(function(r){return r.json();}).then(function(j){
      if(!j||!j.ok||!j.audit){w.innerHTML='<div class="empty">Не удалось загрузить журнал.</div>';return;}
      if(!j.audit.length){w.innerHTML='<div class="empty">Журнал пуст.</div>';return;}
      var h='';j.audit.forEach(function(a){var dt='';try{dt=new Date(a.when).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){}
        h+='<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px;">'+
           '<span class="hint" style="flex:0 0 90px;">'+esc(dt)+'</span>'+
           '<span style="flex:0 0 auto;font-weight:600;">'+esc(a.who||'')+'</span>'+
           '<span style="flex:1;">'+esc(a.action||'')+(a.entity?' · '+esc(a.entity):'')+(a.details?' · '+esc(a.details):'')+'</span></div>';});
      w.innerHTML=h;
    }).catch(function(){w.innerHTML='<div class="empty">Ошибка соединения.</div>';});
}
var _auditBtn=document.getElementById('auditRefresh');if(_auditBtn)_auditBtn.addEventListener('click',loadAudit);

/* ---------- партнёры (доступ) ---------- */
function genCode(){var s='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',o='';for(var i=0;i<6;i++)o+=s[Math.floor(Math.random()*s.length)];return o;}
function buildPartnerStats(pid){
  var today=new Date();today.setHours(0,0,0,0);
  var os=adminOrders.filter(function(o){return o.partner_id===pid && (o.status||'')!=='cancelled';});
  if(!os.length)return {count:0};
  var dates=os.map(function(o){return new Date(o.created||(normDate(o.date)+'T00:00:00'));}).filter(function(d){return !isNaN(d.getTime());}).sort(function(a,b){return a-b;});
  var first=dates[0],last=dates[dates.length-1];
  var totalSum=0,paidSum=0,debtSum=0,payDays=[];
  os.forEach(function(o){
    var s=Number(o.total)||0;totalSum+=s;
    if(o.paid){paidSum+=s;
      if(o.paidAt&&o.created){var c=new Date(o.created),pa=new Date(o.paidAt);var dd=(pa-c)/86400000;if(dd>=0&&dd<400)payDays.push(dd);}
    } else debtSum+=s;
  });
  var d0=first?new Date(first.getFullYear(),first.getMonth(),first.getDate()):null;
  var dL=last?new Date(last.getFullYear(),last.getMonth(),last.getDate()):null;
  var daysCoop=d0?Math.round((today-d0)/86400000):0;
  var daysSinceLast=dL?Math.round((today-dL)/86400000):0;
  var span=(last-first)/86400000;
  var freqDays=os.length>1?Math.round(span/(os.length-1)):null;
  var avgPay=payDays.length?Math.round(payDays.reduce(function(a,b){return a+b;},0)/payDays.length):null;
  return {count:os.length,totalSum:totalSum,paidSum:paidSum,debtSum:debtSum,first:first,last:last,
          daysCoop:daysCoop,daysSinceLast:daysSinceLast,freqDays:freqDays,avgPay:avgPay,silent:daysSinceLast>12};
}
function statFmtDate(d){try{return d.toLocaleDateString('ru-RU');}catch(e){return '—';}}
function partnerStatBlock(p){
  if(!adminOrders.length)return '<div class="hint" style="margin-top:14px;">Статистика подгрузится после загрузки заказов.</div>';
  var st=buildPartnerStats(p.id);
  if(!st.count)return '<div class="lbl" style="margin:16px 0 6px;">Статистика</div><div class="hint">Заказов пока нет.</div>';
  var row=function(l,v,warn){return '<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid var(--line);font-size:13.5px;"><span class="hint">'+l+'</span><span style="font-weight:600;'+(warn?'color:#c0392b;':'')+'">'+v+'</span></div>';};
  return '<div class="lbl" style="margin:16px 0 6px;">Статистика</div>'+
    '<div style="display:flex;gap:24px;flex-wrap:wrap;">'+
      '<div style="flex:1;min-width:230px;">'+
        row('Заказов',st.count)+
        row('Сумма заказов',fmt(st.totalSum)+' дин.')+
        row('Оплачено',fmt(st.paidSum)+' дин.')+
        row('Долг',fmt(st.debtSum)+' дин.',st.debtSum>0)+
        row('Скорость оплаты',st.avgPay!=null?('≈ '+st.avgPay+' дн.'):'нет данных')+
      '</div>'+
      '<div style="flex:1;min-width:230px;">'+
        row('Первый заказ',statFmtDate(st.first))+
        row('Последний заказ',statFmtDate(st.last))+
        row('Длительность сотрудничества',st.daysCoop+' дн.')+
        row('Частота заказов',st.freqDays!=null?('≈ раз в '+st.freqDays+' дн.'):'—')+
        row('С последнего заказа',st.daysSinceLast+' дн.'+(st.silent?' ⚠️':''),st.silent)+
      '</div>'+
    '</div>'+
    (st.silent?'<div style="margin-top:8px;background:#fdecea;border:1px solid #f5c6cb;color:#9c2b22;border-radius:8px;padding:8px 11px;font-size:13px;">⚠️ Не размещал заказов больше 12 дней — стоит связаться.</div>':'');
}
function renderPartnersOverview(){
  var w=document.getElementById('partnersOverview');if(!w)return;
  if(!adminOrders.length){w.innerHTML='<div class="empty">Нажмите «Обновить», чтобы загрузить заказы.</div>';return;}
  var rows=partners.map(function(p){var st=buildPartnerStats(p.id);return {p:p,st:st};})
    .filter(function(x){return x.st.count;})
    .sort(function(a,b){return b.st.totalSum-a.st.totalSum;});
  if(!rows.length){w.innerHTML='<div class="empty">Пока нет заказов ни у одного партнёра.</div>';return;}
  var silent=rows.filter(function(x){return x.st.silent;});
  var head='<div style="display:flex;font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;padding:0 4px 6px;gap:8px;">'+
    '<span style="flex:1;min-width:120px;">Партнёр</span>'+
    '<span style="width:60px;text-align:right;">Заказов</span>'+
    '<span style="width:100px;text-align:right;">Сумма</span>'+
    '<span style="width:90px;text-align:right;">Долг</span>'+
    '<span style="width:90px;text-align:right;">Послед.</span>'+
    '<span style="width:70px;text-align:right;">Молчит</span>'+
    '<span style="width:80px;text-align:right;">Частота</span>'+
    '<span style="width:80px;text-align:right;">Оплата</span>'+
    '</div>';
  var body=rows.map(function(x){var st=x.st;
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-top:1px solid var(--line);font-size:13px;'+(st.silent?'background:#fdecea;':'')+'">'+
      '<span style="flex:1;min-width:120px;font-weight:600;">'+esc(x.p.name)+'</span>'+
      '<span style="width:60px;text-align:right;">'+st.count+'</span>'+
      '<span style="width:100px;text-align:right;font-weight:600;">'+fmt(st.totalSum)+'</span>'+
      '<span style="width:90px;text-align:right;'+(st.debtSum>0?'color:#c0392b;':'color:var(--muted);')+'">'+fmt(st.debtSum)+'</span>'+
      '<span style="width:90px;text-align:right;color:var(--muted);">'+statFmtDate(st.last)+'</span>'+
      '<span style="width:70px;text-align:right;'+(st.silent?'color:#c0392b;font-weight:700;':'')+'">'+st.daysSinceLast+' дн.</span>'+
      '<span style="width:80px;text-align:right;color:var(--muted);">'+(st.freqDays!=null?('/'+st.freqDays+'дн'):'—')+'</span>'+
      '<span style="width:80px;text-align:right;color:var(--muted);">'+(st.avgPay!=null?(st.avgPay+' дн.'):'—')+'</span>'+
      '</div>';
  }).join('');
  var warn=silent.length?'<div style="margin-bottom:12px;background:#fdecea;border:1px solid #f5c6cb;color:#9c2b22;border-radius:9px;padding:9px 12px;font-size:13px;">⚠️ Давно не заказывали ('+silent.length+'): '+silent.map(function(x){return esc(x.p.name)+' — '+x.st.daysSinceLast+' дн.';}).join('; ')+'</div>':'';
  w.innerHTML=warn+head+body;
}
function partnerDetailsHtml(p){
  var pr=profilesAdmin[p.id]||{};
  var addrs=pointsAdmin.filter(function(x){return x.partner_id===p.id&&x.active!==false;});
  function fld(label,key,val,ph){return '<div class="field" style="margin:0;flex:1;min-width:150px;"><label class="lbl">'+label+'</label><input class="inp pf-'+key+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'"></div>';}
  var h='<div class="lbl" style="margin-bottom:6px;">Реквизиты партнёра (заполняются вами или партнёром)</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
      fld('Компания / название','company',pr.company||p.name)+
      fld('Контактное лицо','contact',pr.contact,'имя')+
      fld('Телефон','phone',pr.phone||p.phone,'+381…')+
    '</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">'+
      fld('PIB','pib',pr.pib)+
      fld('Matični broj','maticni',pr.maticni)+
      fld('Номер счёта','account',pr.account)+
    '</div>'+
    '<div class="actions" style="margin-top:10px;align-items:center;gap:10px;">'+
      '<button class="btn btn-primary btn-sm pf-save">💾 Сохранить данные</button>'+
      (pr.updated?'<span class="hint">Обновлено: '+esc((function(){try{return new Date(pr.updated).toLocaleString('ru-RU');}catch(e){return '';}})())+'</span>':'')+
    '</div>';
  h+='<div class="lbl" style="margin:16px 0 6px;">Адреса доставки ('+addrs.length+')</div>';
  if(addrs.length)addrs.forEach(function(a){
    h+='<div style="display:flex;align-items:center;gap:8px;font-size:13.5px;padding:3px 0;">📍 <span style="flex:1;">'+esc(a.name?a.name+' — ':'')+esc(a.address)+'</span>'+
      '<button class="btn btn-line btn-sm pa-del" data-aid="'+esc(a.id)+'">Удалить</button></div>';
  });
  else h+='<div class="hint">Адресов нет.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:flex-end;">'+
    '<div class="field" style="margin:0;min-width:120px;"><label class="lbl">Название точки</label><input class="inp pa-name" placeholder="напр. Центр"></div>'+
    '<div class="field" style="margin:0;flex:1;min-width:180px;"><label class="lbl">Адрес</label><input class="inp pa-addr" placeholder="ул. …"></div>'+
    '<button class="btn btn-line btn-sm pa-add">+ Адрес</button>'+
    '</div>';
  h+=partnerStatBlock(p);
  return h;
}
function savePartnerProfile(pid,row){
  var g=function(k){var el=row.querySelector('.pf-'+k);return el?el.value.trim():'';};
  profilesAdmin[pid]={company:g('company'),contact:g('contact'),phone:g('phone'),pib:g('pib'),maticni:g('maticni'),account:g('account'),updated:new Date().toISOString()};
  cloudPut('profiles',profilesAdmin);
  toast('Данные партнёра сохранены');renderPartners();
}
function pointsCloudSave(mutate,okMsg){
  if(!GAS_URL){toast('Облако не настроено — нажмите «Облако…»');return;}
  // 1) читаем актуальный список с сервера, чтобы не затереть чужие адреса
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,pull:true})})
  .then(function(r){return r.json();}).then(function(j){
    var arr=(j&&j.ok&&j.data&&Array.isArray(j.data.points))?j.data.points.slice():pointsAdmin.slice();
    var res=mutate(arr);var marker=res.marker;arr=res.arr;
    // 2) записываем
    return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,key:'points',value:arr})})
      .then(function(r){return r.json();}).then(function(w){
        if(!(w&&w.ok))throw new Error('save');
        // 3) проверяем чтением
        return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,pull:true})})
          .then(function(r){return r.json();}).then(function(v){
            var saved=(v&&v.ok&&v.data&&Array.isArray(v.data.points))?v.data.points:[];
            pointsAdmin=saved;setSync('on');renderPartners();
            var ok=marker?saved.some(function(x){return x.id===marker;}):true;
            if(marker&&!ok)toast('⚠️ Сервер не сохранил адрес (проверьте Code.gs/развёртывание)');
            else toast(okMsg);
          });
      });
  }).catch(function(){setSync('err');toast('Не удалось сохранить адрес — ошибка соединения');});
}
function addPartnerAddr(pid,row){
  var nm=row.querySelector('.pa-name'),ad=row.querySelector('.pa-addr');
  var addr=ad?ad.value.trim():'';if(!addr){toast('Введите адрес');return;}
  var newPt={id:'pt'+Date.now()+Math.floor(Math.random()*1000),partner_id:pid,name:nm?nm.value.trim():'',address:addr,active:true};
  pointsCloudSave(function(arr){arr.push(newPt);return {arr:arr,marker:newPt.id};},'Адрес добавлен и сохранён');
}
function delPartnerAddr(pid,aid){
  pointsCloudSave(function(arr){return {arr:arr.filter(function(x){return x.id!==aid;}),marker:null};},'Адрес удалён');
}
function renderPartners(){
  var w=document.getElementById('partnersWrap');if(!w)return;
  if(typeof fillDocPartners==='function')fillDocPartners();
  if(!adminOrders.length && typeof loadAdminOrders==='function' && !renderPartners._loaded){
    renderPartners._loaded=1;loadAdminOrders().then(function(){renderPartners();renderPartnersOverview();});
  }
  if(!partners.length){w.innerHTML='<div class="empty">Пока нет партнёров. Добавьте первого — получите код доступа.</div>';return;}
  var h='';
  partners.forEach(function(p){
    var on=p.active!==false;
    h+='<div class="row" style="display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px 14px;margin-bottom:9px;flex-wrap:wrap;" data-id="'+p.id+'">'+
       '<div style="flex:1;min-width:140px;"><div style="font-weight:600;">'+esc(p.name)+(on?'':' <span style="color:var(--muted);font-weight:400;">· доступ выключен</span>')+'</div>'+
       (p.phone?'<div class="hint" style="margin-top:2px;">'+esc(p.phone)+'</div>':'')+'</div>'+
       '<div style="font-family:monospace;font-size:16px;font-weight:700;letter-spacing:.05em;background:var(--cream);border:1px solid var(--line);border-radius:9px;padding:7px 12px;">'+esc(p.code)+'</div>'+
       '<button class="btn btn-line btn-sm p-copy">Копировать код</button>'+
       '<button class="btn btn-line btn-sm p-info">'+(openPartnerId===p.id?'▴ Данные':'▾ Данные')+'</button>'+
       '<button class="btn btn-line btn-sm p-cfg">⚙ Кабинет</button>'+
       '<button class="btn btn-line btn-sm p-toggle">'+(on?'Выключить':'Включить')+'</button>'+
       '<button class="btn btn-line btn-sm danger p-del">Удалить</button>'+
       (openPartnerId===p.id?('<div style="flex-basis:100%;border-top:1px solid var(--line);margin-top:8px;padding-top:10px;">'+partnerDetailsHtml(p)+'</div>'):'')+
       '</div>';
  });
  w.innerHTML=h;
  partners.forEach(function(p){
    var row=w.querySelector('[data-id="'+p.id+'"]');if(!row)return;
    row.querySelector('.p-copy').addEventListener('click',function(){
      var t=p.code;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast('Код скопирован: '+t);},function(){prompt('Код:',t);});}else prompt('Код:',t);});
    row.querySelector('.p-toggle').addEventListener('click',function(){p.active=(p.active===false);savePartners();renderPartners();toast(p.active!==false?'Доступ включён':'Доступ выключен');});
    row.querySelector('.p-cfg').addEventListener('click',function(){openPcfg(p.id,p.name);});
    row.querySelector('.p-info').addEventListener('click',function(){openPartnerId=(openPartnerId===p.id?'':p.id);renderPartners();});
    row.querySelector('.p-del').addEventListener('click',function(){if(confirm('Удалить партнёра «'+p.name+'»? Код перестанет работать.')){partners=partners.filter(function(x){return x.id!==p.id;});savePartners();renderPartners();}});
    if(openPartnerId===p.id){
      var sb=row.querySelector('.pf-save');if(sb)sb.addEventListener('click',function(){savePartnerProfile(p.id,row);});
      var ab=row.querySelector('.pa-add');if(ab)ab.addEventListener('click',function(){addPartnerAddr(p.id,row);});
      row.querySelectorAll('.pa-del').forEach(function(b){b.addEventListener('click',function(){delPartnerAddr(p.id,this.dataset.aid);});});
    }
  });
  if(typeof fillAnnounce==='function')fillAnnounce();
  renderPartnersOverview();
  var ovb=document.getElementById('partnersOvRefresh');
  if(ovb&&!ovb._b){ovb._b=1;ovb.addEventListener('click',function(){if(typeof loadAdminOrders==='function')loadAdminOrders().then(function(){renderPartners();});});}
}
document.getElementById('addPartner').addEventListener('click',function(){
  var name=prompt('Название компании / партнёра:');if(name===null)return;name=name.trim();if(!name){toast('Введите название');return;}
  var phone=prompt('Телефон / контакт (необязательно):','')||'';
  var code=genCode();
  var np={id:uid(),name:name,phone:phone.trim(),code:code,active:true,created:Date.now()};
  partners.push(np);openPartnerId=np.id;
  savePartners();renderPartners();
  alert('Партнёр добавлен.\n\nКод доступа: '+code+'\n\nЗаполните реквизиты в раскрывшемся блоке «Данные», затем передайте код партнёру.');
});
(function(){var ou=document.getElementById('orderUrl');if(ou){try{ou.value=localStorage.getItem('bv_b2b_order_url')||'';}catch(e){}
  ou.addEventListener('input',function(){try{localStorage.setItem('bv_b2b_order_url',this.value);}catch(e){}});}})();
var annDraftId=null;
function normalizeAnnounce(a){
  if(Array.isArray(a))return a.map(function(x){return {id:x.id||('a'+Math.random().toString(36).slice(2)),ru:x.ru||'',sr:x.sr||'',active:x.active!==false,ts:x.ts||x.updated||Date.now()};});
  if(a&&typeof a==='object'&&(a.ru||a.sr))return [{id:'a'+Math.random().toString(36).slice(2),ru:a.ru||'',sr:a.sr||'',active:a.active!==false,ts:a.updated||Date.now()}];
  return [];
}
function annById(id){return announceData.filter(function(x){return x.id===id;})[0];}
function saveAnnounce(){cloudPut('announce',announceData);}
function annResetForm(){annDraftId=null;
  var r=document.getElementById('annRu'),s=document.getElementById('annSr'),c=document.getElementById('annActive');
  if(r)r.value='';if(s)s.value='';if(c)c.checked=true;
  var sv=document.getElementById('annSave'),cn=document.getElementById('annCancel');
  if(sv)sv.textContent='Добавить объявление';if(cn)cn.style.display='none';
}
function annEdit(id){var a=annById(id);if(!a)return;annDraftId=id;
  document.getElementById('annRu').value=a.ru||'';document.getElementById('annSr').value=a.sr||'';document.getElementById('annActive').checked=a.active!==false;
  document.getElementById('annSave').textContent='Сохранить изменения';document.getElementById('annCancel').style.display='';
  document.getElementById('annRu').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderAnnounceList(){
  var w=document.getElementById('annList');if(!w)return;
  if(!announceData.length){w.innerHTML='<p class="hint">Объявлений пока нет.</p>';return;}
  var arr=announceData.slice().sort(function(a,b){return (b.ts||0)-(a.ts||0);});
  var h='';
  arr.forEach(function(a){
    var dt='';try{dt=new Date(a.ts).toLocaleString('ru-RU');}catch(e){}
    h+='<div class="ann-item" data-id="'+esc(a.id)+'" style="border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin-bottom:9px;background:#fff;">'+
       '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;">'+
       '<div style="flex:1;min-width:200px;">'+
       '<div style="font-size:14px;line-height:1.45;">'+esc(a.ru||a.sr||'(пусто)')+'</div>'+
       '<div class="hint" style="margin-top:4px;">'+esc(dt)+(a.active?' · <span style="color:#1e8e5a;font-weight:600;">показывается</span>':' · <span style="color:var(--muted);">скрыто</span>')+'</div>'+
       '</div>'+
       '<div style="display:flex;gap:6px;flex-wrap:wrap;">'+
       '<button class="btn btn-line btn-sm an-toggle">'+(a.active?'Скрыть':'Показать')+'</button>'+
       '<button class="btn btn-line btn-sm an-edit">Ред.</button>'+
       '<button class="btn btn-line btn-sm danger an-del">Удалить</button>'+
       '</div></div></div>';
  });
  w.innerHTML=h;
  w.querySelectorAll('.ann-item').forEach(function(el){
    var id=el.dataset.id;
    el.querySelector('.an-toggle').addEventListener('click',function(){var a=annById(id);if(a){a.active=!a.active;saveAnnounce();renderAnnounceList();toast('Сохранено');}});
    el.querySelector('.an-edit').addEventListener('click',function(){annEdit(id);});
    el.querySelector('.an-del').addEventListener('click',function(){if(confirm('Удалить объявление?')){announceData=announceData.filter(function(x){return x.id!==id;});saveAnnounce();renderAnnounceList();toast('Удалено');}});
  });
}
function fillAnnounce(){renderAnnounceList();}
(function(){
  var sv=document.getElementById('annSave');if(!sv)return;
  sv.addEventListener('click',function(){
    var ru=(document.getElementById('annRu').value||'').trim();
    var sr=(document.getElementById('annSr').value||'').trim();
    var active=document.getElementById('annActive').checked;
    if(!ru&&!sr){toast('Введите текст объявления');return;}
    if(annDraftId){var a=annById(annDraftId);if(a){a.ru=ru;a.sr=sr;a.active=active;a.ts=Date.now();}}
    else announceData.push({id:'a'+Date.now().toString(36)+Math.floor(Math.random()*1000),ru:ru,sr:sr,active:active,ts:Date.now()});
    saveAnnounce();annResetForm();renderAnnounceList();toast('Объявление сохранено');
  });
  var cn=document.getElementById('annCancel');if(cn)cn.addEventListener('click',annResetForm);
})();

