import { useEffect, useMemo, useRef, useState } from 'react';
import { Tree } from 'react-arborist';

// Palace hierarchy (navigation). Parent nodes = wings (toggle open/close).
// Leaves have an `id` that IS the route key.
const TREE_DATA = [
  { id: 'overview', name: 'Palace Overview' },
  { id: 'search', name: 'Search Materials' },
  { id: 'failures', name: 'Failure Browser' },
  { id: 'stats', name: 'Palace Statistics' },
  {
    id: 'nickelates',
    name: 'Nickelates',
    children: [
      { id: 'nickelates/experimental_results', name: 'Experimental Results' },
      { id: 'nickelates/failure_memory', name: 'Failure Memory' },
      { id: 'nickelates/gap_candidates', name: 'Gap Candidates' },
      { id: 'nickelates/substrate_room', name: 'Substrate Room' },
      { id: 'nickelates/data_engine', name: 'Data Engine' },
    ],
  },
  {
    id: 'cuprates',
    name: 'Cuprates',
    children: [
      { id: 'cuprates/experimental_results', name: 'Experimental Results' },
    ],
  },
  {
    id: 'pnictides',
    name: 'Pnictides',
    children: [
      { id: 'pnictides/experimental_results', name: 'Experimental Results' },
    ],
  },
  {
    id: 'hydrides',
    name: 'Hydrides',
    children: [
      { id: 'hydrides/experimental_results', name: 'Experimental Results' },
    ],
  },
  {
    id: 'conventional',
    name: 'Conventional',
    children: [
      { id: 'conventional/experimental_results', name: 'Experimental Results' },
    ],
  },
  {
    id: 'wildcards',
    name: 'Wildcards',
    children: [
      { id: 'wildcards/experimental_results', name: 'Experimental Results' },
    ],
  },
  {
    id: 'history',
    name: 'History',
    children: [
      { id: 'history/timeline', name: 'Tc Timeline' },
      { id: 'history/brief', name: 'Research Brief' },
    ],
  },
];

export default function WingTree({ activeRoute, onNavigate, counts }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 220, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // initial open state — open whichever wing contains the active route
  const initialOpen = useMemo(() => {
    const out = {};
    for (const node of TREE_DATA) {
      if (node.children) {
        const childHit = node.children.some(c => c.id === activeRoute);
        if (childHit || node.id === activeRoute.split('/')[0]) out[node.id] = true;
      }
    }
    if (!Object.keys(out).length) out.nickelates = true;
    return out;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const Node = ({ node, style, dragHandle }) => {
    const isLeaf = !node.children || node.children.length === 0;
    const isWingLevel = node.level === 0 && !isLeaf;
    const isActive = isLeaf && node.data.id === activeRoute;
    const count = counts?.[node.data.id];

    const handleClick = () => {
      if (isLeaf) onNavigate(node.data.id);
      else node.toggle();
    };

    const classes = [
      'arborist-row',
      isActive ? 'is-active' : '',
      isWingLevel ? 'wing-node' : '',
      !isWingLevel && node.level > 0 ? 'room-node' : '',
    ].filter(Boolean).join(' ');

    return (
      <div ref={dragHandle} style={style} onClick={handleClick} className={classes}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', minWidth: 0 }}>
          {!isLeaf && (
            <span style={{ fontSize: 7, color: 'var(--text-faint)', width: 10 }}>
              {node.isOpen ? '▼' : '▶'}
            </span>
          )}
          {isLeaf && node.level > 0 && <span style={{ width: 10 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.data.name}
          </span>
        </span>
        {count != null && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-faint)',
          }}>
            {count}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', padding: '14px 0' }}>
      <div className="overline" style={{ padding: '0 16px 10px' }}>
        Navigation
      </div>
      <div ref={containerRef} className="tree-spine" style={{ height: 'calc(100% - 32px)', overflow: 'hidden' }}>
        <Tree
          data={TREE_DATA}
          width={size.w}
          height={size.h}
          rowHeight={28}
          indent={16}
          openByDefault={false}
          initialOpenState={initialOpen}
          disableDrag
          disableDrop
          disableEdit
          disableMultiSelection
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
}
