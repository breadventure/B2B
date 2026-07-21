/* ============================================================
 * BreadVenture B2B — Вкладки, язык и калькулятор / КП
 * Переключение вкладок, выбор языка, генератор коммерческого предложения (КП).
 * Файл #2 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

/* ---- tabs / lang ---- */
document.querySelectorAll('.tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
    document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
    tab.classList.add('active');document.getElementById('panel-'+tab.dataset.tab).classList.add('active');
    if(tab.dataset.tab==='price')renderCatalog();
    else if(tab.dataset.tab==='partners')renderPartners();
    else if(tab.dataset.tab==='care'){renderCareAdmin();fillCareDocPartners();}
    else if(tab.dataset.tab==='calendar'){renderCalendar();initCalSave();initCalProdSummary();}
    else if(tab.dataset.tab==='subs'){loadAdminSubs();var sr=document.getElementById('subsReload');if(sr&&!sr._b){sr._b=1;sr.addEventListener('click',loadAdminSubs);}}
    else if(tab.dataset.tab==='stats'){initStatsTab();}
  });
});
document.querySelectorAll('#langSeg .seg-b').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('#langSeg .seg-b').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');kpLang=b.dataset.lang;
  });
});
// заход из Telegram-ссылки (#orders) — сразу открыть вкладку «Заказы»
(function(){if((location.hash||'').replace('#','')==='orders'){var ot=document.querySelector('.tab[data-tab="orders"]');if(ot)ot.click();}})();

function newLine(){return {id:uid(),itemId:(catalog[0]?catalog[0].id:''),qty:1,manual:null};}

function renderOffer(){
  var box=document.getElementById('lines');
  box.querySelectorAll('.o-line:not(.o-head)').forEach(function(n){n.remove();});
  offerLines.forEach(function(ln){
    var item=itemById(ln.itemId),qty=Math.max(0,Number(ln.qty)||0);
    var auto=item?discountFor(item,qty):0,disc=(ln.manual!=null)?ln.manual:auto;
    var unit=item?item.retail*(1-disc/100):0,sum=unit*qty;
    var row=document.createElement('div');row.className='o-line';
    var opts=catalog.map(function(it){var lbl=it.name+(it.weight?' · '+it.weight:'');
      return '<option value="'+it.id+'"'+(it.id===ln.itemId?' selected':'')+'>'+esc(lbl)+'</option>';}).join('');
    row.innerHTML=
      '<div><select class="inp sel">'+opts+'</select><span class="base">'+(item?'базовая '+fmt(item.retail)+' дин.':'')+'</span></div>'+
      '<div><input class="inp qtyi" type="number" min="0" step="1" value="'+qty+'"></div>'+
      '<div class="disc-wrap">'+(ln.manual!=null?'<span class="badge manual">вручную</span>':'<span class="badge auto">авто</span>')+
        '<input class="inp disci" type="number" min="0" max="100" step="1" value="'+disc+'"></div>'+
      '<div class="sum">'+fmt(sum)+'<span class="unit">'+(item?fmt(unit)+' дин/'+itemUnit(item):'')+'</span></div>'+
      '<button class="ox" title="Удалить">×</button>';
    row.querySelector('.sel').addEventListener('change',function(){ln.itemId=this.value;ln.manual=null;renderOffer();});
    var qi=row.querySelector('.qtyi');
    qi.addEventListener('input',function(){
      ln.qty=this.value;ln.manual=null;renderTotals();
      var it2=itemById(ln.itemId),q2=Math.max(0,Number(ln.qty)||0);
      var d2=discountFor(it2,q2),u2=it2?it2.retail*(1-d2/100):0;
      var di2=row.querySelector('.disci');if(di2)di2.value=d2;
      var b=row.querySelector('.badge');if(b){b.className='badge auto';b.textContent='авто';}
      row.querySelector('.sum').innerHTML=fmt(u2*q2)+'<span class="unit">'+(it2?fmt(u2)+' дин/'+itemUnit(it2):'')+'</span>';
    });
    qi.addEventListener('blur',function(){renderOffer();});
    var di=row.querySelector('.disci');
    di.addEventListener('input',function(){
      var v=this.value;ln.manual=(v===''?null:Math.max(0,Math.min(100,Number(v))));renderTotals();
      var it2=itemById(ln.itemId),q2=Math.max(0,Number(ln.qty)||0);
      var d2=(ln.manual!=null)?ln.manual:discountFor(it2,q2),u2=it2?it2.retail*(1-d2/100):0;
      var b=row.querySelector('.badge');if(b){b.className='badge '+(ln.manual!=null?'manual':'auto');b.textContent=(ln.manual!=null?'вручную':'авто');}
      row.querySelector('.sum').innerHTML=fmt(u2*q2)+'<span class="unit">'+(it2?fmt(u2)+' дин/'+itemUnit(it2):'')+'</span>';
    });
    di.addEventListener('blur',function(){renderOffer();});
    row.querySelector('.ox').addEventListener('click',function(){offerLines=offerLines.filter(function(x){return x.id!==ln.id;});renderOffer();});
    box.appendChild(row);
  });
  if(!offerLines.length){var e=document.createElement('div');e.className='empty';
    e.textContent='Добавьте позиции, чтобы рассчитать оффер.';box.appendChild(e);}
  renderTotals();
}

