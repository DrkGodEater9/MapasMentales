import React from 'react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="kbd-modal" id="kbdModal">
      <div className="kbd-sheet" role="dialog" aria-modal="true" aria-labelledby="kbdTitle">
        <h2 id="kbdTitle">Atajos de teclado</h2>
        <div className="kbd-list">
          <kbd>Doble clic</kbd><span>Crear nodo en el lienzo</span>
          <kbd>Ctrl Z</kbd><span>Deshacer</span>
          <kbd>Ctrl Y</kbd><span>Rehacer</span>
          <kbd>Delete / ⟵</kbd><span>Eliminar nodo o imagen seleccionada</span>
          <kbd>Enter</kbd><span>Nueva subsección (dentro de un nodo)</span>
          <kbd>Backspace</kbd><span>Borrar subsección vacía</span>
          <kbd>Escape</kbd><span>Deseleccionar / cerrar modal</span>
          <kbd>F</kbd><span>Encuadrar todo el mapa</span>
          <kbd>+</kbd><span>Acercar</span>
          <kbd>-</kbd><span>Alejar</span>
          <kbd>Ctrl Rueda</kbd><span>Zoom en cursor</span>
          <kbd>Arrastrar fondo</kbd><span>Desplazar el lienzo</span>
          <kbd>Ctrl V</kbd><span>Pegar una imagen o un bloque de Markdown</span>
          <kbd>?</kbd><span>Mostrar estos atajos</span>
        </div>
        <button className="btn solid kbd-close" id="kbdClose" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}