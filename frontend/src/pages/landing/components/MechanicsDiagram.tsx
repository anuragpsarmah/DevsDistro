import React, { useEffect, useState } from "react";
import noiseUrl from "@/assets/noise.svg";

type MechanicsDiagramProps = {
  isRunning?: boolean;
};

export default function MechanicsDiagram({
  isRunning = false,
}: MechanicsDiagramProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    setActiveIndex(0);

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => ((prev ?? 0) + 1) % 4);
    }, 2800); // Slightly slower for better reading pace

    return () => window.clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden hide-scrollbar transition-colors">
      <style>{`
        .mechanics-diagram {
          --md-bg: transparent;
          --md-ink: rgba(0, 0, 0, 0.72);
          --md-ink-strong: rgba(0, 0, 0, 0.82);
          --md-ink-muted: rgba(0, 0, 0, 0.26);
          --md-track-idle: rgba(0, 0, 0, 0.06);
          --md-surface: #ffffff;
          --md-stroke-w: 1.25px;
          --md-shadow-idle: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.04));
          --md-shadow-hover-bg: drop-shadow(0 14px 28px rgba(239, 68, 68, 0.12));
          --md-shadow-hover-el: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.08));
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
          --md-ink: rgba(255, 255, 255, 0.82);
          --md-ink-strong: rgba(255, 255, 255, 0.9);
          --md-ink-muted: rgba(255, 255, 255, 0.34);
          --md-track-idle: rgba(255, 255, 255, 0.07);
          --md-surface: #0a0a0a;
          --md-shadow-idle: drop-shadow(0 4px 6px rgba(255, 255, 255, 0.02));
          --md-shadow-hover-bg: drop-shadow(0 14px 28px rgba(239, 68, 68, 0.16));
          --md-shadow-hover-el: drop-shadow(0 5px 10px rgba(255, 255, 255, 0.06));
          --md-accent: #ef4444;
          --md-grid-gap: 2px;
        }

        .mechanics-diagram svg {
          min-width: 800px;
          width: 100%;
          display: block;
          margin: 0 auto;
        }

        .mechanics-diagram .node-group {
          transition: transform 0.5s var(--spring);
          transform-origin: center;
          transform-box: fill-box;
        }

        .mechanics-diagram .interactive-node.active .node-group {
          transform: translateY(-4px) scale(1.04);
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
          transition: fill 0.3s var(--ease-out), transform 0.4s var(--spring);
        }

        /* Triple-Track Data Bus */
        .mechanics-diagram .track-center {
          stroke: var(--md-track-idle);
          stroke-width: var(--md-stroke-w);
          fill: none;
          transition: stroke 0.6s var(--ease-out);
        }
        .mechanics-diagram .track-outer {
          stroke: var(--md-ink);
          stroke-width: 0.9px;
          stroke-dasharray: 4 6;
          fill: none;
          transition: stroke 0.6s var(--ease-out), opacity 0.6s var(--ease-out);
          opacity: 0.12;
        }
        .mechanics-diagram.is-running .track-outer.top {
          animation: md-dash-forward 1.2s linear infinite;
        }
        .mechanics-diagram.is-running .track-outer.bottom {
          animation: md-dash-backward 1.2s linear infinite;
        }

        /* Hover & Active Interactions */
        .mechanics-diagram .interactive-node.active .track-center { stroke: var(--md-ink-muted); }
        .mechanics-diagram .interactive-node.active .track-outer { opacity: 0.55; stroke: var(--md-ink); }

        .mechanics-diagram .interactive-node.active .icon-bg {
          filter: var(--md-shadow-hover-bg);
          stroke: var(--md-ink-strong);
          stroke-width: 1.5px;
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
          animation: md-commit-playback 2.4s ease-in-out 1;
          animation-delay: calc(var(--order) * 0.15s);
        }

        /* Node 2 */
        .mechanics-diagram .oauth-lock { 
          transform-origin: 0px 4px; 
          transform: translateY(3px) scale(0.85); 
          transition: transform 0.6s var(--spring) 0s, filter 0.6s var(--spring) 0s; 
        }
        .mechanics-diagram .lock-shackle { transition: transform 0.3s var(--ease-out) 0.4s, stroke 0.3s var(--ease-out) 0.4s; }
        .mechanics-diagram .interactive-node.n2.active .lock-shackle { transform: translateY(-4px); stroke: var(--md-ink); transition: transform 0.3s var(--ease-out) 0s, stroke 0.3s var(--ease-out) 0s; }
        .mechanics-diagram .interactive-node.n2.active .oauth-lock { transform: translate(14px, -16px) scale(0.5); filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.15)); transition: transform 0.7s var(--spring) 0.2s, filter 0.7s var(--spring) 0.2s; }
        .dark .mechanics-diagram .interactive-node.n2.active .oauth-lock { filter: drop-shadow(0 6px 8px rgba(255, 255, 255, 0.15)); }
        .mechanics-diagram .interactive-node.n2.active .app-frame { filter: var(--md-shadow-hover-el); stroke-width: 1.5px; }
        .mechanics-diagram .interactive-node.n2.active .r1 { transition: all 0.3s var(--ease-out) 0.5s; }
        .mechanics-diagram .interactive-node.n2.active .r2 { transition: all 0.3s var(--ease-out) 0.65s; }
        .mechanics-diagram .interactive-node.n2.active .r3 { transition: all 0.3s var(--ease-out) 0.8s; }
        .mechanics-diagram .repo-dot { opacity: 0; transform: scale(0.5); transition: all 0.3s var(--spring); transform-box: fill-box; transform-origin: center; }
        .mechanics-diagram .repo-line { stroke-dasharray: 12; stroke-dashoffset: 12; opacity: 0; transition: all 0.3s var(--ease-out); }
        .mechanics-diagram .interactive-node.n2.active .repo-dot { opacity: 1; transform: scale(1.1); fill: var(--md-accent); }
        .mechanics-diagram .interactive-node.n2.active .repo-line { stroke-dashoffset: 0; opacity: 0.9; stroke: var(--md-ink); }

        /* Node 3 */
        .mechanics-diagram .token-check { opacity: 0; stroke-dasharray: 14; stroke-dashoffset: 14; transition: all 0.4s var(--spring) 0s; transform-origin: center; transform-box: fill-box; }
        .mechanics-diagram .settle-ring { stroke-dasharray: 105; stroke-dashoffset: 105; transform: rotate(-90deg); transform-origin: center; transform-box: fill-box; transition: stroke-dashoffset 1s var(--ease-in-out), transform 1s var(--ease-in-out), stroke 0.6s var(--ease-out); }
        .mechanics-diagram .interactive-node.n3.active .token-base { filter: var(--md-shadow-hover-el); }
        .mechanics-diagram .interactive-node.n3.active .sol-mark { opacity: 0; transform: scale(0) rotate(180deg); }
        .mechanics-diagram .interactive-node.n3.active .token-check { opacity: 1; stroke-dashoffset: 0; stroke: var(--md-accent); stroke-width: 2px; transition: all 0.6s var(--spring) 0.4s; }
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
          filter: drop-shadow(0 -4px 6px rgba(0,0,0,0.08));
        }
        .dark .mechanics-diagram .interactive-node.n4.active .archive-box-top {
          filter: drop-shadow(0 -4px 6px rgba(255,255,255,0.05));
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
          filter: var(--md-shadow-hover-el);
          animation: md-levitate-core 2.5s ease-in-out infinite 0.6s;
        }

        @keyframes md-dash-forward { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
        @keyframes md-dash-backward { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 20; } }
        @keyframes md-commit-playback {
          0%, 100% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          15% { transform: scale(1.4); fill: var(--md-ink); filter: drop-shadow(0 4px 8px rgba(239,68,68,0.25)); }
          30% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
        }
        .dark @keyframes md-commit-playback {
          0%, 100% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
          15% { transform: scale(1.4); fill: var(--md-ink); filter: drop-shadow(0 4px 8px rgba(239,68,68,0.3)); }
          30% { transform: scale(1); fill: var(--md-surface); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
        }
        @keyframes md-levitate-core {
          0%, 100% { transform: translateY(-8px) scale(1.1); }
          50% { transform: translateY(-13px) scale(1.1); }
        }
      `}</style>

      <div
        className={`mechanics-diagram relative w-full py-8 md:py-10 px-4 md:px-12 flex justify-center bg-white dark:bg-[#050505] transition-colors overflow-hidden ${
          isRunning ? "is-running" : ""
        }`}
      >
        {/* Noise Texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-0"
          style={{
            backgroundImage: `url(${noiseUrl})`,
          }}
        ></div>

        {/* Faded Diagonal Grid */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-5 dark:opacity-10 text-black dark:text-white hidden md:block"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent var(--md-grid-gap)),
              repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 1px, transparent var(--md-grid-gap))
            `,
            maskImage:
              "radial-gradient(ellipse at 50% 50%, black 20%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 50%, black 20%, transparent 80%)",
          }}
        ></div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 60 640 150"
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
                className="fill-black/10 dark:fill-white/10"
              />
            </pattern>
          </defs>
          <g
            className={`interactive-node n1 ${activeIndex === 0 ? "active" : ""}`}
            transform="translate(80, 125)"
          >
            <g className="tracks pointer-events-none">
              <path className="track-outer top" d="M 0 -6 L 160 -6" />
              <path className="track-center" d="M 0 0 L 160 0" />
              <path className="track-outer bottom" d="M 0 6 L 160 6" />
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
                rx="0"
              />
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
                  className="fill-main git-commit"
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

          <g
            className={`interactive-node n2 ${activeIndex === 1 ? "active" : ""}`}
            transform="translate(240, 125)"
          >
            <g className="tracks pointer-events-none">
              <path className="track-outer top" d="M 0 -6 L 160 -6" />
              <path className="track-center" d="M 0 0 L 160 0" />
              <path className="track-outer bottom" d="M 0 6 L 160 6" />
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
                d="M 0 -30 L 30 -20 L 30 20 L 0 30 L -30 20 L -30 -20 Z"
              />
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
              GITHUB SYNC
            </text>
          </g>

          <g
            className={`interactive-node n3 ${activeIndex === 2 ? "active" : ""}`}
            transform="translate(400, 125)"
          >
            <g className="tracks pointer-events-none">
              <path className="track-outer top" d="M 0 -6 L 160 -6" />
              <path className="track-center" d="M 0 0 L 160 0" />
              <path className="track-outer bottom" d="M 0 6 L 160 6" />
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
                d="M -12 -30 L 12 -30 L 30 -12 L 30 12 L 12 30 L -12 30 L -30 12 L -30 -12 Z"
              />
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

          <g
            className={`interactive-node n4 ${activeIndex === 3 ? "active" : ""}`}
            transform="translate(560, 125)"
          >
            <g className="node-group ">
              {/* Hit Box */}
              <circle
                className="fill-transparent opacity-0"
                cx="0"
                cy="0"
                r="50"
              />
              <circle className="icon-bg" cx="0" cy="0" r="32" />

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
