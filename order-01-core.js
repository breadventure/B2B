/* ============================================================
 * BreadVenture — кабинет партнёра — Ядро кабинета партнёра
 * Конфигурация, состояние, связь с облаком, общие хелперы, навигация.
 * Файл #1 из 5. Общий scope, порядок подключения важен (01 первым).
 * ============================================================ */

/* ВСТАВЬТЕ СЮДА тот же URL веб-приложения Apps Script, что и в B2B-инструменте */
var GAS_URL='https://script.google.com/macros/s/AKfycbxec2oCFdaE1hEwCo_GGIyThwihoYk1IOChYUcxLHPqBZU4lzB_d06tav85dPFmGX1o/exec';

var PDV_DEFAULT=10, FREE_FROM=7000, MIN_DELIVERY=2500, DELIVERY=350;
var catalog=[], qtyMap={}, pickup=false, CODE='', PARTNER='', ORDERS=[], DOCS=[], TERMS=[], FOOT={}, CATSR={}, VIEW='new', openOrder='';
var SUBS=[], subQty={}, subEditId='', subDays=[];
var POINTS=[], selPoint='';
var deliveries=[], PROFILE={}, ANNOUNCE={}, STORAGE=null;
var LANG='ru';try{LANG=localStorage.getItem('bv_partner_lang')||'ru';}catch(e){}
var HOLIDAYS=[];var HOLIDAY_RAW=[];var LEAD_DAYS=2;
try{CODE=localStorage.getItem('bv_partner_code')||'';}catch(e){}

var DOC_T={invoice:'Счёт',delivery_note:'Накладная',terms:'Условия',contract:'Договор',certificate:'Сертификат',offer:'КП',other:'Документ'};
var DOC_T_SR={invoice:'Račun',delivery_note:'Otpremnica',terms:'Uslovi',contract:'Ugovor',certificate:'Sertifikat',offer:'Ponuda',other:'Dokument'};
var TL={
  ru:{neworder:'Новый заказ',myorders:'Мои заказы',docs:'Документы',info:'Условия работы',pricetab:'Прайс-лист',logout:'выйти',
    submit:'Отправить заказ',pick:'выберите позиции',pos:'поз.',repeat:'Повторить',details:'Подробнее',collapse:'Свернуть',
    deliv:'Данные доставки',contact:'Контактное лицо',phone:'Телефон',ddate:'Дата доставки',
    pickup:'Самовывоз из пекарни (без доставки)',comment:'Комментарий',dtime:'Время доставки',address:'Адрес заведения',earliest:'Ближайшая доступная дата',needdate:'Укажите дату доставки.',needaddr:'Укажите адрес заведения для доставки.',blocked:'На эту дату заказ разместить нельзя.',nearest:'Ближайшая доступная дата',sundayoff:'По воскресеньям отгрузки нет.',cutoff:'Заказ принимается не позднее чем за 2 дня до доставки (производственный цикл).',
    statusHist:'История статуса',bakeryComments:'Комментарии пекарни',yourComment:'Ваш комментарий',
    noOrders:'У вас пока нет заказов.',noDocs:'Документы появятся здесь после загрузки пекарней.',
    open:'Открыть / скачать',terms:'Условия сотрудничества',contacts:'Контакты',price:'Актуальный прайс',
    delivHint:'Не ранее чем через 48 часов. По воскресеньям отгрузки нет.'},
  sr:{neworder:'Nova porudžbina',myorders:'Moje porudžbine',docs:'Dokumenti',info:'Uslovi rada',pricetab:'Cenovnik',logout:'izlaz',
    submit:'Pošalji porudžbinu',pick:'izaberite stavke',pos:'stavki',repeat:'Ponovi',details:'Detaljnije',collapse:'Sažmi',
    deliv:'Podaci o dostavi',contact:'Kontakt osoba',phone:'Telefon',ddate:'Datum isporuke',
    pickup:'Preuzimanje u pekari (bez dostave)',comment:'Komentar',dtime:'Vreme isporuke',address:'Adresa objekta',earliest:'Najraniji dostupan datum',needdate:'Navedite datum isporuke.',needaddr:'Navedite adresu objekta za dostavu.',blocked:'Za ovaj datum nije moguće napraviti porudžbinu.',nearest:'Najraniji dostupan datum',sundayoff:'Nedeljom se ne isporučuje.',cutoff:'Porudžbina se prima najkasnije 2 dana pre isporuke (proizvodni ciklus).',
    statusHist:'Istorija statusa',bakeryComments:'Komentari pekare',yourComment:'Vaš komentar',
    noOrders:'Još nemate porudžbine.',noDocs:'Dokumenti će se pojaviti ovde nakon što ih pekara doda.',
    open:'Otvori / preuzmi',terms:'Uslovi saradnje',contacts:'Kontakt',price:'Aktuelni cenovnik',
    delivHint:'Najranije za 48 sati. Nedeljom se ne isporučuje.'}
};
function L(k){return (TL[LANG]&&TL[LANG][k])||TL.ru[k]||k;}
var ST_SR={submitted:'Nova',confirmed:'Potvrđena',in_production:'U pripremi',packed:'Spakovana',out_for_delivery:'U dostavi',delivered:'Isporučena',cancelled:'Otkazana'};
function stName(s){return LANG==='sr'?(ST_SR[s]||s):(ST[s]||s);}
function catName(cat){return (LANG==='sr'&&CATSR[cat])?CATSR[cat]:cat;}
function docType(t){return LANG==='sr'?(DOC_T_SR[t]||t):(DOC_T[t]||t);}
function ORD_DOC_SR(t){var ru={predracun:'Предсчёт (predračun)',otpremnica:'Отпремница',deklaracija:'Декларация',invoice:'Счёт',other:'Документ'};var sr={predracun:'Predračun',otpremnica:'Otpremnica',deklaracija:'Deklaracija',invoice:'Račun',other:'Dokument'};return LANG==='sr'?(sr[t]||t):(ru[t]||t);}