function deliveryInfo(net,pickup){
  if(pickup)return {cost:0,mode:'pickup'};
  if(net<MIN_DELIVERY)return {cost:0,mode:'pickup_required'};
  if(net>=FREE_FROM)return {cost:0,mode:'free'};
  return {cost:DELIVERY,mode:'paid'};
}
function offerCompute(){
  var gross=0,base=0,pdvByRate={};  // цены с PDV; ставка у каждой позиции своя
  offerLines.forEach(function(ln){var item=itemById(ln.itemId);if(!item)return;
    var qty=Math.max(0,Number(ln.qty)||0);var disc=(ln.manual!=null)?ln.manual:discountFor(item,qty);
    var g=item.retail*(1-disc/100)*qty;var rate=itemPdv(item);
    base+=item.retail*qty;gross+=g;
    var pv=g-g/(1+rate/100);pdvByRate[rate]=(pdvByRate[rate]||0)+pv;});
  var pdv=0;for(var k in pdvByRate)pdv+=pdvByRate[k];
  var net=gross-pdv;
  var pickup=document.getElementById('pickup').checked;
  var di=deliveryInfo(net,pickup);
  return {base:base,gross:gross,net:net,save:base-gross,pdv:pdv,pdvByRate:pdvByRate,
          delivery:di.cost,delivMode:di.mode,pickup:pickup,grand:gross+di.cost};
}
function renderTotals(){
  var c=offerCompute(),t=document.getElementById('totals'),r='';
  r+='<div class="trow muted"><span>Базовая (розница, с PDV)</span><span class="v">'+fmt(c.base)+' дин.</span></div>';
  if(c.save>0)r+='<div class="trow save"><span>Скидка партнёру</span><span class="v">−'+fmt(c.save)+' дин.</span></div>';
  r+='<div class="trow"><span>Стоимость заказа (с PDV)</span><span class="v">'+fmt(c.gross)+' дин.</span></div>';
  var rates=Object.keys(c.pdvByRate).map(Number).sort(function(a,b){return a-b;});
  rates.forEach(function(rt){r+='<div class="trow muted"><span>в т.ч. PDV '+rt+'%</span><span class="v">'+fmt(c.pdvByRate[rt])+' дин.</span></div>';});
  r+='<div class="trow muted"><span>Стоимость без PDV</span><span class="v">'+fmt(c.net)+' дин.</span></div>';
  var isPickup=(c.delivMode==='pickup'||c.delivMode==='pickup_required');
  r+='<div class="trow muted"><span>'+(isPickup?'Самовывоз':'Доставка')+'</span><span class="v">'+fmt(c.delivery)+' дин.</span></div>';
  r+='<div class="trow grand"><span class="lbl-g">Итого к оплате</span><span class="v">'+fmt(c.grand)+' дин.</span></div>';
  t.innerHTML=r;
  var d=document.createElement('div');
  if(c.delivMode==='pickup'){d.className='delivery pickup';d.innerHTML='<span class="deliv-ico">🏠</span><div>Самовывоз из пекарни — доставка не начисляется.</div>';}
  else if(c.delivMode==='pickup_required'){d.className='delivery pickup';d.innerHTML='<span class="deliv-ico">⚠</span><div>Сумма без PDV меньше <b>2500 дин.</b> — по условиям доступен только <b>самовывоз</b> из пекарни. До платной доставки не хватает <b>'+fmt(MIN_DELIVERY-c.net)+' дин.</b> (без PDV)</div>';}
  else if(c.delivMode==='free'){d.className='delivery free';d.innerHTML='<span class="deliv-ico">✓</span><div>Сумма без PDV от <b>7000 дин.</b> — <b>бесплатная доставка</b> по Белграду.</div>';}
  else{d.className='delivery';d.innerHTML='<span class="deliv-ico">🚲</span><div>Доставка по Белграду — <b>350 дин.</b> начислена автоматически. До бесплатной не хватает <b>'+fmt(FREE_FROM-c.net)+' дин.</b> (без PDV)</div>';}
  t.appendChild(d);
}

