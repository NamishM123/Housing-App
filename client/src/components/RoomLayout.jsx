const SCALE = 18; // pixels per foot

const FURNITURE = [
  { id: 'bed', label: 'Bed', w: 5, h: 6.5, x: 0.5, y: 0.5, color: '#3b82f6' },
  { id: 'desk', label: 'Desk', w: 4, h: 2, x: 0.5, y: 7.5, color: '#8b5cf6' },
  { id: 'dresser', label: 'Dresser', w: 3, h: 1.5, x: 6, y: 0.5, color: '#f59e0b' },
  { id: 'chair', label: 'Chair', w: 2, h: 2, x: 4.5, y: 7.5, color: '#ec4899' },
  { id: 'nightstand', label: 'Nightstand', w: 1.5, h: 1.5, x: 6, y: 2.5, color: '#14b8a6' },
  { id: 'closet', label: 'Closet', w: 4, h: 1.5, x: 0.5, y: 10, color: '#6b7280' },
];

function layoutFurniture(roomW, roomL) {
  const pieces = [];

  // Bed — top-left corner
  const bedW = Math.min(5, roomW - 1);
  const bedH = Math.min(6.5, roomL * 0.45);
  pieces.push({ id: 'bed', label: 'Bed', x: 0.5, y: 0.5, w: bedW, h: bedH, color: '#3b82f6' });

  // Dresser — top-right
  const dresserW = Math.min(3, roomW - bedW - 1.5);
  if (dresserW > 1) {
    pieces.push({ id: 'dresser', label: 'Dresser', x: roomW - dresserW - 0.5, y: 0.5, w: dresserW, h: 1.5, color: '#f59e0b' });
  }

  // Nightstand — beside bed
  if (bedW + 2 < roomW) {
    pieces.push({ id: 'nightstand', label: 'Table', x: bedW + 0.5, y: 0.5, w: 1.5, h: 1.5, color: '#14b8a6' });
  }

  // Desk — bottom strip
  const deskY = roomL - 3.5;
  const deskW = Math.min(4, roomW - 1);
  pieces.push({ id: 'desk', label: 'Desk', x: 0.5, y: deskY, w: deskW, h: 2, color: '#8b5cf6' });

  // Chair — beside desk
  if (deskW + 2.5 < roomW) {
    pieces.push({ id: 'chair', label: 'Chair', x: deskW + 0.8, y: deskY, w: 2, h: 2, color: '#ec4899' });
  }

  // Bookshelf — right wall
  if (roomW >= 10) {
    pieces.push({ id: 'shelf', label: 'Shelf', x: roomW - 1.5, y: deskY - 4, w: 1, h: 3.5, color: '#22c55e' });
  }

  return pieces;
}

export default function RoomLayout({ width, length }) {
  const pieces = layoutFurniture(width, length);
  const svgW = width * SCALE + 40;
  const svgH = length * SCALE + 40;

  return (
    <div className="room-layout">
      <div className="room-label">
        {width} × {length} ft — {(width * length).toLocaleString()} sq ft
      </div>
      <div className="room-svg-wrapper">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="room-svg"
        >
          {/* Room border */}
          <rect
            x={20} y={20}
            width={width * SCALE}
            height={length * SCALE}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={2}
          />

          {/* Grid */}
          {Array.from({ length: width - 1 }, (_, i) => (
            <line
              key={`vg${i}`}
              x1={20 + (i + 1) * SCALE} y1={20}
              x2={20 + (i + 1) * SCALE} y2={20 + length * SCALE}
              stroke="#334155" strokeWidth={0.5} strokeDasharray="3,3"
            />
          ))}
          {Array.from({ length: length - 1 }, (_, i) => (
            <line
              key={`hg${i}`}
              x1={20} y1={20 + (i + 1) * SCALE}
              x2={20 + width * SCALE} y2={20 + (i + 1) * SCALE}
              stroke="#334155" strokeWidth={0.5} strokeDasharray="3,3"
            />
          ))}

          {/* Door */}
          <path
            d={`M ${20 + width * 0.6 * SCALE} ${20 + length * SCALE} A ${2 * SCALE} ${2 * SCALE} 0 0 0 ${20 + width * 0.6 * SCALE + 2 * SCALE} ${20 + length * SCALE}`}
            fill="none" stroke="#64748b" strokeWidth={1.5}
          />
          <line
            x1={20 + width * 0.6 * SCALE} y1={20 + length * SCALE - 1}
            x2={20 + width * 0.6 * SCALE} y2={20 + length * SCALE + 1}
            stroke="#64748b" strokeWidth={2}
          />

          {/* Window */}
          <rect x={20 + width * 0.2 * SCALE} y={18} width={width * 0.3 * SCALE} height={4} fill="#38bdf8" opacity={0.6} />

          {/* Furniture pieces */}
          {pieces.map(piece => (
            <g key={piece.id}>
              <rect
                x={20 + piece.x * SCALE}
                y={20 + piece.y * SCALE}
                width={piece.w * SCALE}
                height={piece.h * SCALE}
                fill={piece.color}
                fillOpacity={0.3}
                stroke={piece.color}
                strokeWidth={1.5}
                rx={3}
              />
              <text
                x={20 + (piece.x + piece.w / 2) * SCALE}
                y={20 + (piece.y + piece.h / 2) * SCALE}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={piece.color}
                fontSize={Math.max(9, Math.min(12, piece.w * SCALE * 0.22))}
                fontWeight="600"
              >
                {piece.label}
              </text>
            </g>
          ))}

          {/* Dimension labels */}
          <text x={20 + width * SCALE / 2} y={14} textAnchor="middle" fill="#64748b" fontSize={11}>{width} ft</text>
          <text x={12} y={20 + length * SCALE / 2} textAnchor="middle" fill="#64748b" fontSize={11} transform={`rotate(-90, 12, ${20 + length * SCALE / 2})`}>{length} ft</text>
        </svg>
      </div>
      <p className="room-note">Suggested layout — drag to customize (visual only)</p>
    </div>
  );
}
