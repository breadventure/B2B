/* ============================================================
 * BreadVenture B2B — Ядро: конфигурация, состояние, облако
 * Бренд-токены, GAS_URL/MASTER, глобальное состояние (catalog, partners, orders…),
 *    функции связи с сервером (cloudPut/pull/sync), снапшоты версий, архив КП.
 *    Загружается ПЕРВЫМ — остальные модули используют его глобальные переменные и функции.
 * Файл #1 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

"use strict";
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function uid(){return 'i'+Math.random().toString(36).slice(2,9);}
function fmt(n){return (Math.round(n*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});}
function toast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show');},1900);}
function nowStr(){return new Date().toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}

var K_CAT='bv_b2b_catalog_v2', K_TERMS='bv_b2b_terms_v3',
    K_PHIST='bv_b2b_pricehist_v1', K_KPARCH='bv_b2b_kparch_v1', K_FOOT='bv_b2b_foot_v1';
var DEFAULT_FOOT={
  noteRu:'Предложение действует по предварительному согласованию. Заказ — не позднее 48 ч до поставки.',
  noteSr:'Ponuda važi uz prethodni dogovor. Porudžbina najkasnije 48h pre isporuke.',
  ownerRu:'Светлана Васильева (основательница)',
  ownerSr:'Svetlana Vasiljeva (vlasnica)',
  brand:'BreadVenture', email:'breadventure.bakery@gmail.com', phone:'+381 63 705 7214'
};
var footData=JSON.parse(JSON.stringify(DEFAULT_FOOT));
function footNote(lang){return lang==='sr'?(footData.noteSr||footData.noteRu):footData.noteRu;}
function footOwner(lang){return lang==='sr'?(footData.ownerSr||footData.ownerRu):footData.ownerRu;}
function footLine(lang){return '<b>'+esc(footData.brand)+'</b> · '+esc(footData.email)+' · '+esc(footData.phone)+' · '+esc(footOwner(lang));}
var PDV=0.10, FREE_FROM=7000, MIN_DELIVERY=2500, DELIVERY=350, kpLang='ru', termsLang='ru';

var DEFAULT_TERMS=[
  {id:uid(),titleRu:'Минимальная сумма заказа и доставка',
   bodyRu:'Доставка по Белграду нашей службой — при заказе от 2500 динаров на один адрес. При сумме менее 2500 динаров доступен только самовывоз из пекарни.\nСтоимость доставки — 350 динаров на адрес, оплачивает заказчик.\nБесплатная доставка — при заказе от 7000 динаров на один адрес.\nПри использовании стороннего сервиса (DExpress, Glovo и т.д.) BreadVenture не несёт ответственности за состояние продукции после передачи курьеру.\nВ воскресенье отгрузки не осуществляются.',
   titleSr:'Minimalni iznos porudžbine i dostava',
   bodySr:'Dostava u Beogradu vrši se putem naše službe — za porudžbine od 2500 dinara po adresi. Za porudžbine manje od 2500 dinara dostupno je samo preuzimanje u pekari.\nCena dostave — 350 dinara po adresi, plaća kupac.\nBesplatna dostava — za porudžbine od 7000 dinara po adresi.\nAko kupac koristi spoljnu uslugu (DExpress, Glovo itd.), BreadVenture ne snosi odgovornost za stanje proizvoda nakon predaje kuriru.\nNedeljom se otprema ne vrši.'},
  {id:uid(),titleRu:'Оплата',
   bodyRu:'Оплата — по предварительному расчёту не позднее чем за один рабочий день до даты поставки, либо наличными при получении с обязательной выдачей фискального чека.\nОтложенные платежи возможны только для надёжных клиентов (сотрудничество не менее 3 месяцев) либо по письменному согласованию с главным менеджером.',
   titleSr:'Plaćanje',
   bodySr:'Plaćanje — po prethodnom proračunu najkasnije jedan radni dan pre datuma isporuke, ili gotovinski prilikom preuzimanja uz obavezno izdavanje fiskalnog računa.\nOdloženo plaćanje moguće je samo za pouzdane klijente (saradnja najmanje 3 meseca) ili po pisanom dogovoru sa glavnim menadžerom.'},
  {id:uid(),titleRu:'Срок оформления заказа',
   bodyRu:'Заказ оформляется заблаговременно, но не позднее чем за 48 часов до планируемой даты поставки. Это обусловлено технологическим циклом производства — две рабочие смены.\nДоставка в день оформления заказа или на следующий рабочий день невозможна.',
   titleSr:'Rok za podnošenje porudžbine',
   bodySr:'Porudžbina se podnosi unapred, ali najkasnije 48 sati pre planiranog datuma isporuke. Ovo je uslovljeno tehnološkim ciklusom proizvodnje — dve radne smene.\nIsporuka istog dana ili sledećeg radnog dana nije moguća.'},
  {id:uid(),titleRu:'Отмена заказа',
   bodyRu:'Отмена возможна не менее чем за 24 часа до поставки.\nПри более поздней отмене стоимость не возвращается — после указанного времени продукция идёт в производство и подлежит оплате.',
   titleSr:'Otkazivanje porudžbine',
   bodySr:'Otkazivanje je moguće najmanje 24 sata pre isporuke.\nU slučaju kasnijeg otkazivanja, cena se ne vraća — nakon navedenog vremena proizvodnja počinje i podleže plaćanju.'},
  {id:uid(),titleRu:'Ремесленный характер продукции',
   bodyRu:'Наша продукция — живая, ремесленная, медленно ферментированная вручную. Возможны естественные отклонения по цвету, форме, текстуре, блеску, пористости — это не дефект, а характер живого продукта.\nПри серьёзных дефектах (структурные нарушения, проблемы с упаковкой, непригодность к использованию) мы предлагаем возврат средств или повторную бесплатную поставку в согласованный день. О проблеме необходимо сообщить в течение 12 часов после получения.',
   titleSr:'Ručna izrada proizvoda i prirodna odstupanja',
   bodySr:'Naši proizvodi su živi, ručno rađeni, sporo fermentisani. Moguća su prirodna odstupanja u boji, obliku, teksturi, sjaju, poroznosti — to se ne smatra defektom, već odražava karakter živog proizvoda.\nU slučaju ozbiljnih defekata (strukturna oštećenja, problemi sa pakovanjem, neprikladnost za upotrebu) nudimo povraćaj sredstava ili ponovnu besplatnu isporuku u dogovorenom danu. O problemu je potrebno obavestiti u roku od 12 sati nakon prijema.'},
  {id:uid(),titleRu:'Кастомизация продукции',
   bodyRu:'По запросу возможны индивидуальные настройки: изменение граммовки, адаптация вкусового профиля, изменение формы или текстуры, упаковка под формат клиента, разработка отдельного вида продукции.\nВсе кастомизации — только по предварительному письменному согласованию с главным менеджером. Срок реализации — не менее 2 недель.',
   titleSr:'Prilagođavanje proizvoda',
   bodySr:'Na zahtev su moguća individualna podešavanja: promena gramaže, prilagođavanje profila ukusa, promena oblika ili teksture, pakovanje prema formatu klijenta, razvoj posebne vrste proizvoda.\nSva prilagođavanja su moguća samo po prethodnom pisanom dogovoru sa glavnim menadžerom. Rok realizacije — najmanje 2 nedelje.'},
  {id:uid(),titleRu:'Политика возврата',
   bodyRu:'Претензии и возврат/замена принимаются только при серьёзном дефекте или деформации, если клиент сообщил о проблеме в течение 12 часов с момента получения товара.\nПо истечении этого срока продукция считается принятой без замечаний.',
   titleSr:'Politika vraćanja',
   bodySr:'Reklamacije i povraćaj/zamena prihvataju se samo u slučaju ozbiljnog defekta ili deformacije, ako je klijent prijavio problem u roku od 12 sati od trenutka prijema robe.\nNakon tog roka, proizvod se smatra prihvaćenim bez primedbi.'}
];

function DC(){return [
  {id:uid(),cat:'Хлеб',name:'Francuski tartin',weight:'650 г',retail:330,
   desc:'Мягкая, не крошащаяся корка и влажный, эластичный мякиш благодаря высокой гидратации. Идеальная основа для сэндвичей, тостов и сырной тарелки. Вкус стабильный, без резкой кислотности, с фруктовыми и ореховыми нотками. Поставляется целиком.',
   sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:15},{min:10,disc:20},{min:15,disc:25}]},
  {id:uid(),cat:'Хлеб',name:'Francuski tartin',weight:'1000 г',retail:465,
   desc:'Тартин в большом формате (1 кг) — под регулярные поставки. Высокая гидратация, мягкая корка, эластичный мякиш.',
   sostav:'', photo:'', tiers:[{min:1,disc:15},{min:6,disc:20},{min:11,disc:25},{min:15,disc:30}]},
  {id:uid(),cat:'Хлеб',name:'Rustični hleb sa semenkama',weight:'670 г',retail:380,
   desc:'Собственный микс отборных семян, предварительно обжаренных — яркий аромат и глубокий вкус. К супам, бранчам и горячим закускам.',
   sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:15},{min:10,disc:20},{min:15,disc:25}]},
  {id:uid(),cat:'Хлеб',name:'Brioš hleb',weight:'280 г',retail:450,
   desc:'Длительная ферментация на закваске, маслянистая текстура, карамельное и сливочное послевкусие (только коричневый сахар). Для слайдеров, бранч-блюд и сладких подач.',
   sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:25},{min:10,disc:30},{min:15,disc:35}]},
  {id:uid(),cat:'Хлеб',name:'Raženi hleb',weight:'460 г',retail:320,
   desc:'Аутентичный вкус с лёгкой кислинкой и насыщенным ароматом ржаной муки. Плотный, сочный мякиш, плотная корка сохраняет свежесть.',
   sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:15},{min:10,disc:20},{min:15,disc:25}]},
  {id:uid(),cat:'Булки и выпечка',name:'Cimet rolnica',weight:'',retail:330,
   desc:'Булочка с корицей.', sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:30},{min:10,disc:35},{min:15,disc:40}]},
  {id:uid(),cat:'Булки и выпечка',name:'Rolnica sa sirom',weight:'',retail:300,
   desc:'Булочка с сыром.', sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:30},{min:10,disc:35},{min:15,disc:40}]},
  {id:uid(),cat:'Булки и выпечка',name:'Rolnica sa makom',weight:'',retail:300,
   desc:'Булочка с маком.', sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:30},{min:10,disc:35},{min:15,disc:40}]},
  {id:uid(),cat:'Булки и выпечка',name:'Brioš sa karamelom',weight:'',retail:300,
   desc:'Бриошь с карамелью.', sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:15},{min:10,disc:25},{min:15,disc:30}]},
  {id:uid(),cat:'Булки и выпечка',name:'Brioš zemička',weight:'',retail:280,
   desc:'Бриошь-булочка.', sostav:'', photo:'', tiers:[{min:1,disc:0},{min:5,disc:30},{min:10,disc:35},{min:15,disc:40}]},
  {id:uid(),cat:'Булки и выпечка',name:'Babka sa lešnikom i čokoladom (mala)',weight:'',retail:330,
   desc:'Бабка с фундуком и шоколадом, малая.', sostav:'', photo:'', tiers:[{min:1,disc:15},{min:5,disc:20},{min:10,disc:25},{min:20,disc:30}]},
  {id:uid(),cat:'Булки и выпечка',name:'Velika babka sa lešnikom i čokoladom',weight:'',retail:750,
   desc:'Большая бабка с фундуком и шоколадом в форме. ~378 г, после отпёка ~340 г.', sostav:'', photo:'', tiers:[{min:1,disc:15},{min:5,disc:20},{min:10,disc:25},{min:20,disc:30}]},
  {id:uid(),cat:'Бриошь-булочки',name:'Brioš zemička 120 g',weight:'120 г',retail:155,
   desc:'Бриошь-булочка 120 г. Скидка на объёмы 35+ обсуждается индивидуально.', sostav:'', photo:'', tiers:[{min:1,disc:15},{min:16,disc:20}]},
  {id:uid(),cat:'Бриошь-булочки',name:'Brioš zemička 130 g',weight:'130 г',retail:168,
   desc:'Бриошь-булочка 130 г. Скидка на объёмы 35+ обсуждается индивидуально.', sostav:'', photo:'', tiers:[{min:1,disc:15},{min:16,disc:20}]}
];}

var catalog=[], terms=[], offerLines=[], priceHistory=[], kpArchive=[], partners=[], catNamesSr={}, partnerPrefs={}, holidays=[], lastKP=null, selectedCats={};
var profilesAdmin={}, pointsAdmin=[], announceData=[], openPartnerId='';
var storageData=null, storeLang='ru';

/* ---- облако (Google Apps Script + Таблица) ---- */
var K_GAS='bv_b2b_gas_url', K_MK='bv_b2b_master';
var GAS_URL='', MASTER='';
try{GAS_URL=localStorage.getItem(K_GAS)||'';MASTER=localStorage.getItem(K_MK)||'';}catch(e){}
var cloudState='off'; // off | on | err

