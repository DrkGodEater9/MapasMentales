import { useStore } from './store';

export function layoutLeaves() {
  const state = useStore.getState();
  if (state.mode !== 'split') return;
  
  const TRUNK = 15;
  const ARM = 15;
  const LEAF_GAP = 8;
  
  const updates = [];

  Object.values(state.nodes).forEach(d => {
    if (!d.items || !d.items.length) return;
    const n = document.getElementById(`n-${d.id}`);
    if (!n) return;
    
    const stacked = [];
    d.items.forEach(it => {
      if (!it.free) stacked.push(it);
    });
    
    if (!stacked.length) return;
    
    const x = n.offsetWidth + TRUNK + ARM; // Relative to node.x
    
    const heights = stacked.map(it => {
      const e = document.getElementById(`l-${it.id}`);
      return e ? e.offsetHeight : 24;
    });
    
    const total = heights.reduce((a, b) => a + b, 0) + LEAF_GAP * (Math.max(0, stacked.length - 1));
    let y = n.offsetHeight / 2 - total / 2; // Relative to node.y
    
    stacked.forEach((it, i) => {
      if (it.dx !== x || it.dy !== y) {
        updates.push({ nodeId: d.id, itemId: it.id, dx: x, dy: y });
      }
      y += heights[i] + LEAF_GAP;
    });
  });

  if (updates.length > 0) {
    useStore.setState(state => {
      const newNodes = { ...state.nodes };
      updates.forEach(u => {
        const node = newNodes[u.nodeId];
        if (node) {
          newNodes[u.nodeId] = {
            ...node,
            items: node.items.map(it => it.id === u.itemId ? { ...it, dx: u.dx, dy: u.dy } : it)
          };
        }
      });
      return { nodes: newNodes };
    });
  }
}