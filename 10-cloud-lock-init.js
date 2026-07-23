/* ============================================================
 * BreadVenture B2B — Настройка облака, замок и запуск
 * Подключение/синхронизация облака, экран-замок (PIN), инициализация приложения.
 * Файл #10 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

/* ---------- облако: настройка и синхронизация ---------- */
(function(){var lb=document.getElementById('logoutBtn');if(lb)lb.addEventListener('click',bvLogout);var pb=document.getElementById('pinBtn');if(pb)pb.addEventListener('click',bvChangePin);})();
document.getElementById('syncBtn').addEventListener('click',function(){
  var msg='Облачная синхронизация (Google Таблица).\n\n';
  if(GAS_URL)msg+='Сейчас подключено к:\n'+GAS_URL+'\n\nВставьте другой URL, чтобы сменить, или оставьте поле пустым и нажмите ОК — появятся действия.';
  else msg+='Вставьте URL веб-приложения Apps Script (заканчивается на /exec).\nИнструкция — в файле Code.gs.';
  var url=prompt(msg,GAS_URL||'');
  if(url===null)return;
  url=url.trim();
  if(url){
    var mk=prompt('Мастер-ключ (та же секретная фраза, что в Code.gs, строка MASTER_KEY):',MASTER||'');
    if(mk===null)return;
    GAS_URL=url;MASTER=mk.trim();
    try{localStorage.setItem(K_GAS,url);localStorage.setItem(K_MK,MASTER);}catch(e){}
    setSync('off','Подключение…');
    cloudGet().then(function(data){
      cloudState='on';
      var hasCloud=data&&data.catalog&&data.catalog.length;
      if(hasCloud){
        if(confirm('В облаке уже есть данные. Загрузить их на это устройство?\n\nОК — взять из облака (текущие локальные данные заменятся).\nОтмена — оставить локальные и отправить их в облако.')){
          applyCloudData(data);rerenderAll();setSync('on','Загружено из облака');toast('Данные загружены из облака');
        }else{
          cloudPutAll().then(function(){setSync('on','Отправлено в облако');toast('Локальные данные отправлены в облако');})
            .catch(function(){setSync('err');toast('Не удалось отправить');});
        }
      }else{
        cloudPutAll().then(function(){setSync('on','Отправлено в облако');toast('Данные отправлены в облако');})
          .catch(function(){setSync('err');toast('Не удалось отправить');});
      }
    }).catch(function(err){cloudState='err';setSync('err','Облако недоступно');
      toast(err==='auth'?'Неверный мастер-ключ':'Не удалось подключиться. Проверьте URL, ключ и доступ «У всех».');});
  }else if(GAS_URL){
    var act=prompt('Подключено к облаку. Введите:\n  1 — загрузить из облака\n  2 — отправить локальные в облако\n  3 — отключить облако (данные останутся локально)','1');
    if(act==='1'){setSync('off','Загрузка…');cloudGet().then(function(d){applyCloudData(d);rerenderAll();cloudState='on';setSync('on','Загружено');toast('Загружено из облака');}).catch(function(){setSync('err');toast('Ошибка загрузки');});}
    else if(act==='2'){cloudPutAll().then(function(){cloudState='on';setSync('on','Отправлено');toast('Отправлено в облако');}).catch(function(){setSync('err');toast('Ошибка отправки');});}
    else if(act==='3'){GAS_URL='';try{localStorage.removeItem(K_GAS);}catch(e){}cloudState='off';setSync('off');toast('Облако отключено');}
  }
});