function stripPhotosArr(cat){return cat.map(function(it){var c=JSON.parse(JSON.stringify(it));c.photo='';return c;});}
function setSync(state,note){
  cloudState=state;
  var dot=document.getElementById('syncDot'),lab=document.getElementById('syncLabel');
  if(!dot)return;
  dot.className='sync-dot '+(state==='on'?'on':state==='err'?'err':'off');
  lab.textContent=note||(state==='on'?'Синхронизировано':state==='err'?'Ошибка облака':'Только это устройство');
}
function cloudGet(){
  if(!GAS_URL)return Promise.reject('no-url');
  return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({pull:true,master:MASTER})}).then(function(r){return r.json();})
    .then(function(j){if(j&&j.ok)return j.data||{};throw (j&&j.error)||'bad';});
}
function cloudPut(key,value){
  if(!GAS_URL||cloudState==='off')return Promise.resolve();
  return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({master:MASTER,key:key,value:value})}).then(function(r){return r.json();})
    .then(function(){setSync('on');}).catch(function(){setSync('err','Не сохранилось в облако');});
}
function cloudPutAll(){
  if(!GAS_URL)return Promise.reject('no-url');
  var payload={catalog:stripPhotosArr(catalog),terms:terms,kpArchive:kpArchive,foot:footData,priceHistory:priceHistory,partners:partners,catNamesSr:catNamesSr,partnerPrefs:partnerPrefs,settings:{free:FREE_FROM,minDeliv:MIN_DELIVERY,deliv:DELIVERY,leadDays:2,holidays:holidays}};
  return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({master:MASTER,all:payload})}).then(function(r){return r.json();})
    .then(function(j){if(j&&j.ok)return j;throw (j&&j.error)||'bad';});
}
var DEFAULT_SELLER={
  name:'Svetlana Vasileva PR Proizvodnja hleba, svežeg peciva i kolača BreadVenture Beograd',
  address:'Bulevar Zorana Đinđića 67',
  city:'11070 Novi Beograd',
  mb:'67411315',pib:'114222897',tr:'200-3781700101033-06'
};
var docConfig={seller:null,counters:{predracun:0,otpremnica:0},parties:{}};
var declProducts={};
var declArchive=[];
function sellerData(){return (docConfig.seller&&docConfig.seller.name)?docConfig.seller:DEFAULT_SELLER;}
function applyCloudData(data){
  var declProductsLegacy=null;
  if(data.declProducts&&typeof data.declProducts==='object')declProducts=data.declProducts;
  if(Array.isArray(data.declArchive))declArchive=data.declArchive;
  if(data.catalog&&data.catalog.length){
    var photoByKey={};catalog.forEach(function(it){photoByKey[it.name+'|'+it.weight]=it.photo;});
    catalog=data.catalog.map(function(it){var c=JSON.parse(JSON.stringify(it));if(!c.id)c.id=uid();
      var ph=photoByKey[c.name+'|'+c.weight];if(ph)c.photo=ph;
      if(!c.tiers)c.tiers=[];if(c.desc==null)c.desc='';if(c.sostav==null)c.sostav='';
      if(c.descSr==null)c.descSr='';if(c.sostavSr==null)c.sostavSr='';if(c.photo==null)c.photo='';
      if(c.pdv==null)c.pdv=10;if(c.uom==null)c.uom='шт';return c;});
  }
  if(data.terms&&data.terms.length&&data.terms[0].titleSr){terms=data.terms;terms.forEach(function(t){if(!t.id)t.id=uid();});}
  if(Array.isArray(data.kpArchive))kpArchive=data.kpArchive;
  if(Array.isArray(data.priceHistory))priceHistory=data.priceHistory;
  if(Array.isArray(data.partners))partners=data.partners;
  if(data.catNamesSr&&typeof data.catNamesSr==='object')catNamesSr=data.catNamesSr;
  if(data.partnerPrefs&&typeof data.partnerPrefs==='object')partnerPrefs=data.partnerPrefs;
  if(data.settings&&Array.isArray(data.settings.holidays))holidays=data.settings.holidays;
  if(data.profiles&&typeof data.profiles==='object')profilesAdmin=data.profiles;
  if(Array.isArray(data.points))pointsAdmin=data.points;
  if(data.announce)announceData=normalizeAnnounce(data.announce);
  if(data.storage&&typeof data.storage==='object')storageData=data.storage;
  if(data.docConfig&&typeof data.docConfig==='object'){
    docConfig=data.docConfig;
    if(!docConfig.counters)docConfig.counters={predracun:0,otpremnica:0};
    if(!docConfig.parties)docConfig.parties={};
    if(!docConfig.seller)docConfig.seller=null;
    // миграция: старый справочник лежал внутри docConfig
    if(docConfig.declProducts&&typeof docConfig.declProducts==='object')declProductsLegacy=docConfig.declProducts;
  }
  if(declProductsLegacy&&!Object.keys(declProducts).length)declProducts=declProductsLegacy;
  if(data.foot){for(var fk in DEFAULT_FOOT)if(data.foot[fk]!=null)footData[fk]=data.foot[fk];}
}
function rerenderAll(){renderCatalog();renderTerms();renderVersions();renderKPArchive();renderFoot();renderPartners();refreshOfferRefs();if(typeof bvRefreshPartnerHints==='function')bvRefreshPartnerHints();if(typeof renderOrdManual==='function')renderOrdManual();}

