import React from "react";
type MechanicsDiagramProps = {
  activeIndex?: number | null;
  isRunning?: boolean;
};

export default function MechanicsDiagram({
  activeIndex = null,
  isRunning = false,
}: MechanicsDiagramProps) {
  const nodeClassName = (index: number, name: string) =>
    `interactive-node ${name} ${activeIndex === index ? "active" : ""}`;

  return (
    <div className="w-full overflow-hidden hide-scrollbar transition-colors">
      <style>{`
        .mechanics-diagram {
          --md-bg: transparent;
          --md-ink: rgba(63, 63, 70, 0.58);
          --md-ink-strong: rgba(39, 39, 42, 0.74);
          --md-ink-muted: rgba(63, 63, 70, 0.38);
          --md-track-idle: rgba(82, 82, 91, 0.16);
          --md-surface: #fafafa;
          --md-stroke-w: 1.25px;
          --md-shadow-idle: drop-shadow(0 7px 16px rgba(24, 24, 27, 0.045));
          --md-shadow-active-bg: drop-shadow(0 10px 22px rgba(24, 24, 27, 0.07)) drop-shadow(0 0 8px rgba(239, 68, 68, 0.08));
          --md-shadow-active-el: drop-shadow(0 6px 14px rgba(24, 24, 27, 0.09));
          --md-shadow-lock: drop-shadow(0 7px 14px rgba(24, 24, 27, 0.12));
          --md-shadow-top: drop-shadow(0 -5px 10px rgba(24, 24, 27, 0.08));
          --md-accent: #ef4444; /* Add accent var */
          --md-grid-gap: 4px;

          /* Premium Easing Functions */
          --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
          --ease-in: cubic-bezier(0.55, 0, 1, 0.45);
          --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
          --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .dark .mechanics-diagram {
          --md-bg: transparent;
          --md-ink: rgba(212, 212, 216, 0.6);
          --md-ink-strong: rgba(228, 228, 231, 0.76);
          --md-ink-muted: rgba(180, 180, 188, 0.42);
          --md-track-idle: rgba(212, 212, 216, 0.13);
          --md-surface: #0f0f10;
          --md-shadow-idle: drop-shadow(0 8px 18px rgba(38,38,38, 0.2));
          --md-shadow-active-bg: drop-shadow(0 14px 28px rgba(38,38,38, 0.36)) drop-shadow(0 0 10px rgba(239, 68, 68, 0.14));
          --md-shadow-active-el: drop-shadow(0 7px 14px rgba(38,38,38, 0.24));
          --md-shadow-lock: drop-shadow(0 8px 16px rgba(38,38,38, 0.28));
          --md-shadow-top: drop-shadow(0 -5px 10px rgba(38,38,38, 0.22));
          --md-accent: #ef4444;
          --md-grid-gap: 3px;
        }

        .mechanics-diagram svg {
          min-width: 800px;
          width: 100%;
          display: block;
          margin: 0 auto;
        }

        .mechanics-diagram .node-group {
          transition: transform 0.5s var(--spring), opacity 0.6s var(--ease-out), filter 0.6s var(--ease-out);
          transform-origin: center;
          transform-box: fill-box;
        }

        .mechanics-diagram .interactive-node.active .node-group {
          transform: scale(1.04);
        }

        .mechanics-diagram.has-active .interactive-node:not(.active) .node-group,
        .mechanics-diagram.has-active .interactive-node:not(.active) .text-label {
          opacity: 1;
          filter: grayscale(100%);
        }

        /* Base Elements */
        .mechanics-diagram .stroke-main {
          stroke: var(--md-ink-muted);
          stroke-width: var(--md-stroke-w);
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: all 0.4s var(--ease-out);
        }
        
        .mechanics-diagram .fill-main {
          fill: var(--md-surface);
          stroke: var(--md-ink-muted);
          stroke-width: var(--md-stroke-w);
          transition: all 0.4s var(--ease-out);
        }

        .mechanics-diagram .icon-bg {
          fill: var(--md-surface);
          stroke: var(--md-ink-muted);
          stroke-width: var(--md-stroke-w);
          transition: all 0.4s var(--ease-out);
          filter: var(--md-shadow-idle);
        }

        .mechanics-diagram .text-label {
          fill: var(--md-ink-muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-anchor: middle;
          pointer-events: none;
          transition: fill 0.3s var(--ease-out), transform 0.4s var(--spring), opacity 0.6s var(--ease-out), filter 0.6s var(--ease-out);
        }

        /* Clean Beam Pipeline */
        .mechanics-diagram .track-center {
          stroke: var(--md-track-idle);
          stroke-width: 1.5px;
          fill: none;
          transition: stroke 0.6s var(--ease-out);
        }
        .mechanics-diagram .track-outer {
          stroke: var(--md-ink);
          stroke-width: 1px;
          fill: none;
          transition: stroke 0.6s var(--ease-out), opacity 0.6s var(--ease-out);
          opacity: 0.08;
        }
        .mechanics-diagram .track-beam {
          stroke: var(--md-accent);
          stroke-width: 2px;
          stroke-linecap: round;
          stroke-dasharray: 40 150;
          stroke-dashoffset: 40;
          fill: none;
          opacity: 0;
          filter: drop-shadow(0 0 4px var(--md-accent));
        }
        
        .mechanics-diagram.is-running .interactive-node.active .track-beam {
          animation: md-shoot-beam 2.8s linear forwards;
        }

        /* Active Interactions */
        .mechanics-diagram .interactive-node.active .track-center { stroke: var(--md-ink-muted); }
        .mechanics-diagram .interactive-node.active .track-outer { opacity: 0.2; stroke: var(--md-ink); }

        .mechanics-diagram .icon-path-trace {
          stroke: var(--md-accent);
          stroke-width: 1.5px;
          fill: none;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          opacity: 0;
          transition: opacity 0.4s var(--ease-out);
        }

        .mechanics-diagram .interactive-node.active .icon-path-trace {
          animation: md-trace-shape 1.8s linear forwards;
        }
        
        .mechanics-diagram .beam-gather,
        .mechanics-diagram .beam-gather-cap {
          fill: none;
          stroke: var(--md-accent);
          opacity: 0;
        }
        .mechanics-diagram .beam-gather {
          stroke-linecap: butt;
        }
        .mechanics-diagram .beam-gather-cap {
          stroke-linecap: round;
        }
        .mechanics-diagram.is-running .interactive-node.active .beam-gather,
        .mechanics-diagram.is-running .interactive-node.active .beam-gather-cap {
          animation: md-gather-beam 2.8s linear forwards;
        }

        .mechanics-diagram .interactive-node.active .icon-bg {
          filter: var(--md-shadow-active-bg);
        }
        .mechanics-diagram .interactive-node.active .text-label { 
          fill: var(--md-accent); 
        }
        .mechanics-diagram .interactive-node.active .stroke-main { stroke: var(--md-ink-strong); }
        .mechanics-diagram .interactive-node.active .fill-main { stroke: var(--md-ink-strong); }
        
        /* Node 1 */
        .mechanics-diagram .git-path { transition: stroke 0.4s var(--ease-out); }
        .mechanics-diagram .git-commit {
          transition: all 0.4s var(--spring);
          transform-origin: center;
          transform-box: fill-box;
        }
        .mechanics-diagram .interactive-node.n1.active .git-commit {
          stroke: var(--md-ink);
          animation: md-commit-playback 1.8s ease-in-out 1;
          animation-delay: calc(var(--order) * 0.12s);
        }
        .mechanics-diagram .interactive-node.n1.active .git-commit.final-commit {
          animation: md-final-commit-glow 1.1s ease-in-out 1 forwards;
          animation-delay: calc(var(--order) * 0.12s);
        }

        /* Node 2 */
        .mechanics-diagram .oauth-lock { 
          transform-origin: 0px 4px; 
          transform: translateY(3px) scale(0.85); 
          transition: transform 0.6s var(--spring) 0s, filter 0.6s var(--spring) 0s; 
        }
        .mechanics-diagram .lock-shackle { transition: transform 0.3s var(--ease-out) 0.4s, stroke 0.3s var(--ease-out) 0.4s; }
        .mechanics-diagram .interactive-node.n2.active .lock-shackle { transform: translateY(-4px); stroke: var(--md-ink); transition: transform 0.3s var(--ease-out) 0s, stroke 0.3s var(--ease-out) 0s; }
        .mechanics-diagram .interactive-node.n2.active .oauth-lock { transform: translate(14px, -16px) scale(0.5); filter: var(--md-shadow-lock); transition: transform 0.7s var(--spring) 0.2s, filter 0.7s var(--spring) 0.2s; }
        .mechanics-diagram .interactive-node.n2.active .app-frame { filter: var(--md-shadow-active-el); stroke-width: 1.35px; }
        .mechanics-diagram .interactive-node.n2.active .r1 { transition: all 0.3s var(--ease-out) 0.6s; }
        .mechanics-diagram .interactive-node.n2.active .r2 { transition: all 0.3s var(--ease-out) 0.8s; }
        .mechanics-diagram .interactive-node.n2.active .r3 { transition: all 0.3s var(--ease-out) 1.0s; }
        .mechanics-diagram .repo-dot { opacity: 0; transform: scale(0.5); transition: all 0.3s var(--spring); transform-box: fill-box; transform-origin: center; }
        .mechanics-diagram .repo-line { stroke-dasharray: 12; stroke-dashoffset: 12; opacity: 0; transition: all 0.3s var(--ease-out); }
        .mechanics-diagram .interactive-node.n2.active .repo-dot { opacity: 1; transform: scale(1.1); fill: var(--md-accent); }
        .mechanics-diagram .interactive-node.n2.active .repo-line { stroke-dashoffset: 0; opacity: 0.9; stroke: var(--md-ink); }

        /* Node 3 */
        .mechanics-diagram .token-check { opacity: 0; stroke-dasharray: 14; stroke-dashoffset: 14; transition: all 0.4s var(--spring) 0s; transform-origin: center; transform-box: fill-box; }
        .mechanics-diagram .settle-ring { stroke-dasharray: 105; stroke-dashoffset: 105; transform: rotate(-90deg); transform-origin: center; transform-box: fill-box; transition: stroke-dashoffset 1s var(--ease-in-out), transform 1s var(--ease-in-out), stroke 0.6s var(--ease-out); }
        .mechanics-diagram .interactive-node.n3.active .token-base { filter: var(--md-shadow-active-el); }
        .mechanics-diagram .interactive-node.n3.active .sol-mark { opacity: 0; transform: scale(0) rotate(180deg); }
        .mechanics-diagram .interactive-node.n3.active .token-check { opacity: 1; stroke-dashoffset: 0; stroke: var(--md-accent); stroke-width: 2px; transition: all 0.5s var(--spring) 0.8s; }
        .mechanics-diagram .interactive-node.n3.active .settle-ring { stroke-dashoffset: 0; stroke: var(--md-accent); transform: rotate(90deg); }
        .mechanics-diagram .sol-mark { fill: var(--md-ink-muted); transition: all 0.5s var(--spring); transform-origin: center; transform-box: fill-box; }

        /* Node 4 */
        .mechanics-diagram .archive-box-top {
          d: path("M 0 -9 L -12 -3 L 0 3 L 12 -3 Z");
          transition: d 0.6s var(--spring), stroke 0.6s var(--ease-out), fill 0.6s var(--ease-out), filter 0.6s var(--ease-out);
        }
        .mechanics-diagram .archive-box-side-l, .mechanics-diagram .archive-box-side-r, .mechanics-diagram .archive-inner-wall {
          transition: all 0.6s var(--ease-out);
        }
        .mechanics-diagram .archive-data-core {
          opacity: 0;
          transform: translateY(8px) scale(0.9);
          transition: all 0.6s var(--spring), filter 0.6s var(--ease-out);
        }

        .mechanics-diagram .interactive-node.n4.active .archive-box-top {
          d: path("M 0 -13 L 0 -26 L 12 -20 L 12 -7 Z"); /* Adjusted paths for pop open */
          stroke: var(--md-ink);
          fill: var(--md-surface);
          filter: var(--md-shadow-top);
        }

        .mechanics-diagram .interactive-node.n4.active .archive-box-side-l,
        .mechanics-diagram .interactive-node.n4.active .archive-box-side-r,
        .mechanics-diagram .interactive-node.n4.active .archive-inner-wall {
          stroke: var(--md-ink);
        }
        .mechanics-diagram .interactive-node.n4.active .archive-data-core {
          opacity: 1;
          transform: translateY(-8px) scale(1.1);
          stroke: var(--md-accent);
          filter: var(--md-shadow-active-el);
          animation: md-levitate-core 2.5s ease-in-out infinite 0.6s;
        }

        @keyframes md-gather-beam {
          0%, 7.7% {
            opacity: 0;
            transform: scaleX(0);
            stroke-width: 0px;
            stroke: var(--md-accent);
            filter: drop-shadow(0 0 0px var(--md-accent));
          }
          19.3% {
            opacity: 0.8;
            transform: scaleX(0.2);
            stroke-width: 1.5px;
            stroke: var(--md-accent);
            filter: drop-shadow(0 0 2px var(--md-accent));
          }
          38.6% {
            opacity: 1;
            transform: scaleX(0.5);
            stroke-width: 2.5px;
            stroke: var(--md-accent);
            filter: drop-shadow(0 0 4px var(--md-accent));
          }
          54.6% {
            opacity: 1;
            transform: scaleX(1);
            stroke-width: 4px;
            stroke: var(--md-accent);
            filter: drop-shadow(0 0 8px var(--md-accent));
          }
          56.6% {
            opacity: 1;
            transform: scaleX(1.5);
            stroke-width: 4.6px;
            stroke: color-mix(in srgb, var(--md-accent) 62%, #ffffff);
            filter: drop-shadow(0 0 9px var(--md-accent));
          }
          64% {
            opacity: 1;
            transform: translateX(0.9px) scaleX(1.57);
            stroke-width: 4.9px;
            stroke: color-mix(in srgb, var(--md-accent) 58%, #ffffff);
            filter: drop-shadow(0 0 10px var(--md-accent));
          }
          72% {
            opacity: 1;
            transform: translateX(-0.8px) scaleX(1.47);
            stroke-width: 4.2px;
            stroke: color-mix(in srgb, var(--md-accent) 70%, #ffffff);
            filter: drop-shadow(0 0 7px var(--md-accent));
          }
          80% {
            opacity: 1;
            transform: translateX(0.65px) scaleX(1.54);
            stroke-width: 4.8px;
            stroke: color-mix(in srgb, var(--md-accent) 60%, #ffffff);
            filter: drop-shadow(0 0 10px var(--md-accent));
          }
          88% {
            opacity: 1;
            transform: translateX(-0.55px) scaleX(1.49);
            stroke-width: 4.4px;
            stroke: color-mix(in srgb, var(--md-accent) 66%, #ffffff);
            filter: drop-shadow(0 0 8px var(--md-accent));
          }
          92.2% {
            opacity: 1;
            transform: translateX(0) scaleX(1.5);
            stroke-width: 4.6px;
            stroke: color-mix(in srgb, var(--md-accent) 62%, #ffffff);
            filter: drop-shadow(0 0 9px var(--md-accent));
          }
          96% {
            opacity: 0;
            transform: scaleX(4);
            stroke-width: 1px;
            stroke: var(--md-accent);
            filter: drop-shadow(0 0 0px var(--md-accent));
          }
          97%, 100% {
            opacity: 0;
          }
        }
        @keyframes md-shoot-beam {
          0%, 92.2% {
            stroke-dashoffset: 40;
            opacity: 0;
          }
          92.3% {
            opacity: 1;
            stroke-dashoffset: 40;
          }
          99.9% {
            stroke-dashoffset: -124;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -124;
            opacity: 0;
          }
        }
        @keyframes md-trace-shape {
          0% {
            stroke-dashoffset: 1;
            opacity: 1;
          }
          12%, 100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes md-commit-playback {
          0%, 100% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(38,38,38,0)); }
          15% { transform: scale(1.4); fill: var(--md-ink); filter: drop-shadow(0 3px 6px rgba(239,68,68,0.16)); }
          30% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(38,38,38,0)); }
        }
        @keyframes md-final-commit-glow {
          0% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(239,68,68,0)); }
          18% { transform: scale(1.42); fill: var(--md-ink); filter: drop-shadow(0 3px 6px rgba(239,68,68,0.16)); }
          38% { transform: scale(1.08); fill: var(--md-accent); filter: drop-shadow(0 0 3px rgba(239,68,68,0.22)); }
          100% { transform: scale(1.08); fill: var(--md-accent); filter: drop-shadow(0 0 3px rgba(239,68,68,0.22)); }
        }
        .dark @keyframes md-commit-playback {
          0%, 100% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
          15% { transform: scale(1.4); fill: var(--md-ink); filter: drop-shadow(0 3px 6px rgba(239,68,68,0.18)); }
          30% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
        }
        @keyframes md-levitate-core {
          0%, 100% { transform: translateY(-8px) scale(1.1); }
          50% { transform: translateY(-13px) scale(1.1); }
        }
      `}</style>

      <div
        className={`mechanics-diagram relative w-full py-8 md:py-10 px-4 md:px-12 flex justify-center bg-transparent transition-colors overflow-hidden ${
          isRunning ? "is-running" : ""
        } ${activeIndex !== null ? `has-active active-${activeIndex}` : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="20 65 600 130"
          className="w-full max-w-5xl h-auto relative z-10"
        >
          <defs>
            <pattern
              id="md-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="2"
                cy="2"
                r="0.75"
                className="fill-neutral-950/10 dark:fill-white/10"
              />
            </pattern>
          </defs>
          <g className={nodeClassName(0, "n1")} transform="translate(80, 125)">
            <g className="tracks pointer-events-none">
              <path className="track-outer top" d="M 26 -6 L 130 -6" />
              <path className="track-center" d="M 26 0 L 130 0" />
              <path className="track-beam" d="M 26 0 L 130 0" />
              <path className="track-outer bottom" d="M 26 6 L 130 6" />
            </g>
            <g className="node-group ">
              {/* Hit Box */}
              <circle
                className="fill-transparent opacity-0"
                cx="0"
                cy="0"
                r="50"
              />
              <rect
                className="icon-bg"
                x="-26"
                y="-26"
                width="52"
                height="52"
                rx="3"
              />
              <g className="icon-glow-group">
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -26 0 L -26 -23 A 3 3 0 0 1 -23 -26 L 23 -26 A 3 3 0 0 1 26 -23 L 26 0"
                />
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -26 0 L -26 23 A 3 3 0 0 0 -23 26 L 23 26 A 3 3 0 0 0 26 23 L 26 0"
                />
                <path
                  className="beam-gather"
                  d="M 26 0 L 32 0"
                  style={{ transformOrigin: "26px 0px" }}
                />
                <path
                  className="beam-gather-cap"
                  d="M 32 0 L 32.01 0"
                  style={{ transformOrigin: "26px 0px" }}
                />
              </g>
              <g transform="translate(0, -1)">
                <path
                  className="stroke-main git-path trunk"
                  d="M 0 16 L 0 -16"
                />
                <path
                  className="stroke-main git-path branch-r"
                  d="M 0 8 C 14 8, 14 -6, 0 -6"
                />
                <path
                  className="stroke-main git-path branch-l"
                  d="M 0 0 C -12 0, -12 -8, -12 -12"
                />
                <circle
                  className="fill-main git-commit"
                  cx="0"
                  cy="16"
                  r="2.5"
                  style={{ "--order": 0 } as React.CSSProperties}
                />
                <circle
                  className="fill-main git-commit"
                  cx="0"
                  cy="8"
                  r="2.5"
                  style={{ "--order": 1 } as React.CSSProperties}
                />
                <circle
                  className="fill-main git-commit"
                  cx="0"
                  cy="0"
                  r="2.5"
                  style={{ "--order": 2 } as React.CSSProperties}
                />
                <circle
                  className="fill-main git-commit"
                  cx="10.5"
                  cy="1"
                  r="2.5"
                  style={{ "--order": 2 } as React.CSSProperties}
                />
                <circle
                  className="fill-main git-commit"
                  cx="0"
                  cy="-6"
                  r="2.5"
                  style={{ "--order": 3 } as React.CSSProperties}
                />
                <circle
                  className="fill-main git-commit"
                  cx="-12"
                  cy="-12"
                  r="2.5"
                  style={{ "--order": 3 } as React.CSSProperties}
                />
                <circle
                  className="fill-main git-commit final-commit"
                  cx="0"
                  cy="-16"
                  r="2.5"
                  style={{ "--order": 4 } as React.CSSProperties}
                />
              </g>
            </g>
            <text className="text-label font-space" x="0" y="65">
              REPOSITORY
            </text>
          </g>

          <g className={nodeClassName(1, "n2")} transform="translate(240, 125)">
            <g className="tracks pointer-events-none">
              <path className="track-outer top" d="M 30 -6 L 130 -6" />
              <path className="track-center" d="M 30 0 L 130 0" />
              <path className="track-beam" d="M 30 0 L 130 0" />
              <path className="track-outer bottom" d="M 30 6 L 130 6" />
            </g>
            <g className="node-group ">
              {/* Hit Box */}
              <circle
                className="fill-transparent opacity-0"
                cx="0"
                cy="0"
                r="50"
              />
              <path
                className="icon-bg"
                strokeLinejoin="round"
                d="M -2.84 -29.05 Q 0 -30 2.84 -29.05 L 27.16 -20.95 Q 30 -20 30 -17 L 30 17 Q 30 20 27.16 20.95 L 2.84 29.05 Q 0 30 -2.84 29.05 L -27.16 20.95 Q -30 20 -30 17 L -30 -17 Q -30 -20 -27.16 -20.95 Z"
              />
              <g className="icon-glow-group">
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -30 0 L -30 -17 Q -30 -20 -27.16 -20.95 L -2.84 -29.05 Q 0 -30 2.84 -29.05 L 27.16 -20.95 Q 30 -20 30 -17 L 30 0"
                />
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -30 0 L -30 17 Q -30 20 -27.16 20.95 L -2.84 29.05 Q 0 30 2.84 29.05 L 27.16 20.95 Q 30 20 30 17 L 30 0"
                />
                <path
                  className="beam-gather"
                  d="M 30 0 L 36 0"
                  style={{ transformOrigin: "30px 0px" }}
                />
                <path
                  className="beam-gather-cap"
                  d="M 36 0 L 36.01 0"
                  style={{ transformOrigin: "30px 0px" }}
                />
              </g>
              <g transform="translate(0, 0)">
                <rect
                  className="stroke-main fill-main app-frame"
                  x="-14"
                  y="-17"
                  width="28"
                  height="34"
                  rx="0"
                />
                <line
                  className="stroke-main app-header"
                  x1="-14"
                  y1="-10"
                  x2="14"
                  y2="-10"
                />
                <circle
                  className="fill-main app-control"
                  cx="-10"
                  cy="-13.5"
                  r="1"
                />
                <circle
                  className="fill-main app-control"
                  cx="-6"
                  cy="-13.5"
                  r="1"
                />
                <g className="repo-lines">
                  <circle
                    className="fill-main repo-dot r1"
                    cx="-8"
                    cy="-4"
                    r="1.5"
                  />
                  <line
                    className="stroke-main repo-line r1"
                    x1="-4"
                    y1="-4"
                    x2="8"
                    y2="-4"
                  />
                  <circle
                    className="fill-main repo-dot r2"
                    cx="-8"
                    cy="3"
                    r="1.5"
                  />
                  <line
                    className="stroke-main repo-line r2"
                    x1="-4"
                    y1="3"
                    x2="5"
                    y2="3"
                  />
                  <circle
                    className="fill-main repo-dot r3"
                    cx="-8"
                    cy="10"
                    r="1.5"
                  />
                  <line
                    className="stroke-main repo-line r3"
                    x1="-4"
                    y1="10"
                    x2="8"
                    y2="10"
                  />
                </g>
                <g className="oauth-lock">
                  <rect
                    className="fill-main stroke-main lock-body"
                    x="-8"
                    y="-2"
                    width="16"
                    height="12"
                    rx="0"
                  />
                  <path
                    className="stroke-main lock-shackle"
                    d="M -4 -2 V -5 A 4 4 0 0 1 4 -5 V -2"
                  />
                  <circle
                    className="lock-keyhole"
                    cx="0"
                    cy="4"
                    r="1.5"
                    fill="var(--md-ink-muted)"
                  />
                </g>
              </g>
            </g>
            <text className="text-label font-space" x="0" y="65">
              INTEGRATION
            </text>
          </g>

          <g className={nodeClassName(2, "n3")} transform="translate(400, 125)">
            <g className="tracks pointer-events-none">
              <path className="track-outer top" d="M 30 -6 L 128 -6" />
              <path className="track-center" d="M 30 0 L 128 0" />
              <path className="track-beam" d="M 30 0 L 128 0" />
              <path className="track-outer bottom" d="M 30 6 L 128 6" />
            </g>
            <g className="node-group ">
              {/* Hit Box */}
              <circle
                className="fill-transparent opacity-0"
                cx="0"
                cy="0"
                r="50"
              />
              <path
                className="icon-bg"
                strokeLinejoin="round"
                d="M -14.12 -27.88 Q -12 -30 -9 -30 L 9 -30 Q 12 -30 14.12 -27.88 L 27.88 -14.12 Q 30 -12 30 -9 L 30 9 Q 30 12 27.88 14.12 L 14.12 27.88 Q 12 30 9 30 L -9 30 Q -12 30 -14.12 27.88 L -27.88 14.12 Q -30 12 -30 9 L -30 -9 Q -30 -12 -27.88 -14.12 Z"
              />
              <g className="icon-glow-group">
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -30 0 L -30 -9 Q -30 -12 -27.88 -14.12 L -14.12 -27.88 Q -12 -30 -9 -30 L 9 -30 Q 12 -30 14.12 -27.88 L 27.88 -14.12 Q 30 -12 30 -9 L 30 0"
                />
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -30 0 L -30 9 Q -30 12 -27.88 14.12 L -14.12 27.88 Q -12 30 -9 30 L 9 30 Q 12 30 14.12 27.88 L 27.88 14.12 Q 30 12 30 9 L 30 0"
                />
                <path
                  className="beam-gather"
                  d="M 30 0 L 36 0"
                  style={{ transformOrigin: "30px 0px" }}
                />
                <path
                  className="beam-gather-cap"
                  d="M 36 0 L 36.01 0"
                  style={{ transformOrigin: "30px 0px" }}
                />
              </g>
              <g transform="translate(0, 0)">
                <circle
                  className="stroke-main settle-ring"
                  cx="0"
                  cy="0"
                  r="16"
                  fill="none"
                />
                <circle
                  className="fill-main stroke-main token-base"
                  cx="0"
                  cy="0"
                  r="12"
                />
                <path
                  className="sol-mark"
                  d="M -2 -6 h 8 l -4 3 h -8 z m -4 4.5 h 8 l 4 3 h -8 z m 4 4.5 h 8 l -4 3 h -8 z"
                />
                <path
                  className="stroke-main token-check"
                  d="M -3.5 0.5 L -1 3 L 5 -3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>
            <text className="text-label font-space" x="0" y="65">
              SETTLEMENT
            </text>
          </g>

          <g className={nodeClassName(3, "n4")} transform="translate(560, 125)">
            <g className="node-group ">
              {/* Hit Box */}
              <circle
                className="fill-transparent opacity-0"
                cx="0"
                cy="0"
                r="50"
              />
              <circle className="icon-bg" cx="0" cy="0" r="32" />
              <g className="icon-glow-group">
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -32 0 A 32 32 0 0 1 32 0"
                />
                <path
                  className="icon-path-trace"
                  pathLength="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M -32 0 A 32 32 0 0 0 32 0"
                />
              </g>

              <g transform="translate(0, 0)">
                <path
                  className="stroke-main archive-inner-wall"
                  fill="var(--md-surface)"
                  d="M -12 -3 L 0 -9 L 0 3 L -12 9 Z"
                />
                <path
                  className="stroke-main archive-inner-wall"
                  fill="var(--md-surface)"
                  d="M 12 -3 L 0 -9 L 0 3 L 12 9 Z"
                />

                <path
                  className="stroke-main fill-main archive-box-top"
                  d="M 0 -9 L -12 -3 L 0 3 L 12 -3 Z"
                />

                <g className="archive-data-core">
                  <path
                    className="stroke-main fill-main"
                    d="M -6 4 L 0 1 L 6 4 L 0 7 Z"
                  />
                  <path
                    className="stroke-main fill-main"
                    d="M -6 0 L 0 -3 L 6 0 L 0 3 Z"
                  />
                  <path
                    className="stroke-main fill-main"
                    d="M -6 -4 L 0 -7 L 6 -4 L 0 -1 Z"
                  />
                </g>

                <path
                  className="stroke-main fill-main archive-box-side-l"
                  d="M -12 -3 L -12 9 L 0 15 L 0 3 Z"
                />
                <path
                  className="stroke-main fill-main archive-box-side-r"
                  d="M 12 -3 L 12 9 L 0 15 L 0 3 Z"
                />
              </g>
            </g>
            <text className="text-label font-space" x="0" y="65">
              ARCHIVE
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
