import React from 'react';
import { useStore } from '../store';

export default function Toolbar() {
  const mode = useStore(state => state.mode);
  const setMode = useStore(state => state.setMode);
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  const addNode = useStore(state => state.addNode);
  const view = useStore(state => state.view);
  const tidyRadial = useStore(state => state.tidyRadial);

  const handleAddNode = () => {
    // Add node in the center of the screen
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const worldX = (cx - view.x) / view.s;
    const worldY = (cy - view.y) / view.s;
    addNode(worldX - 125, worldY - 30);
  };

  return (
    <header className="bar">
      <div className="brand"><b>Ramas</b><span>mapas mentales</span></div>
      <div id="mapTitle" contentEditable spellCheck="false">Mapa sin título</div>

      <div className="switch" data-mode={mode} title="Cambiar diseño" onClick={(e) => {
        const btn = e.target.closest('button');
        if (btn) setMode(btn.dataset.mode);
      }}>
        <span className="knob"></span>
        <button data-mode="card">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 10h10M7 14h7"/></svg>
          <span className="lbl">Tarjeta</span>
        </button>
        <button data-mode="split">
          <svg viewBox="0 0 24 24"><rect x="2" y="9" width="7" height="6" rx="1.5"/><rect x="15" y="3" width="7" height="5" rx="1.5"/><rect x="15" y="16" width="7" height="5" rx="1.5"/><path d="M9 12h3m0-6.5V18.5m0-13H15m-3 13H15"/></svg>
          <span className="lbl">Diagrama</span>
        </button>
      </div>

      <div className="spacer"></div>

      <button className="act solid" onClick={handleAddNode}>
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span className="lbl">Nodo</span>
      </button>

      <button className="act" title="Reordenar el mapa" onClick={() => tidyRadial()}>
        <svg viewBox="0 0 24 24"><path d="M4 6h6M4 12h10M4 18h7M17 4v16m0 0 3-3m-3 3-3-3"/></svg>
        <span className="lbl">Ordenar</span>
      </button>
      
      <button className="act ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Modo oscuro / claro">
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>
    </header>
  );
}