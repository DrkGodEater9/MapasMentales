const fs = require('fs');

let content = fs.readFileSync('src/store.js', 'utf8');

const tidyFunc = `
  tidyRadial: () => set((state) => {
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
        nodes[d.id].x = radius * Math.cos(midAngle);
        nodes[d.id].y = radius * Math.sin(midAngle);
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
  }),
`;

content = content.replace('deleteNode: (id) => set((state) => {', tidyFunc + '\n  deleteNode: (id) => set((state) => {');

fs.writeFileSync('src/store.js', content, 'utf8');