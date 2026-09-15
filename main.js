(function(){
"use strict";

/* ───────────────────────────── constantes ───────────────────────────── */
const COLORS = ["#22406E","#D3455B","#E2A33A","#3E7C59","#6B4E9E","#1B2A22"];
const COLOR_NAMES = {
  azul:"#22406E", rojo:"#D3455B", naranja:"#E2A33A",
  verde:"#3E7C59", violeta:"#6B4E9E", negro:"#1B2A22"
};
const NODE_W = 250, LEAF_W = 236, TRUNK = 34, LEAF_GAP = 8, ARM = 26;

const world   = document.getElementById('world');
const stage   = document.getElementById('stage');
const links   = document.getElementById('links');
const toastEl = document.getElementById('toast');
const modal   = document.getElementById('mdModal');
const mdText  = document.getElementById('mdText');
const kbdModal= document.getElementById('kbdModal');
const mmCanvas= document.getElementById('mmCanvas');
const mmVp    = document.getElementById('mmVp');

const nodes = new Map();   // id -> {id,x,y,color,parent,title,items:[{id,text}]}
const pics  = new Map();   // id -> {id,x,y,w,src}
let uid = 0;
const nid = p => (p||'n') + (++uid);

const view = {x:-5800, y:-3800, s:1};
let mode = 'card';
let selected = null;

/* ───────────────────────── historial undo/redo ───────────────────────── */
const history = { stack:[], cursor:-1, paused:false };
function snapshot(){
  if(history.paused) return;
  const state = JSON.stringify({
    nodes: [...nodes.entries()].map(([k,v])=>({...v, items:v.items.map(i=>({...i}))})),
    pics:  [...pics.entries()].map(([k,v])=>({...v}))
  });
  // descartar futuros si los hay
  history.stack = history.stack.slice(0, history.cursor + 1);
  // evitar duplicados consecutivos
  if(history.stack[history.cursor] === state) return;
  history.stack.push(state);
  if(history.stack.length > 60) history.stack.shift();
  history.cursor = history.stack.length - 1;
  updateUndoButtons();
}
function restoreState(state){
  history.paused = true;
  const d = JSON.parse(state);
  nodes.clear(); pics.clear(); selected = null;
  world.querySelectorAll('.node,.leaf,.pic').forEach(n=>n.remove());
  links.innerHTML = '';
  d.nodes.forEach(v => nodes.set(v.id, v));
  d.pics.forEach(v  => {
    pics.set(v.id, v);
    world.appendChild(buildPic(v));
  });
  // recuperar uid mayor
  [...nodes.keys(),...pics.keys()].forEach(k=>{
    const n = parseInt((k+'').replace(/\D/g,''));
    if(!isNaN(n) && n > uid) uid = n;
  });
  history.paused = false;
  renderAll();
}
function undo(){
  if(history.cursor <= 0){ toast('Nada que deshacer.'); return; }
  history.cursor--;
  restoreState(history.stack[history.cursor]);
  updateUndoButtons();
  toast('Deshacer');
}
function redo(){
  if(history.cursor >= history.stack.length-1){ toast('Nada que rehacer.'); return; }
  history.cursor++;
  restoreState(history.stack[history.cursor]);
  updateUndoButtons();
  toast('Rehacer');
}
function updateUndoButtons(){
  document.getElementById('btnUndo').classList.toggle('dim', history.cursor <= 0);
  document.getElementById('btnRedo').classList.toggle('dim', history.cursor >= history.stack.length-1);
}

/* ─────────────────────────── vista ─────────────────────────────────── */
function applyView(){
  world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.s})`;
  document.getElementById('zVal').textContent = Math.round(view.s*100)+'%';
  updateMinimap();
}
function screenToWorld(cx, cy){
  const r = stage.getBoundingClientRect();
  return {x:(cx - r.left - view.x)/view.s, y:(cy - r.top - view.y)/view.s};
}
function centerOfScreen(){
  const r = stage.getBoundingClientRect();
  return screenToWorld(r.left + r.width/2, r.top + r.height/2);
}
function zoomAt(factor, cx, cy){
  const r = stage.getBoundingClientRect();
  const px = cx - r.left, py = cy - r.top;
  const ns = Math.min(2.2, Math.max(0.2, view.s * factor));
  view.x = px - (px - view.x) * (ns/view.s);
  view.y = py - (py - view.y) * (ns/view.s);
  view.s = ns; applyView();
}

/* ─────────────────────────── utilidades ────────────────────────────── */
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(()=>toastEl.classList.remove('on'), 2400);
}
function hideToast(){
  clearTimeout(toast._t);
  toastEl.classList.remove('on');
}
function el(id){ return world.querySelector('[data-id="'+id+'"]'); }
function leafEl(itemId){ return world.querySelector('[data-item="'+itemId+'"]'); }
function childrenOf(id){ const out=[]; nodes.forEach(k=>{ if(k.parent===id) out.push(k); }); return out; }
function markContent(){
  const has = nodes.size + pics.size > 0;
  document.body.classList.toggle('has-content', has);
  updateNodeCount();
}
function updateNodeCount(){
  const nc = document.getElementById('nodeCount');
  if(!nodes.size && !pics.size){ nc.textContent = ''; return; }
  const parts = [];
  if(nodes.size) parts.push(nodes.size + (nodes.size===1?' nodo':' nodos'));
  if(pics.size)  parts.push(pics.size + (pics.size===1?' img':' imgs'));
  nc.textContent = parts.join(' · ');
}
function updateTitle(){
  const t = document.getElementById('mapTitle').textContent.trim() || 'Mapa mental';
  document.title = t + ' — Ramas';
}
function select(id){
  if(selected){ const p = el(selected); if(p) p.classList.remove('sel'); }
  selected = id;
  if(id){ const n = el(id); if(n) n.classList.add('sel'); }
}
function placeCaret(node){
  if(!node) return;
  node.focus();
  const r = document.createRange(); r.selectNodeContents(node); r.collapse(false);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}
function esc(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function editable(t){
  if(!t || t.nodeType !== 1) return false;
  if(t.isContentEditable) return true;
  return !!t.closest('[contenteditable]:not([contenteditable="false"]), textarea, input');
}

/* ─────────────────────────── minimap ───────────────────────────────── */
let mmRaf = null;
function updateMinimap(){
  if(mmRaf) return;
  mmRaf = requestAnimationFrame(drawMinimap);
}
function drawMinimap(){
  mmRaf = null;
  const mm = document.getElementById('minimap');
  if(!mm || !nodes.size && !pics.size){ return; }
  const ctx = mmCanvas.getContext && mmCanvas.getContext('2d');
  if(!ctx) return;                       // navegador sin canvas: el resto sigue vivo
  const cw = mmCanvas.width, ch = mmCanvas.height;
  ctx.clearRect(0, 0, cw, ch);

  // fondo
  ctx.fillStyle = (document.documentElement.classList.contains('dark') ? '#1A1E1C' : '#DBE2D8');
  ctx.fillRect(0, 0, cw, ch);

  // calcular bounding de todo el contenido
  let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  nodes.forEach(d=>{
    x1=Math.min(x1,d.x); y1=Math.min(y1,d.y);
    x2=Math.max(x2,d.x+NODE_W); y2=Math.max(y2,d.y+100);
  });
  pics.forEach(d=>{
    x1=Math.min(x1,d.x); y1=Math.min(y1,d.y);
    x2=Math.max(x2,d.x+d.w); y2=Math.max(y2,d.y+d.w*0.6);
  });
  if(!isFinite(x1)) return;
  const pad = 200;
  x1-=pad; y1-=pad; x2+=pad; y2+=pad;
  const mw = x2-x1, mh = y2-y1;
  const scale = Math.min(cw/mw, ch/mh);
  const ox = (cw - mw*scale)/2 - x1*scale;
  const oy = (ch - mh*scale)/2 - y1*scale;

  // dibujar nodos
  nodes.forEach(d=>{
    ctx.fillStyle = d.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : d.color;
    ctx.globalAlpha = 0.7;
    const rx = d.x*scale+ox, ry = d.y*scale+oy;
    const rw = NODE_W*scale, rh = Math.max(6, 28*scale);
    const r = 2;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(rx,ry,rw,rh,r);
    else ctx.rect(rx,ry,rw,rh);
    ctx.fill();
  });
  pics.forEach(d=>{
    ctx.fillStyle = (document.documentElement.classList.contains('dark') ? '#3B4A41' : '#C3CDBF');
    ctx.globalAlpha = 0.6;
    ctx.fillRect(d.x*scale+ox, d.y*scale+oy, d.w*scale, d.w*0.6*scale);
  });
  ctx.globalAlpha = 1;

  // viewport rect
  const r = stage.getBoundingClientRect();
  const vpX = (-view.x / view.s)*scale + ox;
  const vpY = (-view.y / view.s)*scale + oy;
  const vpW = (r.width  / view.s)*scale;
  const vpH = (r.height / view.s)*scale;

  const vp = document.getElementById('mmVp');
  vp.style.left   = Math.max(0, vpX)+'px';
  vp.style.top    = Math.max(0, vpY)+'px';
  vp.style.width  = Math.min(cw, vpW)+'px';
  vp.style.height = Math.min(ch, vpH)+'px';

  // guardar para clic
  mmCanvas._mapInfo = {scale, ox, oy};
}

document.getElementById('minimap').addEventListener('click', e=>{
  const info = mmCanvas._mapInfo; if(!info) return;
  const r = mmCanvas.getBoundingClientRect();
  const cx = (e.clientX - r.left) / (r.width / mmCanvas.width);
  const cy = (e.clientY - r.top) / (r.height / mmCanvas.height);
  const wx = (cx - info.ox) / info.scale;
  const wy = (cy - info.oy) / info.scale;
  const sr = stage.getBoundingClientRect();
  view.x = sr.width/2  - wx*view.s;
  view.y = sr.height/2 - wy*view.s;
  applyView();
});

/* ─────────────────────────── datos ─────────────────────────────────── */
function addNode(x, y, opts){
  opts = opts || {};
  const id = nid();
  nodes.set(id, {
    id, x:Math.round(x), y:Math.round(y),
    color: opts.color || COLORS[nodes.size % COLORS.length],
    parent: opts.parent || null,
    title: opts.title || '',
    items: []
  });
  return id;
}
function addItem(nodeId, text){
  const d = nodes.get(nodeId); if(!d) return null;
  const it = {id:nid('i'), text:text || ''};
  d.items.push(it); return it.id;
}
function removeItem(nodeId, itemId){
  const d = nodes.get(nodeId); if(!d) return;
  d.items = d.items.filter(i => i.id !== itemId);
}
function removeNode(id){
  const d = nodes.get(id); if(!d) return;
  nodes.forEach(k => { if(k.parent === id) k.parent = d.parent; });
  nodes.delete(id);
  if(selected === id) selected = null;
}
function clearAll(){
  nodes.clear(); pics.clear(); selected = null;
  world.querySelectorAll('.node,.leaf,.pic').forEach(n => n.remove());
  links.innerHTML = ''; markContent();
}

/* ─────────────────────────── render ────────────────────────────────── */
function buildNode(d){
  const n = document.createElement('article');
  n.className = 'node'; n.dataset.id = d.id; n.dataset.kind = 'node';
  n.style.setProperty('--c', d.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : d.color);
  n.style.left = d.x+'px'; n.style.top = d.y+'px';
  const subs = (mode === 'card')
    ? d.items.map(it => `<li data-item="${it.id}"><span class="sub" contenteditable spellcheck="false">${esc(it.text)}</span><button class="kill" data-act="delsub" title="Quitar">×</button></li>`).join('')
    : '';
  n.innerHTML = `
    <div class="spine"></div>
    <div class="body">
      <h2 class="title" contenteditable spellcheck="false">${esc(d.title)}</h2>
      <ul class="subs">${subs}</ul>
      <button class="addsub" data-act="sub">+ subsección</button>
    </div>
    <div class="tools">
      <button data-act="child" title="Nodo conectado"><svg viewBox="0 0 24 24"><path d="M4 12h7m0 0V6h9M11 12v6h9"/></svg></button>
      <button data-act="sub" title="Subsección"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h10M4 17h13"/></svg></button>
      <button data-act="del" title="Eliminar nodo"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/></svg></button>
      <div class="swatches">${COLORS.map(c=>`<i class="sw" data-color="${c}" style="background:${c}"></i>`).join('')}</div>
    </div>`;
  if(d.id === selected) n.classList.add('sel');
  return n;
}
function buildLeaf(d, it){
  const f = document.createElement('div');
  f.className = 'leaf';
  f.dataset.item = it.id; f.dataset.node = d.id;
  f.style.setProperty('--c', d.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : d.color);
  f.style.width = LEAF_W+'px';
  if(it.free) f.classList.add('free');
  f.innerHTML = `<span class="leaf-grip" title="Arrastra para moverla · doble clic para reacomodarla"></span><span class="sub" contenteditable spellcheck="false">${esc(it.text)}</span><button class="kill" data-act="delsub" title="Quitar">×</button>`;
  return f;
}
function buildPic(d){
  const f = document.createElement('figure');
  f.className = 'pic'; f.dataset.id = d.id; f.dataset.kind = 'pic';
  f.style.left = d.x+'px'; f.style.top = d.y+'px'; f.style.width = d.w+'px';
  f.innerHTML = `<img alt="Imagen del mapa"><button class="kill" data-act="delpic" title="Quitar imagen">×</button><span class="grip"></span>`;
  f.querySelector('img').src = d.src;
  return f;
}
function renderAll(){
  world.querySelectorAll('.node,.leaf').forEach(n => n.remove());
  const frag = document.createDocumentFragment();
  nodes.forEach(d => {
    frag.appendChild(buildNode(d));
    if(mode === 'split') d.items.forEach(it => frag.appendChild(buildLeaf(d, it)));
  });
  world.appendChild(frag);
  layoutLeaves(); drawLinks(); markContent(); updateMinimap();
}

/* posiciona las subsecciones sueltas al lado de su nodo (modo diagrama) */
function layoutLeaves(){
  if(mode !== 'split') return;
  nodes.forEach(d => {
    if(!d.items.length) return;
    const n = el(d.id); if(!n) return;
    const stacked = [];
    d.items.forEach(it => {
      const e = leafEl(it.id); if(!e) return;
      if(it.free){
        e.classList.add('free');
        e.style.left = Math.round(d.x + it.dx)+'px';
        e.style.top  = Math.round(d.y + it.dy)+'px';
      } else { e.classList.remove('free'); stacked.push(e); }
    });
    if(!stacked.length) return;
    const x = d.x + n.offsetWidth + TRUNK + ARM;
    let total = 0;
    stacked.forEach(e => { e.style.left = x+'px'; total += e.offsetHeight; });
    total += LEAF_GAP * (stacked.length - 1);
    let y = d.y + n.offsetHeight/2 - total/2;
    stacked.forEach(e => { e.style.top = Math.round(y)+'px'; y += e.offsetHeight + LEAF_GAP; });
  });
}
function clusterHeight(d){
  const n = el(d.id); if(!n) return 90;
  let h = n.offsetHeight;
  const st = (mode === 'split') ? d.items.filter(it => !it.free) : [];
  if(st.length){
    let t = LEAF_GAP * (st.length - 1);
    st.forEach(it => { const e = leafEl(it.id); t += e ? e.offsetHeight : 34; });
    h = Math.max(h, t);
  }
  return h;
}
function clusterWidth(d){
  const n = el(d.id);
  const w = n ? n.offsetWidth : NODE_W;
  const anchored = mode === 'split' && d.items.some(it => !it.free);
  return anchored ? w + TRUNK + ARM + LEAF_W : w;
}

/* ─────────────────────────── conexiones ────────────────────────────── */
function box(id){
  const e = el(id); if(!e) return null;
  return {x:e.offsetLeft, y:e.offsetTop, w:e.offsetWidth, h:e.offsetHeight};
}
function ortho(A, B){
  const ac = {x:A.x+A.w/2, y:A.y+A.h/2}, bc = {x:B.x+B.w/2, y:B.y+B.h/2};
  const s = (bc.x - ac.x) >= 0 ? 1 : -1;
  const p1 = {x:ac.x + s*A.w/2, y:ac.y}, p2 = {x:bc.x - s*B.w/2, y:bc.y};
  const mx = (Math.abs(p2.x-p1.x) > 70) ? (p1.x+p2.x)/2 : p1.x + s*40;
  return `M${p1.x} ${p1.y}H${mx}V${p2.y}H${p2.x}`;
}
function drawLinks(){
  let d = '';
  nodes.forEach(k => {
    if(!k.parent || !nodes.has(k.parent)) return;
    const A = box(k.parent), B = box(k.id);
    if(!A || !B) return;
    const color = nodes.get(k.parent).color;
    const ac = {x:A.x+A.w/2, y:A.y+A.h/2}, bc = {x:B.x+B.w/2, y:B.y+B.h/2};
    const dx = bc.x-ac.x, dy = bc.y-ac.y;
    let path;
    if(mode === 'split'){
      path = ortho(A, B);
    } else if(Math.abs(dx) >= Math.abs(dy)){
      const s = dx >= 0 ? 1 : -1;
      const p1 = {x:ac.x + s*A.w/2, y:ac.y}, p2 = {x:bc.x - s*B.w/2, y:bc.y};
      const k2 = Math.max(40, Math.abs(p2.x-p1.x)*0.45);
      path = `M${p1.x} ${p1.y}C${p1.x+s*k2} ${p1.y} ${p2.x-s*k2} ${p2.y} ${p2.x} ${p2.y}`;
    } else {
      const s = dy >= 0 ? 1 : -1;
      const p1 = {x:ac.x, y:ac.y + s*A.h/2}, p2 = {x:bc.x, y:bc.y - s*B.h/2};
      const k2 = Math.max(36, Math.abs(p2.y-p1.y)*0.45);
      path = `M${p1.x} ${p1.y}C${p1.x} ${p1.y+s*k2} ${p2.x} ${p2.y-s*k2} ${p2.x} ${p2.y}`;
    }
    d += `<path d="${path}" stroke="${color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : color}" opacity=".55"/>`;
  });

  if(mode === 'split'){
    nodes.forEach(k => {
      const A = box(k.id); if(!A) return;
      const els = [];
      k.items.forEach(it => {
        const e = leafEl(it.id); if(!e) return;
        if(it.free){
          const B = {x:e.offsetLeft, y:e.offsetTop, w:e.offsetWidth, h:e.offsetHeight};
          d += `<path d="${ortho(A, B)}" stroke="${k.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : k.color}" opacity=".45"/>`;
        } else els.push(e);
      });
      if(!els.length) return;
      const startX = A.x + A.w, cy = A.y + A.h/2;
      const trunkX = startX + TRUNK;
      const centers = els.map(e => e.offsetTop + e.offsetHeight/2);
      const top = Math.min(cy, ...centers), bot = Math.max(cy, ...centers);
      let p = `M${startX} ${cy}H${trunkX}M${trunkX} ${top}V${bot}`;
      centers.forEach((c, i) => { p += `M${trunkX} ${c}H${els[i].offsetLeft}`; });
      d += `<path d="${p}" stroke="${k.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : k.color}" opacity=".5"/>`;
    });
  }
  links.innerHTML = d;
}

/* ─────────────────────── acciones de alto nivel ─────────────────────── */
function createNode(x, y, opts){
  snapshot();
  const id = addNode(x, y, opts);
  renderAll(); select(id);
  placeCaret(el(id).querySelector('.title'));
  return id;
}
function createItem(nodeId){
  snapshot();
  const itemId = addItem(nodeId, '');
  renderAll();
  const host = mode === 'split' ? leafEl(itemId) : el(nodeId).querySelector('[data-item="'+itemId+'"]');
  placeCaret(host && host.querySelector('.sub'));
}

/* eliminación con animación */
function animRemove(nodeEl, cb){
  if(!nodeEl){ cb && cb(); return; }
  let done = false;
  const finish = () => { if(done) return; done = true; nodeEl.remove(); cb && cb(); };
  nodeEl.classList.add('removing');
  nodeEl.addEventListener('animationend', finish, {once:true});
  setTimeout(finish, 260);                 // por si la animación no llega a correr
}
function deleteItem(nodeId, itemId){
  snapshot();
  removeItem(nodeId, itemId); renderAll();
}
function deleteNode(id){
  snapshot();
  const nodeEl = el(id);
  // se re-dibuja de una para que datos y pantalla nunca queden desfasados;
  // la animación de salida corre sobre una copia que se descarta sola
  if(nodeEl){
    const ghost = nodeEl.cloneNode(true);
    ghost.removeAttribute('data-id');
    ghost.style.left = nodeEl.offsetLeft+'px';
    ghost.style.top  = nodeEl.offsetTop+'px';
    ghost.style.pointerEvents = 'none';
    world.appendChild(ghost);
    animRemove(ghost);
    setTimeout(()=>ghost.remove(), 400);   // red de seguridad
  }
  removeNode(id);
  renderAll();
}

/* ─────────────────────────── imágenes ──────────────────────────────── */
function addImage(src, x, y){
  const id = nid('p');
  const d = {id, x:Math.round(x), y:Math.round(y), w:260, src};
  pics.set(id, d);
  const f = buildPic(d);
  world.appendChild(f);
  const img = f.querySelector('img');
  img.onload = () => {
    const w = Math.min(360, Math.max(140, img.naturalWidth || 260));
    f.style.width = w+'px'; d.w = w;
    snapshot();
  };
  img.onerror = () => {
    f.remove(); pics.delete(id); markContent();
    toast('No se pudo cargar esa imagen. Descárgala y arrástrala al lienzo.');
  };
  markContent();
}
/* saca los archivos de imagen del portapapeles o de un arrastre */
function imageFiles(dt){
  if(!dt) return [];
  const out = [];
  [...(dt.files || [])].forEach(f => { if(f && f.type && f.type.startsWith('image/')) out.push(f); });
  if(!out.length) [...(dt.items || [])].forEach(i => {
    if(i.kind === 'file' && i.type && i.type.startsWith('image/')){
      const f = i.getAsFile(); if(f) out.push(f);
    }
  });
  return out;
}
/* cuando se copia desde una página web solo llega el HTML: sacamos el src */
function imageUrlFrom(dt){
  if(!dt) return null;
  const html = dt.getData('text/html') || '';
  const m = /<img[^>]+src\s*=\s*["']([^"']+)["']/i.exec(html);
  if(m) return m[1];
  const uri = (dt.getData('text/uri-list') || '').split('\n')[0].trim();
  const txt = (dt.getData('text') || '').trim();
  const cand = uri || txt;
  if(/^data:image\//i.test(cand)) return cand;
  if(/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i.test(cand)) return cand;
  return null;
}
/* trae la imagen y la incrusta; si el servidor no deja, la enlaza y avisa */
async function addImageFromUrl(url, x, y){
  if(/^data:image\//i.test(url)){ addImage(url, x, y); toast('Imagen pegada.'); return; }
  toast('Trayendo la imagen…');
  try{
    const res = await fetch(url, {mode:'cors'});
    if(!res.ok) throw new Error('http');
    const blob = await res.blob();
    if(!blob.type.startsWith('image/')) throw new Error('tipo');
    const fr = new FileReader();
    fr.onload = ev => { addImage(ev.target.result, x, y); toast('Imagen pegada.'); };
    fr.readAsDataURL(blob);
  }catch(err){
    addImage(url, x, y);
    toast('Imagen enlazada. Si no sale al exportar, descárgala y arrástrala.');
  }
}
function readFiles(files, wx, wy){
  let i = 0;
  [...files].forEach(file => {
    if(!file || !file.type || !file.type.startsWith('image/')) return;
    const fr = new FileReader();
    const ox = wx + i*26, oy = wy + i*26; i++;
    fr.onload = e => addImage(e.target.result, ox, oy);
    fr.readAsDataURL(file);
  });
  if(i === 0) toast('Eso no es una imagen. Arrastra un PNG, JPG, GIF o WEBP.');
}

/* ─────────────────────────── arrastre ──────────────────────────────── */
let drag = null;
world.addEventListener('pointerdown', e => {
  if(e.button !== 0) return;
  const grip = e.target.closest('.grip');
  if(grip){
    const f = grip.closest('.pic');
    drag = {mode:'resize', el:f, id:f.dataset.id, sx:e.clientX, w0:f.offsetWidth};
    if(f.setPointerCapture) f.setPointerCapture(e.pointerId);
    e.preventDefault(); return;
  }
  const lf = e.target.closest('.leaf');
  if(lf){
    if(editable(e.target) || e.target.closest('button')) return;
    if(!nodes.has(lf.dataset.node)) return;
    drag = {mode:'leaf', el:lf, nodeId:lf.dataset.node, itemId:lf.dataset.item,
            sx:e.clientX, sy:e.clientY, x0:lf.offsetLeft, y0:lf.offsetTop, moved:false};
    lf.classList.add('dragging');
    world.appendChild(lf);
    if(lf.setPointerCapture) lf.setPointerCapture(e.pointerId);
    e.preventDefault(); return;
  }
  const boxEl = e.target.closest('.node, .pic');
  if(!boxEl) return;
  select(boxEl.dataset.id);
  if(editable(e.target) || e.target.closest('button, .sw')) return;
  world.appendChild(boxEl);
  drag = {mode:'move', el:boxEl, id:boxEl.dataset.id, sx:e.clientX, sy:e.clientY, x0:boxEl.offsetLeft, y0:boxEl.offsetTop, moved:false};
  boxEl.classList.add('dragging');
  if(boxEl.setPointerCapture) boxEl.setPointerCapture(e.pointerId);
  e.preventDefault();
});

world.addEventListener('dblclick', e => {
  const lf = e.target.closest('.leaf');
  if(!lf || editable(e.target) || e.target.closest('button')) return;
  const d = nodes.get(lf.dataset.node);
  const it = d && d.items.find(i => i.id === lf.dataset.item);
  if(it && it.free){
    snapshot();
    delete it.free; delete it.dx; delete it.dy;
    layoutLeaves(); drawLinks(); toast('Subsección de vuelta en su sitio.');
  }
});
world.addEventListener('pointermove', e => {
  if(!drag) return;
  if(drag.mode === 'leaf'){
    const nx = Math.round(drag.x0 + (e.clientX-drag.sx)/view.s);
    const ny = Math.round(drag.y0 + (e.clientY-drag.sy)/view.s);
    drag.el.style.left = nx+'px'; drag.el.style.top = ny+'px';
    drag.el.classList.add('free');
    const d = nodes.get(drag.nodeId);
    const it = d && d.items.find(i => i.id === drag.itemId);
    if(it){ it.free = true; it.dx = nx - d.x; it.dy = ny - d.y; }
    drag.moved = true;
    drawLinks(); updateMinimap(); return;
  }
  const rec = nodes.get(drag.id) || pics.get(drag.id);
  if(drag.mode === 'move'){
    const nx = Math.round(drag.x0 + (e.clientX-drag.sx)/view.s);
    const ny = Math.round(drag.y0 + (e.clientY-drag.sy)/view.s);
    drag.el.style.left = nx+'px'; drag.el.style.top = ny+'px';
    if(rec){ rec.x = nx; rec.y = ny; }
    drag.moved = true;
    layoutLeaves(); drawLinks(); updateMinimap();
  } else {
    const w = Math.max(90, Math.round(drag.w0 + (e.clientX-drag.sx)/view.s));
    drag.el.style.width = w+'px';
    if(rec) rec.w = w;
    drag.moved = true;
  }
});
function endDrag(){
  if(drag){
    if(drag.moved) snapshot();
    drag.el.classList.remove('dragging'); drag = null;
  }
}
world.addEventListener('pointerup', endDrag);
world.addEventListener('pointercancel', endDrag);

/* ─────────────────── interacción dentro del lienzo ─────────────────── */
world.addEventListener('click', e => {
  const sw = e.target.closest('.sw');
  if(sw){
    snapshot();
    const n = sw.closest('.node'), d = nodes.get(n.dataset.id);
    d.color = sw.dataset.color;
    n.style.setProperty('--c', d.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : d.color);
    d.items.forEach(it => { const l = leafEl(it.id); if(l) l.style.setProperty('--c', d.color === '#1B2A22' && document.documentElement.classList.contains('dark') ? '#8FA698' : d.color); });
    drawLinks(); return;
  }
  const btn = e.target.closest('[data-act]');
  if(!btn) return;
  const act = btn.dataset.act;

  if(act === 'delsub'){
    const host = btn.closest('.leaf, li');
    const nodeId = host.dataset.node || host.closest('.node').dataset.id;
    deleteItem(nodeId, host.dataset.item); return;
  }
  const boxEl = btn.closest('.node, .pic');
  if(!boxEl) return;
  const id = boxEl.dataset.id;
  if(act === 'sub') createItem(id);
  if(act === 'del') deleteNode(id);
  if(act === 'delpic'){
    snapshot();
    pics.delete(id); boxEl.remove(); if(selected===id) selected=null; markContent();
  }
  if(act === 'child'){
    const p = nodes.get(id);
    const gap = clusterWidth(p) + 120;
    const kids = childrenOf(id);
    createNode(p.x + gap, p.y + kids.length * (mode==='split' ? 150 : 130), {parent:id, color:p.color});
  }
});

/* sincroniza el texto editado con los datos */
world.addEventListener('input', e => {
  const t = e.target;
  if(t.classList.contains('title')){
    const d = nodes.get(t.closest('.node').dataset.id);
    if(d) d.title = t.textContent;
  } else if(t.classList.contains('sub')){
    const host = t.closest('.leaf, li');
    if(host){
      const nodeId = host.dataset.node || host.closest('.node').dataset.id;
      const d = nodes.get(nodeId);
      const it = d && d.items.find(i => i.id === host.dataset.item);
      if(it) it.text = t.textContent;
    }
  }
  layoutLeaves(); drawLinks();
});

// snapshot al salir de un campo editable
world.addEventListener('blur', e => {
  if(editable(e.target)) snapshot();
}, true);

world.addEventListener('keydown', e => {
  if(!editable(e.target)) return;
  const host = e.target.closest('.leaf, li');
  const nodeId = host ? (host.dataset.node || host.closest('.node').dataset.id)
                      : (e.target.closest('.node') || {dataset:{}}).dataset.id;
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    if(!nodeId) return;
    if(host && !e.target.textContent.trim()){ deleteItem(nodeId, host.dataset.item); return; }
    createItem(nodeId);
  }
  if(e.key === 'Backspace' && host && !e.target.textContent){
    e.preventDefault();
    const d = nodes.get(nodeId);
    const i = d.items.findIndex(it => it.id === host.dataset.item);
    const prev = i > 0 ? d.items[i-1].id : null;
    deleteItem(nodeId, host.dataset.item);
    if(prev){
      const pe = mode === 'split' ? leafEl(prev) : el(nodeId).querySelector('[data-item="'+prev+'"]');
      placeCaret(pe && pe.querySelector('.sub'));
    } else placeCaret(el(nodeId).querySelector('.title'));
  }
  if(e.key === 'Escape') e.target.blur();
});
world.addEventListener('paste', e => {
  if(!editable(e.target)) return;
  e.preventDefault();
  const txt = (e.clipboardData || window.clipboardData).getData('text');
  document.execCommand('insertText', false, txt.replace(/\s+/g,' ').trim());
});

/* ─────────────────── lienzo: pan, zoom, soltar, hover ──────────────── */
let pan = null;

// hover hint en lienzo vacío
stage.addEventListener('mousemove', e => {
  if(e.target !== stage && e.target !== world && !e.target.closest('#links')) return;
  if(nodes.size || pics.size) return;
  stage.style.setProperty('--cx', e.offsetX+'px');
  stage.style.setProperty('--cy', e.offsetY+'px');
  stage.classList.add('empty-hover');
});
stage.addEventListener('mouseleave', () => stage.classList.remove('empty-hover'));
stage.addEventListener('mousedown', ()  => stage.classList.remove('empty-hover'));

stage.addEventListener('pointerdown', e => {
  if(e.target.closest('.node, .pic, .leaf')) return;
  select(null);
  pan = {sx:e.clientX, sy:e.clientY, x0:view.x, y0:view.y};
  stage.classList.add('panning');
  if(stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if(!pan) return;
  view.x = pan.x0 + (e.clientX-pan.sx);
  view.y = pan.y0 + (e.clientY-pan.sy);
  applyView();
});
['pointerup','pointercancel'].forEach(t =>
  stage.addEventListener(t, () => { pan = null; stage.classList.remove('panning'); }));

stage.addEventListener('dblclick', e => {
  if(e.target.closest('.node, .pic, .leaf')) return;
  const p = screenToWorld(e.clientX, e.clientY);
  createNode(p.x - NODE_W/2, p.y - 30, {});
});

stage.addEventListener('wheel', e => {
  e.preventDefault();
  // pinch / ctrl+wheel → zoom; resto → desplazar el lienzo
  if(e.ctrlKey || e.metaKey){
    zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX, e.clientY);
  } else {
    view.x -= e.deltaX;
    view.y -= e.deltaY;
    applyView();
  }
}, {passive:false});

['dragenter','dragover'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
document.addEventListener('drop', e => {
  e.preventDefault();
  const dt = e.dataTransfer; if(!dt) return;
  const p = screenToWorld(e.clientX, e.clientY);
  const files = imageFiles(dt);
  if(files.length){ readFiles(files, p.x - 130, p.y - 90); return; }
  const url = imageUrlFrom(dt);          // arrastrada desde otra pestaña
  if(url) addImageFromUrl(url, p.x - 130, p.y - 90);
});
/* Se registra en fase de captura para atender la imagen ANTES que el editor de
   texto: así pegar funciona aunque el cursor esté dentro de un nodo. */
document.addEventListener('paste', e => {
  if(e.target === mdText) return;              // el panel de markdown recibe texto normal
  const cd = e.clipboardData; if(!cd) return;
  const c = centerOfScreen();

  const files = imageFiles(cd);
  if(files.length){
    e.preventDefault(); e.stopPropagation();
    if(editable(e.target)) e.target.blur();
    readFiles(files, c.x-130, c.y-90);
    return;
  }
  const url = imageUrlFrom(cd);
  if(url){
    e.preventDefault(); e.stopPropagation();
    if(editable(e.target)) e.target.blur();
    addImageFromUrl(url, c.x-130, c.y-90);
    return;
  }
}, true);

document.addEventListener('paste', e => {
  if(editable(e.target) || e.target === mdText) return;
  const cd = e.clipboardData; if(!cd) return;
  const txt = (cd.getData('text')||'').trim();
  if(txt && /^\s*(#{1,6}\s|[-*+]\s)/m.test(txt)){
    e.preventDefault(); openModal(txt);
    toast('Markdown detectado en el portapapeles.');
  }
});

/* atajos globales de teclado */
document.addEventListener('keydown', e => {
  // cerrar modales con Escape
  if(e.key === 'Escape'){
    if(!kbdModal.hidden){ closeKbd(); return; }
    if(!modal.hidden){ closeModal(); return; }
  }
  if(editable(e.target)) return;

  // undo / redo
  if((e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); undo(); return; }
  if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))){ e.preventDefault(); redo(); return; }

  // eliminar seleccionado
  if((e.key === 'Delete' || e.key === 'Backspace') && selected){
    e.preventDefault();
    if(nodes.has(selected)) deleteNode(selected);
    else { snapshot(); const n = el(selected); if(n) n.remove(); pics.delete(selected); selected = null; markContent(); }
    return;
  }

  // zoom con + / -
  if(e.key === '+' || e.key === '='){ const r=stage.getBoundingClientRect(); zoomAt(1.15,r.left+r.width/2,r.top+r.height/2); return; }
  if(e.key === '-' || e.key === '_'){ const r=stage.getBoundingClientRect(); zoomAt(0.87,r.left+r.width/2,r.top+r.height/2); return; }

  // encuadrar con F
  if(e.key === 'f' || e.key === 'F'){ fit(); return; }

  // panel de atajos con ?
  if(e.key === '?'){ openKbd(); return; }
});

/* ─────────────────────────── barra ────────────────────────────────── */
document.getElementById('btnNode').onclick = () => {
  const c = centerOfScreen();
  createNode(c.x - NODE_W/2 + (Math.random()*50-25), c.y - 40 + (Math.random()*50-25), {});
};
document.getElementById('btnImg').onclick = () => document.getElementById('filePick').click();
document.getElementById('filePick').onchange = e => {
  const c = centerOfScreen();
  readFiles(e.target.files, c.x-130, c.y-90);
  e.target.value = '';
};
document.getElementById('btnClear').onclick = () => {
  if(!nodes.size && !pics.size) return;
  if(!confirm('Se borra todo el mapa y no hay forma de recuperarlo. ¿Seguir?')) return;
  snapshot(); clearAll();
};
document.getElementById('btnTidy').onclick = () => { snapshot(); tidy(); toast('Mapa reordenado.'); };
document.getElementById('zIn').onclick  = () => { const r=stage.getBoundingClientRect(); zoomAt(1.15,r.left+r.width/2,r.top+r.height/2); };
document.getElementById('zOut').onclick = () => { const r=stage.getBoundingClientRect(); zoomAt(0.87,r.left+r.width/2,r.top+r.height/2); };
document.getElementById('zFit').onclick = fit;
document.getElementById('btnUndo').onclick = undo;
document.getElementById('btnRedo').onclick = redo;

// título de la pestaña se actualiza con el nombre del mapa
document.getElementById('mapTitle').addEventListener('input', updateTitle);
document.getElementById('mapTitle').addEventListener('blur',  updateTitle);

/* interruptor de diseño */
const modeSwitch = document.getElementById('modeSwitch');
modeSwitch.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  setMode(b.dataset.mode);
});
function setMode(m){
  if(m === mode) return;
  snapshot();
  mode = m;
  modeSwitch.dataset.mode = m;
  renderAll();
  toast(m === 'split' ? 'Diseño diagrama: cada subsección en su propia caja.' : 'Diseño tarjeta: subsecciones dentro del nodo.');
}

/* ─────────────────────────── ordenar ──────────────────────────────── */
function tidy(){
  if(!nodes.size){ toast('El mapa está vacío.'); return; }
  const col = (mode === 'split' ? 620 : 360);
  const VGAP = 30;
  let cursor = 0;
  const seen = new Set();
  function place(d, depth){
    if(seen.has(d.id)) return; seen.add(d.id);
    const kids = childrenOf(d.id);
    kids.forEach(k => place(k, depth+1));
    const own = clusterHeight(d);
    let y;
    if(!kids.length){ y = cursor; cursor += own + VGAP; }
    else {
      const f = kids[0], l = kids[kids.length-1];
      y = (f.y + clusterHeight(f)/2 + l.y + clusterHeight(l)/2)/2 - own/2;
      cursor = Math.max(cursor, y + own + VGAP);
    }
    d.x = depth * col; d.y = Math.round(y);
  }
  const roots = [];
  nodes.forEach(d => { if(!d.parent || !nodes.has(d.parent)) roots.push(d); });
  roots.forEach(r => { place(r, 0); cursor += 40; });
  nodes.forEach(d => { if(!seen.has(d.id)) place(d, 0); });

  let minX = Infinity, minY = Infinity;
  nodes.forEach(d => { minX = Math.min(minX, d.x); minY = Math.min(minY, d.y); });
  const off = {x:6000 - minX, y:4200 - minY};
  nodes.forEach(d => { d.x += off.x; d.y += off.y; });
  nodes.forEach(d => { const e = el(d.id); if(e){ e.style.left = d.x+'px'; e.style.top = d.y+'px'; } });
  layoutLeaves(); drawLinks(); fit();
}

function tidyRadial(){
  if(!nodes.size){ toast('El mapa está vacío.'); return; }
  const col = (mode === 'split' ? 620 : 360);
  const seen = new Set();
  
  function getWeight(id) {
    const kids = childrenOf(id);
    if (!kids.length) return 1;
    return kids.reduce((sum, k) => sum + getWeight(k.id), 0);
  }
  
  function place(d, depth, angleStart, angleEnd) {
    if(seen.has(d.id)) return; seen.add(d.id);
    const midAngle = (angleStart + angleEnd) / 2;
    // Radius increases with depth to prevent overlapping
    const radius = depth === 0 ? 0 : (mode === 'split' ? 300 : 250) + depth * col;
    
    if (depth === 0) {
      d.x = 0;
      d.y = 0;
    } else {
      d.x = radius * Math.cos(midAngle);
      d.y = radius * Math.sin(midAngle);
    }
    
    const kids = childrenOf(d.id);
    if (!kids.length) return;
    
    const totalWeight = kids.reduce((sum, k) => sum + getWeight(k.id), 0);
    let currentAngle = angleStart;
    
    kids.forEach(k => {
      const w = getWeight(k.id);
      const sweep = (w / totalWeight) * (angleEnd - angleStart);
      place(k, depth + 1, currentAngle, currentAngle + sweep);
      currentAngle += sweep;
    });
  }
  
  const roots = [];
  nodes.forEach(d => { if(!d.parent || !nodes.has(d.parent)) roots.push(d); });
  
  let totalRootWeight = roots.reduce((sum, r) => sum + getWeight(r.id), 0);
  let currentRootAngle = 0;
  
  roots.forEach(r => {
    const w = getWeight(r.id);
    const sweep = roots.length === 1 ? Math.PI * 2 : (w / totalRootWeight) * Math.PI * 2;
    place(r, 0, currentRootAngle, currentRootAngle + sweep);
    currentRootAngle += sweep;
  });
  
  nodes.forEach(d => { if(!seen.has(d.id)) place(d, 0, 0, Math.PI * 2); });
  
  let minX = Infinity, minY = Infinity;
  nodes.forEach(d => { 
    d.x -= clusterWidth(d)/2; 
    d.y -= clusterHeight(d)/2;
    minX = Math.min(minX, d.x); 
    minY = Math.min(minY, d.y); 
  });
  
  const off = {x:6000 - minX, y:4200 - minY};
  nodes.forEach(d => { d.x = Math.round(d.x + off.x); d.y = Math.round(d.y + off.y); });
  nodes.forEach(d => { const e = el(d.id); if(e){ e.style.left = d.x+'px'; e.style.top = d.y+'px'; } });
  
  layoutLeaves(); drawLinks(); fit();
}

function bounds(pad){
  pad = pad == null ? 70 : pad;
  const items = world.querySelectorAll('.node, .pic, .leaf');
  if(!items.length) return null;
  let x1=Infinity, y1=Infinity, x2=-Infinity, y2=-Infinity;
  items.forEach(n => {
    x1 = Math.min(x1, n.offsetLeft); y1 = Math.min(y1, n.offsetTop);
    x2 = Math.max(x2, n.offsetLeft + n.offsetWidth);
    y2 = Math.max(y2, n.offsetTop + n.offsetHeight);
  });
  return {x:x1-pad, y:y1-pad, w:(x2-x1)+pad*2, h:(y2-y1)+pad*2};
}
function fit(){
  const b = bounds();
  if(!b){ toast('El mapa está vacío.'); return; }
  const r = stage.getBoundingClientRect();
  view.s = Math.max(0.08, Math.min(1.4, Math.min(r.width/b.w, r.height/b.h) || 1));
  view.x = (r.width - b.w*view.s)/2 - b.x*view.s;
  view.y = (r.height - b.h*view.s)/2 - b.y*view.s;
  applyView();
}

/* ─────────────────────────── markdown ─────────────────────────────── */
const SAMPLE = `# Árboles de Decisión
## Ventajas {color:verde}
- Fáciles de interpretar y visualizar
- No requieren normalización de los datos
- Manejan variables numéricas y categóricas
## Desventajas {color:rojo}
- Tienden al sobreajuste (overfitting)
- Pequeños cambios en los datos alteran el árbol
## Tipos de árboles {color:azul}
- Clasificación
  - Predicen una categoría o clase
  - Ej: aprobado / rechazado
- Regresión
  - Predicen un valor numérico o continuo
## Algoritmos {color:violeta}
- ID3
  - Usa ganancia de información
- C4.5
  - Maneja datos continuos y faltantes
- CART
  - Usa índice Gini, genera árboles binarios`;

function cleanInline(s){
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`|~~)/g, '')
    .replace(/^\*(.*)\*$/, '$1')
    .replace(/\{color:[^}]+\}/gi, '')  // quitar la etiqueta de color del texto visible
    .trim();
}

