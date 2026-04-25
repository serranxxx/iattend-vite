

import { useState } from 'react'

const PomponBow = ({ size = 1 }) => {
  const cx = 105 * size, cy = 105 * size, r = size;
  return (
    <svg
      width={210 * size}
      height={210 * size}
      viewBox={`0 0 ${210 * size} ${210 * size}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {[
        [cx - 45 * r, cy], [cx + 45 * r, cy],
        [cx, cy - 45 * r], [cx, cy + 45 * r],
        [cx - 32 * r, cy - 32 * r], [cx + 32 * r, cy - 32 * r],
        [cx - 32 * r, cy + 32 * r], [cx + 32 * r, cy + 32 * r],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={22 * r} fill="white" opacity="0.88" />
      ))}
      {[
        [cx - 28 * r, cy - 18 * r], [cx + 28 * r, cy - 18 * r],
        [cx - 28 * r, cy + 18 * r], [cx + 28 * r, cy + 18 * r],
      ].map(([x, y], i) => (
        <circle key={`s${i}`} cx={x} cy={y} r={16 * r} fill="white" opacity="0.75" />
      ))}
      <circle cx={cx} cy={cy} r={22 * r} fill="#e74c3c" />
      <circle cx={cx} cy={cy} r={14 * r} fill="#c0392b" />
      <circle cx={cx} cy={cy} r={7 * r} fill="#e74c3c" />
    </svg>
  );
};

const SatinBow = ({ vertical = false }) => {
  if (!vertical) {
    return (
      <svg width="390" height="230" viewBox="0 0 390 230" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <path d="M175 115 C150 75, 95 60, 80 80 C95 95, 150 100, 175 115Z" fill="#bdbdbd" opacity="0.95" />
        <path d="M175 115 C155 85, 105 72, 88 84 C103 95, 152 104, 175 115Z" fill="#f0f0f0" opacity="0.8" />
        <path d="M215 115 C240 75, 295 60, 310 80 C295 95, 240 100, 215 115Z" fill="#bdbdbd" opacity="0.95" />
        <path d="M215 115 C235 85, 285 72, 302 84 C287 95, 238 104, 215 115Z" fill="#f0f0f0" opacity="0.8" />
        <path d="M195 92 C170 60, 175 15, 195 8 C215 15, 220 60, 195 92Z" fill="#bdbdbd" opacity="0.95" />
        <path d="M195 92 C178 65, 182 22, 195 13 C208 22, 212 65, 195 92Z" fill="#f0f0f0" opacity="0.8" />
        <path d="M195 138 C170 170, 175 215, 195 222 C215 215, 220 170, 195 138Z" fill="#bdbdbd" opacity="0.95" />
        <path d="M195 138 C178 165, 182 208, 195 217 C208 208, 212 165, 195 138Z" fill="#f0f0f0" opacity="0.8" />
        <ellipse cx="195" cy="115" rx="22" ry="18" fill="#9e9e9e" />
        <ellipse cx="195" cy="115" rx="16" ry="13" fill="#e8e8e8" />
        <ellipse cx="195" cy="113" rx="10" ry="8" fill="white" opacity="0.85" />
      </svg>
    );
  }
  return (
    <svg width="210" height="330" viewBox="0 0 210 330" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <path d="M105 148 C80 115, 82 72, 105 60 C128 72, 130 115, 105 148Z" fill="#bdbdbd" opacity="0.95" />
      <path d="M105 148 C86 118, 88 78, 105 67 C122 78, 124 118, 105 148Z" fill="#f0f0f0" opacity="0.8" />
      <path d="M105 182 C80 215, 82 258, 105 270 C128 258, 130 215, 105 182Z" fill="#bdbdbd" opacity="0.95" />
      <path d="M105 182 C86 212, 88 252, 105 263 C122 252, 124 212, 105 182Z" fill="#f0f0f0" opacity="0.8" />
      <path d="M91 165 C60 140, 28 142, 16 158 C28 172, 60 170, 91 165Z" fill="#bdbdbd" opacity="0.95" />
      <path d="M91 165 C64 147, 34 148, 22 161 C34 171, 62 168, 91 165Z" fill="#f0f0f0" opacity="0.8" />
      <path d="M119 165 C150 140, 182 142, 194 158 C182 172, 150 170, 119 165Z" fill="#bdbdbd" opacity="0.95" />
      <path d="M119 165 C146 147, 176 148, 188 161 C176 171, 148 168, 119 165Z" fill="#f0f0f0" opacity="0.8" />
      <ellipse cx="105" cy="165" rx="18" ry="14" fill="#9e9e9e" />
      <ellipse cx="105" cy="165" rx="12" ry="9" fill="#e8e8e8" />
      <ellipse cx="105" cy="163" rx="7" ry="6" fill="white" opacity="0.85" />
    </svg>
  );
};

const DiamondPattern = ({  highlight = "#ff6b6b", cols = 10, rows = 7, vertical = false }) => {
  const w = vertical ? 210 : 390;
  const h = vertical ? 330 : 230;
  const spacing = vertical ? 30 : 40;
  const dots = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing + (row % 2 === 0 ? 10 : 25);
      const y = row * 32 + 10;
      if (x > w - 5 || y > h - 5) continue;
      dots.push({ x, y, key: `${row}-${col}` });
    }
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {dots.map(({ x, y, key }) => (
        <rect
          key={key}
          x={x} y={y} width="10" height="10" rx="2"
          fill={highlight} opacity="0.45"
          transform={`rotate(45 ${x + 5} ${y + 5})`}
        />
      ))}
    </svg>
  );
};

const HolographicStripes = ({ vertical = false }) => {
  const w = vertical ? 210 : 390;
  const h = vertical ? 330 : 230;
  const stripes = vertical
    ? [
        { x: -20, fill: "#7986cb" }, { x: 20, fill: "#90caf9" },
        { x: 55, fill: "#5c6bc0" }, { x: 95, fill: "#80deea" },
        { x: 130, fill: "#b39ddb" }, { x: 170, fill: "#90caf9" },
        { x: 200, fill: "#7986cb" },
      ]
    : [
        { x: -20, fill: "#7986cb" }, { x: 30, fill: "#90caf9" },
        { x: 70, fill: "#5c6bc0" }, { x: 120, fill: "#80deea" },
        { x: 160, fill: "#7986cb" }, { x: 210, fill: "#b39ddb" },
        { x: 250, fill: "#5c6bc0" }, { x: 300, fill: "#90caf9" },
        { x: 340, fill: "#7986cb" }, { x: 390, fill: "#80deea" },
      ];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <g opacity="0.38">
        {stripes.map((s, i) => (
          <rect key={i} x={s.x} y={-20} width={i % 2 === 0 ? 40 : 18} height={h + 40}
            fill={s.fill} transform={`rotate(-30 ${s.x + 20} ${h / 2})`} />
        ))}
      </g>
    </svg>
  );
};

const RibbonLayer = ({ vertical = false, color = "white", opacity = 0.22 }) => {
  if (!vertical) {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: "44%", top: 0, bottom: 0, width: "12%", background: color, opacity: opacity * 0.7 }} />
        <div style={{ position: "absolute", left: "45.5%", top: 0, bottom: 0, width: "9%", background: color, opacity }} />
        <div style={{ position: "absolute", left: "47%", top: 0, bottom: 0, width: "6%", background: color, opacity: opacity * 0.6 }} />
        <div style={{ position: "absolute", top: "38%", left: 0, right: 0, height: "12%", background: color, opacity: opacity * 0.7 }} />
        <div style={{ position: "absolute", top: "40%", left: 0, right: 0, height: "9%", background: color, opacity }} />
        <div style={{ position: "absolute", top: "42%", left: 0, right: 0, height: "5%", background: color, opacity: opacity * 0.6 }} />
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "41%", top: 0, bottom: 0, width: "18%", background: color, opacity: opacity * 0.7 }} />
      <div style={{ position: "absolute", left: "44%", top: 0, bottom: 0, width: "12%", background: color, opacity }} />
      <div style={{ position: "absolute", left: "46.5%", top: 0, bottom: 0, width: "7%", background: color, opacity: opacity * 0.6 }} />
      <div style={{ position: "absolute", top: "42%", left: 0, right: 0, height: "9%", background: color, opacity: opacity * 0.7 }} />
      <div style={{ position: "absolute", top: "44%", left: 0, right: 0, height: "6%", background: color, opacity }} />
      <div style={{ position: "absolute", top: "46%", left: 0, right: 0, height: "4%", background: color, opacity: opacity * 0.6 }} />
    </div>
  );
};

const LogoSlot = ({ dark = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 9,
      border: `1.5px dashed ${dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.55)"}`,
      background: dark ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.14)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="2" width="12" height="12" rx="3"
          stroke={dark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)"}
          strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
      </svg>
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em", color: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.8)" }}>
      Tu marca
    </span>
  </div>
);

