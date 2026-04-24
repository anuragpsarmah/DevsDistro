import { type PointerEvent, useEffect, useRef, useState } from "react";
import MechanicsDiagram from "./MechanicsDiagram";

const HOVER_HOLD_DELAY_MS = 500;
const HOVER_INTENT_RECENCY_MS = 160;
const HOVER_MOVE_THRESHOLD_PX = 4;
const HOVER_SCROLL_SUPPRESSION_MS = 520;
const NODE_SEQUENCE_MS = 1800;
const RELEASE_BEAM_MS = 270;

export default function TheMechanics() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hoverEntryPointRef = useRef<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const lastPointerMoveRef = useRef({
    time: 0,
    x: 0,
    y: 0,
  });
  const lastScrollTimeRef = useRef(0);
  const releaseTimerRef = useRef<number | null>(null);
  const pendingHoverIndexRef = useRef<number | null>(null);
  const [hasStartedDiagram, setHasStartedDiagram] = useState(false);
  const [autoMechanicIndex, setAutoMechanicIndex] = useState<number | null>(
    null
  );
  const [heldMechanicIndex, setHeldMechanicIndex] = useState<number | null>(
    null
  );
  const [releaseMechanicIndex, setReleaseMechanicIndex] = useState<
    number | null
  >(null);
  const activeMechanicIndex =
    heldMechanicIndex ?? releaseMechanicIndex ?? autoMechanicIndex;

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || hasStartedDiagram) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setHasStartedDiagram(true);
        observer.disconnect();
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [hasStartedDiagram]);

  useEffect(() => {
    if (
      !hasStartedDiagram ||
      heldMechanicIndex !== null ||
      releaseMechanicIndex !== null
    ) {
      return;
    }

    setAutoMechanicIndex((previousIndex) => previousIndex ?? 0);

    const interval = window.setInterval(() => {
      setAutoMechanicIndex((previousIndex) => ((previousIndex ?? 0) + 1) % 4);
    }, NODE_SEQUENCE_MS);

    return () => window.clearInterval(interval);
  }, [hasStartedDiagram, heldMechanicIndex, releaseMechanicIndex]);

  useEffect(() => {
    const recordScroll = () => {
      lastScrollTimeRef.current = performance.now();
    };

    window.addEventListener("scroll", recordScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", recordScroll);

      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }

      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
    };
  }, []);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current === null) {
      return;
    }

    window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    pendingHoverIndexRef.current = null;
  };

  const clearReleaseTimer = () => {
    if (releaseTimerRef.current === null) {
      return;
    }

    window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
  };

  const startMechanicHoverHold = (index: number) => {
    clearHoverTimer();
    pendingHoverIndexRef.current = index;

    hoverTimerRef.current = window.setTimeout(() => {
      pendingHoverIndexRef.current = null;
      hoverTimerRef.current = null;
      clearReleaseTimer();
      setReleaseMechanicIndex(null);
      setAutoMechanicIndex(index);
      setHeldMechanicIndex(index);
    }, HOVER_HOLD_DELAY_MS);
  };

  const recordPointerMove = (event: PointerEvent<Element>) => {
    lastPointerMoveRef.current = {
      time: performance.now(),
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handleMechanicHoverStart = (
    index: number,
    event: PointerEvent<Element>
  ) => {
    clearHoverTimer();
    hoverEntryPointRef.current = {
      index,
      x: event.clientX,
      y: event.clientY,
    };

    const pointerWasJustMoving =
      performance.now() - lastPointerMoveRef.current.time <
      HOVER_INTENT_RECENCY_MS;
    const pageWasJustScrolled =
      performance.now() - lastScrollTimeRef.current <
      HOVER_SCROLL_SUPPRESSION_MS;

    if (pointerWasJustMoving && !pageWasJustScrolled) {
      startMechanicHoverHold(index);
    }
  };

  const handleMechanicHoverMove = (
    index: number,
    event: PointerEvent<Element>
  ) => {
    const entryPoint = hoverEntryPointRef.current;

    if (
      entryPoint?.index === index &&
      pendingHoverIndexRef.current !== index &&
      heldMechanicIndex !== index
    ) {
      const deltaX = event.clientX - entryPoint.x;
      const deltaY = event.clientY - entryPoint.y;
      const movedFarEnough =
        Math.hypot(deltaX, deltaY) >= HOVER_MOVE_THRESHOLD_PX;

      if (movedFarEnough) {
        startMechanicHoverHold(index);
      }
    }

    recordPointerMove(event);
  };

  const handleMechanicHoverEnd = (index: number) => {
    if (hoverEntryPointRef.current?.index === index) {
      hoverEntryPointRef.current = null;
    }

    if (pendingHoverIndexRef.current === index) {
      clearHoverTimer();
      return;
    }

    if (heldMechanicIndex !== index) {
      return;
    }

    clearReleaseTimer();
    setHeldMechanicIndex(null);
    setReleaseMechanicIndex(index);
    setAutoMechanicIndex(index);

    releaseTimerRef.current = window.setTimeout(() => {
      releaseTimerRef.current = null;
      setReleaseMechanicIndex(null);
      setAutoMechanicIndex((index + 1) % 4);
    }, RELEASE_BEAM_MS);
  };

  const cardClassName = (index: number, isFeature = false) => {
    const isActive = activeMechanicIndex === index;
    const baseClassName =
      "relative border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 transition-colors duration-300";
    const edgeClassName = index === 0 || isFeature ? " border-l-2" : "";
    const featureClassName = isFeature
      ? " lg:col-span-3 text-black dark:text-white"
      : "";
    const activeClassName = isActive
      ? " bg-red-500/[0.06] dark:bg-red-500/[0.08] shadow-[inset_0_0_0_1px_rgba(239,68,68,0.28)]"
      : isFeature
        ? " bg-black/5 dark:bg-white/5"
        : "";

    return `${baseClassName}${edgeClassName}${featureClassName}${activeClassName}`;
  };

  const numberClassName = (index: number, isMuted = false) => {
    const isActive = activeMechanicIndex === index;
    const idleClassName = isMuted
      ? "text-gray-500 dark:text-gray-500"
      : "text-black dark:text-white";
    const colorClassName = isActive
      ? "text-red-500 dark:text-red-500"
      : idleClassName;

    return `font-space text-4xl font-bold mb-8 ${colorClassName} transition-colors`;
  };

  const paragraphClassName = (_index: number, isLarge = false) => {
    const sizeClassName = isLarge ? "text-lg" : "text-sm";

    return `text-justify font-space ${sizeClassName} leading-relaxed text-gray-700 dark:text-gray-300 transition-colors`;
  };

  const renderPauseIndicator = (index: number) => {
    if (heldMechanicIndex !== index) {
      return null;
    }

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-6 inline-flex h-4 w-3 text-red-500"
      >
        <svg
          className="block h-full w-full"
          viewBox="0 0 12 16"
          fill="currentColor"
          shapeRendering="crispEdges"
        >
          <rect x="2" y="1" width="2" height="14" />
          <rect x="8" y="1" width="2" height="14" />
        </svg>
      </div>
    );
  };

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] text-black dark:text-white transition-colors duration-300 relative"
      id="the-mechanics"
      onPointerMove={recordPointerMove}
    >
      <div className="landing-dotted-rule landing-dotted-b absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-20"></div>
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6 border-b-4 border-black/20 dark:border-white/20 pb-4 transition-colors w-fit mx-auto md:mx-0">
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs">
              The Mechanics
            </span>
          </div>
          <h2 className="font-syne text-5xl md:text-7xl font-black uppercase leading-none text-center md:text-left">
            How The Machine
            <br />
            <span className="text-black/40 dark:text-white/40">Operates.</span>
          </h2>
        </div>

        <div>
          <div className="border-t-2 border-l-2 border-r-2 border-black/20 dark:border-white/20 transition-colors">
            <MechanicsDiagram
              activeIndex={activeMechanicIndex}
              heldIndex={heldMechanicIndex}
              isRunning={hasStartedDiagram}
              releaseIndex={releaseMechanicIndex}
              onNodeHoverEnd={handleMechanicHoverEnd}
              onNodeHoverMove={handleMechanicHoverMove}
              onNodeHoverStart={handleMechanicHoverStart}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t-2 border-black/20 dark:border-white/20 transition-colors">
            <div
              className={cardClassName(0)}
              onPointerEnter={(event) => handleMechanicHoverStart(0, event)}
              onPointerLeave={() => handleMechanicHoverEnd(0)}
              onPointerMove={(event) => handleMechanicHoverMove(0, event)}
            >
              {renderPauseIndicator(0)}
              <div className={numberClassName(0)}>01.</div>
              <h3 className="font-syne text-2xl font-bold uppercase mb-4">
                The Repository
              </h3>
              <p className={paragraphClassName(0)}>
                Your intellectual property. DevsDistro allows sellers to easily
                integrate and monetize the private repositories they already own
                on GitHub.
              </p>
            </div>

            <div
              className={cardClassName(1)}
              onPointerEnter={(event) => handleMechanicHoverStart(1, event)}
              onPointerLeave={() => handleMechanicHoverEnd(1)}
              onPointerMove={(event) => handleMechanicHoverMove(1, event)}
            >
              {renderPauseIndicator(1)}
              <div className={numberClassName(1)}>02.</div>
              <h3 className="font-syne text-2xl font-bold uppercase mb-4">
                Integration
              </h3>
              <p className={paragraphClassName(1)}>
                Connect via standard GitHub OAuth and our native App
                Integration. This securely fetches your selected repositories so
                you can list them on the marketplace.
              </p>
            </div>

            <div
              className={cardClassName(2)}
              onPointerEnter={(event) => handleMechanicHoverStart(2, event)}
              onPointerLeave={() => handleMechanicHoverEnd(2)}
              onPointerMove={(event) => handleMechanicHoverMove(2, event)}
            >
              {renderPauseIndicator(2)}
              <div className={numberClassName(2)}>03.</div>
              <h3 className="font-syne text-2xl font-bold uppercase mb-4">
                Solana Settlement
              </h3>
              <p className={paragraphClassName(2)}>
                A buyer connects their Phantom or Solflare wallet. They execute
                the purchase on Solana, paying in USDC by default, or native SOL
                when the seller enables it.
              </p>
            </div>

            <div
              className={cardClassName(3, true)}
              onPointerEnter={(event) => handleMechanicHoverStart(3, event)}
              onPointerLeave={() => handleMechanicHoverEnd(3)}
              onPointerMove={(event) => handleMechanicHoverMove(3, event)}
            >
              {renderPauseIndicator(3)}
              <div className="max-w-3xl lg:max-w-[66.666%]">
                <div className={numberClassName(3, true)}>04.</div>
                <h3 className="font-syne text-3xl font-bold uppercase mb-4">
                  Archive Delivery
                </h3>
                <p className={paragraphClassName(3, true)}>
                  The instant the Solana transaction is validated on-chain,
                  DevsDistro orchestrates the secure downloading and compiling
                  of your repository into a downloadable ZIP file, immediately
                  served to the buyer. No manual labor required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