/* ---------- экран-замок (PIN) ---------- */
function bvChangePin(){
  var stored='';try{stored=localStorage.getItem('bv_b2b_pin')||'';}catch(e){}
  function askNew(){
    var n=prompt('Новый PIN (4–8 цифр):');if(n===null)return;n=n.trim();
    if(!/^\d{4,8}$/.test(n)){alert('PIN должен быть от 4 до 8 цифр.');return;}
    var n2=prompt('Повторите новый PIN:');if(n2===null)return;
    if(n2.trim()!==n){alert('PIN не совпадают, попробуйте ещё раз.');return;}
    bvHash(n).then(function(h){
      try{localStorage.setItem('bv_b2b_pin',h);localStorage.removeItem('bv_b2b_pin_trust');}catch(e){}
      alert('PIN изменён. В следующий раз входите с новым PIN.');
    });
  }
  if(stored){
    var cur=prompt('Введите текущий PIN:');if(cur===null)return;
    bvHash(cur.trim()).then(function(h){
      if(h!==stored){alert('Текущий PIN неверный.');return;}
      askNew();
    });
  } else askNew();
}
function bvLogout(){
  if(!confirm('Выйти и заблокировать панель? Для входа снова понадобится PIN.'))return;
  try{localStorage.removeItem('bv_b2b_pin_trust');}catch(e){}
  location.reload();
}
function bvHash(s){
  try{
    var enc=new TextEncoder().encode('bvpin:'+s);
    return crypto.subtle.digest('SHA-256',enc).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
    });
  }catch(e){
    var h=0,t='bvpin:'+s;for(var i=0;i<t.length;i++){h=(h*31+t.charCodeAt(i))|0;}
    return Promise.resolve('f'+(h>>>0).toString(16));
  }
}
function initLock(onUnlock){
  var ov=document.getElementById('bvLock');
  if(!ov){onUnlock();return;}
  function unlock(){ov.style.display='none';onUnlock();}
  var stored='';try{stored=localStorage.getItem('bv_b2b_pin')||'';}catch(e){}
  var trust=0;try{trust=Number(localStorage.getItem('bv_b2b_pin_trust')||0);}catch(e){}
  if(stored&&trust&&Date.now()<trust){unlock();return;}
  var msg=document.getElementById('bvLockMsg'),err=document.getElementById('bvLockErr'),
      inp=document.getElementById('bvLockPin'),btn=document.getElementById('bvLockBtn'),
      trustEl=document.getElementById('bvLockTrust'),forgot=document.getElementById('bvLockForgot');
  var creating=!stored;
  if(creating){msg.textContent='Задайте PIN (4–8 цифр) — он будет нужен для входа';btn.textContent='Сохранить PIN';forgot.style.display='none';}
  function fail(t){err.textContent=t;inp.value='';inp.focus();}
  function submit(){
    var v=(inp.value||'').trim();
    if(creating){
      if(!/^\d{4,8}$/.test(v)){fail('PIN — от 4 до 8 цифр');return;}
      bvHash(v).then(function(h){try{localStorage.setItem('bv_b2b_pin',h);}catch(e){}
        if(trustEl.checked){try{localStorage.setItem('bv_b2b_pin_trust',String(Date.now()+30*864e5));}catch(e){}}
        unlock();});
      return;
    }
    bvHash(v).then(function(h){
      if(h===stored){
        if(trustEl.checked){try{localStorage.setItem('bv_b2b_pin_trust',String(Date.now()+30*864e5));}catch(e){}}
        else{try{localStorage.removeItem('bv_b2b_pin_trust');}catch(e){}}
        unlock();
      }else fail('Неверный PIN');
    });
  }
  btn.addEventListener('click',submit);
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')submit();});
  forgot.addEventListener('click',function(){
    var mk='';try{mk=localStorage.getItem('bv_b2b_master')||'';}catch(e){}
    if(!mk){alert('Сбросить PIN можно через мастер-ключ, но он не сохранён на этом устройстве. Очистите данные сайта в браузере и задайте PIN заново.');return;}
    var entered=prompt('Введите мастер-ключ (как в Code.gs), чтобы сбросить PIN:');
    if(entered===null)return;
    if(entered.trim()===mk){try{localStorage.removeItem('bv_b2b_pin');localStorage.removeItem('bv_b2b_pin_trust');}catch(e){}alert('PIN сброшен. Задайте новый.');location.reload();}
    else alert('Мастер-ключ неверный.');
  });
  inp.focus();
}

/* ---------- init (после разблокировки) ---------- */
function bootApp(){
  loadAll().then(function(){
    renderCatalog();renderTerms();renderVersions();renderKPArchive();renderFoot();renderPartners();
    if(typeof bvRefreshPartnerHints==='function')bvRefreshPartnerHints();
    if(typeof renderOrdManual==='function')renderOrdManual();
    offerLines=[newLine()];renderOffer();
  });
}
