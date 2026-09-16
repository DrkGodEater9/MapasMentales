import React from 'react';
import { useStore } from '../store';
import clsx from 'clsx';

export default function Picture({ data }) {
  const { id, x, y, w, src } = data;
  const { selected, deletePic } = useStore();
  const isSelected = selected === id;

  return (
    <div 
      className={clsx('pic', { sel: isSelected })} 
      style={{ left: x, top: y, width: w }}
      id={`p-${id}`}
    >
      <img src={src} draggable="false" alt="img" />
      {isSelected && (
        <div className="tools">
          <button className="kill" onClick={() => deletePic(id)}>
             <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}