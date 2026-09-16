import React, { useRef } from 'react';
import { useStore } from '../store';
import clsx from 'clsx';

const COLORS = ["#22406E","#D3455B","#E2A33A","#3E7C59","#6B4E9E","#1B2A22"];

export default function Node({ data }) {
  const { id, x, y, color, title, items } = data;
  const { selected, updateNode, updateItem, addItem, deleteNode, deleteItem, addNode, mode, theme } = useStore();
  const isSelected = selected === id;
  
  const c = color === '#1B2A22' && theme === 'dark' ? '#8FA698' : color;

  return (
    <article 
      className={clsx('node', { sel: isSelected })} 
      style={{ left: x, top: y, '--c': c }}
      id={`n-${id}`}
      data-id={id}
      data-kind="node"
    >
      <div className="spine" />
      <div className="body">
        <h2 
          className="title" 
          contentEditable 
          suppressContentEditableWarning
          spellCheck="false"
          onBlur={(e) => updateNode(id, { title: e.target.textContent })}
        >
          {title}
        </h2>
        
        {mode === 'card' && (
          <ul className="subs">
            {items.map(it => (
              <li key={it.id} data-item={it.id}>
                <span 
                  className="sub" 
                  contentEditable 
                  suppressContentEditableWarning
                  spellCheck="false"
                  onBlur={(e) => {
                    if (!e.target.textContent.trim()) deleteItem(id, it.id);
                    else updateItem(id, it.id, { text: e.target.textContent });
                  }}
                >
                  {it.text}
                </span>
                <button className="kill" onClick={() => deleteItem(id, it.id)} title="Quitar">×</button>
              </li>
            ))}
          </ul>
        )}
        <button className="addsub" onClick={() => addItem(id)}>+ subsección</button>
      </div>

      {isSelected && (
        <div className="tools">
          <button onClick={() => addNode(x + 280, y + 40, { parent: id })} title="Nodo conectado">
             <svg viewBox="0 0 24 24"><path d="M4 12h7m0 0V6h9M11 12v6h9"/></svg>
          </button>
          <button onClick={() => addItem(id)} title="Subsección">
             <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h10M4 17h13"/></svg>
          </button>
          <button onClick={() => deleteNode(id)} title="Eliminar nodo">
             <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/></svg>
          </button>
          <div className="swatches">
             {COLORS.map(swColor => (
                <i 
                  key={swColor} 
                  className="sw" 
                  style={{ background: swColor }} 
                  onClick={() => updateNode(id, { color: swColor })}
                />
             ))}
          </div>
        </div>
      )}
    </article>
  );
}