/* extrae {color:X} del título y devuelve {title, color} */
function extractColor(raw){
  const m = raw.match(/\{color:([^}]+)\}/i);
  if(!m) return {title: raw.trim(), color: null};
  let c = m[1].trim().toLowerCase();
  const named = COLOR_NAMES[c];
  const color = named || (/^#[0-9a-f]{3,8}$/i.test(c) ? c : null);
  const title = raw.replace(/\{color:[^}]+\}/gi,'').trim();
  return {title, color};
}

/* Convierte markdown en [{tmp,parentTmp,title,color,items[]}] */
function parseMarkdown(text){
  const out = [];
  const byLevel = {};
  let current = null;
  let lastBullet = null;
  let seq = 0;
  const make = (rawTitle, parentTmp) => {
    const {title, color} = extractColor(rawTitle);
    const n = {tmp:'t'+(++seq), title:cleanInline(title), color, parentTmp:parentTmp || null, items:[]};
    out.push(n); return n;
  };

  text.split(/\r?\n/).forEach(raw => {
    const line = raw.replace(/\t/g, '  ');
    const t = line.trim();
    if(!t || /^([-*_]\s*){3,}$/.test(t)) return;

    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if(h){
      const lvl = h[1].length;
      let parent = null;
      for(let i = lvl-1; i >= 1; i--){ if(byLevel[i]){ parent = byLevel[i]; break; } }
      const n = make(h[2], parent);
      byLevel[lvl] = n.tmp;
      Object.keys(byLevel).forEach(k => { if(+k > lvl) delete byLevel[k]; });
      current = n; lastBullet = null;
      return;
    }

    const b = t.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    const indent = line.match(/^[ ]*/)[0].length;
    const body = b ? b[1] : t;

    if(!current){ current = make('Ideas', null); }

    if(b && indent >= 2 && lastBullet){
      if(!lastBullet.promoted){
        const parentNode = out.find(n => n.tmp === lastBullet.hostTmp);
        const title = parentNode.items.splice(lastBullet.index, 1)[0];
        const n = make(title, parentNode.tmp);
        lastBullet.promoted = true; lastBullet.tmp = n.tmp;
      }
      const target = out.find(n => n.tmp === lastBullet.tmp);
      target.items.push(cleanInline(body));
      return;
    }

    current.items.push(cleanInline(body));
    lastBullet = {hostTmp:current.tmp, tmp:current.tmp, index:current.items.length-1, promoted:false};
  });

  return out.filter(n => n.title || n.items.length);
}