function loadLocal(){
  try{var c=localStorage.getItem(K_CAT);if(c)catalog=JSON.parse(c);}catch(e){}
  if(!Array.isArray(catalog)||!catalog.length)catalog=DC();
  catalog.forEach(function(it){if(!it.tiers)it.tiers=[];if(it.desc==null)it.desc='';if(it.sostav==null)it.sostav='';if(it.descSr==null)it.descSr='';if(it.sostavSr==null)it.sostavSr='';if(it.photo==null)it.photo='';if(it.pdv==null)it.pdv=10;if(it.uom==null)it.uom='шт';});
  try{var t=localStorage.getItem(K_TERMS);if(t)terms=JSON.parse(t);}catch(e){}
  if(!Array.isArray(terms)||!terms.length||!terms[0].titleSr)terms=JSON.parse(JSON.stringify(DEFAULT_TERMS));
  terms.forEach(function(tm){if(!tm.id)tm.id=uid();});
  try{var p=localStorage.getItem(K_PHIST);if(p)priceHistory=JSON.parse(p);}catch(e){}
  if(!Array.isArray(priceHistory))priceHistory=[];
  try{var k=localStorage.getItem(K_KPARCH);if(k)kpArchive=JSON.parse(k);}catch(e){}
  if(!Array.isArray(kpArchive))kpArchive=[];
  try{var f=localStorage.getItem(K_FOOT);if(f){var fd=JSON.parse(f);for(var kk in DEFAULT_FOOT)if(fd[kk]!=null)footData[kk]=fd[kk];}}catch(e){}
  try{var prt=localStorage.getItem('bv_b2b_partners');if(prt)partners=JSON.parse(prt);}catch(e){}
  if(!Array.isArray(partners))partners=[];
  try{var cs=localStorage.getItem('bv_b2b_catsr');if(cs)catNamesSr=JSON.parse(cs);}catch(e){}
  if(!catNamesSr||typeof catNamesSr!=='object')catNamesSr={};
  try{var ppf=localStorage.getItem('bv_b2b_pprefs');if(ppf)partnerPrefs=JSON.parse(ppf);}catch(e){}
  if(!partnerPrefs||typeof partnerPrefs!=='object')partnerPrefs={};
  try{var hd=localStorage.getItem('bv_b2b_holidays');if(hd)holidays=JSON.parse(hd);}catch(e){}
  if(!Array.isArray(holidays))holidays=[];
}
function loadAll(){
  loadLocal();
  if(!GAS_URL){setSync('off');return Promise.resolve();}
  setSync('off','Подключение к облаку…');
  return cloudGet().then(function(data){
    applyCloudData(data);cloudState='on';setSync('on');
  }).catch(function(){cloudState='err';setSync('err','Облако недоступно — работаю локально');});
}
function saveCat(){try{localStorage.setItem(K_CAT,JSON.stringify(catalog));flash('priceStatus');}catch(e){toast('Память переполнена — уменьшите число фото');}cloudPut('catalog',stripPhotosArr(catalog));}
function saveTerms(){try{localStorage.setItem(K_TERMS,JSON.stringify(terms));flash('termsStatus');}catch(e){}cloudPut('terms',terms);}
function savePHist(){try{localStorage.setItem(K_PHIST,JSON.stringify(priceHistory));}catch(e){toast('Память переполнена — удалите старые версии');}cloudPut('priceHistory',priceHistory);}
function saveKPArch(){try{localStorage.setItem(K_KPARCH,JSON.stringify(kpArchive));}catch(e){toast('Память переполнена — удалите старые КП');}cloudPut('kpArchive',kpArchive);}
function saveFoot(){try{localStorage.setItem(K_FOOT,JSON.stringify(footData));flash('termsStatus');}catch(e){}cloudPut('foot',footData);}
function savePartners(){try{localStorage.setItem('bv_b2b_partners',JSON.stringify(partners));}catch(e){}cloudPut('partners',partners);}
function saveCatSr(){try{localStorage.setItem('bv_b2b_catsr',JSON.stringify(catNamesSr));}catch(e){}cloudPut('catNamesSr',catNamesSr);}
function savePartnerPrefs(){try{localStorage.setItem('bv_b2b_pprefs',JSON.stringify(partnerPrefs));}catch(e){}cloudPut('partnerPrefs',partnerPrefs);}
function saveHolidays(){try{localStorage.setItem('bv_b2b_holidays',JSON.stringify(holidays));}catch(e){}cloudPut('settings',{free:FREE_FROM,minDeliv:MIN_DELIVERY,deliv:DELIVERY,leadDays:2,holidays:holidays});}
function flash(id){var el=document.getElementById(id);if(!el)return;el.innerHTML='<b>Сохранено ✓</b> '+nowStr();
  clearTimeout(el._t);el._t=setTimeout(function(){el.textContent='Правки сохраняются автоматически';},2500);}

