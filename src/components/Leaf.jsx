import React from 'react';
import { useStore } from '../store';
import clsx from 'clsx';

export default function Leaf({ item, node }) {
  const { id, text, free, dx, dy } = item;
  const { updateItem, deleteItem, selected, theme } = useStore();
  const isSelected = selected === id;
  
  const c = node.color === '#1B2A22' && theme === 'dark' ? '#8FA698' : node.color;
  
  // ALWAYS use dx and dy for positioning relative to the node, whether free or stacked
  const x = node.x + (dx || 0);
  const y = node.y + (dy || 0);

  return (
    <div 
      className={clsx('leaf', { free, sel: isSelected })}
      style={{ left: x, top: y, '--c': c, width: '180px' }}
      id={`l-${id}`}
      data-node-id={node.id}
      onDoubleClick={() => updateItem(node.id, id, { free: false })}
    >
      <span className="leaf-grip" title="Arrastra para moverla o doble clic para reacomodarla"></span>
      <span 
        className="sub" 
        contentEditable 
        suppressContentEditableWarning
        spellCheck="false"
        onBlur={(e) => {
          if (!e.target.textContent.trim()) deleteItem(node.id, id);
          else updateItem(node.id, id, { text: e.target.textContent });
        }}
      >
        {text}
      </span>
      <button className="kill" onClick={() => deleteItem(node.id, id)} title="Quitar">×</button>
    </div>
  );
}