function importMarkdown(text, replace){
  const parsed = parseMarkdown(text);
  if(!parsed.length){ toast('No encontré nada que insertar.'); return; }
  if(replace) clearAll();
  snapshot();

  const map = {};
  let branch = 0;
  parsed.forEach(p => {
    const parentId = p.parentTmp ? map[p.parentTmp] : null;
    let color;
    if(p.color){
      // color explícito en el markdown
      color = p.color;
    } else if(!parentId){
      color = COLORS[0];
    } else if(nodes.get(parentId).parent === null){
      color = COLORS[1 + (branch++ % (COLORS.length-1))];
    } else {
      color = nodes.get(parentId).color;
    }
    const id = addNode(0, 0, {title:p.title || 'Sin título', parent:parentId, color});
    map[p.tmp] = id;
    p.items.forEach(txt => addItem(id, txt));
  });
  selected = null;
  renderAll(); tidyRadial();
  toast(parsed.length + (parsed.length === 1 ? ' nodo insertado.' : ' nodos insertados.'));
}

/* ─────────────────── modales: markdown, teclado ────────────────────── */
/* focus trap helper */
function trapFocus(container){
  const focusable = container.querySelectorAll('button,textarea,input,[tabindex]:not([tabindex="-1"]),[contenteditable]');
  const first = focusable[0], last = focusable[focusable.length-1];
  function handler(e){
    if(e.key !== 'Tab') return;
    if(e.shiftKey){ if(document.activeElement === first){ e.preventDefault(); last.focus(); } }
    else           { if(document.activeElement === last ){ e.preventDefault(); first.focus();} }
  }
  container._trapHandler = handler;
  container.addEventListener('keydown', handler);
}
function releaseTrap(container){
  if(container._trapHandler) container.removeEventListener('keydown', container._trapHandler);
}

