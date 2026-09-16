import React, { useRef, useLayoutEffect } from 'react';
import { useStore } from '../store';
import Node from './Node';
import Picture from './Picture';
import Links from './Links';
import Leaf from './Leaf';
import { layoutLeaves } from '../layout';

export default function Stage() {
  const { nodes, pics, view, setView, mode, selectNode } = useStore();
  const stageRef = useRef(null);

  useLayoutEffect(() => {
    if (mode === 'split') {
       requestAnimationFrame(() => layoutLeaves());
    }
  }, [nodes, mode]);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Only left click
    const target = e.target;
    
    const nodeEl = target.closest('.node');
    const picEl = target.closest('.pic');
    const leafEl = target.closest('.leaf');
    const gripEl = target.closest('.grip');

    // Handle Selection FIRST
    if (nodeEl) {
      selectNode(nodeEl.dataset.id);
    } else if (leafEl) {
      selectNode(leafEl.id.replace('l-', ''));
    } else if (picEl) {
      selectNode(picEl.id.replace('p-', ''));
    } else if (!target.closest('.item') && !target.closest('.tools')) {
      selectNode(null); // click on background
    }

    // Handle Dragging
    const state = useStore.getState();

    if (
      target.isContentEditable || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' ||
      target.closest('.tools')
    ) {
      return; // Do not drag if interacting with content/buttons
    }

    if (gripEl && picEl) {
      const id = picEl.id.replace('p-', '');
      window.__startDrag = { type: 'resizePic', id, ix: e.clientX, w0: state.pics[id].w, viewS: view.s };
      if (picEl.setPointerCapture) picEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (nodeEl) {
      const id = nodeEl.dataset.id;
      window.__startDrag = { type: 'node', id, ix: e.clientX, iy: e.clientY, nx: state.nodes[id].x, ny: state.nodes[id].y, viewS: view.s };
      if (nodeEl.setPointerCapture) nodeEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (leafEl) {
      const id = leafEl.id.replace('l-', '');
      const nodeId = leafEl.dataset.nodeId;
      const item = state.nodes[nodeId].items.find(i => i.id === id);
      window.__startDrag = { type: 'leaf', id, nodeId, ix: e.clientX, iy: e.clientY, nx: item.dx || 0, ny: item.dy || 0, viewS: view.s };
      if (leafEl.setPointerCapture) leafEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (picEl) {
      const id = picEl.id.replace('p-', '');
      window.__startDrag = { type: 'pic', id, ix: e.clientX, iy: e.clientY, nx: state.pics[id].x, ny: state.pics[id].y, viewS: view.s };
      if (picEl.setPointerCapture) picEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (!target.closest('.item') && !target.closest('.tools')) {
      window.__startDrag = { type: 'pan', ix: e.clientX, iy: e.clientY, startX: view.x, startY: view.y };
      e.preventDefault();
    }
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom is handled by App.jsx
      return;
    }
    // Pan
    setView(v => ({
      x: v.x - e.deltaX,
      y: v.y - e.deltaY
    }));
  };

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault(); // prevent browser zoom
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  const handleDoubleClick = (e) => {
    if (e.target.closest('.node, .pic, .leaf')) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const cx = e.clientX - stageRect.left;
    const cy = e.clientY - stageRect.top;
    
    const worldX = (cx - view.x) / view.s;
    const worldY = (cy - view.y) / view.s;
    
    useStore.getState().addNode(worldX - 125, worldY - 30);
  };

  return (
    <div 
      id="stage" 
      ref={stageRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div 
        id="world" 
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
      >
        <Links />
        
        {Object.values(nodes).map(node => (
          <React.Fragment key={node.id}>
            <Node data={node} />
            {mode === 'split' && node.items.map(item => (
              <Leaf key={item.id} item={item} node={node} />
            ))}
          </React.Fragment>
        ))}
        
        {Object.values(pics).map(pic => (
          <Picture key={pic.id} data={pic} />
        ))}
      </div>
    </div>
  );
}