document.getElementById('addLine').addEventListener('click',function(){
  if(!catalog.length){toast('Сначала добавьте позиции');return;}offerLines.push(newLine());renderOffer();hideOut();});
document.getElementById('pickup').addEventListener('change',function(){
  document.getElementById('pickupChk').classList.toggle('on',this.checked);renderTotals();});
document.getElementById('incTerms').addEventListener('change',function(){
  document.getElementById('termsChk').classList.toggle('on',this.checked);});
document.getElementById('clearOffer').addEventListener('click',function(){
  offerLines=[];document.getElementById('partner').value='';
  document.getElementById('pickup').checked=false;document.getElementById('pickupChk').classList.remove('on');
  hideOut();renderOffer();});
function hideOut(){document.getElementById('kpWrap').style.display='none';
  document.getElementById('kpActions').style.display='none';document.getElementById('txtWrap').style.display='none';}

function LB(lang){return (lang==='sr')?{
  kpTitle:'Ponuda za saradnju',primary:'Cenovnik i uslovi saradnje',forw:'Za:',date:'Datum:',
  base:'Maloprodaja',baseSum:'Osnovna vrednost (maloprodaja, sa PDV)',save:'Popust za partnera',
  gross:'Vrednost porudžbine (sa PDV)',pdvIncl:'u tome PDV',netLbl:'Vrednost bez PDV',deliv:'Dostava',pickup:'Preuzimanje u pekari',total:'Ukupno za plaćanje',
  pcs:'kom',cur:'din.',perPc:'din/kom',from:'Od,',price:'Cena/kom',priceWord:'Cena',disc:'Popust',terms:'Uslovi saradnje',sastav:'Sastav:',
  priceNote:'Cene su navedene sa PDV (stopa je navedena uz svaku poziciju). Dostava u Beogradu — 350 din. (za porudžbine od 2500 din. bez PDV; besplatno od 7000 din. bez PDV). Za manje od 2500 din. — preuzimanje u pekari. Nedeljom se otprema ne vrši.',
  foot:'Ponuda važi uz prethodni dogovor. Porudžbina najkasnije 48h pre isporuke.',owner:'Svetlana Vasiljeva (vlasnica)',sub:'zanatska pekara · Beograd'
}:{
  kpTitle:'Коммерческое предложение',primary:'Прайс-лист и условия сотрудничества',forw:'Для:',date:'Дата:',
  base:'Розница',baseSum:'Базовая стоимость (розница, с PDV)',save:'Скидка партнёру',
  gross:'Стоимость заказа (с PDV)',pdvIncl:'в т.ч. PDV',netLbl:'Стоимость без PDV',deliv:'Доставка',pickup:'Самовывоз',total:'Итого к оплате',
  pcs:'шт',cur:'дин.',perPc:'дин/шт',from:'От,',price:'Цена/шт',priceWord:'Цена',disc:'Скидка',terms:'Условия сотрудничества',sastav:'Состав:',
  priceNote:'Цены указаны с учётом PDV (ставка указана у каждой позиции). Доставка по Белграду — 350 дин. (при заказе от 2500 дин. без PDV; бесплатно от 7000 дин. без PDV). Менее 2500 дин. — самовывоз. В воскресенье отгрузки не осуществляются.',
  foot:'Предложение действует по предварительному согласованию. Заказ — не позднее 48 ч до поставки.',owner:'Светлана Васильева (основательница)',sub:'ремесленная пекарня · Белград'
};}
function logoHTML(){return document.querySelector('.logo-box .bv-logo').outerHTML;}
function kpDateMs(id){var el=document.getElementById(id||'kpDate');
  if(el&&el.value){var d=new Date(el.value+'T12:00:00');if(!isNaN(d.getTime()))return d.getTime();}
  return Date.now();}