function openModal(prefill){
  modal.hidden = false;
  if(prefill != null) mdText.value = prefill;
  trapFocus(modal.querySelector('.sheet'));
  setTimeout(() => mdText.focus(), 30);
}
function closeModal(){ modal.hidden = true; releaseTrap(modal.querySelector('.sheet')); }

function openKbd(){
  kbdModal.hidden = false;
  trapFocus(kbdModal.querySelector('.kbd-sheet'));
  setTimeout(()=>document.getElementById('kbdClose').focus(), 30);
}
function closeKbd(){ kbdModal.hidden = true; releaseTrap(kbdModal.querySelector('.kbd-sheet')); }

document.getElementById('btnMd').onclick    = () => openModal();
document.getElementById('mdCancel').onclick = closeModal;
document.getElementById('kbdClose').onclick = closeKbd;
document.getElementById('btnHelp').onclick  = openKbd;

kbdModal.addEventListener('pointerdown', e => { if(e.target === kbdModal) closeKbd(); });
modal.addEventListener('pointerdown',    e => { if(e.target === modal)    closeModal(); });

document.getElementById('mdSample').onclick = () => { mdText.value = SAMPLE; mdText.focus(); };
document.getElementById('mdAdd').onclick = () => {
  const v = mdText.value.trim();
  if(!v){ toast('Pega primero el Markdown.'); return; }
  importMarkdown(v, false); closeModal();
};
document.getElementById('mdReplace').onclick = () => {
  const v = mdText.value.trim();
  if(!v){ toast('Pega primero el Markdown.'); return; }
  if((nodes.size || pics.size) && !confirm('Se reemplaza todo el mapa actual. ¿Seguir?')) return;
  importMarkdown(v, true); closeModal();
};

