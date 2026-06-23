/* ============================================================
 * BreadVenture B2B — Сводка производства и статистика
 * Производственная сводка на день, статистика по счетам (оплата/долги), рендер списка заказов.
 * Файл #7 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

function buildProductionSummary(date){
  var target=normDate(date);
  var orders=adminOrders.filter(function(o){return normDate(o.date)===target&&(o.status||'submitted')!=='cancelled';});
  var totalsMap={},byPartner=[];
  orders.forEach(function(o){
    var pname=o.partner||'—',pEntry=null;
    byPartner.forEach(function(x){if(x.partner===pname)pEntry=x;});
    if(!pEntry){pEntry={partner:pname,items:[]};byPartner.push(pEntry);}
    (o.items||[]).forEach(function(it){
      var q=Number(it.qty)||0;if(!q)return;
      var key=(it.name||'')+'|'+(it.weight||'');
      if(!totalsMap[key])totalsMap[key]={name:it.name||'',weight:it.weight||'',qty:0};
      totalsMap[key].qty+=q;
      var pi=null;pEntry.items.forEach(function(x){if(x.name===(it.name||'')&&x.weight===(it.weight||''))pi=x;});
      if(!pi){pi={name:it.name||'',weight:it.weight||'',qty:0};pEntry.items.push(pi);}
      pi.qty+=q;
    });
  });
  var totals=Object.keys(totalsMap).map(function(k){return totalsMap[k];}).sort(function(a,b){return b.qty-a.qty;});
  return {date:date,orderCount:orders.length,totals:totals,byPartner:byPartner};
}
function renderProdSummary(date,cid){
  cid=cid||'prodSummary';
  var w=document.getElementById(cid);if(!w)return;
  date=date||new Date().toISOString().slice(0,10);
  if(!adminOrders.length){w.innerHTML='<div class="empty">Нажмите «Обновить» в заказах, чтобы загрузить данные.</div>';return;}
  var s=buildProductionSummary(date);
  if(!s.orderCount){w.innerHTML='<div class="empty">На '+esc(declDateFmt(date))+' заказов нет.</div>';return;}
  var totalsH=s.totals.map(function(t){return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--line);"><span>'+esc(t.name)+(t.weight?' · '+esc(t.weight):'')+'</span><b style="white-space:nowrap;">'+t.qty+' шт</b></div>';}).join('');
  var partnersH=s.byPartner.map(function(p){
    var its=p.items.map(function(it){return esc(it.name)+(it.weight?' ('+esc(it.weight)+')':'')+' — '+it.qty+' шт';}).join(', ');
    return '<div style="padding:7px 0;border-bottom:1px solid var(--line);"><b>'+esc(p.partner)+'</b><div class="hint" style="margin-top:3px;line-height:1.6;">'+its+'</div></div>';
  }).join('');
  w.innerHTML='<div style="font-weight:700;margin-bottom:12px;">📅 '+esc(declDateFmt(date))+' · '+s.orderCount+' заказ(ов)</div>'+
    '<div style="display:flex;gap:28px;flex-wrap:wrap;">'+
      '<div style="flex:1;min-width:240px;"><div class="lbl" style="margin-bottom:6px;">Всего испечь</div>'+totalsH+'</div>'+
      '<div style="flex:1;min-width:240px;"><div class="lbl" style="margin-bottom:6px;">По заведениям</div>'+partnersH+'</div>'+
    '</div>';
}
var statsRange='365';
function buildStats(opts){
  opts=opts||{};
  var cutoff=null, until=null;
  if(opts.from)cutoff=new Date(opts.from+'T00:00:00');
  if(opts.to)until=new Date(opts.to+'T23:59:59');
  if(!opts.from && opts.range && opts.range!=='all'){
    cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(opts.range));cutoff.setHours(0,0,0,0);
  }
  var today=new Date();today.setHours(0,0,0,0);
  // карта название позиции → категория (из каталога)
  var catMap={};
  if(typeof catalog!=='undefined'&&catalog&&catalog.length){
    catalog.forEach(function(p){if(p&&p.name)catMap[String(p.name).trim().toLowerCase()]=p.cat||'Без категории';});
  }
  var orders=adminOrders.filter(function(o){
    if((o.status||'submitted')==='cancelled')return false;
    var d=new Date(o.created||(normDate(o.date)+'T00:00:00'));
    if(cutoff&&(isNaN(d.getTime())||d<cutoff))return false;
    if(until&&(isNaN(d.getTime())||d>until))return false;
    return true;
  });
  var total=0,paidCnt=0,nedospeliCnt=0,dospeliCnt=0,totalSum=0,byPartner={},debtByPartner={};
  var byProduct={},byCategory={},byMonth={};
  orders.forEach(function(o){
    var sum=Number(o.total)||0;totalSum+=sum;total++;
    var pname=o.partner||'—';byPartner[pname]=(byPartner[pname]||0)+sum;
    if(o.paid)paidCnt++;
    else{
      var due=normDate(o.dueDate);
      var overdue=due&&(new Date(due+'T00:00:00')<today);
      if(overdue)dospeliCnt++;else nedospeliCnt++;
      debtByPartner[pname]=(debtByPartner[pname]||0)+sum;
    }
    (o.items||[]).forEach(function(it){
      var nm=String(it.name||'—').trim();
      var q=Number(it.qty)||0, s=Number(it.sum)||0;
      if(!byProduct[nm])byProduct[nm]={qty:0,sum:0};
      byProduct[nm].qty+=q; byProduct[nm].sum+=s;
      var cat=catMap[nm.toLowerCase()]||'Без категории';
      if(!byCategory[cat])byCategory[cat]={qty:0,sum:0};
      byCategory[cat].qty+=q; byCategory[cat].sum+=s;
    });
    var dm=new Date(o.created||(normDate(o.date)+'T00:00:00'));
    if(!isNaN(dm.getTime())){var mk=dm.getFullYear()+'-'+('0'+(dm.getMonth()+1)).slice(-2);byMonth[mk]=(byMonth[mk]||0)+sum;}
  });
  var best=Object.keys(byPartner).map(function(k){return {name:k,sum:byPartner[k]};}).sort(function(a,b){return b.sum-a.sum;}).slice(0,5);
  var debt=Object.keys(debtByPartner).map(function(k){return {name:k,sum:debtByPartner[k]};}).filter(function(x){return x.sum>0;}).sort(function(a,b){return b.sum-a.sum;}).slice(0,5);
  var prodArr=Object.keys(byProduct).map(function(k){return {name:k,qty:byProduct[k].qty,sum:byProduct[k].sum};});
  var prodByQty=prodArr.slice().sort(function(a,b){return b.qty-a.qty;}).slice(0,8);
  var prodBySum=prodArr.slice().sort(function(a,b){return b.sum-a.sum;}).slice(0,8);
  var cats=Object.keys(byCategory).map(function(k){return {name:k,qty:byCategory[k].qty,sum:byCategory[k].sum};}).sort(function(a,b){return b.sum-a.sum;});
  var months=Object.keys(byMonth).sort().map(function(k){return {m:k,sum:byMonth[k]};});
  return {total:total,paidCnt:paidCnt,nedospeliCnt:nedospeliCnt,dospeliCnt:dospeliCnt,totalSum:totalSum,
          best:best,debt:debt,prodByQty:prodByQty,prodBySum:prodBySum,cats:cats,months:months};
}
function statsDonut(segs,size){
  var totalV=segs.reduce(function(s,x){return s+x.value;},0)||1;
  var r=size/2-13,cx=size/2,cy=size/2,circ=2*Math.PI*r,off=0,parts='';
  segs.forEach(function(sg){
    if(sg.value<=0)return;
    var len=sg.value/totalV*circ;
    parts+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+sg.color+'" stroke-width="24" stroke-dasharray="'+len+' '+(circ-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 '+cx+' '+cy+')"/>';
    off+=len;
  });
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+parts+'</svg>';
}
function statsBar(rank,name,sum,max,color){
  var w=max>0?Math.max(3,Math.round(sum/max*100)):0;
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span style="width:16px;color:var(--muted);font-size:13px;">'+rank+'</span>'+
    '<div style="flex:1;background:var(--cream);border-radius:7px;overflow:hidden;height:28px;position:relative;border:1px solid var(--line);">'+
      '<div style="width:'+w+'%;height:100%;background:'+color+';opacity:.55;"></div>'+
      '<span style="position:absolute;left:9px;top:0;line-height:28px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 16px);">'+esc(name)+'</span>'+
    '</div>'+
    '<span style="width:110px;text-align:right;font-size:12.5px;font-weight:700;white-space:nowrap;">'+fmt(sum)+' дин.</span></div>';
}
var statsFrom='', statsTo='';
function statsCurrentOpts(){
  if(statsRange==='custom' && statsFrom && statsTo)return {from:statsFrom,to:statsTo};
  return {range:statsRange};
}
var RU_MON=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
function statsMonthLabel(mk){var p=mk.split('-');return RU_MON[(Number(p[1])||1)-1]+' '+p[0].slice(2);}
function statsMonthsChart(months){
  if(!months.length)return '<div class="hint">Нет данных за период.</div>';
  var max=Math.max.apply(null,months.map(function(m){return m.sum;}))||1;
  var n=months.length, bw=46, gap=20, padL=8, padB=34, padT=22, H=220;
  var W=padL*2+n*bw+(n-1)*gap, plotH=H-padB-padT;
  var bars='';
  months.forEach(function(m,i){
    var x=padL+i*(bw+gap);
    var h=Math.max(2,Math.round(m.sum/max*plotH));
    var y=padT+plotH-h;
    bars+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+h+'" rx="5" fill="#47A2DA" opacity="0.55"/>';
    bars+='<text x="'+(x+bw/2)+'" y="'+(y-5)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1D1D1B">'+Math.round(m.sum/1000)+'к</text>';
    bars+='<text x="'+(x+bw/2)+'" y="'+(H-12)+'" text-anchor="middle" font-size="10.5" fill="#777">'+statsMonthLabel(m.m)+'</text>';
  });
  return '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="max-width:100%;">'+bars+'</svg>';
}
function statsProdRow(rank,name,metricTxt,subTxt,frac,color){
  var w=Math.max(3,Math.round(frac*100));
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;"><span style="width:16px;color:var(--muted);font-size:13px;">'+rank+'</span>'+
    '<div style="flex:1;background:var(--cream);border-radius:7px;overflow:hidden;height:28px;position:relative;border:1px solid var(--line);">'+
      '<div style="width:'+w+'%;height:100%;background:'+color+';opacity:.5;"></div>'+
      '<span style="position:absolute;left:9px;top:0;line-height:28px;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 14px);">'+esc(name)+'</span>'+
    '</div>'+
    '<span style="width:80px;text-align:right;font-size:12.5px;font-weight:700;">'+metricTxt+'</span>'+
    '<span style="width:96px;text-align:right;font-size:11.5px;color:var(--muted);">'+subTxt+'</span></div>';
}
function renderStats(){
  var w=document.getElementById('statsView');if(!w)return;
  if(!adminOrders.length){w.innerHTML='<div class="empty">Нажмите «Обновить», чтобы загрузить данные.</div>';return;}
  var s=buildStats(statsCurrentOpts());
  if(!s.total){w.innerHTML='<div class="empty">За выбранный период счетов нет.</div>';return;}
  var segs=[{value:s.paidCnt,color:'#3a8a3a'},{value:s.nedospeliCnt,color:'#5bb6a8'},{value:s.dospeliCnt,color:'#d9706e'}];
  var leg=function(color,n,label){return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;"><span style="width:11px;height:11px;border-radius:50%;background:'+color+';flex:none;"></span><b style="font-size:18px;">'+n+'</b> <span class="hint">'+label+'</span></div>';};
  var donutBlock='<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">'+
    '<div style="position:relative;width:200px;height:200px;flex:none;">'+statsDonut(segs,200)+
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;"><b style="font-size:26px;">'+s.total+'</b><span class="hint">счетов</span></div></div>'+
    '<div style="flex:1;min-width:220px;">'+
      leg('#3a8a3a',s.paidCnt,'Оплачено')+
      leg('#5bb6a8',s.nedospeliCnt,'Не оплачено, срок не наступил')+
      leg('#d9706e',s.dospeliCnt,'Просрочено')+
      '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px;font-size:15px;">Сумма выданных счетов: <b>'+fmt(s.totalSum)+' дин.</b></div></div>'+
    '</div>';
  var maxBest=s.best.length?s.best[0].sum:0;
  var bestBlock=s.best.length?s.best.map(function(x,i){return statsBar(i+1,x.name,x.sum,maxBest,'#47A2DA');}).join(''):'<div class="hint">Нет данных.</div>';
  var maxDebt=s.debt.length?s.debt[0].sum:0;
  var debtBlock=s.debt.length?s.debt.map(function(x,i){return statsBar(i+1,x.name,x.sum,maxDebt,'#d9706e');}).join(''):'<div class="hint">Должников нет — всё оплачено 🎉</div>';
  // позиции
  var maxQ=s.prodByQty.length?s.prodByQty[0].qty:0;
  var qtyBlock=s.prodByQty.length?s.prodByQty.map(function(x,i){return statsProdRow(i+1,x.name,x.qty+' шт',fmt(x.sum)+' дин.',maxQ?x.qty/maxQ:0,'#47A2DA');}).join(''):'<div class="hint">Нет данных.</div>';
  var maxS=s.prodBySum.length?s.prodBySum[0].sum:0;
  var sumBlock=s.prodBySum.length?s.prodBySum.map(function(x,i){return statsProdRow(i+1,x.name,fmt(x.sum)+' дин.',x.qty+' шт',maxS?x.sum/maxS:0,'#3a8a3a');}).join(''):'<div class="hint">Нет данных.</div>';
  // категории
  var maxC=s.cats.length?s.cats[0].sum:0;
  var catBlock=s.cats.length?s.cats.map(function(x,i){return statsProdRow(i+1,x.name,fmt(x.sum)+' дин.',x.qty+' шт',maxC?x.sum/maxC:0,'#c79a4b');}).join(''):'<div class="hint">Нет данных.</div>';

  w.innerHTML=donutBlock+
    '<div style="display:flex;gap:28px;flex-wrap:wrap;margin-top:26px;">'+
      '<div style="flex:1;min-width:300px;"><div class="cat-title" style="margin-top:0;">Лучшие покупатели</div>'+bestBlock+'</div>'+
      '<div style="flex:1;min-width:300px;"><div class="cat-title" style="margin-top:0;">Крупнейшие должники</div>'+debtBlock+'</div>'+
    '</div>'+
    '<div class="cat-title">Заработок по месяцам</div>'+
    '<div style="overflow-x:auto;padding:4px 0;">'+statsMonthsChart(s.months)+'</div>'+
    '<div style="display:flex;gap:28px;flex-wrap:wrap;margin-top:20px;">'+
      '<div style="flex:1;min-width:340px;"><div class="cat-title" style="margin-top:0;">Самые продаваемые позиции — по количеству</div>'+qtyBlock+'</div>'+
      '<div style="flex:1;min-width:340px;"><div class="cat-title" style="margin-top:0;">Самые прибыльные позиции — по заработку</div>'+sumBlock+'</div>'+
    '</div>'+
    '<div class="cat-title">Категории товаров — по заработку</div>'+catBlock;
}
function statsExportPdf(){
  var view=document.getElementById('statsView');if(!view||!view.innerHTML.trim())return;
  if(!window.html2canvas||!window.jspdf){alert('Библиотеки PDF не загрузились, обновите страницу.');return;}
  var opts=statsCurrentOpts();
  var periodTxt=opts.from?(opts.from+' — '+opts.to):(statsRange==='30'?'за 30 дней':statsRange==='365'?'за 12 месяцев':'за всё время');
  var logo=(typeof BV_DOC_LOGO_PNG!=='undefined')?BV_DOC_LOGO_PNG:'';
  var holder=document.createElement('div');
  holder.style.cssText='position:fixed;left:-9999px;top:0;width:760px;background:#fff;padding:28px;color:#1D1D1B;';
  holder.innerHTML='<div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;">'+
    (logo?'<img src="'+logo+'" style="width:78px;height:auto;">':'')+
    '<div><div style="font-size:22px;font-weight:700;">Отчёт по статистике</div>'+
    '<div style="color:#777;font-size:13px;">BreadVenture · период: '+periodTxt+' · сформирован '+new Date().toLocaleDateString('ru-RU')+'</div></div></div>'+
    '<hr style="border:none;border-top:2px solid #47A2DA;margin:10px 0 18px;">'+view.innerHTML;
  document.body.appendChild(holder);
  var fin=function(){try{document.body.removeChild(holder);}catch(e){}};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){
    return window.html2canvas(holder,{scale:3,backgroundColor:'#ffffff',useCORS:true,windowWidth:820});
  }).then(function(canvas){
    var jsPDF=window.jspdf.jsPDF,pdf=new jsPDF('p','mm','a4');
    var pw=210,ph=297,iw=pw,ih=canvas.height*iw/canvas.width;
    if(ih<=ph){pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,iw,ih);pdf.save('BreadVenture_статистика_'+(new Date().toISOString().slice(0,10))+'.pdf');fin();return;}
    var ctx=canvas.getContext('2d'), W=canvas.width;
    var margin=10;                                  // поле сверху/снизу, мм
    var contentMm=ph-margin*2;                      // полезная высота страницы
    var pagePx=Math.floor(contentMm*canvas.width/pw);
    function isWhiteRow(y){
      if(y<0||y>=canvas.height)return false;
      var d;try{d=ctx.getImageData(0,y,W,1).data;}catch(e){return false;}
      for(var x=0;x<d.length;x+=4){if(d[x]<248||d[x+1]<248||d[x+2]<248)return false;}
      return true;
    }
    function findCut(target){
      var minY=target-Math.floor(pagePx*0.28);
      for(var y=target;y>minY;y--){if(isWhiteRow(y))return y;}
      return target;
    }
    var y=0;
    while(y<canvas.height){
      var end=Math.min(y+pagePx,canvas.height);
      if(end<canvas.height)end=findCut(end);
      var slice=end-y;
      var cv=document.createElement('canvas');cv.width=W;cv.height=slice;
      cv.getContext('2d').drawImage(canvas,0,y,W,slice,0,0,W,slice);
      if(y>0)pdf.addPage();
      pdf.addImage(cv.toDataURL('image/png'),'PNG',0,margin,iw,slice*iw/W);
      y=end;
    }
    pdf.save('BreadVenture_статистика_'+(new Date().toISOString().slice(0,10))+'.pdf');fin();
  }).catch(function(e){fin();alert('Ошибка PDF: '+e);});
}
function initStatsTab(){
  var seg=document.getElementById('statsRange');
  if(seg&&!seg._b){seg._b=1;seg.querySelectorAll('.seg-b').forEach(function(b){b.addEventListener('click',function(){
    seg.querySelectorAll('.seg-b').forEach(function(x){x.classList.remove('active');});this.classList.add('active');
    statsRange=this.dataset.range;
    var pr=document.getElementById('statsPeriodRow');if(pr)pr.style.display='none';
    renderStats();});});}
  var ap=document.getElementById('statsApply');
  if(ap&&!ap._b){ap._b=1;ap.addEventListener('click',function(){
    var f=document.getElementById('statsFromInp'),t=document.getElementById('statsToInp');
    if(!f.value||!t.value){alert('Укажите обе даты периода.');return;}
    if(f.value>t.value){alert('Дата «от» позже даты «до».');return;}
    statsFrom=f.value;statsTo=t.value;statsRange='custom';
    if(seg)seg.querySelectorAll('.seg-b').forEach(function(x){x.classList.remove('active');});
    renderStats();});}
  var pb=document.getElementById('statsPeriodBtn');
  if(pb&&!pb._b){pb._b=1;pb.addEventListener('click',function(){
    var pr=document.getElementById('statsPeriodRow');if(pr)pr.style.display=pr.style.display==='none'?'flex':'none';});}
  var rf=document.getElementById('statsRefresh');
  if(rf&&!rf._b){rf._b=1;rf.addEventListener('click',function(){loadAdminOrders().then(renderStats);});}
  var pd=document.getElementById('statsPdf');
  if(pd&&!pd._b){pd._b=1;pd.addEventListener('click',statsExportPdf);}
  if(!adminOrders.length)loadAdminOrders().then(renderStats);else renderStats();
}
function renderAdminOrders(){
  renderOrdersFilter();
  var w=document.getElementById('ordersView');if(!w)return;
  var list=adminOrders.filter(function(o){return ordersFilterSt==='all'||(o.status||'submitted')===ordersFilterSt;});
  if(!list.length){w.innerHTML='<div class="empty">'+(adminOrders.length?'Нет заказов в этом статусе.':'Заказов пока нет.')+'</div>';return;}
  var h='';
  list.forEach(function(o){
    var st=o.status||'submitted',open=openAdminOrder===o.order_id,editing=editingOrder===o.order_id;
    var dt='';try{dt=new Date(o.created).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){}
    h+='<div class="card" style="padding:14px 16px;margin-bottom:11px;" data-id="'+esc(o.order_id)+'">'+
       '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'+
       '<b style="font-size:15px;">'+esc(o.order_id||'')+'</b>'+
       '<span style="font-weight:600;">'+esc(o.partner||'')+'</span>'+
       '<span class="st-badge" style="background:'+(ORD_ST_COLOR[st]||'#999')+'22;color:'+(ORD_ST_COLOR[st]||'#999')+';border:1px solid '+(ORD_ST_COLOR[st]||'#999')+'55;">'+esc(ORD_ST[st]||st)+'</span>'+
       '<span class="hint" style="margin-left:auto;">'+esc(dt)+'</span></div>'+
       '<div class="hint" style="margin-top:5px;">'+esc(o.contact||'')+(o.phone?' · '+esc(o.phone):'')+(o.date?' · доставка: '+esc(o.date)+(o.time?' '+esc(o.time):''):'')+(o.address?' · '+esc(o.address):'')+'</div>';

    if(editing){
      // ── режим редактирования позиций ──
      var rc=ordRecalc(o);
      h+='<div style="border-top:1px solid var(--line);margin-top:11px;padding-top:11px;">'+
         '<div class="lbl" style="margin-bottom:7px;">Редактирование позиций</div>';
      editItems.forEach(function(ei,idx){
        h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;flex-wrap:wrap;">'+
           '<span style="flex:1;min-width:150px;font-size:13.5px;">'+esc(ei.name)+(ei.weight?' <span class="hint">('+esc(ei.weight)+')</span>':'')+'</span>'+
           '<button class="btn btn-line btn-sm e-minus" data-i="'+idx+'">−</button>'+
           '<input class="inp e-qty" data-i="'+idx+'" type="number" min="0" value="'+(Number(ei.qty)||0)+'" style="width:60px;text-align:center;padding:6px;font-size:13.5px;">'+
           '<button class="btn btn-line btn-sm e-plus" data-i="'+idx+'">+</button>'+
           '<span style="width:90px;text-align:right;font-size:13.5px;">'+fmt(ei.sum||0)+' дин.</span>'+
           '<button class="btn btn-line btn-sm danger e-del" data-i="'+idx+'">✕</button></div>';
      });
      var addOpts='<option value="">+ добавить позицию…</option>'+catalog.map(function(it){return '<option value="'+esc(it.id)+'">'+esc(it.name)+(it.weight?' · '+esc(it.weight):'')+'</option>';}).join('');
      h+='<div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;"><select class="inp e-add" style="flex:1;min-width:160px;font-size:13.5px;">'+addOpts+'</select></div>';
      h+='<div style="display:flex;justify-content:space-between;margin-top:10px;font-weight:700;">'+
         '<span>Итого'+(rc.delivery>0?' (вкл. доставку '+fmt(rc.delivery)+')':'')+'</span><span>'+fmt(rc.total)+' дин.</span></div>';
      h+='<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn btn-primary btn-sm e-save">Сохранить заказ</button>'+
         '<button class="btn btn-line btn-sm e-cancel">Отмена</button></div></div></div>';
      return;
    }

    var items=(o.items||[]).map(function(it){return '• '+it.name+(it.weight?' ('+it.weight+')':'')+' — '+it.qty+' '+(it.uom||'шт')+(it.sum!=null?' = '+fmt(it.sum)+' дин.':'');}).join('<br>');
    h+='<div style="font-size:13px;color:#55544c;margin-top:9px;line-height:1.7;">'+items+'</div>'+
       (o.comment?'<div class="hint" style="margin-top:8px;">💬 От партнёра: '+esc(o.comment)+'</div>':'');
    if(open){
      h+='<div style="border-top:1px solid var(--line);margin-top:11px;padding-top:11px;">';
      h+='<div class="lbl" style="margin-bottom:5px;">История статуса</div>';
      (o.events||[]).forEach(function(ev){var et='';try{et=new Date(ev.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){}
        h+='<div style="font-size:13px;color:#55544c;padding:2px 0;">'+esc(ORD_ST[ev.status]||ev.status)+(ev.note?' ('+esc(ev.note)+')':'')+' <span class="hint">· '+esc(et)+'</span></div>';});
      if((o.comments||[]).length){h+='<div class="lbl" style="margin:10px 0 5px;">Комментарии</div>';
        o.comments.forEach(function(cm){var ct='';try{ct=new Date(cm.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){}
          h+='<div style="font-size:13px;padding:3px 0;color:'+(cm.internal?'#9a6b1e':'#2c7a4b')+';">'+(cm.internal?'🔒 внутр.: ':'💬 партнёру: ')+esc(cm.text)+' <span class="hint">· '+esc(ct)+'</span></div>';});}
      h+='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">'+
         '<input class="inp c-text" placeholder="Новый комментарий…" style="flex:1;min-width:160px;font-size:13.5px;">'+
         '<button class="btn btn-line btn-sm c-int">Внутр.</button>'+
         '<button class="btn btn-primary btn-sm c-ext">Партнёру</button></div>';
      h+='<div style="margin-top:10px;"><button class="btn btn-line btn-sm o-edit">✏️ Редактировать позиции</button></div>';
      h+='<div style="border-top:1px solid var(--line);margin-top:12px;padding-top:11px;">'+
         '<div class="lbl" style="margin-bottom:6px;">Документы заказа</div>'+
         '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px;"><button class="btn btn-line btn-sm dg-make" data-kind="predracun">📄 Предрачун</button><button class="btn btn-line btn-sm dg-make" data-kind="faktura">📄 Фактура</button><button class="btn btn-line btn-sm dg-make" data-kind="otpremnica">📄 Отпремница</button><button class="btn btn-line btn-sm decl-make">📄 Декларация</button></div>';
      if((o.docs||[]).length){
        o.docs.forEach(function(dc){var dt2='';try{dt2=new Date(dc.ts).toLocaleDateString('ru-RU');}catch(e){}
          h+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;">'+
             '<span style="flex:1;"><b>'+esc(ORD_DOC[dc.type]||dc.type)+'</b>'+(dc.title?' · '+esc(dc.title):'')+(dc.name?' · <span class="hint">'+esc(dc.name)+'</span>':'')+'</span>'+
             (dc.url?'<a href="'+esc(dc.url)+'" target="_blank" rel="noopener" class="btn btn-line btn-sm" style="text-decoration:none;">'+(dc.name?'⬇ Скачать':'Открыть')+'</a>':'')+
             '<button class="btn btn-line btn-sm danger od-del" data-ts="'+esc(dc.ts)+'">✕</button></div>';});
      }else h+='<div class="hint" style="margin-bottom:6px;">Документов пока нет. Predračun прикрепляют после подтверждения, отпремницу — после отгрузки.</div>';
      h+='<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;align-items:center;">'+
         '<select class="inp od-type" style="width:auto;font-size:13px;padding:7px 10px;"><option value="predracun">Предсчёт (predračun)</option><option value="otpremnica">Отпремница</option><option value="invoice">Счёт</option><option value="other">Документ</option></select>'+
         '<input class="inp od-title" placeholder="Название (необяз.)" style="flex:1;min-width:120px;font-size:13px;">'+
         '<input type="file" class="od-file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,image/*" style="flex:2;min-width:170px;font-size:12.5px;">'+
         '<button class="btn btn-primary btn-sm od-add">Прикрепить</button></div>'+
         '<div class="hint" style="margin-top:5px;">Можно выбрать несколько файлов (PDF, DOC, JPG, PNG, до 30 МБ каждый) — партнёр скачает сами файлы, не ссылки.</div></div>';
      var paid=!!o.paid,due=o.dueDate||'';
      h+='<div style="border-top:1px solid var(--line);margin-top:12px;padding-top:11px;">'+
         '<div class="lbl" style="margin-bottom:6px;">Оплата</div>'+
         '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;">'+
           '<span class="st-badge" style="background:'+(paid?'#2c7a4b22':'#c0512922')+';color:'+(paid?'#2c7a4b':'#c05129')+';border:1px solid '+(paid?'#2c7a4b55':'#c0512955')+';">'+(paid?'Оплачен':'Не оплачен')+'</span>'+
           '<label class="hint" style="display:flex;align-items:center;gap:6px;">Срок оплаты<input type="date" class="inp pay-due" value="'+esc(due)+'" style="width:auto;font-size:13px;padding:6px 9px;"></label>'+
           '<button class="btn btn-line btn-sm pay-toggle">'+(paid?'Снять оплату':'Отметить оплаченным')+'</button>'+
           '<button class="btn btn-primary btn-sm pay-save">Сохранить срок</button>'+
         '</div>'+
         (o.paidAt?'<div class="hint" style="margin-top:5px;">Отмечен оплаченным: '+esc((function(){try{return new Date(o.paidAt).toLocaleDateString('ru-RU');}catch(e){return '';}})())+'</div>':'')+
         '</div>';
      h+='</div>';
    }
    // строка статуса: смена по кнопке «Сохранить», а не сразу
    var cur=(pendingStatus[o.order_id]!=null?pendingStatus[o.order_id]:st);
    var opts=ORD_FLOW.map(function(s){return '<option value="'+s+'"'+(s===cur?' selected':'')+'>'+esc(ORD_ST[s])+'</option>';}).join('');
    var changed=(cur!==st);
    h+='<div style="display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap;">'+
       '<b>'+(o.total!==''&&o.total!=null?fmt(o.total)+' дин.':'')+'</b>'+
       '<button class="btn btn-line btn-sm o-det" style="margin-left:auto;">'+(open?'Свернуть':'Подробнее')+'</button>'+
       '<select class="inp o-status" style="width:auto;padding:8px 12px;font-size:13.5px;">'+opts+'</select>'+
       (changed?'<button class="btn btn-primary btn-sm o-save">Сохранить и отправить</button>':'')+'</div></div>';
  });
  w.innerHTML=h;
  w.querySelectorAll('.card[data-id]').forEach(function(card){
    var id=card.dataset.id;
    var o=null;adminOrders.forEach(function(x){if(x.order_id===id)o=x;});if(!o)return;

    if(editingOrder===id){
      card.querySelectorAll('.e-minus').forEach(function(b){b.addEventListener('click',function(){var i=+this.dataset.i;editItems[i].qty=Math.max(0,(Number(editItems[i].qty)||0)-1);renderAdminOrders();});});
      card.querySelectorAll('.e-plus').forEach(function(b){b.addEventListener('click',function(){var i=+this.dataset.i;editItems[i].qty=(Number(editItems[i].qty)||0)+1;renderAdminOrders();});});
      card.querySelectorAll('.e-qty').forEach(function(inp){inp.addEventListener('change',function(){var i=+this.dataset.i;editItems[i].qty=Math.max(0,Number(this.value)||0);renderAdminOrders();});});
      card.querySelectorAll('.e-del').forEach(function(b){b.addEventListener('click',function(){var i=+this.dataset.i;editItems.splice(i,1);renderAdminOrders();});});
      var addSel=card.querySelector('.e-add');
      if(addSel)addSel.addEventListener('change',function(){var it=itemById(this.value);if(!it)return;
        if(editItems.some(function(ei){return ei.name===it.name&&(ei.weight||'')===(it.weight||'');})){toast('Эта позиция уже в заказе');this.value='';return;}
        editItems.push({name:it.name,weight:it.weight,uom:itemUnit(it),qty:1});renderAdminOrders();});
      card.querySelector('.e-save').addEventListener('click',function(){
        var clean=editItems.filter(function(ei){return (Number(ei.qty)||0)>0;});
        if(!clean.length){toast('В заказе должна остаться хотя бы одна позиция');return;}
        var rc=ordRecalc(o);var btn=this;btn.disabled=true;btn.textContent='Сохраняем…';
        cloudEditOrder(id,clean,rc.total).then(function(j){
          if(j&&j.ok){o.items=clean;o.total=rc.total;o.events=(o.events||[]).concat([{ts:new Date().toISOString(),status:o.status,note:'изменён'}]);
            editingOrder='';editItems=[];toast('Заказ изменён');renderAdminOrders();}
          else{toast('Не удалось сохранить');btn.disabled=false;btn.textContent='Сохранить заказ';}
        }).catch(function(){toast('Ошибка соединения');btn.disabled=false;btn.textContent='Сохранить заказ';});
      });
      card.querySelector('.e-cancel').addEventListener('click',function(){editingOrder='';editItems=[];renderAdminOrders();});
      return;
    }

    var sel=card.querySelector('.o-status');
    if(sel)sel.addEventListener('change',function(){pendingStatus[id]=this.value;renderAdminOrders();});
    var saveBtn=card.querySelector('.o-save');
    if(saveBtn)saveBtn.addEventListener('click',function(){var ns=pendingStatus[id];if(ns==null)return;saveBtn.disabled=true;saveBtn.textContent='Отправляем…';
      cloudSetStatus(id,ns).then(function(j){
        if(j&&j.ok){o.status=ns;o.events=(o.events||[]).concat([{ts:new Date().toISOString(),status:ns}]);delete pendingStatus[id];toast('Статус сохранён: '+ORD_ST[ns]);renderAdminOrders();}
        else{toast('Не удалось обновить');saveBtn.disabled=false;saveBtn.textContent='Сохранить и отправить';}
      }).catch(function(){toast('Ошибка соединения');saveBtn.disabled=false;saveBtn.textContent='Сохранить и отправить';});});
    var det=card.querySelector('.o-det');
    if(det)det.addEventListener('click',function(){openAdminOrder=(openAdminOrder===id?'':id);renderAdminOrders();});
    card.querySelectorAll('.dg-make').forEach(function(b){b.addEventListener('click',function(){openDocGen(id,this.dataset.kind);});});
    var declBtn=card.querySelector('.decl-make');if(declBtn)declBtn.addEventListener('click',function(){openOrderDecl(id);});
    var payToggle=card.querySelector('.pay-toggle'),paySave=card.querySelector('.pay-save'),payDue=card.querySelector('.pay-due');
    if(payToggle)payToggle.addEventListener('click',function(){var np=!o.paid;payToggle.disabled=true;
      cloudSetPayment(id,np,payDue?payDue.value:(o.dueDate||'')).then(function(j){
        if(j&&j.ok){o.paid=np;o.paidAt=np?new Date().toISOString():'';if(payDue)o.dueDate=payDue.value;toast(np?'Отмечен оплаченным':'Оплата снята');renderAdminOrders();}
        else{toast('Не удалось');payToggle.disabled=false;}
      }).catch(function(){toast('Ошибка соединения');payToggle.disabled=false;});});
    if(paySave)paySave.addEventListener('click',function(){paySave.disabled=true;paySave.textContent='Сохраняем…';
      cloudSetPayment(id,o.paid,payDue?payDue.value:'').then(function(j){
        if(j&&j.ok){o.dueDate=payDue?payDue.value:'';toast('Срок оплаты сохранён');renderAdminOrders();}
        else{toast('Не удалось');paySave.disabled=false;paySave.textContent='Сохранить срок';}
      }).catch(function(){toast('Ошибка соединения');paySave.disabled=false;paySave.textContent='Сохранить срок';});});
    var edit=card.querySelector('.o-edit');
    if(edit)edit.addEventListener('click',function(){editingOrder=id;editItems=(o.items||[]).map(function(x){return {name:x.name,weight:x.weight,uom:x.uom,qty:Number(x.qty)||0,_unit:(x.sum&&x.qty?x.sum/x.qty:0)};});renderAdminOrders();});
    var odAdd=card.querySelector('.od-add');
    if(odAdd)odAdd.addEventListener('click',function(){
      var tp=card.querySelector('.od-type').value,ti=card.querySelector('.od-title').value.trim();
      var fi=card.querySelector('.od-file'),files=fi&&fi.files?Array.prototype.slice.call(fi.files):[];
      if(!files.length){toast('Выберите файл(ы) — PDF, DOC, JPG');return;}
      var MAX=30*1024*1024,big=files.filter(function(f){return f.size>MAX;});
      if(big.length){toast('Файл больше 30 МБ: '+big[0].name);return;}
      odAdd.disabled=true;
      var done=0,fail=0,lastMsg='';
      function finish(){odAdd.disabled=false;odAdd.textContent='Прикрепить';if(fi)fi.value='';renderAdminOrders();
        toast(fail?(lastMsg||('Загружено '+done+', с ошибкой '+fail)):('Файлов прикреплено: '+done));}
      function next(i){
        if(i>=files.length){finish();return;}
        var file=files[i];odAdd.textContent='Загрузка '+(i+1)+'/'+files.length+'…';
        var rd=new FileReader();
        rd.onload=function(){var b64=String(rd.result||'');var ix=b64.indexOf('base64,');if(ix>=0)b64=b64.substring(ix+7);
          cloudOrderDocUpload(id,tp,ti,file.name,file.type,b64).then(function(j){
            if(j&&j.ok&&j.doc){o.docs=(o.docs||[]).concat([j.doc]);done++;}
            else{fail++;if(j&&j.error==='drive')lastMsg='Нет доступа к Drive: запустите authorizeDrive в Apps Script и переразверните';else if(j&&j.ok&&!j.doc)lastMsg='На сервере старая версия Code.gs — переразверните новую';}
            next(i+1);
          }).catch(function(){fail++;lastMsg='Ошибка соединения';next(i+1);});
        };
        rd.onerror=function(){fail++;next(i+1);};
        rd.readAsDataURL(file);
      }
      next(0);
    });
    card.querySelectorAll('.od-del').forEach(function(b){b.addEventListener('click',function(){
      var ts=this.dataset.ts;cloudOrderDocDel(id,ts).then(function(j){if(j&&j.ok){o.docs=(o.docs||[]).filter(function(d){return d.ts!==ts;});renderAdminOrders();}else toast('Не удалось');}).catch(function(){toast('Ошибка');});});});
    var ci=card.querySelector('.c-int'),ce=card.querySelector('.c-ext'),ct=card.querySelector('.c-text');
    function addC(internal){if(!ct||!ct.value.trim())return;var text=ct.value.trim();ci.disabled=ce.disabled=true;
      cloudComment(id,text,internal).then(function(j){if(j&&j.ok){o.comments=(o.comments||[]).concat([{ts:new Date().toISOString(),text:text,internal:internal,author:'admin'}]);toast('Комментарий добавлен');renderAdminOrders();}else{toast('Не удалось');ci.disabled=ce.disabled=false;}}).catch(function(){toast('Ошибка');ci.disabled=ce.disabled=false;});}
    if(ci)ci.addEventListener('click',function(){addC(true);});
    if(ce)ce.addEventListener('click',function(){addC(false);});
  });
}
