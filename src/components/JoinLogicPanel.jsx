import { t } from "../lib/i18n";

export default function JoinLogicPanel({ locale }) {
  return (
    <div className="join-logic">
      <svg
        aria-label={t(locale, "join.aria")}
        className="join-logic__diagram"
        role="img"
        viewBox="0 0 320 230"
      >
        <rect fill="#f4f1eb" height="230" width="320" x="0" y="0" />

        <polygon
          fill="#eadfcf"
          points="46,76 112,52 214,52 278,76 250,112 70,112"
          stroke="#1a1a1a"
          strokeOpacity="0.15"
        />
        <polygon
          fill="#e6d8c7"
          points="116,112 204,112 224,148 160,190 96,148"
          stroke="#1a1a1a"
          strokeOpacity="0.14"
        />
        <polygon
          fill="#d8c8b5"
          points="130,148 190,148 204,216 116,216"
          stroke="#1a1a1a"
          strokeOpacity="0.12"
        />

        <path
          d="M46 76 L112 52 L214 52 L278 76 M70 112 L250 112 M116 112 L160 190 L204 112 M96 148 L160 112 L224 148 M130 148 L160 216 L190 148"
          fill="none"
          stroke="#d9381e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />

        <path
          d="M79 98 L132 62 M111 112 L164 52 M160 112 L214 52 M206 112 L256 68 M114 130 L174 176 M144 148 L110 212 M175 148 L209 212"
          fill="none"
          stroke="#7d6753"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />

        <circle cx="160" cy="112" fill="#d9381e" r="4" />
        <circle cx="160" cy="148" fill="#d9381e" r="4" />

        <text className="join-logic__label" x="20" y="28">
          {t(locale, "join.surface")}
        </text>
        <text className="join-logic__label" x="196" y="136">
          {t(locale, "join.collar")}
        </text>
        <text className="join-logic__label" x="190" y="210">
          {t(locale, "join.core")}
        </text>
      </svg>

      <div className="join-logic__notes">
        <p className="panel__note">{t(locale, "join.surfaceNote")}</p>
        <p className="panel__note">{t(locale, "join.collarNote")}</p>
        <p className="panel__note">{t(locale, "join.coreNote")}</p>
      </div>
    </div>
  );
}