var ST={submitted:'Новый',confirmed:'Подтверждён',in_production:'В производстве',packed:'Собран',out_for_delivery:'В доставке',delivered:'Доставлен',cancelled:'Отменён'};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return (Math.round(n*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});}
function itemPdv(it){var v=(it&&it.pdv!=null&&it.pdv!=='')?Number(it.pdv):PDV_DEFAULT;return isNaN(v)?PDV_DEFAULT:v;}
function itemUnit(it){return (it&&it.uom)?it.uom:'шт';}
function uName(u){if(LANG!=='sr')return u||'шт';return ({'шт':'kom','кг':'kg','г':'g','мл':'ml','л':'l'})[u]||u;}
function cur(){return LANG==='sr'?'din.':'дин.';}
function ymd(d){var m=(''+(d.getMonth()+1)).padStart(2,'0'),dd=(''+d.getDate()).padStart(2,'0');return d.getFullYear()+'-'+m+'-'+dd;}
function fmtDate(d){return (''+d.getDate()).padStart(2,'0')+'.'+(''+(d.getMonth()+1)).padStart(2,'0')+'.'+d.getFullYear();}
function isSunday(d){return d.getDay()===0;}
function isHoliday(d){return HOLIDAYS.indexOf(ymd(d))>=0;}
function earliestDate(){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+LEAD_DAYS);return d;}
function isBlockedDate(d){if(d<earliestDate())return true;if(isSunday(d))return true;if(isHoliday(d))return true;return false;}
function nextAvailable(){var d=earliestDate(),g=0;while(isBlockedDate(d)&&g<120){d.setDate(d.getDate()+1);g++;}return d;}
var HOL_LBL={weekend:{ru:'выходные',sr:'neradni dani'},holiday:{ru:'праздничные выходные',sr:'praznični dani'},maintenance:{ru:'технические работы',sr:'tehnički radovi'}};
function holRawType(y){for(var i=0;i<HOLIDAY_RAW.length;i++){var h=HOLIDAY_RAW[i];var d=(typeof h==='string')?h:(h&&h.date);if(d===y)return (typeof h==='string')?'holiday':((h&&h.type)||'holiday');}return 'holiday';}
function timeSlotOptions(sel){var o='<option value="">'+(LANG==='sr'?'— vreme —':'— время —')+'</option>';for(var hh=8;hh<=16;hh++){var t=(hh<10?'0':'')+hh+':00';o+='<option value="'+t+'"'+(sel===t?' selected':'')+'>'+t+'</option>';}return o;}
function holidayBannerHtml(){
  if(!HOLIDAYS.length)return '';
  var today=new Date();today.setHours(0,0,0,0);
  var fut=HOLIDAYS.filter(function(y){return new Date(y+'T00:00:00')>=today;}).sort();
  if(!fut.length)return '';
  var ranges=[],cur=[fut[0]];
  for(var i=1;i<fut.length;i++){var p=new Date(fut[i-1]+'T00:00:00'),n=new Date(fut[i]+'T00:00:00');if((n-p)===86400000)cur.push(fut[i]);else{ranges.push(cur);cur=[fut[i]];}}
  ranges.push(cur);
  function f(y){var d=new Date(y+'T00:00:00');return (''+d.getDate()).padStart(2,'0')+'.'+(''+(d.getMonth()+1)).padStart(2,'0')+'.'+d.getFullYear();}
  var sr=(LANG==='sr'),lines=[];
  ranges.forEach(function(r){
    var startD=new Date(r[0]+'T00:00:00'),daysLeft=Math.round((startD-today)/86400000);
    if(daysLeft>14)return;
    var tp=holRawType(r[0]),tn=(HOL_LBL[tp]?HOL_LBL[tp][sr?'sr':'ru']:(sr?'neradni dani':'нерабочие дни'));
    if(r.length===1)lines.push(f(r[0])+' — '+tn);
    else lines.push((sr?'od ':'с ')+f(r[0])+(sr?' do ':' по ')+f(r[r.length-1])+' — '+tn);
  });
  if(!lines.length)return '';
  var head=sr?'Obratite pažnju na neradne dane (uzmite u obzir pri planiranju):':'Обратите внимание на нерабочие дни (учитывайте при планировании):';
  return '<div class="holiday-banner">📅 '+head+'<br>'+lines.join('<br>')+'</div>';
}
function pdvName(){return 'PDV';}
function nextTierHint(it,q){
  if(!it||!it.tiers||!it.tiers.length||q<=0)return '';
  var cd=discountFor(it,q);
  var sorted=it.tiers.slice().sort(function(a,b){return a.min-b.min;});
  var nxt=null;for(var i=0;i<sorted.length;i++){if(sorted[i].min>q&&(Number(sorted[i].disc)||0)>cd){nxt=sorted[i];break;}}
  if(!nxt)return cd>0?(LANG==='sr'?'maksimalan popust −'+fmt(cd)+'%':'макс. скидка −'+fmt(cd)+'%'):'';
  var need=nxt.min-q,uu=uName(itemUnit(it)),dd=fmt(Number(nxt.disc)||0);
  return LANG==='sr'?('još '+need+' '+uu+' do popusta −'+dd+'%'):('ещё '+need+' '+uu+' до скидки −'+dd+'%');
}
function discountFor(it,qty){if(!it||!it.tiers||!it.tiers.length)return 0;var d=0,best=-1;
  it.tiers.forEach(function(t){if(qty>=t.min&&t.min>best){best=t.min;d=Number(t.disc)||0;}});return d;}
