import React, { useEffect, useRef, useState } from 'react';
import Toolbar from './components/Toolbar';
import Stage from './components/Stage';
import Minimap from './components/Minimap';
import ZoomControls from './components/ZoomControls';
import ShortcutsModal from './components/ShortcutsModal';
import { useStore } from './store';
import { handlePaste, handleDrop } from './imageHandler';

export default function App() {
  const { view, setView, theme, nodes, pics } = useStore();
  const dragRef = useRef(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    // Paste listener (needs to be capture phase to run before contenteditable handles it)
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('drop', handleDrop);
    const prevent = e => e.preventDefault();
    document.addEventListener('dragenter', prevent);
    document.addEventListener('dragover', prevent);

    return () => {
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragenter', prevent);
      document.removeEventListener('dragover', prevent);
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const hasContent = Object.keys(nodes).length > 0 || Object.keys(pics).length > 0;
    if (hasContent) {
      document.body.classList.add('has-content');
    } else {
      document.body.classList.remove('has-content');
    }
  }, [nodes, pics]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) return;
      setView(v => ({
        x: v.x - e.deltaX,
        y: v.y - e.deltaY
      }));
    };
    
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [setView]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
      }

      const isInput = e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      
      const state = useStore.getState();
      const selId = state.selectedId;
      
      if (e.key === '?' && !isInput) {
        setIsShortcutsOpen(true);
      } else if (e.key === 'Tab' && selId && !isInput) {
        e.preventDefault();
        const selNode = state.nodes[selId];
        if (selNode) {
          const newY = selNode.y + Object.keys(state.nodes).length * 20; // Basic offset
          state.addNode(selNode.x + 220, newY, { parent: selId, color: selNode.color });
        }
      } else if (e.key === 'Delete' && selId && !isInput) {
        if (selId.startsWith('l-')) {
          const lId = selId.slice(2);
          for (const n of Object.values(state.nodes)) {
            if (n.items.find(i => i.id === lId)) {
              state.deleteItem(n.id, lId);
              break;
            }
          }
        } else {
          state.deleteNode(selId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!window.__startDrag) return;
      if (!dragRef.current) {
        dragRef.current = window.__startDrag;
      }
      
      const drag = dragRef.current;
      const state = useStore.getState();
      
      if (drag.type === 'pan') {
        setView(v => ({
          x: drag.startX + (e.clientX - drag.ix),
          y: drag.startY + (e.clientY - drag.iy)
        }));
      } else {
        const dx = (e.clientX - drag.ix) / state.view.s;
        const dy = (e.clientY - drag.iy) / state.view.s;
        
        if (drag.type === 'node' || drag.type === 'leaf' || drag.type === 'pic') {
          if (drag.type === 'node') {
            state.updateNode(drag.id, { x: drag.nx + dx, y: drag.ny + dy });
          } else if (drag.type === 'leaf') {
            state.updateItem(drag.nodeId, drag.id, { free: true, dx: drag.nx + dx, dy: drag.ny + dy });
          } else if (drag.type === 'pic') {
            state.updatePic(drag.id, { x: drag.nx + dx, y: drag.ny + dy });
          }
        } else if (drag.type === 'resizePic') {
          const dx = (e.clientX - drag.ix) / state.view.s;
          const newW = Math.max(50, drag.w0 + dx);
          state.updatePic(drag.id, { w: newW });
        }
      }
    };

    const handlePointerUp = () => {
      if (dragRef.current && dragRef.current.type !== 'pan') {
         // trigger render update if needed, but Zustand does it
      }
      dragRef.current = null;
      window.__startDrag = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [setView]);

  return (
    <>
      <Toolbar />
      <Stage />
      <Minimap />
      <ZoomControls />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <p className="tip">Arrastra la franja de color para mover · Doble clic para crear · Ctrl + V pega imágenes · <kbd style={{font:'inherit', background:'#EDF0E8', border:'1px solid #C3CDBF', borderRadius:'3px', padding:'0 4px', cursor: 'pointer'}} onClick={() => setIsShortcutsOpen(true)}>?</kbd> para atajos</p>
      <div className="toast" id="toast"></div>
    </>
  );
}