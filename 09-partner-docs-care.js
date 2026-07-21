/* ============================================================
 * BreadVenture B2B — Документы партнёров и хранение
 * Документы в кабинете партнёра; модуль хранения и рекомендаций по продукции.
 * Файл #9 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

/* ---------- документы партнёров ---------- */
var documentsAdmin=[];
var DOC_TLBL={invoice:'Счёт',delivery_note:'Накладная',terms:'Условия',contract:'Договор',certificate:'Сертификат',offer:'КП',other:'Документ'};
function fillDocPartners(){
  var s=document.getElementById('docPartner');if(!s)return;
  s.innerHTML=partners.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';}).join('')||'<option value="">— нет партнёров —</option>';
}
function renderDocsAdmin(){
  var w=document.getElementById('docsView');if(!w)return;
  var live=documentsAdmin.filter(function(d){return !d.archived;});
  if(!live.length){w.innerHTML='<div class="empty">Документов пока нет.</div>';return;}
  var byP={};live.forEach(function(d){(byP[d.partner_id]=byP[d.partner_id]||[]).push(d);});
  var h='';
  Object.keys(byP).forEach(function(pid){
    var pname='';partners.forEach(function(p){if(p.id===pid)pname=p.name;});
    h+='<div class="cat">'+esc(pname||'Партнёр')+'</div>';
    byP[pid].forEach(function(d){var dt='';try{dt=new Date(d.created).toLocaleDateString('ru-RU');}catch(e){}
      h+='<div class="row" style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:11px;padding:10px 13px;margin-bottom:8px;flex-wrap:wrap;" data-id="'+esc(d.id)+'">'+
         '<div style="flex:1;min-width:150px;"><b>'+esc(d.title||DOC_TLBL[d.type]||'Документ')+'</b> <span class="hint">· '+esc(DOC_TLBL[d.type]||d.type)+(d.version?' · v'+esc(d.version):'')+' · '+esc(dt)+'</span></div>'+
         (d.url?'<a class="btn btn-line btn-sm" href="'+esc(d.url)+'" target="_blank" rel="noopener">'+(d.name?'⬇ Скачать':'Открыть')+'</a>':'')+
         '<button class="btn btn-line btn-sm danger d-arch">Убрать</button></div>';
    });
  });
  w.innerHTML=h;
  w.querySelectorAll('.row[data-id]').forEach(function(row){
    row.querySelector('.d-arch').addEventListener('click',function(){
      if(!confirm('Убрать документ у партнёра? (запись сохранится в Таблице как архивная)'))return;
      var id=row.dataset.id;
      fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,docArchive:id})})
        .then(function(r){return r.json();}).then(function(j){if(j&&j.ok){documentsAdmin.forEach(function(d){if(d.id===id)d.archived=true;});renderDocsAdmin();toast('Документ убран');}else toast('Не удалось');}).catch(function(){toast('Ошибка');});
    });
  });
}
function loadDocs(){
  var w=document.getElementById('docsView');if(w)w.innerHTML='<div class="empty">Загрузка…</div>';
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,pull:true})})
    .then(function(r){return r.json();}).then(function(j){
      if(j&&j.ok&&j.data){documentsAdmin=Array.isArray(j.data.documents)?j.data.documents:[];renderDocsAdmin();}
      else if(w)w.innerHTML='<div class="empty">Не удалось загрузить.</div>';
    }).catch(function(){if(w)w.innerHTML='<div class="empty">Ошибка соединения.</div>';});
}
var _dr=document.getElementById('docRefresh');if(_dr)_dr.addEventListener('click',loadDocs);
var _da=document.getElementById('docAddBtn');if(_da)_da.addEventListener('click',function(){
  if(!GAS_URL){toast('Сначала подключите облако');return;}
  var pid=document.getElementById('docPartner').value;
  var type=document.getElementById('docType').value;
  var title=document.getElementById('docTitle').value.trim();
  var ver=document.getElementById('docVer').value.trim();
  var fi=document.getElementById('docFile'),files=fi&&fi.files?Array.prototype.slice.call(fi.files):[];
  if(!pid){toast('Нет партнёров — сначала заведите партнёра');return;}
  if(!files.length){toast('Выберите файл(ы) — PDF, DOC, JPG');return;}
  var MAX=30*1024*1024,big=files.filter(function(f){return f.size>MAX;});
  if(big.length){toast('Файл больше 30 МБ: '+big[0].name);return;}
  _da.disabled=true;var done=0,fail=0,lastMsg='';
  function finish(){_da.disabled=false;_da.textContent='Добавить документ';renderDocsAdmin();
    document.getElementById('docTitle').value='';if(document.getElementById('docFile'))document.getElementById('docFile').value='';document.getElementById('docVer').value='';
    toast(fail?(lastMsg||('Добавлено '+done+', с ошибкой '+fail)):('Документов добавлено: '+done));}
  function next(i){
    if(i>=files.length){finish();return;}
    var file=files[i];_da.textContent='Загрузка '+(i+1)+'/'+files.length+'…';
    var ttl=(files.length>1?file.name:(title||file.name));
    var rd=new FileReader();
    rd.onload=function(){var b64=String(rd.result||'');var ix=b64.indexOf('base64,');if(ix>=0)b64=b64.substring(ix+7);
      fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({master:MASTER,docUpload:true,partner_id:pid,type:type,title:ttl,version:ver,fileName:file.name,mime:file.type,dataB64:b64})})
        .then(function(r){return r.json();}).then(function(j){
          if(j&&j.ok&&j.doc){documentsAdmin.push(j.doc);done++;}
          else{fail++;if(j&&j.error==='drive')lastMsg='Нет доступа к Drive: запустите authorizeDrive в Apps Script и переразверните';else if(j&&j.ok&&!j.doc)lastMsg='На сервере старая версия Code.gs — переразверните новую';}
          next(i+1);
        }).catch(function(){fail++;lastMsg='Ошибка соединения';next(i+1);});
    };
    rd.onerror=function(){fail++;next(i+1);};
    rd.readAsDataURL(file);
  }
  next(0);
});
document.querySelector('.tab[data-tab="partners"]').addEventListener('click',function(){fillDocPartners();});