function discountFor(item,qty){if(!item||!item.tiers||!item.tiers.length)return 0;
  var d=0,best=-1;item.tiers.forEach(function(t){if(qty>=t.min&&t.min>best){best=t.min;d=Number(t.disc)||0;}});return d;}
function itemPdv(it){var v=(it&&it.pdv!=null&&it.pdv!=='')?Number(it.pdv):10;return isNaN(v)?10:v;}
function itemUnit(it){return (it&&it.uom)?it.uom:'шт';}
function uomLoc(u,lang){if(lang!=='sr')return u||'шт';var m={'шт':'kom','кг':'kg','г':'g','мл':'ml','л':'l'};return m[u]||u||'kom';}
function locDesc(it,lang){return lang==='sr'?(it.descSr||it.desc||''):(it.desc||'');}
function locSostav(it,lang){return lang==='sr'?(it.sostavSr||it.sostav||''):(it.sostav||'');}
function visTag(it){return it.b2bHide?' · 🚫 скрыто от партнёров':((Array.isArray(it.b2bOnly)&&it.b2bOnly.length)?' · 👤 только выбранным':'');}
function minB2B(item){if(!item.tiers||!item.tiers.length)return item.retail;
  var md=0;item.tiers.forEach(function(t){if((Number(t.disc)||0)>md)md=Number(t.disc)||0;});return item.retail*(1-md/100);}
