import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { layoutLeaves } from '../layout';

function box(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return {
    x: el.offsetLeft,
    y: el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight
  };
}

function orthoBox(A, B) {
  const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
  const ex = B.x + B.w / 2, ey = B.y + B.h / 2;
  const p1 = { x: A.x + (ex > cx ? A.w : 0), y: A.y + A.h / 2 };
  const p2 = { x: B.x + (ex > cx ? 0 : B.w), y: B.y + B.h / 2 };
  return `M${p1.x} ${p1.y} L${p1.x + (ex > cx ? 15 : -15)} ${p1.y} L${p1.x + (ex > cx ? 15 : -15)} ${p2.y} L${p2.x} ${p2.y}`;
}

export default function Links() {
  const { nodes, mode, theme } = useStore();
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    let raf;
    const update = () => {
      layoutLeaves();

      const newPaths = [];
      const nodesArr = Object.values(nodes);

      // 1. Draw Links between Nodes
      nodesArr.forEach(k => {
        if (!k.parent || !nodes[k.parent]) return;
        
        const A = box(`n-${k.parent}`);
        const B = box(`n-${k.id}`);
        if (!A || !B || A.w === 0 || B.w === 0) return;

        const pNode = nodes[k.parent];
        const color = pNode.color === '#1B2A22' && theme === 'dark' ? '#8FA698' : pNode.color;
        
        const ac = { x: A.x + A.w / 2, y: A.y + A.h / 2 };
        const bc = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
        const dx = bc.x - ac.x;
        const dy = bc.y - ac.y;

        let pathStr;
        if (mode === 'split') {
          pathStr = orthoBox(A, B);
        } else if (Math.abs(dx) >= Math.abs(dy)) {
          const s = dx >= 0 ? 1 : -1;
          const p1 = { x: ac.x + s * A.w / 2, y: ac.y };
          const p2 = { x: bc.x - s * B.w / 2, y: bc.y };
          const k2 = Math.max(40, Math.abs(p2.x - p1.x) * 0.45);
          pathStr = `M${p1.x} ${p1.y}C${p1.x + s * k2} ${p1.y} ${p2.x - s * k2} ${p2.y} ${p2.x} ${p2.y}`;
        } else {
          const s = dy >= 0 ? 1 : -1;
          const p1 = { x: ac.x, y: ac.y + s * A.h / 2 };
          const p2 = { x: bc.x, y: bc.y - s * B.h / 2 };
          const k2 = Math.max(36, Math.abs(p2.y - p1.y) * 0.45);
          pathStr = `M${p1.x} ${p1.y}C${p1.x} ${p1.y + s * k2} ${p2.x} ${p2.y - s * k2} ${p2.x} ${p2.y}`;
        }

        newPaths.push(
          <path key={`link-${k.id}`} d={pathStr} stroke={color} opacity=".55" fill="none" strokeWidth="2.5" />
        );
      });

      // 2. Draw Links from Node to Leaves (only in split mode)
      if (mode === 'split') {
        const TRUNK = 15;
        nodesArr.forEach(k => {
          const A = box(`n-${k.id}`);
          if (!A || A.w === 0) return;
          
          const kColor = k.color === '#1B2A22' && theme === 'dark' ? '#8FA698' : k.color;
          const els = [];

          k.items.forEach(it => {
            const e = box(`l-${it.id}`);
            if (!e || e.w === 0) return;
            
            if (it.free) {
              const B = e;
              newPaths.push(
                <path key={`sub-${it.id}`} d={orthoBox(A, B)} stroke={kColor} opacity=".45" fill="none" strokeWidth="1.5" />
              );
            } else {
              els.push(e);
            }
          });

          if (!els.length) return;
          
          const startX = A.x + A.w, cy = A.y + A.h / 2;
          const trunkX = startX + TRUNK;
          const centers = els.map(e => e.y + e.h / 2);
          const top = Math.min(cy, ...centers), bot = Math.max(cy, ...centers);
          
          let p = `M${startX} ${cy}H${trunkX}M${trunkX} ${top}V${bot}`;
          centers.forEach((c, i) => { p += `M${trunkX} ${c}H${els[i].x}`; });
          
          newPaths.push(
            <path key={`trunk-${k.id}`} d={p} stroke={kColor} opacity=".5" fill="none" strokeWidth="1.5" />
          );
        });
      }

      setPaths(newPaths);
    };

    raf = requestAnimationFrame(() => {
       setTimeout(update, 10);
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes, mode, theme]);

  return (
    <svg className="links" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      {paths}
    </svg>
  );
}