function minB2BLocal(it){if(!it||!it.tiers||!it.tiers.length)return it.retail;var md=0;it.tiers.forEach(function(t){var d=Number(t.disc)||0;if(d>md)md=d;});return it.retail*(1-md/100);}
function deliveryInfo(net){if(pickup)return {cost:0,mode:'pickup'};
  if(net<MIN_DELIVERY)return {cost:0,mode:'need'};
  if(net>=FREE_FROM)return {cost:0,mode:'free'};
  return {cost:DELIVERY,mode:'paid'};}
function catList(){var seen={},arr=[];catalog.forEach(function(it){var c=it.cat||'Без категории';if(!seen[c]){seen[c]=1;arr.push(c);}});return arr;}
function itemByNameWeight(name,weight){var r=null;catalog.forEach(function(it){if(it.name===name&&(it.weight||'')===(weight||''))r=it;});return r;}

function compute(){
  var gross=0,base=0,pdvByRate={},cnt=0;
  catalog.forEach(function(it){var q=Math.max(0,Number(qtyMap[it.id])||0);if(!q)return;cnt++;
    var disc=discountFor(it,q);var g=it.retail*(1-disc/100)*q;var rate=itemPdv(it);
    base+=it.retail*q;gross+=g;var pv=g-g/(1+rate/100);pdvByRate[rate]=(pdvByRate[rate]||0)+pv;});
  var pdv=0;for(var k in pdvByRate)pdv+=pdvByRate[k];
  var net=gross-pdv,di=deliveryInfo(net);
  return {base:base,gross:gross,net:net,pdv:pdv,pdvByRate:pdvByRate,save:base-gross,
          delivery:di.cost,mode:di.mode,grand:gross+di.cost,count:cnt};
}