/* build a KP data object that is fully self-contained for archiving/printing */
function snapTerms(lang){var arr=[];terms.forEach(function(tm){
  var title=lang==='sr'?tm.titleSr:tm.titleRu, body=lang==='sr'?tm.bodySr:tm.bodyRu;
  if(body&&body.trim())arr.push({title:title,body:body});});return arr;}

function catList(){var seen={},arr=[];catalog.forEach(function(it){var c=it.cat||'Без категории';if(!seen[c]){seen[c]=1;arr.push(c);}});return arr;}
function catalogByCats(){
  var cats=Object.keys(selectedCats);if(!cats.length)return catalog.slice();
  return catalog.filter(function(it){return selectedCats[it.cat||'Без категории'];});
}
function renderCatChips(){
  var box=document.getElementById('catChips');if(!box)return;
  var cats=catList(),existing={};cats.forEach(function(c){existing[c]=1;});
  Object.keys(selectedCats).forEach(function(c){if(!existing[c])delete selectedCats[c];});
  document.getElementById('catFilterRow').style.display=cats.length>1?'flex':'none';
  box.innerHTML='';
  cats.forEach(function(c){
    var b=document.createElement('button');
    b.className='chk cat-chip'+(selectedCats[c]?' on':'');
    b.innerHTML='<span>'+esc(c)+'</span>';
    b.addEventListener('click',function(){
      if(selectedCats[c])delete selectedCats[c];else selectedCats[c]=1;
      this.classList.toggle('on');});
    box.appendChild(b);
  });
}

function collectKP(type){
  var lang=kpLang,l=LB(lang),partner=document.getElementById('partner').value.trim();
  var incTerms=document.getElementById('incTerms').checked;
  var items, c=null;
  if(type==='volume'){
    var lines=offerLines.filter(function(ln){var it=itemById(ln.itemId);return it&&(Math.max(0,Number(ln.qty)||0)>0);});
    if(!lines.length)return null;
    c=offerCompute();
    items=lines.map(function(ln){var it=itemById(ln.itemId),qty=Math.max(0,Number(ln.qty)||0);
      var disc=(ln.manual!=null)?ln.manual:discountFor(it,qty);
      return {name:it.name,weight:it.weight,cat:it.cat||'',catSr:(catNamesSr[it.cat]||''),desc:locDesc(it,lang),sostav:locSostav(it,lang),retail:it.retail,pdv:itemPdv(it),uom:itemUnit(it),
              tiers:JSON.parse(JSON.stringify(it.tiers||[])),qty:qty,disc:disc,unit:it.retail*(1-disc/100)};});
  }else{
    var uniq;
    if(Object.keys(selectedCats).length){uniq=catalogByCats();}
    else{var seen={};uniq=[];offerLines.forEach(function(ln){var it=itemById(ln.itemId);if(it&&!seen[it.id]){seen[it.id]=1;uniq.push(it);}});if(!uniq.length)uniq=catalog.slice();}
    items=uniq.map(function(it){return {name:it.name,weight:it.weight,cat:it.cat||'',catSr:(catNamesSr[it.cat]||''),desc:locDesc(it,lang),sostav:locSostav(it,lang),retail:it.retail,pdv:itemPdv(it),uom:itemUnit(it),
              tiers:JSON.parse(JSON.stringify(it.tiers||[]))};});
  }
  return {id:uid(),ts:kpDateMs(),when:nowStr(),type:type,lang:lang,partner:partner,
          pickup:c?c.pickup:false,incTerms:incTerms,items:items,totals:c,termsSnap:incTerms?snapTerms(lang):[]};
}

