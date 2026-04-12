import React from "react";

const c = {
  line: "var(--border, #e2e8f0)",
  block: "var(--muted, #f1f5f9)",
  accent: "var(--primary, #3b82f6)",
  dark: "var(--muted-foreground, #64748b)",
};

export const CATEGORY_WIREFRAMES: Record<string, React.ReactNode> = {
  hero: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="80" y="30" width="160" height="10" rx="3" fill={c.dark} />
      <rect x="60" y="48" width="200" height="10" rx="3" fill={c.dark} />
      <rect x="90" y="70" width="140" height="6" rx="2" fill={c.line} />
      <rect x="105" y="82" width="110" height="6" rx="2" fill={c.line} />
      <rect x="88" y="102" width="64" height="22" rx="11" fill={c.accent} />
      <rect x="162" y="102" width="64" height="22" rx="11" stroke={c.dark} strokeWidth="1.5" />
    </svg>
  ),
  features: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      {[40, 130, 220].map(x => (
        <g key={x}>
          <rect x={x} y="24" width="28" height="28" rx="8" fill={c.accent} opacity="0.2" />
          <rect x={x + 6} y="32" width="16" height="12" rx="2" fill={c.accent} />
          <rect x={x - 4} y="62" width="68" height="7" rx="2" fill={c.dark} />
          <rect x={x - 4} y="76" width="68" height="5" rx="2" fill={c.line} />
          <rect x={x - 4} y="86" width="52" height="5" rx="2" fill={c.line} />
        </g>
      ))}
    </svg>
  ),
  content: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="24" y="24" width="130" height="132" rx="8" fill={c.block} />
      <polygon points="54,120 89,70 124,120" fill={c.line} />
      <circle cx="70" cy="60" r="12" fill={c.line} />
      <rect x="174" y="36" width="50" height="5" rx="2" fill={c.accent} />
      <rect x="174" y="52" width="120" height="8" rx="2" fill={c.dark} />
      <rect x="174" y="66" width="100" height="8" rx="2" fill={c.dark} />
      <rect x="174" y="86" width="120" height="5" rx="2" fill={c.line} />
      <rect x="174" y="96" width="110" height="5" rx="2" fill={c.line} />
      <rect x="174" y="106" width="90" height="5" rx="2" fill={c.line} />
      <rect x="174" y="124" width="70" height="20" rx="10" fill={c.accent} />
    </svg>
  ),
  newsletter: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="40" y="28" width="240" height="10" rx="3" fill={c.dark} />
      <rect x="56" y="46" width="208" height="6" rx="2" fill={c.line} />
      <rect x="72" y="58" width="176" height="6" rx="2" fill={c.line} />
      <rect
        x="40"
        y="82"
        width="240"
        height="36"
        rx="8"
        fill="white"
        stroke={c.line}
        strokeWidth="1"
      />
      <rect x="52" y="94" width="16" height="12" rx="2" fill={c.line} />
      <rect x="76" y="97" width="100" height="6" rx="2" fill={c.block} />
      <rect x="188" y="82" width="92" height="36" fill={c.accent} />
      <rect x="210" y="97" width="48" height="6" rx="2" fill="white" opacity="0.95" />
    </svg>
  ),
  testimonials: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <text x="130" y="50" fontSize="48" fill={c.block} fontFamily="Georgia">
        &ldquo;
      </text>
      <rect x="70" y="64" width="180" height="6" rx="2" fill={c.line} />
      <rect x="85" y="78" width="150" height="6" rx="2" fill={c.line} />
      <rect x="95" y="92" width="130" height="6" rx="2" fill={c.line} />
      <rect x="140" y="110" width="40" height="2" rx="1" fill={c.block} />
      <circle cx="140" cy="132" r="12" fill={c.accent} opacity="0.2" />
      <rect x="158" y="126" width="50" height="6" rx="2" fill={c.dark} />
      <rect x="158" y="136" width="36" height="5" rx="2" fill={c.line} />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      {[32, 122, 212].map(x => (
        <g key={x}>
          <rect x={x} y="20" width="76" height="140" rx="8" fill={c.block} />
          <rect x={x} y="20" width="76" height="70" rx="8" fill={c.line} />
          <rect x={x} y="82" width="76" height="8" rx="0" fill={c.block} />
          <rect x={x + 12} y="100" width="52" height="7" rx="2" fill={c.dark} />
          <rect x={x + 18} y="114" width="40" height="5" rx="2" fill={c.line} />
        </g>
      ))}
    </svg>
  ),
  pricing: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="72" y="10" width="176" height="8" rx="2" fill={c.dark} />
      <rect x="96" y="24" width="128" height="5" rx="2" fill={c.line} />
      {[28, 118, 208].map((x, i) => (
        <g key={x}>
          <rect
            x={x}
            y="40"
            width="84"
            height="128"
            rx="8"
            fill={c.block}
            stroke={i === 1 ? c.accent : c.line}
            strokeWidth={i === 1 ? 2 : 1}
          />
          <rect x={x + 24} y="50" width="36" height="5" rx="2" fill={c.dark} />
          <rect x={x + 12} y="60" width="60" height="4" rx="1" fill={c.line} />
          <rect x={x + 20} y="72" width="44" height="10" rx="2" fill={c.dark} />
          <rect x={x + 12} y="88" width="60" height="3" rx="1" fill={c.line} />
          <rect x={x + 12} y="96" width="56" height="3" rx="1" fill={c.line} />
          <rect x={x + 10} y="118" width="64" height="16" rx="8" fill={c.accent} />
        </g>
      ))}
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="60" y="16" width="200" height="148" rx="10" fill={c.block} />
      <rect x="80" y="30" width="50" height="4" rx="2" fill={c.accent} />
      <rect x="80" y="40" width="100" height="8" rx="2" fill={c.dark} />
      <rect
        x="80"
        y="58"
        width="160"
        height="18"
        rx="4"
        fill="white"
        stroke={c.line}
        strokeWidth="1"
      />
      <rect
        x="80"
        y="82"
        width="160"
        height="18"
        rx="4"
        fill="white"
        stroke={c.line}
        strokeWidth="1"
      />
      <rect
        x="80"
        y="106"
        width="160"
        height="28"
        rx="4"
        fill="white"
        stroke={c.line}
        strokeWidth="1"
      />
      <rect x="80" y="140" width="160" height="18" rx="9" fill={c.accent} />
    </svg>
  ),
  cta: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="24" y="24" width="272" height="132" rx="12" fill={c.accent} opacity="0.15" />
      <rect x="80" y="46" width="160" height="10" rx="3" fill={c.dark} />
      <rect x="95" y="64" width="130" height="6" rx="2" fill={c.line} />
      <rect x="105" y="76" width="110" height="6" rx="2" fill={c.line} />
      <rect x="100" y="100" width="56" height="22" rx="11" fill={c.accent} />
      <rect x="164" y="100" width="56" height="22" rx="11" stroke={c.dark} strokeWidth="1.5" />
    </svg>
  ),
  faq: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      {[24, 72, 120].map((y, i) => (
        <g key={y}>
          <rect x="40" y={y} width="180" height="7" rx="2" fill={c.dark} />
          <rect x="40" y={y + 14} width="240" height="5" rx="2" fill={c.line} />
          <rect x="40" y={y + 24} width="200" height="5" rx="2" fill={c.line} />
          {i < 2 && (
            <line x1="40" y1={y + 40} x2="280" y2={y + 40} stroke={c.block} strokeWidth="1" />
          )}
        </g>
      ))}
    </svg>
  ),
  commerce: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="90" y="12" width="140" height="156" rx="10" fill={c.block} />
      <rect x="90" y="12" width="140" height="80" rx="10" fill={c.line} />
      <rect x="90" y="85" width="140" height="7" rx="0" fill={c.block} />
      <rect x="106" y="102" width="80" height="7" rx="2" fill={c.dark} />
      <rect x="106" y="116" width="44" height="7" rx="2" fill={c.accent} />
      <rect x="106" y="134" width="108" height="20" rx="10" fill={c.accent} />
    </svg>
  ),
  "social-proof": (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="40" y="36" width="56" height="16" rx="3" fill={c.dark} />
      <rect x="40" y="58" width="72" height="6" rx="2" fill={c.line} />
      <rect x="132" y="36" width="56" height="16" rx="3" fill={c.dark} />
      <rect x="132" y="58" width="72" height="6" rx="2" fill={c.line} />
      <rect x="224" y="36" width="56" height="16" rx="3" fill={c.dark} />
      <rect x="224" y="58" width="72" height="6" rx="2" fill={c.line} />
      <rect x="72" y="108" width="176" height="8" rx="2" fill={c.line} />
      {[88, 132, 176, 220].map(x => (
        <circle key={x} cx={x} cy="142" r="10" fill={c.block} stroke={c.line} strokeWidth="1" />
      ))}
    </svg>
  ),
  navigation: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="24" y="24" width="272" height="36" rx="6" fill={c.block} />
      <rect x="36" y="34" width="50" height="8" rx="2" fill={c.dark} />
      <rect x="196" y="36" width="28" height="5" rx="2" fill={c.line} />
      <rect x="232" y="36" width="28" height="5" rx="2" fill={c.line} />
      <rect x="268" y="34" width="18" height="8" rx="2" fill={c.accent} />
      <rect x="24" y="100" width="272" height="60" rx="6" fill={c.dark} />
      <rect x="120" y="112" width="80" height="7" rx="2" fill={c.block} />
      <rect x="100" y="126" width="120" height="5" rx="2" fill={c.line} />
      <rect x="128" y="142" width="24" height="4" rx="2" fill={c.line} />
      <rect x="158" y="142" width="24" height="4" rx="2" fill={c.line} />
    </svg>
  ),
};
