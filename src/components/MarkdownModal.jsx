import React, { useState } from 'react';
import { useStore } from '../store';
import { importMarkdown } from '../markdown';

export default function MarkdownModal({ isOpen, onClose }) {
  const [text, setText] = useState('');
  const store = useStore();

  if (!isOpen) return null;

  const handleImport = (replace) => {
    importMarkdown(text, replace, store);
    onClose();
  };

  return (
    <div className="modal" id="mdModal">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mdTitle">
        <h2 id="mdTitle">Insertar desde Markdown</h2>
        <p>Cada <code>#</code> crea un nodo. Cada <code>##</code> crea un nodo hijo. Las viñetas <code>-</code> son subsecciones. Para asignar color a un nodo añade <code>{'{color:azul}'}</code> al final del encabezado.</p>
        <p style={{marginBottom: '4px'}}>Colores disponibles: <code>{'{color:azul}'}</code> <code>{'{color:rojo}'}</code> <code>{'{color:naranja}'}</code> <code>{'{color:verde}'}</code> <code>{'{color:violeta}'}</code> <code>{'{color:negro}'}</code> — o un hex: <code>{'{color:#FF6B35}'}</code></p>
        <textarea 
          id="mdText" 
          spellCheck="false" 
          placeholder="# Idea central&#10;## Primera rama {color:azul}&#10;- Un detalle&#10;- Otro detalle&#10;## Segunda rama {color:rojo}"
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        ></textarea>
        
        <details className="ai-box" id="aiDetails">
          <summary>
            <svg viewBox="0 0 24 24"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1v-1a2 2 0 0 1 2-2h1V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/></svg>
            Cómo pedirle esto a una IA — copia este prompt
          </summary>
          <div className="ai-prompt" id="aiPrompt">
            Genera un mapa mental en formato Markdown siguiendo estas reglas estrictas:
            1. Usa # para el nodo raíz (solo uno).
            2. Usa ## para ramas principales (hijos directos del raíz).
            3. Usa ### para sub-ramas (nietos).
            4. Usa - para subsecciones/puntos dentro de cada nodo.
            5. Si una viñeta tiene viñetas con sangría de 2 espacios debajo, se convierte en su propio nodo hijo.
            6. Para asignar color a un nodo, añade {'{color:X}'} al final del título del encabezado.
            Colores permitidos: azul, rojo, naranja, verde, violeta, negro.
          </div>
        </details>

        <div className="acts">
          <button className="act" onClick={onClose}>Cancelar</button>
          <span style={{flex: 1}}></span>
          <button className="act danger" onClick={() => handleImport(true)} title="Borra el mapa actual">Reemplazar mapa</button>
          <button className="act solid" onClick={() => handleImport(false)}>Insertar al mapa</button>
        </div>
      </div>
    </div>
  );
}