function tiersTableFromData(item,l,lang){
  if(!item.tiers||!item.tiers.length)return '';
  var u=uomLoc(item.uom,lang);
  var ts=item.tiers.slice().sort(function(a,b){return a.min-b.min;});
  var h='<div class="kp-tiers"><table><tr><th>'+l.from+' '+esc(u)+'</th>';
  ts.forEach(function(t){h+='<th>'+t.min+'+</th>';});
  h+='</tr><tr><td>'+l.priceWord+'/'+esc(u)+'</td>';ts.forEach(function(t){h+='<td>'+fmt(item.retail*(1-(Number(t.disc)||0)/100))+'</td>';});
  var _rate=itemPdv(item);
  h+='</tr><tr><td>'+(lang==='sr'?'bez PDV':'без PDV')+'</td>';ts.forEach(function(t){var wp=item.retail*(1-(Number(t.disc)||0)/100);h+='<td>'+fmt(wp/(1+_rate/100))+'</td>';});
  h+='</tr><tr><td>'+l.disc+'</td>';ts.forEach(function(t){h+='<td>'+(Number(t.disc)||0)+'%</td>';});
  h+='</tr></table></div>';return h;
}
function photoFor(name,weight){for(var i=0;i<catalog.length;i++)if(catalog[i].name===name&&catalog[i].weight===weight)return catalog[i].photo;return '';}