function itemById(id){for(var i=0;i<catalog.length;i++)if(catalog[i].id===id)return catalog[i];return null;}

/* ---- version snapshots (catalog without photos + terms) ---- */
function stripPhotos(cat){return cat.map(function(it){var c=JSON.parse(JSON.stringify(it));c.photo='';return c;});}
function saveVersion(kind){
  priceHistory.unshift({id:uid(),ts:Date.now(),when:nowStr(),kind:kind,
    catalog:stripPhotos(catalog),terms:JSON.parse(JSON.stringify(terms))});
  savePHist();renderVersions();
}
function restoreVersion(id){
  var v=null;priceHistory.forEach(function(x){if(x.id===id)v=x;});if(!v)return;
  if(!confirm('Восстановить версию от '+v.when+'? Текущее состояние сначала сохранится в историю. Фото подтянутся для совпадающих позиций.'))return;
  saveVersion('Авто: перед восстановлением');
  var photoByKey={};catalog.forEach(function(it){photoByKey[it.name+'|'+it.weight]=it.photo;});
  catalog=v.catalog.map(function(it){var c=JSON.parse(JSON.stringify(it));c.id=c.id||uid();
    var ph=photoByKey[c.name+'|'+c.weight];if(ph)c.photo=ph;return c;});
  terms=JSON.parse(JSON.stringify(v.terms));terms.forEach(function(t){if(!t.id)t.id=uid();});
  saveCat();saveTerms();renderCatalog();renderTerms();refreshOfferRefs();
  toast('Версия восстановлена');
}
function deleteVersion(id){if(!confirm('Удалить эту версию из истории?'))return;
  priceHistory=priceHistory.filter(function(x){return x.id!==id;});savePHist();renderVersions();}