/* ---------- навигация ---------- */
function setView(v){VIEW=v;
  document.getElementById('who').style.display='block';
  document.getElementById('who').innerHTML='<span class="lang-sw"><a class="lng'+(LANG==='ru'?' on':'')+'" data-l="ru">RU</a><a class="lng'+(LANG==='sr'?' on':'')+'" data-l="sr">SR</a></span> · '+esc(PARTNER)+' · <a id="logout">'+L('logout')+'</a>';
  document.getElementById('logout').addEventListener('click',logout);
  var _tag=document.querySelector('.tag');if(_tag)_tag.textContent=(LANG==='sr'?'BreadVenture · zanatska pekara · Beograd':'BreadVenture · ремесленная пекарня · Белград');
  document.querySelectorAll('.lng').forEach(function(a){a.addEventListener('click',function(){LANG=this.dataset.l;try{localStorage.setItem('bv_partner_lang',LANG);}catch(e){}setView(VIEW);});});
  if(v==='new')renderNew();else if(v==='orders')renderOrders();else if(v==='mystats')renderMyStats();else if(v==='subs')renderSubs();else if(v==='points')renderMe();else if(v==='me')renderMe();else if(v==='care')renderStorage();else if(v==='docs')renderDocs();else if(v==='price')renderPriceList();else renderTerms();
}
function navHtml(active){
  return '<nav><button data-v="new" class="'+(active==='new'?'on':'')+'">'+L('neworder')+'</button>'+
         '<button data-v="orders" class="'+(active==='orders'?'on':'')+'">'+L('myorders')+(ORDERS.length?' ('+ORDERS.length+')':'')+(unreadOrders().length?' <span class="ndot"></span>':'')+'</button>'+
         '<button data-v="mystats" class="'+(active==='mystats'?'on':'')+'">'+(LANG==='sr'?'Moja statistika':'Моя статистика')+'</button>'+
         '<button data-v="subs" class="'+(active==='subs'?'on':'')+'">'+(LANG==='sr'?'Redovne porudžbine':'Регулярные заказы')+(pendingCount()?' •'+pendingCount():'')+'</button>'+
         '<button data-v="me" class="'+(active==='me'?'on':'')+'">'+(LANG==='sr'?'Moji podaci i adrese':'Мои данные и адреса')+'</button>'+
         '<button data-v="care" class="'+(active==='care'?'on':'')+'">'+(LANG==='sr'?'Čuvanje i serviranje':'Хранение и подача')+'</button>'+
         '<button data-v="docs" class="'+(active==='docs'?'on':'')+'">'+L('docs')+(DOCS.length?' ('+DOCS.length+')':'')+'</button>'+
         '<button data-v="price" class="'+(active==='price'?'on':'')+'">'+L('pricetab')+'</button>'+
         '<button data-v="info" class="'+(active==='info'?'on':'')+'">'+L('info')+'</button></nav>';
}
function bindNav(){document.querySelectorAll('nav button').forEach(function(b){b.addEventListener('click',function(){setView(this.dataset.v);});});}
function logout(){try{localStorage.removeItem('bv_partner_code');}catch(e){}CODE='';PARTNER='';catalog=[];ORDERS=[];qtyMap={};deliveries=[];PROFILE={};
  document.getElementById('who').style.display='none';document.getElementById('bar').style.display='none';showLogin();}