const CardNumber = ({ color = "rgba(255,255,255,0.45)", size = 11 }) => (
  <span style={{ fontSize: size, letterSpacing: "0.06em", color, fontFamily: "'DM Mono', monospace" }}>
    •••• •••• •••• 7743
  </span>
);

export const CardBHorizontal = ({ amount = "$50.00", flipped }) => (
  <div style={{
    width: 390, minHeight: 230, borderRadius: 20, position: "relative", overflow: "hidden",
    background: "#c0392b",
    transition: "transform 0.6s cubic-bezier(.23,1,.32,1), box-shadow 0.4s ease",
    transform: flipped ? "rotateY(8deg) scale(1.02)" : "rotateY(0deg) scale(1)",
    cursor: "pointer",
  }}>
    <DiamondPattern vertical={false} />
    <RibbonLayer vertical={false} color="white" opacity={0.2} />
    <PomponBow size={0.55} />
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "22px 26px", zIndex: 2 }}>
      <LogoSlot />
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Gift Card</div>
        <div style={{ color: "#fff", fontSize: 32, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.5px" }}>{amount}</div>
        <CardNumber />
      </div>
    </div>
  </div>
);

export const CardCHorizontal = ({ amount = "$250.00", flipped }) => (
  <div style={{
    width: 390, minHeight: 230, borderRadius: 20, position: "relative", overflow: "hidden",
    background: "#1565c0",
    transition: "transform 0.6s cubic-bezier(.23,1,.32,1), box-shadow 0.4s ease",
    transform: flipped ? "rotateY(-8deg) scale(1.02)" : "rotateY(0deg) scale(1)",
    cursor: "pointer",
  }}>
    <HolographicStripes vertical={false} />
    <RibbonLayer vertical={false} color="white" opacity={0.25} />
    <SatinBow vertical={false} />
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "22px 26px", zIndex: 2 }}>
      <LogoSlot />
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "rgba(180,210,255,0.75)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Gift Card</div>
        <div style={{ color: "#fff", fontSize: 32, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.5px" }}>{amount}</div>
        <CardNumber color="rgba(255,255,255,0.38)" />
      </div>
    </div>
  </div>
);

const STACK_CARDS = [
    { C: CardBHorizontal, rot: -10 },
    { C: CardCHorizontal, rot: 0 },
    { C: CardBHorizontal, rot: 10 },
]

export const GiftCardsStack = () => {
    const [active, setActive] = useState(1)

    return (
        <div style={{ position: 'relative', height: '160px', alignSelf: 'stretch' }}>
            {STACK_CARDS.map(({ rot }, i) => {
                const isActive = active === i
                const left = ['20%', '50%', '80%'][i]
                return (
                    <div
                        key={i}
                        onClick={() => setActive(i)}
                        style={{
                            position: 'absolute',
                            left,
                            top: '50%',
                            transform: `translateX(-50%) translateY(-50%) rotate(${isActive ? 0 : rot}deg) scale(${isActive ? 0.55 : 0.48})`,
                            transformOrigin: 'center center',
                            zIndex: isActive ? 3 : i,
                            transition: 'all 0.4s cubic-bezier(.23,1,.32,1)',
                            cursor: 'pointer',
                        }}
                    >
                        <Card flipped={isActive} />
                    </div>
                )
            })}
        </div>
    )
}
