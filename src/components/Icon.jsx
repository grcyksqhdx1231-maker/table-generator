const ICONS = {
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V20h11v-9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  workspace: (
    <>
      <path d="M4 5h16v11H4z" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="M7 9h10" />
      <path d="M8 13h3" />
    </>
  ),
  parameters: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="17" r="2" />
    </>
  ),
  ai: (
    <>
      <path d="M8 4h8l3 3v8l-3 3H8l-3-3V7z" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9.5 14c1.6 1.2 3.4 1.2 5 0" />
      <path d="M12 2v2" />
    </>
  ),
  generate: (
    <>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m18.4 5.6-2.8 2.8" />
      <path d="m8.4 15.6-2.8 2.8" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h12l2 2v14H5z" />
      <path d="M8 4v6h8V4" />
      <path d="M8 20v-6h8v6" />
    </>
  ),
  drafts: (
    <>
      <path d="M7 4h10v16H7z" />
      <path d="M4 7h3" />
      <path d="M4 12h3" />
      <path d="M4 17h3" />
      <path d="M10 8h4" />
      <path d="M10 12h4" />
    </>
  ),
  gallery: (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="M8 15l3-3 2 2 2.5-3 2.5 4" />
      <circle cx="8" cy="9" r="1.2" />
    </>
  ),
  favorite: (
    <>
      <path d="M12 20s-7-4.2-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.8-7 10-7 10z" />
    </>
  ),
  cart: (
    <>
      <path d="M4 5h2l2 10h9.5l2-7H7" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  settings: (
    <>
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M4.9 4.9 7 7" />
      <path d="m17 17 2.1 2.1" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.9 19.1 7 17" />
      <path d="m17 7 2.1-2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 5 5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M5 18v2h14v-2" />
    </>
  ),
  download: (
    <>
      <path d="M12 5v11" />
      <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
      <path d="M5 18v2h14v-2" />
    </>
  ),
  gh: (
    <>
      <circle cx="6.5" cy="7" r="2.2" />
      <circle cx="17.5" cy="7" r="2.2" />
      <circle cx="12" cy="17" r="2.2" />
      <path d="M8.5 8.2 11 15" />
      <path d="M15.5 8.2 13 15" />
      <path d="M8.7 7h6.6" />
    </>
  ),
  lock: (
    <>
      <path d="M7 10V8a5 5 0 0 1 10 0v2" />
      <path d="M6 10h12v10H6z" />
      <path d="M12 14v2" />
    </>
  ),
  unlock: (
    <>
      <path d="M8 10V8a5 5 0 0 1 8.5-3.5" />
      <path d="M6 10h12v10H6z" />
      <path d="M12 14v2" />
    </>
  ),
  edit: (
    <>
      <path d="M5 19h4l10-10-4-4L5 15z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  delete: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: (
    <>
      <path d="M5 12h14" />
    </>
  ),
  back: (
    <>
      <path d="M11 6 5 12l6 6" />
      <path d="M5 12h14" />
    </>
  ),
  next: (
    <>
      <path d="m13 6 6 6-6 6" />
      <path d="M5 12h14" />
    </>
  ),
  language: (
    <>
      <path d="M4 5h8" />
      <path d="M8 5v2" />
      <path d="M6 17c2.8-2.5 4.3-5.7 4.8-10" />
      <path d="M5 10c1.5 2.6 3.8 4.6 7 6" />
      <path d="M14 20l3.5-8 3.5 8" />
      <path d="M15.2 17h4.6" />
    </>
  ),
  day: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="m4.9 19.1 2.1-2.1" />
      <path d="m17 7 2.1-2.1" />
    </>
  ),
  night: (
    <>
      <path d="M18.5 15.5A7 7 0 0 1 8.5 5.5 7.5 7.5 0 1 0 18.5 15.5z" />
    </>
  ),
  minimal: (
    <>
      <path d="M5 7h14" />
      <path d="M7 12h10" />
      <path d="M9 17h6" />
    </>
  ),
  material: (
    <>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  size: (
    <>
      <path d="M5 19V5h14" />
      <path d="m5 5 4 4" />
      <path d="m19 5-4 4" />
      <path d="M5 19l4-4" />
      <path d="M19 5v14H5" />
    </>
  ),
  tabletop: (
    <>
      <path d="M4 9h16" />
      <path d="M6 9l3 9" />
      <path d="M18 9l-3 9" />
      <path d="M8 13h8" />
    </>
  ),
  legs: (
    <>
      <path d="M5 6h14" />
      <path d="M7 6v14" />
      <path d="M17 6v14" />
      <path d="M9 12h6" />
    </>
  ),
  lighting: (
    <>
      <path d="M12 3 7 13h5l-1 8 6-11h-5z" />
    </>
  ),
  quote: (
    <>
      <path d="M7 3h10v18H7z" />
      <path d="M10 8h4" />
      <path d="M10 12h4" />
      <path d="M10 16h2" />
      <path d="M15 15.5c1.5.2 2.2.9 2.2 2s-.9 2-2.4 2" />
    </>
  )
};

export default function Icon({ name, className = "", title = "" }) {
  const icon = ICONS[name] || ICONS.parameters;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      className={`ui-icon ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      {icon}
    </svg>
  );
}
