/* ============================================================
 * BreadVenture B2B — Прайс-лист
 * Редактор каталога товаров: разделы, позиции, цены, B2B-скидки, шифра/артикул, фото.
 * Файл #3 из 11. Весь код в общем (глобальном) scope —
 * порядок подключения в index.html важен: 01 первым, далее по номерам.
 * ============================================================ */

if(typeof window!=='undefined'&&!window.driveThumb){window.driveThumb=function(id){return 'https://drive.google.com/thumbnail?id='+id+'&sz=w400';};}


/* ===================== PRICE LIST ===================== */
var dragId=null;
function moveItemBefore(dragId,targetId){
  var dragItem=itemById(dragId),targetItem=itemById(targetId);
  if(!dragItem||!targetItem||dragId===targetId)return;
  dragItem.cat=targetItem.cat;
  catalog=catalog.filter(function(x){return x.id!==dragId;});
  var ti=0;for(var i=0;i<catalog.length;i++){if(catalog[i].id===targetId){ti=i;break;}}
  catalog.splice(ti,0,dragItem);
  saveCat();renderCatalog();
}
function moveItemToCatStart(dragId,cat){
  var dragItem=itemById(dragId);if(!dragItem)return;
  dragItem.cat=cat;
  catalog=catalog.filter(function(x){return x.id!==dragId;});
  var idx=-1;for(var i=0;i<catalog.length;i++){if((catalog[i].cat||'Без категории')===cat){idx=i;break;}}
  if(idx<0)catalog.push(dragItem);else catalog.splice(idx,0,dragItem);
  saveCat();renderCatalog();
}
function renameCat(oldCat){
  var nn=prompt('Название раздела (русский):',oldCat);
  if(nn==null)return;nn=nn.trim();if(!nn)return;
  var sr=prompt('Название раздела на сербском (для КП на Srpski). Можно оставить пустым:',catNamesSr[oldCat]||catNamesSr[nn]||'');
  if(sr===null)sr='';sr=sr.trim();
  if(nn!==oldCat){
    catalog.forEach(function(it){if((it.cat||'Без категории')===oldCat)it.cat=nn;});
    if(selectedCats[oldCat]){delete selectedCats[oldCat];selectedCats[nn]=1;}
    if(catNamesSr[oldCat]){delete catNamesSr[oldCat];}
  }
  if(sr)catNamesSr[nn]=sr;else delete catNamesSr[nn];
  saveCat();saveCatSr();renderCatalog();toast('Раздел обновлён');
}
function renderCatalog(){
  var view=document.getElementById('catalogView');view.innerHTML='';
  if(!catalog.length){view.innerHTML='<div class="empty">Прайс-лист пуст. Добавьте позицию.</div>';return;}
  var order=[],groups={};
  catalog.forEach(function(it){var c=it.cat||'Без категории';if(!groups[c]){groups[c]=[];order.push(c);}groups[c].push(it);});
  order.forEach(function(cat){
    var ct=document.createElement('div');ct.className='cat-title-row';
    ct.innerHTML='<span class="cat-title">'+esc(cat)+'</span><button class="cat-rename" title="Переименовать раздел">✎ переименовать</button>';
    ct.querySelector('.cat-rename').addEventListener('click',function(){renameCat(cat);});
    ct.addEventListener('dragover',function(e){if(!dragId)return;e.preventDefault();ct.classList.add('drop-target');});
    ct.addEventListener('dragleave',function(){ct.classList.remove('drop-target');});
    ct.addEventListener('drop',function(e){if(!dragId)return;e.preventDefault();ct.classList.remove('drop-target');moveItemToCatStart(dragId,cat);});
    view.appendChild(ct);
    groups[cat].forEach(function(it){view.appendChild(itemCard(it));});});
  renderCatChips();
}
function itemCard(it){
  var card=document.createElement('div');card.className='item';if(it._open)card.classList.add('open');
  var head=document.createElement('div');head.className='item-head';
  var _pu=it.photo||(it.photoId?driveThumb(it.photoId):'');
  var thumb=_pu?'<img class="thumb" src="'+esc(_pu)+'" alt="">':'<div class="thumb">🥖</div>';
  head.innerHTML='<span class="drag-handle" draggable="true" title="Перетащите в другой раздел">⠿</span>'+thumb+'<div class="nm"><b>'+esc(it.name)+'</b><small>'+esc(it.weight||'')+(it.weight?' · ':'')+esc(it.cat||'')+' · PDV '+itemPdv(it)+'%'+visTag(it)+'</small></div>'+
    '<div class="price-tag"><div class="retail">'+fmt(it.retail)+' дин.</div><div class="b2b">от '+fmt(minB2B(it))+' дин.</div></div><div class="chev">▾</div>';
  head.addEventListener('click',function(){it._open=!it._open;card.classList.toggle('open');});
  var dh=head.querySelector('.drag-handle');
  if(dh){
    dh.addEventListener('click',function(e){e.stopPropagation();});
    dh.addEventListener('dragstart',function(e){dragId=it.id;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',it.id);}catch(_){}card.classList.add('dragging');});
    dh.addEventListener('dragend',function(){dragId=null;card.classList.remove('dragging');document.querySelectorAll('.drop-target').forEach(function(n){n.classList.remove('drop-target');});});
  }
  card.addEventListener('dragover',function(e){if(!dragId||dragId===it.id)return;e.preventDefault();card.classList.add('drop-target');});
  card.addEventListener('dragleave',function(e){if(e.target===card)card.classList.remove('drop-target');});
  card.addEventListener('drop',function(e){if(!dragId||dragId===it.id)return;e.preventDefault();card.classList.remove('drop-target');moveItemBefore(dragId,it.id);});
  card.appendChild(head);
  var body=document.createElement('div');body.className='item-body';
  var g3=document.createElement('div');g3.className='grid3';
  g3.innerHTML='<div><label class="lbl">Название</label><input class="inp f-name" value="'+esc(it.name)+'"></div>'+
    '<div><label class="lbl">Граммовка</label><input class="inp f-weight" value="'+esc(it.weight||'')+'" placeholder="650 г"></div>'+
    '<div><label class="lbl">Розница, дин.</label><input class="inp f-retail" type="number" min="0" step="1" value="'+(it.retail||0)+'"></div>'+
    '<div><label class="lbl">Шифра / Артикул</label><input class="inp f-sifra" value="'+esc(it.sifra||'')+'" placeholder="напр. 1001"></div>';
  body.appendChild(g3);
  var cat=document.createElement('div');cat.className='grid3';
  var cats=catList();
  var curCat=it.cat||'Без категории';
  var catOpts=cats.map(function(c){return '<option value="'+esc(c)+'"'+(c===curCat?' selected':'')+'>'+esc(c)+'</option>';}).join('');
  cat.innerHTML='<div style="grid-column:span 2;"><label class="lbl">Раздел</label><select class="inp f-cat">'+catOpts+'<option value="__new__">➕ Новый раздел…</option></select></div>'+
    '<div><label class="lbl">PDV</label><select class="inp f-pdv"><option value="10"'+(itemPdv(it)==10?' selected':'')+'>10%</option><option value="20"'+(itemPdv(it)==20?' selected':'')+'>20%</option></select></div>';
  body.appendChild(cat);
  var vis=document.createElement('div');vis.className='field';
  var vmode=it.b2bHide?'hide':((Array.isArray(it.b2bOnly)&&it.b2bOnly.length)?'only':'all');
  vis.innerHTML='<label class="lbl">Видно партнёрам</label>'+
    '<select class="inp f-vis"><option value="all"'+(vmode==='all'?' selected':'')+'>Всем партнёрам</option>'+
    '<option value="hide"'+(vmode==='hide'?' selected':'')+'>Скрыто (сезонная / нет в продаже)</option>'+
    '<option value="only"'+(vmode==='only'?' selected':'')+'>Только выбранным партнёрам</option></select>'+
    '<div class="f-vis-list" style="margin-top:8px;'+(vmode==='only'?'':'display:none;')+'"></div>';
  body.appendChild(vis);
  var visList=vis.querySelector('.f-vis-list');
  function renderVisList(){
    if(!partners.length){visList.innerHTML='<div class="hint">Партнёров пока нет — заведите их во вкладке «Партнёры».</div>';return;}
    it.b2bOnly=Array.isArray(it.b2bOnly)?it.b2bOnly:[];
    visList.innerHTML=partners.map(function(p){var on=it.b2bOnly.indexOf(p.id)>=0;
      return '<label style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13.5px;cursor:pointer;"><input type="checkbox" class="f-vis-p" value="'+esc(p.id)+'"'+(on?' checked':'')+'> '+esc(p.name)+'</label>';}).join('');
    visList.querySelectorAll('.f-vis-p').forEach(function(cb){cb.addEventListener('change',function(){
      var pid=this.value;it.b2bOnly=it.b2bOnly||[];
      if(this.checked){if(it.b2bOnly.indexOf(pid)<0)it.b2bOnly.push(pid);}else{it.b2bOnly=it.b2bOnly.filter(function(x){return x!==pid;});}
      saveCat();});});
  }
  renderVisList();
  vis.querySelector('.f-vis').addEventListener('change',function(){
    var v=this.value;
    if(v==='all'){it.b2bHide=false;it.b2bOnly=[];}
    else if(v==='hide'){it.b2bHide=true;}
    else{it.b2bHide=false;it.b2bOnly=it.b2bOnly||[];}
    visList.style.display=(v==='only')?'block':'none';saveCat();renderVisList();updateHead();
  });
  var desc=document.createElement('div');desc.className='field';
  desc.innerHTML='<label class="lbl">Описание (рус / срб)</label><div class="term-cols">'+
    '<textarea class="inp f-desc" placeholder="Описание для КП (рус)">'+esc(it.desc||'')+'</textarea>'+
    '<textarea class="inp f-desc-sr" placeholder="Opis za ponudu (срб)">'+esc(it.descSr||'')+'</textarea></div>';body.appendChild(desc);
  var sos=document.createElement('div');sos.className='field';
  sos.innerHTML='<label class="lbl">Состав (рус / срб)</label><div class="term-cols">'+
    '<textarea class="inp f-sostav" placeholder="Мука, вода, закваска, соль... (рус)">'+esc(it.sostav||'')+'</textarea>'+
    '<textarea class="inp f-sostav-sr" placeholder="Brašno, voda, kvasac, so... (срб)">'+esc(it.sostavSr||'')+'</textarea></div>';body.appendChild(sos);
  var pr=document.createElement('div');pr.className='photo-row';
  var _pp=it.photo||(it.photoId?driveThumb(it.photoId):'');
  var prev=_pp?'<img class="photo-prev" src="'+esc(_pp)+'" alt="">':'<div class="photo-prev">нет фото</div>';
  pr.innerHTML=prev+'<div class="photo-ctrl"><label class="lbl">Фото продукта</label>'+
    '<button class="btn btn-ghost btn-sm f-photo-btn">Загрузить фото</button>'+
    (it.photo?'<button class="btn btn-line btn-sm f-photo-del">Удалить фото</button>':'')+
    '<input type="file" accept="image/*" class="f-photo-inp" style="display:none;"></div>';
  body.appendChild(pr);
  var tiers=document.createElement('div');tiers.className='tiers';
  var units=['шт','кг','г','мл','л'];
  var uOpts=units.map(function(u){return '<option'+(itemUnit(it)===u?' selected':'')+'>'+u+'</option>';}).join('');
  tiers.innerHTML='<div class="tiers-lbl">Скидки по объёму &nbsp;<span style="text-transform:none;font-weight:600;">единица:</span> '+
    '<select class="f-uom" style="text-transform:none;font-size:12.5px;padding:4px 7px;border:1px solid var(--line);border-radius:7px;">'+uOpts+'</select> '+
    '<span style="text-transform:none;font-weight:500;color:var(--muted);">· цена за ед.: <b style="color:var(--blue-d);">с PDV</b> / без PDV</span></div>';
  var tWrap=document.createElement('div');
  function renderTiers(){
    tWrap.innerHTML='';
    (it.tiers||[]).sort(function(a,b){return a.min-b.min;}).forEach(function(t,idx){
      var disc0=Number(t.disc)||0;
      var pW0=it.retail*(1-disc0/100), pN0=pW0/(1+itemPdv(it)/100);
      var tr=document.createElement('span');tr.className='tier-row';
      tr.innerHTML='<span>от</span><input type="number" min="1" step="1" class="t-min" value="'+t.min+'"><span>'+esc(itemUnit(it))+' →</span>'+
        '<input type="number" min="0" max="100" step="1" class="t-disc" value="'+t.disc+'"><span>%</span>'+
        '<span class="tier-price">= '+fmt(pW0)+' / '+fmt(pN0)+'</span>'+
        '<span class="tx" title="Удалить">×</span>';
      var prEl=tr.querySelector('.tier-price');
      tr.querySelector('.t-min').addEventListener('input',function(){t.min=Math.max(1,Number(this.value)||1);saveCat();});
      tr.querySelector('.t-disc').addEventListener('input',function(){t.disc=Math.max(0,Math.min(100,Number(this.value)||0));saveCat();updateHead();
        var pW=it.retail*(1-(Number(t.disc)||0)/100),pN=pW/(1+itemPdv(it)/100);prEl.textContent='= '+fmt(pW)+' / '+fmt(pN);});
      tr.querySelector('.tx').addEventListener('click',function(){it.tiers.splice(idx,1);saveCat();renderTiers();updateHead();});
      tWrap.appendChild(tr);
    });
    var add=document.createElement('button');add.className='tier-add';add.textContent='+ порог';
    add.addEventListener('click',function(){if(!it.tiers)it.tiers=[];
      var lm=it.tiers.length?Math.max.apply(null,it.tiers.map(function(x){return x.min;})):0;
      it.tiers.push({min:lm+5,disc:0});saveCat();renderTiers();updateHead();});
    tWrap.appendChild(add);
  }
  renderTiers();tiers.appendChild(tWrap);body.appendChild(tiers);
  tiers.querySelector('.f-uom').addEventListener('change',function(){it.uom=this.value;saveCat();renderTiers();});
  var acts=document.createElement('div');acts.className='item-actions';
  acts.innerHTML='<button class="btn btn-primary btn-sm save">Сохранить</button><button class="btn btn-line btn-sm dup">Дублировать</button><button class="btn btn-line btn-sm danger del">Удалить позицию</button>';
  body.appendChild(acts);card.appendChild(body);
  function updateHead(){head.querySelector('.retail').textContent=fmt(it.retail)+' дин.';
    head.querySelector('.b2b').textContent='от '+fmt(minB2B(it))+' дин.';head.querySelector('.nm b').textContent=it.name;
    head.querySelector('.nm small').textContent=(it.weight||'')+(it.weight?' · ':'')+(it.cat||'')+' · PDV '+itemPdv(it)+'%'+visTag(it);}
  body.querySelector('.f-name').addEventListener('input',function(){it.name=this.value;saveCat();updateHead();});
  body.querySelector('.f-weight').addEventListener('input',function(){it.weight=this.value;saveCat();updateHead();});
  body.querySelector('.f-retail').addEventListener('input',function(){it.retail=Math.max(0,Number(this.value)||0);saveCat();updateHead();renderTiers();});
  var fsi=body.querySelector('.f-sifra');if(fsi)fsi.addEventListener('input',function(){it.sifra=this.value.trim();saveCat();});
  body.querySelector('.f-cat').addEventListener('change',function(){
    if(this.value==='__new__'){var nn=prompt('Название нового раздела:','');if(nn!=null&&nn.trim())it.cat=nn.trim();saveCat();renderCatalog();return;}
    it.cat=this.value;saveCat();renderCatalog();});
  body.querySelector('.f-pdv').addEventListener('change',function(){it.pdv=Number(this.value)||10;saveCat();updateHead();renderTiers();});
  body.querySelector('.f-desc').addEventListener('input',function(){it.desc=this.value;saveCat();});
  body.querySelector('.f-desc-sr').addEventListener('input',function(){it.descSr=this.value;saveCat();});
  body.querySelector('.f-sostav').addEventListener('input',function(){it.sostav=this.value;saveCat();});
  body.querySelector('.f-sostav-sr').addEventListener('input',function(){it.sostavSr=this.value;saveCat();});
  var inp=body.querySelector('.f-photo-inp');
  body.querySelector('.f-photo-btn').addEventListener('click',function(){inp.click();});
  inp.addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;e.target.value='';
    compressImage(f,function(d){it.photo=d;saveCat();it._open=true;refreshCard(card,it);
      var b64=d.indexOf('base64,')>=0?d.substring(d.indexOf('base64,')+7):d;
      if(GAS_URL){toast('Загрузка фото для партнёров…');
        driveUpload((it.name||'product')+'.jpg','image/jpeg',b64).then(function(j){
          if(j&&j.ok&&j.fileId){it.photoId=j.fileId;saveCat();toast('Фото сохранено ✓');}
          else toast(j&&j.error==='auth'?'Фото локально. Для партнёров переразверните Code.gs (доступ к Drive)':'Фото сохранено локально');
        }).catch(function(){toast('Фото сохранено локально');});
      }
    },function(){toast('Не удалось обработать фото');});});
  var pdel=body.querySelector('.f-photo-del');
  if(pdel)pdel.addEventListener('click',function(){it.photo='';it.photoId='';saveCat();it._open=true;refreshCard(card,it);});
  acts.querySelector('.save').addEventListener('click',function(){saveCat();toast('Позиция сохранена ✓');});
  acts.querySelector('.dup').addEventListener('click',function(){
    var copy=JSON.parse(JSON.stringify(it));copy.id=uid();copy.name=it.name+' (копия)';delete copy._open;
    var idx=catalog.indexOf(it);catalog.splice(idx+1,0,copy);saveCat();renderCatalog();});
  acts.querySelector('.del').addEventListener('click',function(){
    if(confirm('Удалить «'+it.name+'»?')){catalog=catalog.filter(function(x){return x.id!==it.id;});saveCat();renderCatalog();refreshOfferRefs();}});
  return card;
}
function refreshCard(oldCard,it){oldCard.replaceWith(itemCard(it));}
function refreshOfferRefs(){offerLines=offerLines.filter(function(ln){return itemById(ln.itemId);});if(!offerLines.length)offerLines=[newLine()];renderOffer();}
function compressImage(file,ok,fail){
  var rd=new FileReader();
  rd.onload=function(){var img=new Image();
    img.onload=function(){var max=640,w=img.width,h=img.height;
      if(w>h&&w>max){h=h*max/w;w=max;}else if(h>=w&&h>max){w=w*max/h;h=max;}
      var cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);
      try{ok(cv.toDataURL('image/jpeg',0.72));}catch(e){fail&&fail();}};
    img.onerror=function(){fail&&fail();};img.src=rd.result;};
  rd.onerror=function(){fail&&fail();};rd.readAsDataURL(file);
}
function renderVisModal(){
  var w=document.getElementById('visList');if(!w)return;
  if(!catalog.length){w.innerHTML='<div class="empty">Прайс пуст — добавьте позиции.</div>';return;}
  var groups={},order=[];
  catalog.forEach(function(it){var c=it.cat||'Без категории';if(!groups[c]){groups[c]=[];order.push(c);}groups[c].push(it);});
  var h='';
  order.forEach(function(cat){
    h+='<div class="vis-cat">'+esc(cat)+'</div>';
    groups[cat].forEach(function(it){
      var visible=!it.b2bHide;
      var only=(Array.isArray(it.b2bOnly)&&it.b2bOnly.length);
      var sub=it.b2bHide?'скрыто от всех':(only?'👤 только выбранным ('+it.b2bOnly.length+')':'видно всем');
      h+='<div class="vis-row"><div class="vn">'+esc(it.name)+(it.weight?'<span class="vtag">'+esc(it.weight)+'</span>':'')+
         '<div class="vsub">'+sub+'</div></div>'+
         '<div class="tgl'+(visible?' on':'')+'" data-id="'+esc(it.id)+'" title="'+(visible?'Скрыть от партнёров':'Показать партнёрам')+'"></div></div>';
    });
  });
  w.innerHTML=h;
  w.querySelectorAll('.tgl').forEach(function(t){t.addEventListener('click',function(){
    var it=itemById(this.dataset.id);if(!it)return;
    it.b2bHide=!it.b2bHide;saveCat();renderVisModal();renderCatalog();
  });});
}
function openVisModal(){renderVisModal();document.getElementById('visModal').style.display='flex';}