/* copiar prompt para IA */
document.getElementById('copyPrompt').onclick = () => {
  const text = document.getElementById('aiPrompt').textContent;
  navigator.clipboard.writeText(text).then(()=>{
    const btn = document.getElementById('copyPrompt');
    const orig = btn.textContent;
    btn.textContent = '✓ Copiado';
    setTimeout(()=>{ btn.textContent = orig; }, 1800);
  }).catch(()=> toast('No se pudo copiar. Selecciona el texto manualmente.'));
};

/* ─────────────────────────── exportar ─────────────────────────────── */
async function captureCanvas(){
  const b = bounds();
  if(!b){ toast('Agrega algo al mapa antes de exportar.'); return null; }
  if(typeof html2canvas === 'undefined'){
    toast('No cargó la librería de exportación. Usa Ctrl + P y guarda como PDF.');
    return null;
  }
  select(null);
  hideToast();                       // el aviso no debe salir en la foto
  const prev = {x:view.x, y:view.y, s:view.s};
  document.body.classList.add('exporting');
  world.style.transform = `translate(${-b.x}px,${-b.y}px) scale(1)`;
  await new Promise(r => requestAnimationFrame(()=>setTimeout(r, 90)));
  try{
    const r = stage.getBoundingClientRect();
    return await html2canvas(document.body, {
      backgroundColor:(document.documentElement.classList.contains('dark') ? '#1A1E1C' : '#DBE2D8'),
      scale: Math.min(2, (window.devicePixelRatio || 1) * 1.4),
      x: r.left + window.scrollX, y: r.top + window.scrollY,
      width: b.w, height: b.h,
      windowWidth: Math.max(document.documentElement.clientWidth, b.w + 40),
      windowHeight: Math.max(document.documentElement.clientHeight, b.h + 40),
      useCORS:true, logging:false,
      ignoreElements: n => n.classList && (
        n.classList.contains('toast') || n.classList.contains('bar') ||
        n.classList.contains('zoom')  || n.classList.contains('tip') ||
        n.classList.contains('modal') || n.classList.contains('kbd-modal') ||
        n.id === 'minimap'
      )
    });
  } finally {
    document.body.classList.remove('exporting');
    view.x = prev.x; view.y = prev.y; view.s = prev.s;
    applyView();
  }
}
function fileName(ext){
  const t = document.getElementById('mapTitle').textContent.trim() || 'mapa-mental';
  return (t.toLowerCase().replace(/[^\w\sáéíóúñ-]/g,'').replace(/\s+/g,'-').slice(0,50) || 'mapa-mental') + '.' + ext;
}
document.getElementById('btnPng').onclick = async () => {
  const c = await captureCanvas(); if(!c) return;
  const a = document.createElement('a');
  a.download = fileName('png'); a.href = c.toDataURL('image/png'); a.click();
  toast('PNG descargado.');
};
document.getElementById('btnPdf').onclick = async () => {
  if(!window.jspdf){ toast('No cargó la librería de PDF. Usa Ctrl + P y guarda como PDF.'); return; }
  const c = await captureCanvas(); if(!c) return;
  const {jsPDF} = window.jspdf;
  const w = c.width, h = c.height;
  const pdf = new jsPDF({orientation: w >= h ? 'landscape' : 'portrait', unit:'px', format:[w,h], compress:true});
  pdf.addImage(c.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, w, h);
  pdf.save(fileName('pdf'));
  toast('PDF descargado.');
};

