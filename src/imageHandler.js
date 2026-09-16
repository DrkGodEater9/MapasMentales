import { useStore } from './store';

function addImage(src, x, y) {
  const store = useStore.getState();
  store.addImage(src, x, y);
  
  // No need to queryDOM to get image sizes, we can just wait for it to load
  // Actually, we can pre-load it to get dimensions before committing, OR
  // update the dimensions later once it loads in Pic.jsx.
  // In React, Pic.jsx should handle the `img.onload` to update its own width!
}

export function imageFiles(dt) {
  if (!dt) return [];
  if (dt.items) {
    return [...dt.items].filter(i => i.type.indexOf('image/') === 0).map(i => i.getAsFile());
  }
  return [...(dt.files || [])].filter(f => f.type.indexOf('image/') === 0);
}

export function imageUrlFrom(dt) {
  if (!dt) return null;
  const html = dt.getData('text/html');
  if (html) {
    const m = html.match(/<img[^>]+src="([^">]+)"/i);
    if (m) return m[1];
  }
  const uri = dt.getData('text/uri-list');
  if (uri && /^https?:\/\//i.test(uri)) return uri.split('\n')[0].trim();
  const txt = dt.getData('text/plain');
  if (txt && /^https?:\/\/[^\s]+(\.(jpeg|jpg|gif|png|webp|svg))?$/i.test(txt.trim())) return txt.trim();
  return null;
}

export async function addImageFromUrl(url, x, y) {
  if (/^data:image\//i.test(url)) {
    addImage(url, x, y);
    return;
  }
  
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('http');
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('tipo');
    const fr = new FileReader();
    fr.onload = ev => addImage(ev.target.result, x, y);
    fr.readAsDataURL(blob);
  } catch (err) {
    addImage(url, x, y);
  }
}

export function readFiles(files, wx, wy) {
  let i = 0;
  [...files].forEach(file => {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    const fr = new FileReader();
    const ox = wx + i * 26, oy = wy + i * 26; 
    i++;
    fr.onload = e => addImage(e.target.result, ox, oy);
    fr.readAsDataURL(file);
  });
  if (i === 0) alert('Eso no es una imagen. Arrastra un PNG, JPG, GIF o WEBP.');
}

export function handlePaste(e) {
  // Ignorar si estamos en un input o contenteditable
  if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }
  
  const cd = e.clipboardData; 
  if (!cd) return;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const state = useStore.getState();
  const wx = (cx - state.view.x) / state.view.s;
  const wy = (cy - state.view.y) / state.view.s;

  const files = imageFiles(cd);
  if (files.length) {
    e.preventDefault();
    e.stopPropagation();
    readFiles(files, wx - 130, wy - 90);
    return;
  }
  
  const url = imageUrlFrom(cd);
  if (url) {
    e.preventDefault();
    e.stopPropagation();
    addImageFromUrl(url, wx - 130, wy - 90);
    return;
  }
}

export function handleDrop(e) {
  e.preventDefault();
  const dt = e.dataTransfer; 
  if (!dt) return;
  
  const state = useStore.getState();
  const wx = (e.clientX - state.view.x) / state.view.s;
  const wy = (e.clientY - state.view.y) / state.view.s;
  
  const files = imageFiles(dt);
  if (files.length) {
    readFiles(files, wx - 130, wy - 90);
    return;
  }
  
  const url = imageUrlFrom(dt);
  if (url) {
    addImageFromUrl(url, wx - 130, wy - 90);
  }
}