/* ---- KP archive ---- */
function archiveLastKP(){
  if(!lastKP){toast('Сначала сформируйте КП');return;}
  kpArchive.unshift(JSON.parse(JSON.stringify(lastKP)));
  saveKPArch();renderKPArchive();toast('КП сохранено в архив');
}
function deleteKP(id){if(!confirm('Удалить это КП из архива?'))return;
  kpArchive=kpArchive.filter(function(x){return x.id!==id;});saveKPArch();renderKPArchive();}

/* ===== Единый список партнёров для полей ввода (подсказки) ===== */
function bvPartnerNames(){
  var out=[],seen={};
  (partners||[]).forEach(function(p){
    if(p.name&&!seen[p.name]){seen[p.name]=1;out.push(p.name);}
    var pr=(profilesAdmin||{})[p.id];
    if(pr&&pr.company&&!seen[pr.company]){seen[pr.company]=1;out.push(pr.company);}
  });
  return out.sort(function(a,b){return a.localeCompare(b,'ru');});
}
function bvPartnerDatalist(){
  var dl=document.getElementById('bvPartnerList');
  if(!dl){dl=document.createElement('datalist');dl.id='bvPartnerList';document.body.appendChild(dl);}
  dl.innerHTML=bvPartnerNames().map(function(n){return '<option value="'+esc(n)+'"></option>';}).join('');
  return dl;
}
function bvAttachPartnerHints(ids){
  bvPartnerDatalist();
  (ids||[]).forEach(function(id){
    var el=document.getElementById(id);
    if(el&&el.tagName==='INPUT'){el.setAttribute('list','bvPartnerList');el.setAttribute('autocomplete','off');}
  });
}
function bvRefreshPartnerHints(){
  bvAttachPartnerHints(['partner','declRecipient']);
}
