import { useStore } from './store';

const COLORS = ['#1B2A22', '#647D6F', '#8C9879', '#D1CCAA', '#9F9779', '#E6E8E3', '#405B4B', '#5A634B'];
const COLOR_NAMES = {
  'azul': '#647D6F', 'verde': '#8C9879', 'amarillo': '#D1CCAA',
  'marrón': '#9F9779', 'marron': '#9F9779', 'blanco': '#E6E8E3',
  'oscuro': '#405B4B', 'oliva': '#5A634B', 'negro': '#1B2A22',
  'rojo': '#8C5A5A', 'naranja': '#A67C52', 'violeta': '#6A5A7A'
};

function cleanInline(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`|~~)/g, '')
    .replace(/^\*(.*)\*$/, '$1')
    .replace(/\{color:[^}]+\}/gi, '')
    .trim();
}

function extractColor(raw) {
  const m = raw.match(/\{color:([^}]+)\}/i);
  if (!m) return { title: raw.trim(), color: null };
  let c = m[1].trim().toLowerCase();
  const named = COLOR_NAMES[c];
  const color = named || (/^#[0-9a-f]{3,8}$/i.test(c) ? c : null);
  const title = raw.replace(/\{color:[^}]+\}/gi, '').trim();
  return { title, color };
}

export function parseMarkdown(text) {
  const out = [];
  const byLevel = {};
  let current = null;
  let lastBullet = null;
  let seq = 0;
  
  const make = (rawTitle, parentTmp) => {
    const { title, color } = extractColor(rawTitle);
    const n = { tmp: 't' + (++seq), title: cleanInline(title), color, parentTmp: parentTmp || null, items: [] };
    out.push(n);
    return n;
  };

  text.split(/\r?\n/).forEach(raw => {
    const line = raw.replace(/\t/g, '  ');
    const t = line.trim();
    if (!t || /^([-*_]\s*){3,}$/.test(t)) return;

    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      let parent = null;
      for (let i = lvl - 1; i >= 1; i--) { 
        if (byLevel[i]) { parent = byLevel[i]; break; } 
      }
      const n = make(h[2], parent);
      byLevel[lvl] = n.tmp;
      Object.keys(byLevel).forEach(k => { if (+k > lvl) delete byLevel[k]; });
      current = n; 
      lastBullet = null;
      return;
    }

    const b = t.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    const indent = line.match(/^[ ]*/)[0].length;
    const body = b ? b[1] : t;

    if (!current) { current = make('Ideas', null); }

    if (b && indent >= 2 && lastBullet) {
      if (!lastBullet.promoted) {
        const parentNode = out.find(n => n.tmp === lastBullet.hostTmp);
        const title = parentNode.items.splice(lastBullet.index, 1)[0];
        const n = make(title, parentNode.tmp);
        lastBullet.promoted = true; 
        lastBullet.tmp = n.tmp;
      }
      const target = out.find(n => n.tmp === lastBullet.tmp);
      target.items.push(cleanInline(body));
      return;
    }

    current.items.push(cleanInline(body));
    lastBullet = { hostTmp: current.tmp, tmp: current.tmp, index: current.items.length - 1, promoted: false };
  });

  return out.filter(n => n.title || n.items.length);
}

export function importMarkdown(text, replace, store) {
  const parsed = parseMarkdown(text);
  if (!parsed.length) {
    alert('No encontré nada que insertar.');
    return;
  }
  
  if (replace) {
    store.clearAll();
  }

  const map = {};
  let branch = 0;
  
  // We need to use store.addNode sequentially
  parsed.forEach(p => {
    const parentId = p.parentTmp ? map[p.parentTmp] : null;
    let color;
    if (p.color) {
      color = p.color;
    } else if (!parentId) {
      color = COLORS[0];
    } else if (store.nodes[parentId] && store.nodes[parentId].parent === null) {
      color = COLORS[1 + (branch++ % (COLORS.length - 1))];
    } else if (store.nodes[parentId]) {
      color = store.nodes[parentId].color;
    }
    
    const id = store.addNode(0, 0, { title: p.title || 'Sin título', parent: parentId, color });
    map[p.tmp] = id;
    p.items.forEach(txt => store.addItem(id, txt));
  });
  
  store.selectNode(null);
  store.tidyRadial();
  
  // Flash toast ideally, here we just alert or do nothing
}