/* ---------- хранение и рекомендации (админка) ---------- */
var CARE_COLORS={
  yellow:{bg:'#FFF7DA',bd:'#ecdb94',fg:'#6b5b16',name:'Жёлтый'},
  red:{bg:'#FCEBEA',bd:'#f0b3ad',fg:'#962f26',name:'Красный'},
  blue:{bg:'#E8F4FC',bd:'#9fcdeb',fg:'#175680',name:'Синий'},
  green:{bg:'#EAF6EE',bd:'#a6d8bb',fg:'#1d6840',name:'Зелёный'},
  grey:{bg:'#F0F0EA',bd:'#dcdad0',fg:'#45443e',name:'Серый'}
};
var DEFAULT_STORAGE={blocks:[
  {type:'p',t:{
    ru:'Вся продукция BreadVenture — живая, ремесленная, без консервантов. Срок годности короче, чем у промышленной выпечки, поэтому правильное хранение и подача напрямую определяют качество на витрине партнёра. Условия различаются по типу начинки: изделия с карамелью и крем заморозку не переносят, а холодильное хранение каждого изделия необходимо протестировать в условиях конкретного заведения.',
    sr:'Svi proizvodi BreadVenture su živi, zanatski, bez konzervansa. Rok trajanja je kraći nego kod industrijskog peciva, zato pravilno čuvanje i serviranje direktno određuju kvalitet na vitrini partnera. Uslovi se razlikuju po vrsti fila: proizvodi sa karamelom i krem ne podnose zamrzavanje, a čuvanje u frižideru za svaki proizvod treba testirati u uslovima konkretnog objekta.'}},
  {type:'h',t:{ru:'Хранение по категориям',sr:'Čuvanje po kategorijama'}},
  {type:'table',t:{
    ru:[
      ['Категория','Комнатная t°','Холодильник +2…+6 °C','Морозилка −18 °C'],
      ['Булки и бабки без скоропортящейся начинки\n(Cimet rolnica, Rolnica sa makom, Brioš zemička, Babka sa lešnikom i čokoladom)','2 дня','до 3 дней *','до 1 месяца'],
      ['С карамельной начинкой\n(Brioš sa karamelom, Babka sa cimetom i slanim karamelom)','1–2 дня','до 3 дней *','не замораживать'],
      ['Rolnica sa sirom (с сыром)','1 день','3 дня','до 1 месяца'],
      ['Slani karamel (крем)','—','10 дней','не замораживать'],
      ['Кексы\n(Lemon Drizzle, Banana Hleb, Čokoladni Kolač — с кремом только холодильник)','3 дня','до 6 дней (в плотной обёртке)','—']
    ],
    sr:[
      ['Kategorija','Sobna t°','Frižider +2…+6 °C','Zamrzivač −18 °C'],
      ['Peciva i babke bez kvarljivog fila\n(Cimet rolnica, Rolnica sa makom, Brioš zemička, Babka sa lešnikom i čokoladom)','2 dana','do 3 dana *','do 1 mesec'],
      ['Sa karamel filom\n(Brioš sa karamelom, Babka sa cimetom i slanim karamelom)','1–2 dana','do 3 dana *','ne zamrzavati'],
      ['Rolnica sa sirom','1 dan','3 dana','do 1 mesec'],
      ['Slani karamel (krem)','—','10 dana','ne zamrzavati'],
      ['Kolači\n(Lemon Drizzle, Banana Hleb, Čokoladni Kolač — sa kremom samo frižider)','3 dana','do 6 dana (u čvrstom pakovanju)','—']
    ]}},
  {type:'note',color:'yellow',t:{
    ru:'* Холодильное хранение булок и бабок обязательно протестировать в условиях заведения (тип печи, влажность, скорость и равномерность прогрева) перед регулярным использованием.',
    sr:'* Čuvanje peciva i babki u frižideru obavezno testirati u uslovima objekta (vrsta peći, vlažnost, brzina i ravnomernost zagrevanja) pre redovne upotrebe.'}},
  {type:'h',t:{ru:'Булки и бабки без скоропортящейся начинки',sr:'Peciva i babke bez kvarljivog fila'}},
  {type:'p',t:{
    ru:'Cimet rolnica, Rolnica sa makom, Brioš zemička, Babka sa lešnikom i čokoladom. При комнатной температуре в закрытой упаковке — 2 дня (день получения и следующий), лучшее качество в день получения. В холодильнике в плотной упаковке — до 3 дней, но этот режим обязательно протестировать в условиях вашего заведения. Перед подачей изделие доводится до комнатной температуры, затем прогревается для освежения непосредственно перед выдачей. Повторно операцию (охлаждение → подогрев) изделия не переносят — освежать можно только один раз. Заморозка — до 1 месяца.',
    sr:'Cimet rolnica, Rolnica sa makom, Brioš zemička, Babka sa lešnikom i čokoladom. Na sobnoj temperaturi u zatvorenom pakovanju — 2 dana (dan prijema i sledeći), najbolji kvalitet na dan prijema. U frižideru u čvrstom pakovanju — do 3 dana, ali taj režim obavezno testirati u uslovima vašeg objekta. Pre serviranja proizvod se dovede na sobnu temperaturu, zatim zagreje radi osvežavanja neposredno pre izdavanja. Ponavljanje (hlađenje → zagrevanje) proizvodi ne podnose — osvežavati samo jednom. Zamrzavanje — do 1 mesec.'}},
  {type:'h',t:{ru:'Изделия с карамельной начинкой',sr:'Proizvodi sa karamel filom'}},
  {type:'p',t:{
    ru:'Не замораживать ни при каких условиях. Карамель при разморозке расслаивается, кристаллизуется и теряет текстуру. Brioš sa karamelom и Babka sa cimetom i slanim karamelom: при комнатной температуре в закрытой упаковке — 1–2 дня, лучшее качество в день получения. В холодильнике — до 3 дней (так же протестировать). Перед подачей довести до комнатной температуры и кратко прогреть, чтобы карамель снова стала мягкой; не перегревать — карамель начинает течь. Освежать только один раз.',
    sr:'Ne zamrzavati ni pod kojim uslovima. Karamel se pri odmrzavanju raslojava, kristališe i gubi teksturu. Brioš sa karamelom i Babka sa cimetom i slanim karamelom: na sobnoj temperaturi u zatvorenom pakovanju — 1–2 dana, najbolji kvalitet na dan prijema. U frižideru — do 3 dana (takođe testirati). Pre serviranja dovesti na sobnu temperaturu i kratko zagrejati da karamel ponovo omekša; ne pregrevati — karamel počinje da curi. Osvežavati samo jednom.'}},
  {type:'h',t:{ru:'Rolnica sa sirom',sr:'Rolnica sa sirom'}},
  {type:'p',t:{
    ru:'При комнатной температуре — 1 день, лучшее качество в день получения. Для последующего хранения только холодильник при +2…+6 °C, срок 3 дня. Перед подачей довести до комнатной температуры или кратко прогреть; следить, чтобы сыр не подгорел. Заморозка — до 1 месяца.',
    sr:'Na sobnoj temperaturi — 1 dan, najbolji kvalitet na dan prijema. Za dalje čuvanje samo frižider na +2…+6 °C, rok 3 dana. Pre serviranja dovesti na sobnu temperaturu ili kratko zagrejati; paziti da se sir ne zagori. Zamrzavanje — do 1 mesec.'}},
  {type:'h',t:{ru:'Slani karamel (крем)',sr:'Slani karamel (krem)'}},
  {type:'p',t:{
    ru:'Холодильник при +2…+6 °C в плотно закрытой таре, срок 10 дней. Перед использованием дать постоять при комнатной температуре — так карамель становится пластичной для прослойки, начинки и декора. Не замораживать: при разморозке расслаивается.',
    sr:'Frižider na +2…+6 °C u dobro zatvorenoj posudi, rok 10 dana. Pre upotrebe ostaviti na sobnoj temperaturi — tako karamel postaje plastičan za prelivanje, fil i dekor. Ne zamrzavati: pri odmrzavanju se raslojava.'}},
  {type:'h',t:{ru:'Кексы',sr:'Kolači'}},
  {type:'p',t:{
    ru:'Lemon Drizzle Cake, Banana Hleb, Čokoladni Kolač. При комнатной температуре в закрытой упаковке — 3 дня (если у кекса нет крема сверху). Изделия с кремом в составе (например, Čokoladni Kolač) лучше всегда держать в холоде и нарезать непосредственно перед подачей. В холодильнике в плотной обёртке — до 6 дней; вкус и влажная текстура хорошо сохраняются. Подавать при комнатной температуре — перед выкладкой дать кексу согреться.',
    sr:'Lemon Drizzle Cake, Banana Hleb, Čokoladni Kolač. Na sobnoj temperaturi u zatvorenom pakovanju — 3 dana (ako kolač nema krem odozgo). Proizvode sa kremom u sastavu (na primer, Čokoladni Kolač) bolje uvek držati u hladnom i seći neposredno pre serviranja. U frižideru u čvrstom pakovanju — do 6 dana; ukus i vlažna tekstura se dobro čuvaju. Servirati na sobnoj temperaturi — pre izlaganja pustiti da se kolač zagreje.'}},
  {type:'h',t:{ru:'Подогрев и освежение',sr:'Zagrevanje i osvežavanje'}},
  {type:'note',color:'blue',t:{
    ru:'Важно: время и температуры могут отличаться в зависимости от вашего оборудования. Для каждого изделия необходим тест!',
    sr:'Važno: vreme i temperature mogu da se razlikuju u zavisnosti od vaše opreme. Za svaki proizvod je potreban test!'}},
  {type:'table',t:{
    ru:[
      ['Изделие','Температура и время','Примечание'],
      ['Булки и бабки (без скоропорт. начинки)','150–160 °C, 2–3 мин','из холодильника — сначала до комнатной t°'],
      ['С карамельной начинкой','150–160 °C, 2–3 мин','карамель должна стать мягкой, не перегревать'],
      ['Кексы','подача при комнатной t°','—']
    ],
    sr:[
      ['Proizvod','Temperatura i vreme','Napomena'],
      ['Peciva i babke (bez kvarljivog fila)','150–160 °C, 2–3 min','iz frižidera — prvo na sobnu t°'],
      ['Sa karamel filom','150–160 °C, 2–3 min','karamel treba da omekša, ne pregrevati'],
      ['Kolači','serviranje na sobnoj t°','—']
    ]}},
  {type:'h',t:{ru:'Правила подогрева',sr:'Pravila zagrevanja'}},
  {type:'p',t:{
    ru:'Только духовой шкаф (конвекция или верх-низ). Микроволновую печь не использовать — тесто становится резиновым, карамель перегревается неравномерно. Изделия из холодильника сначала доводятся до комнатной температуры (≈20–30 минут), и только затем прогреваются. Освежение делается один раз, непосредственно перед подачей. Лайфхак: если оборудование пересушивает изделие, перед прогревом можно совсем чуть-чуть увлажнить поверхность из распылителя — буквально пара лёгких движений, без излишков.',
    sr:'Samo rerna (konvekcija ili gore-dole). Mikrotalasnu ne koristiti — testo postaje gumeno, karamel se neravnomerno pregreva. Proizvodi iz frižidera se prvo dovode na sobnu temperaturu (≈20–30 minuta), pa tek onda zagrevaju. Osvežavanje se radi jednom, neposredno pre serviranja. Trik: ako oprema presušuje proizvod, pre zagrevanja površinu možete sasvim malo navlažiti raspršivačem — bukvalno par laganih poteza, bez viška.'}},
  {type:'h',t:{ru:'Контроль качества после подогрева',sr:'Kontrola kvaliteta posle zagrevanja'}},
  {type:'p',t:{
    ru:'Корректно освежённое изделие: тёплое внутри, корочка слегка хрустит, мякиш мягкий и не подсохший, карамель/сыр мягкие и не вытекли. Если изделие осталось холодным внутри — добавить 30–60 секунд, не повышая температуру.',
    sr:'Pravilno osveženo: toplo iznutra, korica blago hrska, sredina mekana i nije presušena, karamel/sir mekani i nisu iscureli. Ako je proizvod ostao hladan iznutra — dodati 30–60 sekundi, bez povećanja temperature.'}},
  {type:'h',t:{ru:'Ограничения',sr:'Ograničenja'}},
  {type:'note',color:'red',t:{
    ru:'Ориентир по температуре — 150–160 °C; превышать 160 °C нельзя, иначе тесто пересыхает, карамель течёт и пригорает, сыр вытекает. Время гибкое: 2–3 минуты достаточно для изделия комнатной температуры, для охлаждённого может потребоваться до 5 минут, на менее мощном оборудовании — больше. Ориентируйтесь не на таймер, а на состояние изделия. Не подогревать впрок «на витрину». Не замораживать карамельные изделия и крем.',
    sr:'Orijentir za temperaturu — 150–160 °C; preko 160 °C nije dozvoljeno, jer testo presuši, karamel curi i zagoreva, sir iscuri. Vreme je fleksibilno: 2–3 minuta dovoljno za proizvod sobne temperature, za ohlađen može trebati do 5 minuta, na slabijoj opremi — više. Orijentišite se na stanje proizvoda, a ne na tajmer. Ne zagrevati unapred „za vitrinu". Ne zamrzavati karamel proizvode i krem.'}},
  {type:'h',t:{ru:'Витрина и подача',sr:'Vitrina i serviranje'}},
  {type:'p',t:{
    ru:'Держите изделия под колпаком или в закрытой витрине — открытый воздух быстро сушит выпечку. Булки и бабки выставляйте порциями на текущий день; кексы можно держать нарезанными. Кремовые и сырные позиции не оставляйте при комнатной температуре дольше, чем необходимо для подачи.',
    sr:'Držite proizvode pod zvonom ili u zatvorenoj vitrini — otvoren vazduh brzo suši pecivo. Peciva i babke izlažite u porcijama za tekući dan; kolače možete držati isečene. Krem i sir pozicije ne ostavljajte na sobnoj temperaturi duže nego što je potrebno za serviranje.'}},
  {type:'h',t:{ru:'Контроль качества и претензии',sr:'Kontrola kvaliteta i reklamacije'}},
  {type:'p',t:{
    ru:'BreadVenture отвечает за качество продукции в момент её передачи партнёру. Дальнейшее хранение, подогрев и подача — в зоне ответственности партнёра. Претензии по качеству принимаются только при соблюдении условий настоящего документа и при обращении в течение 12 часов после получения (см. «Политика возврата» в основном прайс-листе). Отклонения вследствие нарушения условий хранения, подогрева или подачи на стороне партнёра рекламации не подлежат.',
    sr:'BreadVenture odgovara za kvalitet proizvoda u trenutku predaje partneru. Dalje čuvanje, zagrevanje i serviranje su u zoni odgovornosti partnera. Reklamacije na kvalitet primaju se samo uz poštovanje uslova ovog dokumenta i uz obraćanje u roku od 12 sati po prijemu (vidi „Politiku povraćaja" u glavnom cenovniku). Odstupanja nastala usled kršenja uslova čuvanja, zagrevanja ili serviranja na strani partnera ne podležu reklamaciji.'}},
  {type:'p',t:{
    ru:'BreadVenture · breadventure.bakery@gmail.com · +381 63 705 7214 · Светлана Васильева (основательница)',
    sr:'BreadVenture · breadventure.bakery@gmail.com · +381 63 705 7214 · Svetlana Vasiljeva (osnivačica)'}}
]};