window.addEventListener('beforeunload', e => {
  if(nodes.size || pics.size){ e.preventDefault(); e.returnValue = ''; }
});
window.addEventListener('resize', () => { layoutLeaves(); drawLinks(); updateMinimap(); });

/* ─────────────────────────── arranque ─────────────────────────────── */
applyView();
(function seed(){
  const c = centerOfScreen();
  const root = addNode(c.x - NODE_W/2, c.y - 60, {title:'Idea central', color:COLORS[0]});
  addItem(root, 'Para qué sirve');
  addItem(root, 'A quién le sirve');
  const a = addNode(c.x + 220, c.y - 150, {title:'Rama uno', parent:root, color:COLORS[1]});
  addItem(a, 'Primer detalle');
  const b = addNode(c.x + 220, c.y + 60, {title:'Rama dos', parent:root, color:COLORS[3]});
  addItem(b, 'Segundo detalle');
  renderAll();
  snapshot(); // estado inicial como punto base del historial
})();

updateTitle();

/* acceso interno para pruebas */
window.MM = {nodes, pics, view, parseMarkdown, importMarkdown, setMode, createNode, createItem,
             deleteNode, deleteItem, addImage, tidy, clearAll, getMode:()=>mode, renderAll, undo, redo};
})();

/* --------------------------- tema (dark mode) ------------------------- */
const btnTheme = document.getElementById('btnTheme');
const sunIcon = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>';
const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function setTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    btnTheme.querySelector('svg').innerHTML = sunIcon;
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    btnTheme.querySelector('svg').innerHTML = moonIcon;
    localStorage.setItem('theme', 'light');
  }
  if (typeof renderAll === 'function') renderAll();
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  setTheme(true);
}

btnTheme.addEventListener('click', () => {
  setTheme(!document.documentElement.classList.contains('dark'));
});