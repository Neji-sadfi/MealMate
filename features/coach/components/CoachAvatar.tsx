export type CoachState = "idle" | "thinking" | "speaking";

/**
 * Mia, the MealMate coach. Pure SVG, so it stays crisp and weighs nothing.
 * idle: blinks, thinking: eyes look up and dots bounce, speaking: mouth moves.
 * Animations are disabled for users who prefer reduced motion.
 */
export function CoachAvatar({ state = "idle", size = 96 }: { state?: CoachState; size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Mia, your coach"
      data-state={state}
      className="coach-avatar shrink-0"
    >
      <style>{`
        .coach-avatar .eye { transform-box: fill-box; transform-origin: center; }
        .coach-avatar .mouth { transform-box: fill-box; transform-origin: center; }
        .coach-avatar .dots, .coach-avatar .look-up { display: none; }
        .coach-avatar[data-state="thinking"] .dots { display: block; }
        .coach-avatar[data-state="thinking"] .pupil { transform: translateY(-2.5px); }
        @media (prefers-reduced-motion: no-preference) {
          .coach-avatar .eye { animation: coach-blink 4s infinite; }
          .coach-avatar[data-state="speaking"] .mouth { animation: coach-talk 0.32s ease-in-out infinite; }
          .coach-avatar[data-state="thinking"] .dot { animation: coach-dot 0.9s ease-in-out infinite; }
          .coach-avatar .dot:nth-child(2) { animation-delay: 0.15s; }
          .coach-avatar .dot:nth-child(3) { animation-delay: 0.3s; }
          .coach-avatar { animation: coach-float 5s ease-in-out infinite; }
        }
        @keyframes coach-blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
        @keyframes coach-talk { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1.25); } }
        @keyframes coach-dot { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
        @keyframes coach-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
      `}</style>

      {/* Leaf on top: ties the character to the MealMate brand */}
      <path d="M60 14c10-10 26-8 30 0-8 8-22 10-30 0z" fill="#4c9a6e" />
      <path
        d="M60 16c0-6 0-9 1-12"
        stroke="#285e43"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Head */}
      <circle cx="60" cy="66" r="44" fill="#285e43" />
      <circle cx="60" cy="68" r="38" fill="#e8efdf" />

      {/* Cheeks */}
      <circle cx="32" cy="78" r="6" fill="#f2b8a2" opacity="0.7" />
      <circle cx="88" cy="78" r="6" fill="#f2b8a2" opacity="0.7" />

      {/* Eyes */}
      <g className="eye">
        <ellipse cx="44" cy="62" rx="6" ry="7.5" fill="#1c2b23" />
        <circle className="pupil" cx="46" cy="59.5" r="2" fill="#fff" />
      </g>
      <g className="eye">
        <ellipse cx="76" cy="62" rx="6" ry="7.5" fill="#1c2b23" />
        <circle className="pupil" cx="78" cy="59.5" r="2" fill="#fff" />
      </g>

      {/* Mouth */}
      <g className="mouth">
        {state === "speaking" ? (
          <ellipse cx="60" cy="86" rx="9" ry="6" fill="#1c2b23" />
        ) : (
          <path
            d="M48 84c4 8 20 8 24 0"
            stroke="#1c2b23"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </g>

      {/* Thinking dots */}
      <g className="dots" fill="#285e43">
        <circle className="dot" cx="97" cy="28" r="4" />
        <circle className="dot" cx="106" cy="19" r="3.2" />
        <circle className="dot" cx="113" cy="10" r="2.4" />
      </g>
    </svg>
  );
}
