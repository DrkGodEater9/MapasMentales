import React, { useState } from 'react';
import { useStore } from '../store';
import clsx from 'clsx';

export default function Picture({ data }) {
  const { id, x, y, w, src } = data;
  const { selected, deletePic, updatePic } = useStore();
  const [loaded, setLoaded] = useState(false);
  const isSelected = selected === id;

  const handleLoad = (e) => {
    if (loaded) return;
    setLoaded(true);
    const img = e.target;
    const newW = Math.min(360, Math.max(140, img.naturalWidth || 260));
    if (newW !== w) {
      updatePic(id, { w: newW });
    }
  };

  const handleError = () => {
    deletePic(id);
    alert('No se pudo cargar esa imagen. Descárgala y arrástrala al lienzo.');
  };

  return (
    <div 
      className={clsx('pic', { sel: isSelected })} 
      style={{ left: x, top: y, width: w }}
      id={`p-${id}`}
    >
      <img src={src} draggable="false" alt="img" onLoad={handleLoad} onError={handleError} />
      {isSelected && (
        <div className="tools">
          <button className="kill" onClick={() => deletePic(id)}>
             <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
      <div className="grip"></div>
    </div>
  );
}