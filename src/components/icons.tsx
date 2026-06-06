interface P extends React.SVGProps<SVGSVGElement> {}
const base = (props: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Play = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const Star = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const Mic = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
  </svg>
);
export const Home = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
  </svg>
);
export const Film = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
  </svg>
);
export const Tv = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="7" width="20" height="13" rx="2" />
    <path d="m7 2 5 5 5-5" />
  </svg>
);
export const Fire = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2c1 3-1 4-2 6-1 2 0 4 2 4 1.5 0 2-1 2-2 2 1 4 3 4 6a6 6 0 1 1-12 0c0-4 3-6 3-9 0-2-1-3 0-5z" />
  </svg>
);
export const Bookmark = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const ChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
export const Volume = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M19 5a10 10 0 0 1 0 14M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);
export const Mute = (p: P) => (
  <svg {...base(p)}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="m23 9-6 6M17 9l6 6" />
  </svg>
);
export const Info = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
export const Sparkle = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" />
    <path d="M19 14l.9 2.6L22 17.5l-2.1.9L19 21l-.9-2.6L16 17.5l2.1-.9z" />
  </svg>
);
export const Menu = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
export const Clock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
export const Server = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="6" rx="2" />
    <rect x="3" y="14" width="18" height="6" rx="2" />
    <path d="M7 7h.01M7 17h.01" />
  </svg>
);
export const Globe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
  </svg>
);
export const Compass = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="m16 8-2 6-6 2 2-6 6-2z" />
  </svg>
);
export const ExternalLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
