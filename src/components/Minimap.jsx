import React, { useRef, useEffect } from 'react';
import { useStore } from '../store';

export default function Minimap() {
  const canvasRef = useRef(null);
  const vpRef = useRef(null);
  const dragRef = useRef(null);
  const { nodes, pics, view, theme, setView } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 320, 200);
    ctx.fillStyle = theme === 'dark' ? '#1A1E1C' : '#DBE2D8';
    ctx.fillRect(0, 0, 320, 200);

    const nodesArr = Object.values(nodes);
    const picsArr = Object.values(pics);
    
    if (nodesArr.length === 0 && picsArr.length === 0) return;

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

    const w = maxX - minX;
    const h = maxY - minY;
    
    let scale = Math.min(300 / w, 180 / h);
    if (scale > 0.1) scale = 0.1;
    
    const ox = 160 - (minX + w/2) * scale;
    const oy = 100 - (minY + h/2) * scale;

    nodesArr.forEach(d => {
      ctx.fillStyle = d.color === '#1B2A22' && theme === 'dark' ? '#8FA698' : d.color;
      ctx.beginPath();
      ctx.roundRect(d.x * scale + ox, d.y * scale + oy, 120 * scale, 35 * scale, 3);
      ctx.fill();
    });

    picsArr.forEach(p => {
      ctx.fillStyle = theme === 'dark' ? '#3B4A41' : '#C3CDBF';
      ctx.fillRect(p.x * scale + ox, p.y * scale + oy, p.w * scale, p.w * 0.8 * scale);
    });

    // We store the current transform info in the canvas so the drag handlers can read it
    canvas._mapInfo = { ox, oy, scale };

    // Update viewport rect
    if (vpRef.current) {
      const vW = window.innerWidth / view.s;
      const vH = window.innerHeight / view.s;
      const vX = -view.x / view.s;
      const vY = -view.y / view.s;

      vpRef.current.style.left = `${(vX * scale + ox)}px`;
      vpRef.current.style.top = `${(vY * scale + oy)}px`;
      vpRef.current.style.width = `${vW * scale}px`;
      vpRef.current.style.height = `${vH * scale}px`;
    }
  }, [nodes, pics, view, theme]);

  const updateViewFromMouse = (e) => {
    const canvas = canvasRef.current;
    const info = canvas?._mapInfo;
    if (!info) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const scale = info.scale;
    const ox = info.ox;
    const oy = info.oy;

    const worldX = (cx - ox) / scale;
    const worldY = (cy - oy) / scale;

    setView(v => ({
      x: window.innerWidth / 2 - worldX * v.s,
      y: window.innerHeight / 2 - worldY * v.s
    }));
  };

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    dragRef.current = true;
    updateViewFromMouse(e);
  };

  const handlePointerMove = (e) => {
    if (dragRef.current) {
      updateViewFromMouse(e);
    }
  };

  const handlePointerUp = (e) => {
    dragRef.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div id="minimap" title="Minimap - arrastra para encuadrar" style={{ touchAction: 'none' }}>
      <canvas 
        id="mmCanvas" 
        ref={canvasRef} 
        width="320" 
        height="200"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      ></canvas>
      <div className="mm-vp" id="mmVp" ref={vpRef}></div>
    </div>
  );
}