function careTypeLabel(t){return t==='h'?'Заголовок':t==='table'?'Таблица':t==='note'?'Выделение':t==='img'?'Фото':t==='file'?'Файл':'Текст';}
function driveThumb(id){return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1000';}
function driveDl(id){return 'https://drive.google.com/uc?export=download&id='+id;}
function careBlocksHtml(blocks,lang){
  if(!blocks||!blocks.length)return '';
  function tx(b){return (b.t&&b.t[lang])||'';}
  function nl(s){return s.replace(/\n/g,'<br>');}
  function cell(b){
    if(b.type==='h')return '<h3 class="cg-h">'+esc(tx(b))+'</h3>';
    if(b.type==='note'){var c=CARE_COLORS[b.color||'yellow']||CARE_COLORS.yellow;return '<div class="cg-note" style="background:'+c.bg+';border-color:'+c.bd+';color:'+c.fg+';">'+nl(esc(tx(b)))+'</div>';}
    if(b.type==='table'){var t=(b.t&&b.t[lang])||[];if(!t.length)return '';var s='<div class="cg-tablewrap"><table class="cg-table">';t.forEach(function(row,ri){s+='<tr>';row.forEach(function(cl){var tag=ri===0?'th':'td';s+='<'+tag+'>'+nl(esc(cl||''))+'</'+tag+'>';});s+='</tr>';});return s+'</table></div>';}
    if(b.type==='img'){var src=b.fileId?driveThumb(b.fileId):(b.thumb||'');var dl=b.fileId?driveDl(b.fileId):(b.download||'');var cap=(b.cap&&b.cap[lang])||'';
      return '<figure class="cg-fig">'+(src?'<img class="cg-img" data-fid="'+esc(b.fileId||'')+'" src="'+esc(src)+'" alt="">':'')+
        (cap?'<figcaption class="cg-cap">'+nl(esc(cap))+'</figcaption>':'')+
        (dl?'<a class="cg-dl" href="'+esc(dl)+'" rel="noopener">⬇ '+(lang==='sr'?'Preuzmi sliku':'Скачать фото')+'</a>':'')+'</figure>';}
    if(b.type==='file'){var fdl=b.fileId?driveDl(b.fileId):(b.download||'');var ttl=(b.ttl&&b.ttl[lang])||b.name||(lang==='sr'?'Dokument':'Документ');
      return '<div class="cg-file"><span class="cg-fic">📄</span><span class="cg-fname">'+esc(ttl)+'</span>'+(fdl?'<a class="cg-dl" href="'+esc(fdl)+'" rel="noopener">⬇ '+(lang==='sr'?'Preuzmi':'Скачать')+'</a>':'')+'</div>';}
    return '<p class="cg-p">'+nl(esc(tx(b)))+'</p>';
  }
  var secs=[],cur=null;
  blocks.forEach(function(b){if(b.type==='h'){cur={blocks:[b]};secs.push(cur);}else{if(!cur){cur={blocks:[]};secs.push(cur);}cur.blocks.push(b);}});
  if(secs.length){var L=secs[secs.length-1];if(L.blocks.length>1){var lastb=L.blocks[L.blocks.length-1];if(lastb.type==='p'){L.blocks.pop();secs.push({blocks:[lastb],footer:true});}}}
  var h='';
  secs.forEach(function(s){var inner='';s.blocks.forEach(function(b){inner+=cell(b);});h+='<div class="cg-card'+(s.footer?' cg-foot':'')+'">'+inner+'</div>';});
  return h;
}
var careGroupIdx=0;
function careEnsure(){
  if(!storageData||typeof storageData!=='object')storageData={};
  if(!Array.isArray(storageData.groups)){
    if(Array.isArray(storageData.blocks)&&storageData.blocks.length){
      storageData.groups=[{id:uid(),name:{ru:'Общее',sr:'Opšte'},blocks:storageData.blocks}];
    } else if(DEFAULT_STORAGE&&Array.isArray(DEFAULT_STORAGE.blocks)){
      storageData.groups=[{id:uid(),name:{ru:'Общее',sr:'Opšte'},blocks:JSON.parse(JSON.stringify(DEFAULT_STORAGE.blocks))}];
    } else storageData.groups=[{id:uid(),name:{ru:'Общее',sr:'Opšte'},blocks:[]}];
  }
  if(!storageData.groups.length)storageData.groups.push({id:uid(),name:{ru:'Общее',sr:'Opšte'},blocks:[]});
  storageData.groups.forEach(function(g){if(!Array.isArray(g.blocks))g.blocks=[];if(!g.name||typeof g.name!=='object')g.name={ru:'',sr:''};if(!g.id)g.id=uid();});
  if(careGroupIdx>=storageData.groups.length)careGroupIdx=storageData.groups.length-1;
  if(careGroupIdx<0)careGroupIdx=0;
}
function careCurGroup(){careEnsure();return storageData.groups[careGroupIdx];}
function careFlatten(){
  var blocks=[];careEnsure();
  var multi=storageData.groups.length>1;
  storageData.groups.forEach(function(g){
    var nm=(g.name&&((g.name.ru||'').trim()||(g.name.sr||'').trim()));
    if(multi&&nm)blocks.push({type:'h',t:{ru:(g.name.ru||g.name.sr||''),sr:(g.name.sr||g.name.ru||'')}});
    (g.blocks||[]).forEach(function(b){blocks.push(b);});
  });
  return blocks;
}
function careColorPaletteHtml(b){
  var cur=b.color||'yellow',h='<div class="care-colors">';
  Object.keys(CARE_COLORS).forEach(function(k){var c=CARE_COLORS[k];
    h+='<button class="cc-sw'+(cur===k?' on':'')+'" data-col="'+k+'" title="'+c.name+'" style="background:'+c.bg+';border-color:'+c.bd+';"></button>';});
  h+='</div>';return h;
}
function careTableEditorHtml(b,lang){
  var t=(b.t&&b.t[lang])||[['']];if(!t.length)t=[['']];
  var h='<div class="care-tablewrap" style="overflow-x:auto;"><table class="care-tedit">';
  t.forEach(function(row,ri){
    h+='<tr>';
    row.forEach(function(cell,ci){var tag=ri===0?'th':'td';
      h+='<'+tag+'><textarea class="ct-cell" data-r="'+ri+'" data-c="'+ci+'" rows="2">'+esc(cell||'')+'</textarea></'+tag+'>';});
    h+='<td class="ct-actions"><button class="btn btn-line btn-sm ct-delrow" data-r="'+ri+'" title="удалить строку">✕</button></td>';
    h+='</tr>';
  });
  h+='</table></div>';
  h+='<div class="care-tbtns"><button class="btn btn-line btn-sm ct-addrow">+ строка</button><button class="btn btn-line btn-sm ct-addcol">+ столбец</button><button class="btn btn-line btn-sm danger ct-delcol">− столбец</button></div>';
  return h;
}
function careImgEditorHtml(b,lang){
  var src=b.fileId?driveThumb(b.fileId):(b.thumb||'');
  return '<div style="display:flex;gap:12px;align-items:flex-start;">'+
    (src?'<img src="'+esc(src)+'" style="width:92px;height:92px;object-fit:cover;border-radius:10px;border:1px solid var(--line);">':'<div style="width:92px;height:92px;border-radius:10px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;">фото</div>')+
    '<div style="flex:1;"><input class="inp cb-cap" value="'+esc((b.cap&&b.cap[lang])||'')+'" placeholder="Подпись к фото (необяз.)"><div class="hint" style="margin-top:5px;">'+esc(b.name||'')+'</div></div></div>';
}
function careFileEditorHtml(b,lang){
  return '<div style="display:flex;gap:10px;align-items:center;"><span style="font-size:22px;">📄</span>'+
    '<div style="flex:1;"><input class="inp cb-ttl" value="'+esc((b.ttl&&b.ttl[lang])||'')+'" placeholder="Название документа"><div class="hint" style="margin-top:5px;">'+esc(b.name||'')+'</div></div></div>';
}
function driveUpload(fileName,mime,dataB64){
  return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({master:MASTER,driveUpload:true,fileName:fileName,mime:mime,dataB64:dataB64})}).then(function(r){return r.json();});
}
function careFileBytes(fileId){
  return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({master:MASTER,fileBytes:true,fileId:fileId})}).then(function(r){return r.json();});
}
function careAddImage(file){
  if(!file)return;if(file.size>10*1024*1024){toast('Фото больше 10 МБ — уменьшите');return;}
  toast('Загрузка фото…');
  compressImage(file,function(d){
    var b64=d.indexOf('base64,')>=0?d.substring(d.indexOf('base64,')+7):d;
    driveUpload((file.name||'photo')+'.jpg','image/jpeg',b64).then(function(j){
      if(j&&j.ok&&j.fileId){careEnsure();careCurGroup().blocks.push({type:'img',fileId:j.fileId,name:file.name||'',cap:{ru:'',sr:''}});renderCareAdmin();toast('Фото добавлено');}
      else toast(j&&j.error==='auth'?'Нет доступа к Drive — переразверните Code.gs':'Не удалось загрузить');
    }).catch(function(){toast('Ошибка соединения');});
  },function(){toast('Не удалось обработать фото');});
}
function careAddFile(file){
  if(!file)return;if(file.size>10*1024*1024){toast('Файл больше 10 МБ — уменьшите');return;}
  toast('Загрузка файла…');
  var rd=new FileReader();
  rd.onload=function(){var b64=String(rd.result||'');var ix=b64.indexOf('base64,');if(ix>=0)b64=b64.substring(ix+7);
    driveUpload(file.name||'file',file.type||'application/octet-stream',b64).then(function(j){
      if(j&&j.ok&&j.fileId){careEnsure();careCurGroup().blocks.push({type:'file',fileId:j.fileId,name:file.name||'',ttl:{ru:file.name||'Документ',sr:file.name||'Dokument'}});renderCareAdmin();toast('Файл добавлен');}
      else toast(j&&j.error==='auth'?'Нет доступа к Drive — переразверните Code.gs':'Не удалось загрузить');
    }).catch(function(){toast('Ошибка соединения');});
  };
  rd.onerror=function(){toast('Не удалось прочитать файл');};rd.readAsDataURL(file);
}
function renderCareAdmin(){
  careEnsure();
  careCheckDraft();
  careEnsure();
  var lang=storeLang;
  var ed=document.getElementById('careEditor');if(!ed)return;
  var cur=careCurGroup();
  var h='';
  // ── панель типов изделий ──
  h+='<div class="care-groups" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">';
  storageData.groups.forEach(function(g,gi){
    var nm=(g.name&&(g.name[lang]||g.name.ru||g.name.sr))||('Тип '+(gi+1));
    h+='<button class="btn btn-sm '+(gi===careGroupIdx?'btn-primary':'btn-line')+' cg-tab" data-g="'+gi+'">'+esc(nm)+'</button>';
  });
  h+='<button class="btn btn-line btn-sm cg-add">+ Тип</button></div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line);">'+
     '<input class="inp cg-name" value="'+esc((cur.name&&cur.name[lang])||'')+'" placeholder="Название типа ('+(lang==='sr'?'срб':'рус')+') — напр. Булки, Хлеба, Крема" style="max-width:300px;">'+
     '<button class="btn btn-line btn-sm cg-left" title="переместить тип левее"'+(careGroupIdx===0?' disabled style="opacity:.4;"':'')+'>←</button>'+
     '<button class="btn btn-line btn-sm cg-right" title="переместить тип правее"'+(careGroupIdx===storageData.groups.length-1?' disabled style="opacity:.4;"':'')+'>→</button>'+
     '<button class="btn btn-line btn-sm danger cg-delgroup">Удалить тип</button></div>';
  var moveOpts='';
  if(storageData.groups.length>1){
    var others=[];
    storageData.groups.forEach(function(g,gi){if(gi!==careGroupIdx)others.push({id:g.id,name:(g.name&&(g.name[lang]||g.name.ru||g.name.sr))||('Тип '+(gi+1))});});
    if(others.length){
      var moveO='',copyO='';
      others.forEach(function(o){moveO+='<option value="move:'+esc(o.id)+'">'+esc(o.name)+'</option>';copyO+='<option value="copy:'+esc(o.id)+'">'+esc(o.name)+'</option>';});
      moveOpts='<select class="cb-moveto" style="font-size:12px;padding:4px 7px;border:1px solid var(--line);border-radius:8px;margin-right:6px;max-width:180px;">'+
        '<option value="">в другой тип…</option>'+
        '<optgroup label="↦ Переместить (убрать отсюда)">'+moveO+'</optgroup>'+
        '<optgroup label="⧉ Копировать (оставить здесь)">'+copyO+'</optgroup>'+
        '</select>';
    }
  }
  cur.blocks.forEach(function(b,i){
    var first=(i===0),last=(i===cur.blocks.length-1);
    h+='<div class="care-block" data-i="'+i+'">';
    h+='<div class="care-bhead"><span class="care-btype">'+careTypeLabel(b.type)+'</span><span style="flex:1;"></span>'+
       moveOpts+
       '<button class="btn btn-line btn-sm cb-up"'+(first?' disabled style="opacity:.4;"':'')+' title="выше">↑</button>'+
       '<button class="btn btn-line btn-sm cb-down"'+(last?' disabled style="opacity:.4;"':'')+' title="ниже">↓</button>'+
       '<button class="btn btn-line btn-sm danger cb-del">Удалить</button></div>';
    if(b.type==='table')h+=careTableEditorHtml(b,lang);
    else if(b.type==='h')h+='<input class="inp cb-text" value="'+esc((b.t&&b.t[lang])||'')+'" placeholder="Заголовок">';
    else if(b.type==='img')h+=careImgEditorHtml(b,lang);
    else if(b.type==='file')h+=careFileEditorHtml(b,lang);
    else h+='<textarea class="inp cb-text" rows="'+(b.type==='note'?3:4)+'" placeholder="Текст">'+esc((b.t&&b.t[lang])||'')+'</textarea>';
    if(b.type==='note')h+=careColorPaletteHtml(b);
    h+='</div>';
  });
  if(!cur.blocks.length)h+='<div class="hint" style="padding:10px 2px;">В этом типе пока нет блоков — добавьте ниже «+ Текст», «+ Таблица» и т.д.</div>';
  ed.innerHTML=h;
  bindCareGroups();
  bindCareEditor();
  renderCarePreview();
  var up=document.getElementById('careUpdated');
  if(up)up.textContent=(storageData.updated?('Сохранено: '+new Date(storageData.updated).toLocaleString('ru-RU')):'Ещё не сохранено в облако');
  if(typeof renderCareVisibility==='function')renderCareVisibility();
  careDraftSave();
}
function renderCareVisibility(){
  careEnsure();
  var sel=document.getElementById('careVisPartner');if(!sel)return;
  var cur=sel.value;
  var h='<option value="">— выберите партнёра —</option>';
  (partners||[]).forEach(function(p){h+='<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';});
  sel.innerHTML=h;if(cur)sel.value=cur;
  sel.onchange=function(){renderCareVisList();};
  renderCareVisList();
}
function renderCareVisList(){
  var wrap=document.getElementById('careVisList');if(!wrap)return;
  careEnsure();
  var sel=document.getElementById('careVisPartner');var pid=sel?sel.value:'';
  if(!pid){wrap.innerHTML='<div class="hint">Выберите партнёра, чтобы настроить, какие типы он видит.</div>';return;}
  if(typeof docConfig==='undefined'||!docConfig)return;
  docConfig.careHidden=docConfig.careHidden||{};
  var hidden=docConfig.careHidden[pid]||[];
  var lang=storeLang;
  var h='<div style="display:flex;flex-direction:column;gap:9px;">';
  storageData.groups.forEach(function(g){
    var nm=(g.name&&(g.name[lang]||g.name.ru||g.name.sr))||'Без названия';
    var vis=hidden.indexOf(g.id)<0;
    h+='<label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:14px;"><input type="checkbox" class="cv-chk" data-g="'+esc(g.id)+'"'+(vis?' checked':'')+'><span>'+esc(nm)+'</span></label>';
  });
  h+='</div><div class="hint" style="margin-top:9px;">Отмечено — партнёр видит тип. Изменения сохраняются сразу.</div>';
  wrap.innerHTML=h;
  wrap.querySelectorAll('.cv-chk').forEach(function(chk){
    chk.addEventListener('change',function(){
      var gid=this.dataset.g;docConfig.careHidden=docConfig.careHidden||{};
      var arr=(docConfig.careHidden[pid]||[]).slice();
      if(this.checked)arr=arr.filter(function(x){return x!==gid;});
      else if(arr.indexOf(gid)<0)arr.push(gid);
      docConfig.careHidden[pid]=arr;
      if(typeof cloudPut==='function')cloudPut('docConfig',docConfig);
      toast(this.checked?'Тип показан партнёру':'Тип скрыт от партнёра');
    });
  });
}
function bindCareGroups(){
  var ed=document.getElementById('careEditor');if(!ed)return;var lang=storeLang;
  ed.querySelectorAll('.cg-tab').forEach(function(b){b.addEventListener('click',function(){careGroupIdx=Number(this.dataset.g);renderCareAdmin();});});
  var add=ed.querySelector('.cg-add');if(add)add.addEventListener('click',function(){careEnsure();storageData.groups.push({id:uid(),name:{ru:'Новый тип',sr:'Novi tip'},blocks:[]});careGroupIdx=storageData.groups.length-1;renderCareAdmin();careDraftSave();});
  var nm=ed.querySelector('.cg-name');if(nm)nm.addEventListener('input',function(){var g=careCurGroup();g.name=g.name||{ru:'',sr:''};g.name[lang]=this.value;careDraftSave();
    var tab=ed.querySelector('.cg-tab.btn-primary');if(tab)tab.textContent=this.value||('Тип '+(careGroupIdx+1));});
  var lft=ed.querySelector('.cg-left');if(lft)lft.addEventListener('click',function(){careGroupMove(-1);});
  var rgt=ed.querySelector('.cg-right');if(rgt)rgt.addEventListener('click',function(){careGroupMove(1);});
  var del=ed.querySelector('.cg-delgroup');if(del)del.addEventListener('click',function(){
    careEnsure();
    if(storageData.groups.length<=1){alert('Нельзя удалить единственный тип. Сначала создайте другой.');return;}
    var g=careCurGroup();var nm2=(g.name&&(g.name.ru||g.name.sr))||('Тип '+(careGroupIdx+1));
    if(g.blocks.length&&!confirm('Удалить тип «'+nm2+'» вместе со всеми блоками ('+g.blocks.length+')? Отменить нельзя.'))return;
    if(!g.blocks.length&&!confirm('Удалить тип «'+nm2+'»?'))return;
    storageData.groups.splice(careGroupIdx,1);if(careGroupIdx>=storageData.groups.length)careGroupIdx=storageData.groups.length-1;renderCareAdmin();careDraftSave();
  });
}
function careGroupMove(d){careEnsure();var i=careGroupIdx,j=i+d;if(j<0||j>=storageData.groups.length)return;var a=storageData.groups;var t=a[i];a[i]=a[j];a[j]=t;careGroupIdx=j;renderCareAdmin();careDraftSave();}
function careMoveBlockToGroup(i,gid){
  careEnsure();var cur=careCurGroup();var blk=cur.blocks[i];if(!blk)return;
  var target=null;storageData.groups.forEach(function(g){if(g.id===gid)target=g;});
  if(!target||target===cur)return;
  target.blocks.push(blk);cur.blocks.splice(i,1);
  renderCareAdmin();careDraftSave();
  toast('Блок перемещён в «'+((target.name&&(target.name[storeLang]||target.name.ru||target.name.sr))||'тип')+'»');
}
function careCopyBlockToGroup(i,gid){
  careEnsure();var cur=careCurGroup();var blk=cur.blocks[i];if(!blk)return;
  var target=null;storageData.groups.forEach(function(g){if(g.id===gid)target=g;});
  if(!target||target===cur)return;
  target.blocks.push(JSON.parse(JSON.stringify(blk)));
  renderCareAdmin();careDraftSave();
  toast('Копия добавлена в «'+((target.name&&(target.name[storeLang]||target.name.ru||target.name.sr))||'тип')+'» (оригинал остался здесь)');
}
function bindCareEditor(){
  var lang=storeLang;
  document.querySelectorAll('#careEditor .care-block').forEach(function(el){
    var i=Number(el.dataset.i),b=careCurGroup().blocks[i];
    el.querySelector('.cb-up').addEventListener('click',function(){careMove(i,-1);});
    el.querySelector('.cb-down').addEventListener('click',function(){careMove(i,1);});
    el.querySelector('.cb-del').addEventListener('click',function(){if(confirm('Удалить блок?')){careCurGroup().blocks.splice(i,1);renderCareAdmin();}});
    var mv=el.querySelector('.cb-moveto');if(mv)mv.addEventListener('change',function(){var v=this.value;if(!v)return;var ci=v.indexOf(':');var mode=v.slice(0,ci),gid=v.slice(ci+1);if(mode==='move')careMoveBlockToGroup(i,gid);else if(mode==='copy')careCopyBlockToGroup(i,gid);});
    var tx=el.querySelector('.cb-text');
    if(tx)tx.addEventListener('input',function(){b.t=b.t||{};b.t[lang]=this.value;renderCarePreview();});
    el.querySelectorAll('.ct-cell').forEach(function(c){
      c.addEventListener('input',function(){var r=Number(this.dataset.r),ci=Number(this.dataset.c);
        b.t=b.t||{};b.t[lang]=b.t[lang]||[];b.t[lang][r]=b.t[lang][r]||[];b.t[lang][r][ci]=this.value;renderCarePreview();});
    });
    el.querySelectorAll('.cc-sw').forEach(function(sw){sw.addEventListener('click',function(){b.color=this.dataset.col;renderCareAdmin();});});
    var cp=el.querySelector('.cb-cap');if(cp)cp.addEventListener('input',function(){b.cap=b.cap||{};b.cap[lang]=this.value;renderCarePreview();});
    var tt=el.querySelector('.cb-ttl');if(tt)tt.addEventListener('input',function(){b.ttl=b.ttl||{};b.ttl[lang]=this.value;renderCarePreview();});
    var ar=el.querySelector('.ct-addrow');if(ar)ar.addEventListener('click',function(){careTableAddRow(b);renderCareAdmin();});
    var ac=el.querySelector('.ct-addcol');if(ac)ac.addEventListener('click',function(){careTableAddCol(b);renderCareAdmin();});
    var dc=el.querySelector('.ct-delcol');if(dc)dc.addEventListener('click',function(){careTableDelCol(b);renderCareAdmin();});
    el.querySelectorAll('.ct-delrow').forEach(function(btn){btn.addEventListener('click',function(){careTableDelRow(b,Number(this.dataset.r));renderCareAdmin();});});
  });
}
function careCols(b){var t=(b.t&&(b.t.ru||b.t.sr))||[[]];return (t[0]||[]).length||1;}
function careTableAddRow(b){var n=careCols(b);['ru','sr'].forEach(function(L){b.t[L]=b.t[L]||[];var r=[];for(var i=0;i<n;i++)r.push('');b.t[L].push(r);});}
function careTableAddCol(b){['ru','sr'].forEach(function(L){b.t[L]=b.t[L]||[[]];b.t[L].forEach(function(row){row.push('');});});}
function careTableDelCol(b){if(careCols(b)<=1)return;['ru','sr'].forEach(function(L){(b.t[L]||[]).forEach(function(row){row.pop();});});}
function careTableDelRow(b,r){var rows=(b.t&&b.t.ru&&b.t.ru.length)||0;if(rows<=1)return;['ru','sr'].forEach(function(L){if(b.t[L]&&b.t[L].length>r)b.t[L].splice(r,1);});}
function careMove(i,d){var a=careCurGroup().blocks;var j=i+d;if(j<0||j>=a.length)return;var tmp=a[i];a[i]=a[j];a[j]=tmp;renderCareAdmin();}
function careAddBlock(type){careEnsure();
  if(type==='table')careCurGroup().blocks.push({type:'table',t:{ru:[['Колонка 1','Колонка 2'],['','']],sr:[['Kolona 1','Kolona 2'],['','']]}});
  else if(type==='note')careCurGroup().blocks.push({type:'note',color:'yellow',t:{ru:'',sr:''}});
  else careCurGroup().blocks.push({type:type,t:{ru:'',sr:''}});
  renderCareAdmin();
}
function careDocInnerHtml(lang,pname,withMeta){
  var sr=(lang==='sr');
  var title=sr?'Čuvanje i preporuke za upotrebu':'Хранение и рекомендации по использованию';
  var brand=sr?'BreadVenture · zanatska pekara · Beograd':'BreadVenture · ремесленная пекарня · Белград';
  var head='<div class="cg-doctitle">'+esc(title)+'</div><div class="cg-brand">'+esc(brand)+'</div>';
  if(withMeta){var dateStr=new Date().toLocaleDateString(sr?'sr-RS':'ru-RU');
    var meta=(pname?((sr?'Za: ':'Для: ')+esc(pname)+' · '):'')+(sr?'Datum: ':'Дата: ')+dateStr;
    head+='<div class="cg-meta">'+meta+'</div>';}
  else head+='<div class="cg-meta"></div>';
  return head+careBlocksHtml(careFlatten(),lang);
}
function renderCarePreview(){var pv=document.getElementById('carePreview');if(!pv)return;
  pv.innerHTML=careDocInnerHtml(storeLang,'',false);careDraftSave();}
