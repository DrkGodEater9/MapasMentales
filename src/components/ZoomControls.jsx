import React from 'react';
import { useStore } from '../store';

export default function ZoomControls() {
  const { view, setView, fitView } = useStore();

  const handleZoom = (factor) => {
    setView(v => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const ns = Math.min(2.2, Math.max(0.2, v.s * factor));
      return {
        s: ns,
        x: cx - (cx - v.x) * (ns / v.s),
        y: cy - (cy - v.y) * (ns / v.s)
      };
    });
  };

  return (
    <div className="zoom">
      <button onClick={() => handleZoom(0.9)} title="Alejar (-)">−</button>
      <span id="zVal" title="Restablecer (100%)" onClick={() => setView({ s: 1, x: view.x, y: view.y })}>
        {Math.round(view.s * 100)}%
      </span>
      <button onClick={() => handleZoom(1.1)} title="Acercar (+)">+</button>
      <button title="Encuadrar todo (F)" onClick={fitView}>⛶</button>
    </div>
  );
}