// Minimal inline icon set - stroke-based, 16x16, matches the app's line-icon language.
// Avoids pulling in an icon package for a dozen glyphs.

const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconPlus({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function IconSearch({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.8 10.8L14 14" />
    </svg>
  );
}

export function IconList({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M5.5 4h7M5.5 8h7M5.5 12h7" />
      <path d="M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeWidth="2" />
    </svg>
  );
}

export function IconCircleDot({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheckCircle({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.7 8.2l1.6 1.6 3-3.2" />
    </svg>
  );
}

export function IconClock({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.3l2.2 1.3" />
    </svg>
  );
}

export function IconChevronDown({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function IconChevronRight({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function IconX({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconTrash({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8.2a1 1 0 0 0 1 .93h3.8a1 1 0 0 0 1-.93l.6-8.2" />
    </svg>
  );
}

export function IconLogOut({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M6.5 14H3.8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2.7" />
      <path d="M10.5 11l3-3-3-3M13.3 8H6" />
    </svg>
  );
}

export function IconCommand({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M5.5 4.5A1.5 1.5 0 1 0 4 6h8a1.5 1.5 0 1 0-1.5-1.5M5.5 11.5A1.5 1.5 0 1 1 4 10h8a1.5 1.5 0 1 1-1.5 1.5" />
      <rect x="4" y="6" width="8" height="4" rx="0.5" />
    </svg>
  );
}

export function IconRepeat({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M3 7.5V6a3 3 0 0 1 3-3h7M13 4v3h-3" />
      <path d="M13 8.5V10a3 3 0 0 1-3 3H3M3 12V9h3" />
    </svg>
  );
}

export function IconSend({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M8 13V4M4.5 7.5L8 4l3.5 3.5" />
    </svg>
  );
}

export function IconResize({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M6 4L2.5 8l3.5 4M10 4l3.5 4-3.5 4" />
    </svg>
  );
}

export function IconCadence({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 10.5V5.5M8 12V4M12 9V7" />
    </svg>
  );
}

export function IconSparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" stroke="none">
      <path d="M8 2l1.1 3.4L12.5 6.5 9.1 7.6 8 11l-1.1-3.4L3.5 6.5l3.4-1.1z" />
    </svg>
  );
}
