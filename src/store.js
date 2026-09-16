import { create } from 'zustand';

const COLORS = ["#22406E","#D3455B","#E2A33A","#3E7C59","#6B4E9E","#1B2A22"];

let uid = 0;
const generateId = (prefix = 'n') => `${prefix}${++uid}`;

const getInitialState = () => {
  const rootId = generateId();
  const aId = generateId();
  const bId = generateId();
  
  return {
    nodes: {
      [rootId]: { id: rootId, x: 2875, y: 1940, color: COLORS[0], parent: null, title: 'Idea central', items: [
        { id: generateId('i'), text: 'Para qué sirve' },
        { id: generateId('i'), text: 'A quién le sirve' }
      ]},
      [aId]: { id: aId, x: 3095, y: 1880, color: COLORS[1], parent: rootId, title: 'Rama uno', items: [
        { id: generateId('i'), text: 'Primer detalle' }
      ]},
      [bId]: { id: bId, x: 3095, y: 2050, color: COLORS[3], parent: rootId, title: 'Rama dos', items: [
        { id: generateId('i'), text: 'Segundo detalle' }
      ]}
    },
    pics: {},
    view: { x: -2800, y: -1800, s: 1 },
    mode: 'card', 
    theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    selected: null,
    history: [],
    historyCursor: -1,
  };
};

