import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from './store';

function bounds(pad = 70) {
  const world = document.getElementById('world');
  if (!world) return null;
  const items = world.querySelectorAll('.node, .pic, .leaf');
  if (!items.length) return null;
  
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  items.forEach(n => {
    x1 = Math.min(x1, n.offsetLeft);
    y1 = Math.min(y1, n.offsetTop);
    x2 = Math.max(x2, n.offsetLeft + n.offsetWidth);
    y2 = Math.max(y2, n.offsetTop + n.offsetHeight);
  });
  return { x: x1 - pad, y: y1 - pad, w: (x2 - x1) + pad * 2, h: (y2 - y1) + pad * 2 };
}

async function captureCanvas() {
  const b = bounds();
  if (!b) {
    alert('Agrega algo al mapa antes de exportar.');
    return null;
  }

  useStore.getState().selectNode(null);

  const prev = { ...useStore.getState().view };
  document.body.classList.add('exporting');
  
  const world = document.getElementById('world');
  
  // Remove any translation so html2canvas computes coords accurately within world
  world.style.transform = `translate(0px, 0px) scale(1)`;
  
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 90)));
  
  try {
    return await html2canvas(world, {
      backgroundColor: document.documentElement.classList.contains('dark') ? '#1A1E1C' : '#DBE2D8',
      scale: Math.min(2, (window.devicePixelRatio || 1) * 1.4),
      x: b.x,
      y: b.y,
      width: b.w,
      height: b.h,
      useCORS: true,
      logging: false
    });
  } finally {
    document.body.classList.remove('exporting');
    // Restore transform
    useStore.getState().setView(prev);
  }
}

function fileName(ext) {
  const mapTitle = document.getElementById('mapTitle')?.textContent?.trim() || 'mapa-mental';
  return (mapTitle.toLowerCase().replace(/[^\w\s\u00C0-\u017F-]/g, '').replace(/\s+/g, '-').slice(0, 50) || 'mapa-mental') + '.' + ext;
}

export async function exportPNG() {
  const c = await captureCanvas();
  if (!c) return;
  const a = document.createElement('a');
  a.download = fileName('png');
  a.href = c.toDataURL('image/png');
  a.click();
}

export async function exportPDF() {
  const c = await captureCanvas();
  if (!c) return;
  
  const w = c.width;
  const h = c.height;
  const pdf = new jsPDF({
    orientation: w >= h ? 'landscape' : 'portrait',
    unit: 'px',
    format: [w, h],
    compress: true
  });
  
  pdf.addImage(c.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, w, h);
  pdf.save(fileName('pdf'));
}