/* render KP HTML from a KP data object (live or archived) */
function renderKPHtml(kp){
  var l=LB(kp.lang),h='<div class="kp">';
  h+='<div class="kp-head">'+logoHTML()+'<div><h2>'+esc(kp.type==='primary'?l.primary:l.kpTitle)+'</h2>'+
     '<div class="sub">BreadVenture · '+l.sub+'</div></div></div>';
  h+='<div class="kp-meta"><div class="kp-for">'+(kp.partner?l.forw+' <b>'+esc(kp.partner)+'</b>':'')+'</div>'+
     '<div class="kp-date">'+l.date+' '+esc(new Date(kp.ts).toLocaleDateString(kp.lang==='sr'?'sr-RS':'ru-RU',{day:'2-digit',month:'long',year:'numeric'}))+'</div></div>';
  var _groups=[],_gm={};
  kp.items.forEach(function(it){var cc=(it.cat||'').trim()||'__nocat';if(!_gm[cc]){_gm[cc]={cat:cc,items:[]};_groups.push(_gm[cc]);}_gm[cc].items.push(it);});
  _groups.forEach(function(_g){
    if(_g.cat&&_g.cat!=='__nocat'){var _cn=(kp.lang==='sr'&&_g.items[0]&&_g.items[0].catSr)?_g.items[0].catSr:_g.cat;h+='<div class="kp-cat">'+esc(_cn)+'</div>';}
    _g.items.forEach(function(it){
    var ph=photoFor(it.name,it.weight);
    var u=uomLoc(it.uom,kp.lang);
    h+='<div class="kp-prod" style="display:block;page-break-inside:avoid;margin-bottom:20px;">';
    h+='<div class="kp-prod-row" style="display:flex;gap:18px;align-items:flex-start;">';
    if(ph)h+='<img src="'+ph+'" alt="" style="width:200px;height:auto;flex:none;border-radius:12px;border:1px solid #e6e2d3;">';
    h+='<div class="info" style="flex:1;min-width:0;"><h4>'+esc(it.name)+(it.weight?'<span class="w">'+esc(it.weight)+'</span>':'')+'</h4>';
    if(it.sostav)h+='<div class="sostav"><b>'+l.sastav+'</b> '+esc(it.sostav)+'</div>';
    if(kp.type==='primary'){
      h+='<div class="kp-baseprice">'+l.base+': '+fmt(it.retail)+' '+l.cur+' · PDV '+(it.pdv!=null?it.pdv:10)+'%</div>';
      h+=tiersTableFromData(it,l,kp.lang);
    }else{
      h+='<div class="kp-pricing">'+
         (it.disc>0?'<span class="pp">'+l.base+': <span class="base">'+fmt(it.retail)+' '+l.cur+'</span></span>':'')+
         '<span class="pp offer">'+fmt(it.unit)+' '+l.cur+'/'+esc(u)+(it.disc>0?' (−'+fmt(it.disc)+'%)':'')+'</span>'+
         '<span class="pp">× '+it.qty+' '+esc(u)+' = <b>'+fmt(it.unit*it.qty)+' '+l.cur+'</b></span></div>';
      h+=tiersTableFromData(it,l,kp.lang);
    }
    h+='</div></div>';
    if(it.desc)h+='<div class="desc" style="margin-top:10px;">'+esc(it.desc)+'</div>';
    h+='</div>';
    });
  });
  if(kp.type==='volume'&&kp.totals){
    var c=kp.totals;
    var g=(c.gross!=null)?c.gross:((c.net||0)+(c.pdv||0));
    var isPickup=(c.delivMode==='pickup'||c.delivMode==='pickup_required'||c.pickup);
    h+='<div class="kp-totals">';
    h+='<div class="kp-trow muted"><span>'+l.baseSum+'</span><span>'+fmt(c.base)+' '+l.cur+'</span></div>';
    if(c.save>0)h+='<div class="kp-trow"><span>'+l.save+'</span><span>−'+fmt(c.save)+' '+l.cur+'</span></div>';
    h+='<div class="kp-trow"><span>'+l.gross+'</span><span>'+fmt(g)+' '+l.cur+'</span></div>';
    var rates=c.pdvByRate?Object.keys(c.pdvByRate).map(Number).sort(function(a,b){return a-b;}):[];
    if(rates.length){rates.forEach(function(rt){h+='<div class="kp-trow muted"><span>'+l.pdvIncl+' '+rt+'%</span><span>'+fmt(c.pdvByRate[rt])+' '+l.cur+'</span></div>';});}
    else h+='<div class="kp-trow muted"><span>'+l.pdvIncl+'</span><span>'+fmt(c.pdv)+' '+l.cur+'</span></div>';
    h+='<div class="kp-trow muted"><span>'+l.netLbl+'</span><span>'+fmt(c.net!=null?c.net:(g-(c.pdv||0)))+' '+l.cur+'</span></div>';
    h+='<div class="kp-trow muted"><span>'+(isPickup?l.pickup:l.deliv)+'</span><span>'+fmt(c.delivery)+' '+l.cur+'</span></div>';
    h+='<div class="kp-trow g"><span>'+l.total+'</span><span>'+fmt(c.grand)+' '+l.cur+'</span></div></div>';
  }
  if(kp.termsSnap&&kp.termsSnap.length){
    h+='<div class="kp-terms"><h3>'+l.terms+'</h3>';
    kp.termsSnap.forEach(function(tm){h+='<div class="kp-term"><h4>'+esc(tm.title)+'</h4><p>'+esc(tm.body)+'</p></div>';});
    h+='</div>';
  }
  h+='<div class="kp-foot">'+esc(footNote(kp.lang))+'<br>'+footLine(kp.lang)+'</div>';
  h+='</div>';return h;
}
function genPDF(filename){
  var src=document.querySelector('#kpWrap .kp');
  if(!src){toast('Сначала сформируйте документ');return;}
  if(typeof html2canvas==='undefined'||!window.jspdf){toast('Нет связи с библиотекой PDF — используйте «Печать»');return;}
  toast('Готовлю PDF…');
  var WIDTH=760;
  var holder=document.createElement('div');
  holder.style.cssText='position:fixed;left:-9999px;top:0;width:'+WIDTH+'px;background:#fff;font-family:\'Wix Madefor Text\',sans-serif;';
  var clone=src.cloneNode(true);
  clone.style.boxShadow='none';clone.style.border='none';clone.style.borderRadius='0';clone.style.margin='0';clone.style.background='#ffffff';
  clone.querySelectorAll('.kp-terms').forEach(function(n){n.style.boxShadow='none';n.style.border='none';n.style.borderRadius='0';n.style.margin='18px 0 0';});
  clone.querySelectorAll('.kp-head h2,.kp-terms h3').forEach(function(n){n.style.fontFamily="Georgia,'Times New Roman',serif";n.style.fontStyle='italic';n.style.letterSpacing='0';n.style.wordSpacing='0';});
  holder.appendChild(clone);document.body.appendChild(holder);
  // точки возможного разреза по границам блоков
  var cutEls=[];
  var kids=Array.prototype.slice.call(clone.children);
  for(var ki=0;ki<kids.length;ki++){
    var ch=kids[ki];
    if(ch.classList.contains('kp-terms')){
      cutEls.push(ch); // весь блок условий переносится целиком (с заголовком)
      Array.prototype.forEach.call(ch.children,function(t,ti){if(ti>=2)cutEls.push(t);}); // разрезы между разделами; заголовок и первый раздел вместе
    }else if(ch.classList.contains('kp-foot')){
      // подвал не отдельная точка — приклеивается к предыдущему блоку
    }else if(ch.classList.contains('kp-cat')){
      cutEls.push(ch); // разрез перед категорией; заголовок держим с первым товаром
      if(ki+1<kids.length&&kids[ki+1].classList.contains('kp-prod'))ki++;
    }else cutEls.push(ch);
  }
  var baseTop=clone.getBoundingClientRect().top;
  var baseLeft=clone.getBoundingClientRect().left;
  var cutsCss=cutEls.map(function(el){return el.getBoundingClientRect().top-baseTop;});
  var _te=clone.querySelector('.kp-terms');var _ter=_te?_te.getBoundingClientRect():null;
  var termsTopCss=_ter?(_ter.top-baseTop):-1, termsBotCss=_ter?(_ter.bottom-baseTop):-1;
  var termsLeftCss=_ter?(_ter.left-baseLeft):0, termsWidCss=_ter?_ter.width:0;
  function done(ok){if(holder.parentNode)document.body.removeChild(holder);toast(ok?'PDF сохранён':'Ошибка PDF — используйте «Печать»');}
  var fontsReady=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
  fontsReady.then(function(){return new Promise(function(r){setTimeout(r,150);});}).then(function(){
    return html2canvas(holder,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
  }).then(function(canvas){
    var jsPDF=window.jspdf.jsPDF;
    var pdf=new jsPDF('p','mm','a4');
    var pageW=210,pageH=297,margin=13,usableW=pageW-margin*2,usableH=pageH-margin*2;
    var scale=canvas.width/WIDTH;
    var pxPerPage=usableH*canvas.width/usableW;
    var cutsPx=cutsCss.map(function(c){return c*scale;});cutsPx.push(canvas.height);
    var start=0,first=true;
    while(start<canvas.height-1){
      var target=start+pxPerPage, end=-1;
      if(target>=canvas.height){end=canvas.height;}
      else{for(var i=0;i<cutsPx.length;i++){if(cutsPx[i]>start+20&&cutsPx[i]<=target&&cutsPx[i]>end)end=cutsPx[i];}
        if(end<0)end=target;}
      var fragH=Math.round(end-start);if(fragH<=0)break;
      var c2=document.createElement('canvas');c2.width=canvas.width;c2.height=fragH;
      c2.getContext('2d').drawImage(canvas,0,start,canvas.width,fragH,0,0,canvas.width,fragH);
      var imgH=fragH*usableW/canvas.width;
      if(!first)pdf.addPage();first=false;
      // если блок условий разрезан и продолжается — дотянуть кремовый фон до низа страницы
      if(termsBotCss>0){var tT=termsTopCss*scale, tB=termsBotCss*scale;
        if(end>tT+2 && end<tB-2){var k=usableW/WIDTH;
          pdf.setFillColor(244,243,233);
          pdf.rect(margin+termsLeftCss*k, margin+imgH-0.3, termsWidCss*k, usableH-imgH+0.3, 'F');}}
      pdf.addImage(c2.toDataURL('image/jpeg',0.95),'JPEG',margin,margin,usableW,imgH);
      start=end;
    }
    pdf.save(filename);done(true);
  }).catch(function(){done(false);});
}
function showKP(kp){
  lastKP=kp;
  document.getElementById('kpWrap').innerHTML=renderKPHtml(kp);
  document.getElementById('kpWrap').style.display='block';
  document.getElementById('kpActions').style.display='flex';
  document.getElementById('txtWrap').style.display='none';
  document.getElementById('kpWrap').scrollIntoView({behavior:'smooth',block:'start'});
}
document.getElementById('genPrimary').addEventListener('click',function(){var kp=collectKP('primary');if(!kp){toast('Добавьте позиции');return;}showKP(kp);});
document.getElementById('genKP').addEventListener('click',function(){var kp=collectKP('volume');if(!kp){toast('Добавьте позиции с количеством');return;}showKP(kp);});
document.getElementById('printKP').addEventListener('click',function(){window.print();});
document.getElementById('downloadKP').addEventListener('click',function(){
  var n=(lastKP&&lastKP.partner)?lastKP.partner.replace(/[^\wа-яА-Я-]+/g,'_'):'KP';
  genPDF('BreadVenture-'+n+'.pdf');});
document.getElementById('closeKP').addEventListener('click',hideOut);
document.getElementById('saveKP').addEventListener('click',archiveLastKP);

function buildText(){
  var kp=collectKP('volume');if(!kp){toast('Добавьте позиции с количеством');return;}
  var l=LB(kp.lang),c=kp.totals,o=[l.kpTitle.toUpperCase()+' — BreadVenture'];
  if(kp.partner)o.push(l.forw+' '+kp.partner);o.push('');
  kp.items.forEach(function(it){o.push('• '+it.name+(it.weight?' '+it.weight:''));
    var u=uomLoc(it.uom,kp.lang);
    o.push('   '+(it.disc>0?(l.base.toLowerCase()+' '+fmt(it.retail)+' '+l.cur+' → '):'')+fmt(it.unit)+' '+l.cur+'/'+u+
      (it.disc>0?' (−'+fmt(it.disc)+'%)':'')+' × '+it.qty+' '+u+' = '+fmt(it.unit*it.qty)+' '+l.cur);});
  o.push('');
  o.push(l.baseSum+': '+fmt(c.base)+' '+l.cur);
  if(c.save>0)o.push(l.save+': −'+fmt(c.save)+' '+l.cur);
  o.push(l.gross+': '+fmt(c.gross)+' '+l.cur);
  var prates=c.pdvByRate?Object.keys(c.pdvByRate).map(Number).sort(function(a,b){return a-b;}):[];
  if(prates.length)prates.forEach(function(rt){o.push(l.pdvIncl+' '+rt+'%: '+fmt(c.pdvByRate[rt])+' '+l.cur);});
  else o.push(l.pdvIncl+': '+fmt(c.pdv)+' '+l.cur);
  o.push(l.netLbl+': '+fmt(c.net)+' '+l.cur);
  o.push(((c.delivMode==='pickup'||c.delivMode==='pickup_required')?l.pickup:l.deliv)+': '+fmt(c.delivery)+' '+l.cur);
  o.push(l.total+': '+fmt(c.grand)+' '+l.cur);
  if(kp.termsSnap&&kp.termsSnap.length){o.push('');o.push('— '+l.terms.toUpperCase()+' —');
    kp.termsSnap.forEach(function(tm){o.push('');o.push(tm.title+':');o.push(tm.body);});}
  o.push('');o.push(footNote(kp.lang));o.push(footData.brand+' · '+footData.email+' · '+footData.phone);
  document.getElementById('txtOut').value=o.join('\n');
  document.getElementById('txtWrap').style.display='block';
  document.getElementById('kpWrap').style.display='none';document.getElementById('kpActions').style.display='none';
  document.getElementById('txtWrap').scrollIntoView({behavior:'smooth',block:'nearest'});
}
document.getElementById('genTxt').addEventListener('click',buildText);
document.getElementById('copyTxt').addEventListener('click',function(){
  var ta=document.getElementById('txtOut');ta.select();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(function(){toast('Скопировано');},function(){try{document.execCommand('copy');toast('Скопировано');}catch(e){}});
  }else{try{document.execCommand('copy');toast('Скопировано');}catch(e){}}
});