export const useStore = create((set, get) => ({
  ...getInitialState(),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme });
  },
  
  setMode: (mode) => set({ mode }),
  
  setView: (viewUpdater) => set((state) => ({ 
    view: { ...state.view, ...(typeof viewUpdater === 'function' ? viewUpdater(state.view) : viewUpdater) }
  })),

  selectNode: (id) => set({ selected: id }),

  addNode: (x, y, opts = {}) => {
    const id = generateId();
    const state = get();
    const color = opts.color || COLORS[Object.keys(state.nodes).length % COLORS.length];
    
    set((state) => ({
      nodes: {
        ...state.nodes,
        [id]: {
          id, x: Math.round(x), y: Math.round(y), color,
          parent: opts.parent || null, title: opts.title || '', items: []
        }
      },
      selected: id
    }));
    return id;
  },

  updateNode: (id, updates) => set((state) => ({
    nodes: { ...state.nodes, [id]: { ...state.nodes[id], ...updates } }
  })),

  tidyRadial: () => {
    set((state) => {
      const nodes = { ...state.nodes };
      const nodesArr = Object.values(nodes);
      if (!nodesArr.length) return state;

      const col = state.mode === 'split' ? 620 : 360;
      const seen = new Set();
      
      function childrenOf(id) {
        return nodesArr.filter(k => k.parent === id);
      }
      
      function getWeight(id) {
        const kids = childrenOf(id);
        if (!kids.length) return 1;
        return kids.reduce((sum, k) => sum + getWeight(k.id), 0);
      }
      
      function place(d, depth, angleStart, angleEnd) {
        if (seen.has(d.id)) return;
        seen.add(d.id);
        
        const midAngle = (angleStart + angleEnd) / 2;
        const radius = depth === 0 ? 0 : (state.mode === 'split' ? 300 : 250) + depth * col;
        
        nodes[d.id] = { ...d };
        
        if (depth === 0) {
          nodes[d.id].x = 0;
          nodes[d.id].y = 0;
        } else {
          // Use an ellipse to compress vertical spacing, since nodes are wide but short
          const rx = radius;
          const ry = radius * (state.mode === 'split' ? 0.35 : 0.6);
          nodes[d.id].x = rx * Math.cos(midAngle);
          nodes[d.id].y = ry * Math.sin(midAngle);
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
      
      const roots = nodesArr.filter(d => !d.parent || !nodes[d.parent]);
      const totalRootWeight = roots.reduce((sum, r) => sum + getWeight(r.id), 0);
      let currentRootAngle = 0;
      
      roots.forEach(r => {
        const w = getWeight(r.id);
        const sweep = roots.length === 1 ? Math.PI * 2 : (w / totalRootWeight) * Math.PI * 2;
        place(r, 0, currentRootAngle, currentRootAngle + sweep);
        currentRootAngle += sweep;
      });
      
      nodesArr.forEach(d => { if (!seen.has(d.id)) place(d, 0, 0, Math.PI * 2); });
      
      let minX = Infinity, minY = Infinity;
      Object.values(nodes).forEach(d => { 
        const cw = state.mode === 'split' ? 220 : 150;
        const ch = state.mode === 'split' ? 50 : 80;
        minX = Math.min(minX, d.x - cw / 2); 
        minY = Math.min(minY, d.y - ch / 2); 
      });
      
      const offX = 6000 - minX;
      const offY = 4200 - minY;
      
      Object.values(nodes).forEach(d => {
        d.x += offX;
        d.y += offY;
      });

      return { nodes };
    });
    get().fitView();
  },

  fitView: () => set((state) => {
    const nodesArr = Object.values(state.nodes);
    const picsArr = Object.values(state.pics);
    if (nodesArr.length === 0 && picsArr.length === 0) return state;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodesArr.forEach(d => {
      minX = Math.min(minX, d.x);
      minY = Math.min(minY, d.y);
      maxX = Math.max(maxX, d.x + 200);
      maxY = Math.max(maxY, d.y + 100);
    });
    picsArr.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w);
      maxY = Math.max(maxY, p.y + p.w);
    });

    const w = maxX - minX + 160;
    const h = maxY - minY + 160;
    const cx = minX - 80 + w / 2;
    const cy = minY - 80 + h / 2;

    const vW = window.innerWidth;
    const vH = window.innerHeight - 54;
    const ns = Math.max(0.08, Math.min(1.4, Math.min(vW / w, vH / h) || 1));

    return {
      view: {
        s: ns,
        x: vW / 2 - cx * ns,
        y: vH / 2 - cy * ns
      }
    };
  }),

  deleteNode: (id) => set((state) => {
    const newNodes = { ...state.nodes };
    const node = newNodes[id];
    if (!node) return state;
    Object.values(newNodes).forEach(n => {
      if (n.parent === id) newNodes[n.id] = { ...n, parent: node.parent };
    });
    delete newNodes[id];
    return { nodes: newNodes, selected: state.selected === id ? null : state.selected };
  }),

  addItem: (nodeId, text = '') => {
    const itemId = generateId('i');
    set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return state;
      return { nodes: { ...state.nodes, [nodeId]: { ...node, items: [...node.items, { id: itemId, text }] } } };
    });
    return itemId;
  },
  
  updateItem: (nodeId, itemId, updates) => set((state) => {
    const node = state.nodes[nodeId];
    if (!node) return state;
    return { nodes: { ...state.nodes, [nodeId]: { ...node, items: node.items.map(it => it.id === itemId ? { ...it, ...updates } : it) } } };
  }),

  deleteItem: (nodeId, itemId) => set((state) => {
    const node = state.nodes[nodeId];
    if (!node) return state;
    return { nodes: { ...state.nodes, [nodeId]: { ...node, items: node.items.filter(it => it.id !== itemId) } } };
  }),

  addPic: (src, x, y, w = 260) => {
    const id = generateId('p');
    set((state) => ({ pics: { ...state.pics, [id]: { id, x: Math.round(x), y: Math.round(y), w, src } } }));
    return id;
  },

  updatePic: (id, updates) => set((state) => ({ pics: { ...state.pics, [id]: { ...state.pics[id], ...updates } } })),

  deletePic: (id) => set((state) => {
    const newPics = { ...state.pics };
    delete newPics[id];
    return { pics: newPics, selected: state.selected === id ? null : state.selected };
  }),

  clearAll: () => set({ nodes: {}, pics: {}, selected: null }),
  replaceState: (nodes, pics) => set({ nodes, pics, selected: null })
}));