var careDraftChecked=false;
function careDraftSave(){try{localStorage.setItem('bv_b2b_storage_draft',JSON.stringify({data:storageData,ts:Date.now()}));}catch(e){}}
function careCheckDraft(){
  if(careDraftChecked)return;careDraftChecked=true;
  var raw='';try{raw=localStorage.getItem('bv_b2b_storage_draft')||'';}catch(e){}
  if(!raw)return;
  var d=null;try{d=JSON.parse(raw);}catch(e){return;}
  if(!d||!d.data)return;
  var cloudTs=(storageData&&storageData.updated)||0;
  if(d.ts>cloudTs+1500){
    if(confirm('Найден несохранённый черновик раздела «Хранение» от '+new Date(d.ts).toLocaleString('ru-RU')+'.\n\nВосстановить его?\n\nОК — восстановить черновик (ваши несохранённые правки).\nОтмена — оставить версию из облака.')){
      storageData=d.data;
    }
  }
}
function saveStorage(){
  careEnsure();
  storageData.blocks=careFlatten();
  careDraftSave();
  if(typeof cloudState!=='undefined'&&cloudState!=='on'){
    alert('Облако не подключено — в облако не сохранится. Но ваш черновик сохранён в браузере, работа НЕ потеряется.\n\nНажмите «Облако…», подключитесь и сохраните снова.');return;}
  if(!GAS_URL){alert('Облако не настроено.');return;}
  var json=JSON.stringify(storageData);
  if(json.length>48000){alert('Внимание: раздел очень большой ('+Math.round(json.length/1000)+' тыс. символов) и может не поместиться в облако целиком. Черновик в браузере сохранён полностью. Напишите разработчику — снимем лимит.');}
  var btn=document.getElementById('careSave');if(btn){btn.disabled=true;btn.textContent='Сохранение…';}
  if(typeof setSync!=='undefined')setSync('off','Сохранение…');
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({master:MASTER,key:'storage',value:storageData})})
    .then(function(r){return r.json();}).then(function(j){
      if(btn){btn.disabled=false;btn.textContent='Сохранить';}
      if(j&&j.ok){
        storageData.updated=Date.now();careDraftSave();
        if(typeof setSync!=='undefined')setSync('on');
        var up=document.getElementById('careUpdated');if(up)up.textContent='Сохранено: '+new Date(storageData.updated).toLocaleString('ru-RU');
        toast('Раздел сохранён в облако. Партнёр увидит его при следующем входе.');
      } else {
        if(typeof setSync!=='undefined')setSync('err','Не сохранилось');
        alert(j&&j.error==='auth'?'Не сохранилось: неверный мастер-ключ. Черновик в браузере цел. Проверьте «Облако…».':'Не удалось сохранить в облако. Черновик в браузере цел — ничего не потеряно. Попробуйте ещё раз.');
      }
    }).catch(function(){
      if(btn){btn.disabled=false;btn.textContent='Сохранить';}
      if(typeof setSync!=='undefined')setSync('err','Нет связи');
      alert('Не удалось сохранить (нет связи с облаком). Черновик сохранён в браузере — работа не потеряна. Проверьте интернет и сохраните снова.');
    });
}
function saveStorage_OLD(){
  careEnsure();
  if(typeof cloudState!=='undefined'&&cloudState!=='on'){alert('Облако не подключено — раздел не сохранится. Нажмите «Облако…» и подключитесь, затем сохраните снова.');return;}
  storageData.updated=Date.now();
  cloudPut('storage',storageData);
  var up=document.getElementById('careUpdated');if(up)up.textContent='Сохранено: '+new Date(storageData.updated).toLocaleString('ru-RU');
  toast('Раздел сохранён. Партнёр увидит его при следующем входе/обновлении.');
}
function fillCareDocPartners(){
  var sel=document.getElementById('careDocPartner');if(!sel)return;
  var cur=sel.value;
  var h='<option value="">— Общий (без получателя) —</option>';
  (partners||[]).forEach(function(p){h+='<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';});
  sel.innerHTML=h;if(cur)sel.value=cur;
}
function careDocNode(pname,lang){
  var wrap=document.createElement('div');
  wrap.className='cg-doc';
  wrap.style.cssText='position:fixed;left:-9999px;top:0;width:760px;background:#F4F3E9;padding:38px 34px;';
  wrap.innerHTML=careDocInnerHtml(lang,pname,true);
  return wrap;
}
function exportCarePDF(){
  careEnsure();
  var pid=document.getElementById('careDocPartner').value;
  var lang=document.getElementById('careDocLang').value||'ru';
  var pname='';
  if(pid){var pp=(partners||[]).filter(function(x){return x.id===pid;})[0];if(pp)pname=pp.name;
    var pr=(profilesAdmin||{})[pid];if(pr&&pr.company)pname=pr.company;}
  if(!window.html2canvas||!(window.jspdf&&window.jspdf.jsPDF)){alert('Не загрузились библиотеки PDF. Проверьте интернет и обновите страницу.');return;}
  var node=careDocNode(pname,lang);document.body.appendChild(node);
  var btn=document.getElementById('careDocBtn');var oldT=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Готовим PDF…';}
  function done(){if(node.parentNode)node.parentNode.removeChild(node);if(btn){btn.disabled=false;btn.textContent=oldT;}}
  function go(){
    var scale=2;
    function render(){
    window.html2canvas(node,{scale:scale,backgroundColor:'#F4F3E9',useCORS:true,windowWidth:node.scrollWidth}).then(function(canvas){
      var jsPDF=window.jspdf.jsPDF;
      var pdf=new jsPDF('p','mm','a4');
      var pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
      var pxPerMm=canvas.width/pw, pageHpx=ph*pxPerMm;
      var nodeTop=node.getBoundingClientRect().top, breaks=[];
      node.querySelectorAll('.cg-card').forEach(function(c){var r=c.getBoundingClientRect();breaks.push(Math.round((r.bottom-nodeTop)*scale));});
      breaks.push(canvas.height);breaks.sort(function(a,b){return a-b;});
      var startY=0,first=true,guard=0;
      while(startY<canvas.height-1&&guard<80){
        guard++;
        var limit=startY+pageHpx,endY=0,i;
        for(i=0;i<breaks.length;i++){if(breaks[i]>startY+4&&breaks[i]<=limit&&breaks[i]>endY)endY=breaks[i];}
        if(endY===0)endY=Math.min(limit,canvas.height);
        var sliceH=endY-startY;
        var pc=document.createElement('canvas');pc.width=canvas.width;pc.height=Math.round(sliceH);
        var ctx=pc.getContext('2d');ctx.fillStyle='#F4F3E9';ctx.fillRect(0,0,pc.width,pc.height);
        ctx.drawImage(canvas,0,startY,canvas.width,sliceH,0,0,canvas.width,sliceH);
        if(!first)pdf.addPage();
        pdf.setFillColor(244,243,233);pdf.rect(0,0,pw,ph,'F');
        pdf.addImage(pc,'PNG',0,0,pw,sliceH/pxPerMm);
        first=false;startY=endY;
      }
      var fname='BreadVenture - '+(lang==='sr'?'Cuvanje i preporuke':'Hranenie i rekomendacii')+(pname?' - '+pname:'')+'.pdf';
      pdf.save(fname);done();
    }).catch(function(e){done();alert('Не удалось сформировать PDF: '+e);});
    }
    var imgs=Array.prototype.slice.call(node.querySelectorAll('img.cg-img[data-fid]')).filter(function(im){return im.getAttribute('data-fid');});
    if(!imgs.length){render();return;}
    Promise.all(imgs.map(function(im){return careFileBytes(im.getAttribute('data-fid')).then(function(j){
      if(j&&j.ok&&j.b64)return new Promise(function(res){im.onload=function(){res();};im.onerror=function(){res();};im.src='data:'+(j.mime||'image/jpeg')+';base64,'+j.b64;});
    }).catch(function(){});})).then(render).catch(render);
  }
  if(document.fonts&&document.fonts.load){
    Promise.all([document.fonts.load("italic 30px 'Instrument Serif'"),document.fonts.load("700 16px 'Wix Madefor Text'"),document.fonts.load("400 14px 'Wix Madefor Text'")])
      .then(function(){return document.fonts.ready;}).then(function(){setTimeout(go,60);}).catch(go);
  }else setTimeout(go,60);
}
(function(){
  function on(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);}
  on('careAddH',function(){careAddBlock('h');});
  on('careAddP',function(){careAddBlock('p');});
  on('careAddNote',function(){careAddBlock('note');});
  on('careAddTable',function(){careAddBlock('table');});
  on('careAddImg',function(){var i=document.getElementById('careImgInp');if(i)i.click();});
  on('careAddFile',function(){var i=document.getElementById('careFileInp');if(i)i.click();});
  var _ci=document.getElementById('careImgInp');if(_ci)_ci.addEventListener('change',function(e){var f=e.target.files[0];careAddImage(f);e.target.value='';});
  var _cf=document.getElementById('careFileInp');if(_cf)_cf.addEventListener('change',function(e){var f=e.target.files[0];careAddFile(f);e.target.value='';});
  on('careSave',saveStorage);
  on('careDocBtn',exportCarePDF);
  document.querySelectorAll('#careLangSeg .seg-b').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('#careLangSeg .seg-b').forEach(function(x){x.classList.remove('active');});
      b.classList.add('active');storeLang=b.dataset.lang;renderCareAdmin();
    });
  });
})();

