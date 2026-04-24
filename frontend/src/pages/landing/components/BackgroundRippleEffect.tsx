import { useCallback, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

let hasPlayedInitialCenterRipple = false;

export const BackgroundRippleEffect = ({
  rows = 24,
  cols = 20,
  cellSize = 64,
  autoPlayCenter = false,
  autoPlayDelayMs = 180,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  autoPlayCenter?: boolean;
  autoPlayDelayMs?: number;
}) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeHoverCellRef = useRef<HTMLElement | null>(null);

  const triggerRipple = useCallback(
    (originRow: number, originCol: number) => {
      if (!containerRef.current) return false;

      const sourceRow = Math.min(rows - 1, Math.max(0, originRow));
      const sourceCol = Math.min(cols - 1, Math.max(0, originCol));
      const cells = Array.from(
        containerRef.current.querySelectorAll(".ripple-cell")
      );
      const innerRipples = cells.map(
        (cell) => cell.querySelector(".ripple-inner") as HTMLElement
      );

      innerRipples.forEach((el) => {
        if (el) el.style.animation = "none";
      });

      void containerRef.current.offsetWidth;

      cells.forEach((cell, i) => {
        const el = innerRipples[i];
        if (!el) return;

        const row = parseInt(cell.getAttribute("data-row") || "0", 10);
        const col = parseInt(cell.getAttribute("data-col") || "0", 10);

        const distance = Math.hypot(sourceRow - row, sourceCol - col);
        const delay = Math.max(0, distance * 55);
        const duration = 200 + distance * 80;

        el.style.animation = `ripple-fill ${duration}ms forwards ${delay}ms`;
      });

      return true;
    },
    [cols, rows]
  );

  useEffect(() => {
    if (!autoPlayCenter || hasPlayedInitialCenterRipple) return;

    let timeoutId: number | null = null;
    let firstFrameId: number | null = null;
    let secondFrameId: number | null = null;

    const playFromVisibleCenter = () => {
      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          timeoutId = window.setTimeout(() => {
            if (hasPlayedInitialCenterRipple) return;

            const surface = surfaceRef.current;
            const grid = containerRef.current;
            if (!surface || !grid) return;

            const surfaceRect = surface.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            const centerX = surfaceRect.left + surfaceRect.width / 2;
            const centerY = surfaceRect.top + surfaceRect.height / 2;
            const centerCol = Math.floor((centerX - gridRect.left) / cellSize);
            const centerRow = Math.floor((centerY - gridRect.top) / cellSize);

            if (triggerRipple(centerRow, centerCol)) {
              hasPlayedInitialCenterRipple = true;
            }
          }, autoPlayDelayMs);
        });
      });
    };

    if (document.readyState === "complete") {
      playFromVisibleCenter();
    } else {
      window.addEventListener("load", playFromVisibleCenter, { once: true });
    }

    return () => {
      window.removeEventListener("load", playFromVisibleCenter);
      if (firstFrameId !== null) window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [autoPlayCenter, autoPlayDelayMs, cellSize, triggerRipple]);

  useEffect(() => {
    const isInteractivePath = (path: EventTarget[]) =>
      path.some((el) => {
        const tag = (el as HTMLElement).tagName;
        return tag === "HEADER" || tag === "BUTTON" || tag === "A";
      });

    const clearActiveHoverCell = () => {
      if (!activeHoverCellRef.current) return;

      activeHoverCellRef.current.classList.remove(
        "bg-neutral-800/5",
        "dark:bg-white/5"
      );
      activeHoverCellRef.current = null;
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const path = e.composedPath();
      if (isInteractivePath(path)) return;

      const rect = containerRef.current.getBoundingClientRect();

      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        const clickedCol = Math.floor(relX / cellSize);
        const clickedRow = Math.floor(relY / cellSize);

        triggerRipple(clickedRow, clickedCol);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isInteractivePath(e.composedPath())) {
        clearActiveHoverCell();
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();

      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        const col = Math.floor(relX / cellSize);
        const row = Math.floor(relY / cellSize);
        const index = row * cols + col;

        const targetCell = containerRef.current.children[index] as HTMLElement;

        if (activeHoverCellRef.current !== targetCell) {
          // Remove hover from old cell
          if (activeHoverCellRef.current) {
            activeHoverCellRef.current.classList.remove(
              "bg-neutral-800/5",
              "dark:bg-white/5"
            );
          }
          // Add hover to new cell
          if (targetCell) {
            targetCell.classList.add("bg-neutral-800/5", "dark:bg-white/5");
          }
          activeHoverCellRef.current = targetCell;
        }
      } else {
        // Mouse left the grid bounds
        clearActiveHoverCell();
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [cellSize, cols, triggerRipple]);

  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols]
  );

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:rgba(38,38,38,0.1)] [--cell-fill-color:rgba(239,68,68,0.2)]",
        "dark:[--cell-border-color:rgba(255,255,255,0.1)] dark:[--cell-fill-color:rgba(239,68,68,0.2)]"
      )}
    >
      <div className="relative h-full w-full overflow-hidden flex flex-wrap items-start justify-center">
        <div className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden" />

        <div
          ref={containerRef}
          className="relative z-[3] mix-blend-normal"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            width: cols * cellSize,
            height: rows * cellSize,
            marginInline: "auto",
          }}
        >
          {cells.map((idx) => {
            const rowIdx = Math.floor(idx / cols);
            const colIdx = idx % cols;

            return (
              <div
                key={idx}
                data-row={rowIdx}
                data-col={colIdx}
                className={cn(
                  "ripple-cell relative transition-colors duration-75"
                )}
              >
                <div
                  className="ripple-inner absolute inset-0 pointer-events-none opacity-0 animate-ripple-fill"
                  style={{
                    backgroundColor: "var(--cell-fill-color)",
                    animation: "none", // Prevent firing on initial map render
                  }}
                />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 border-[0.5px] border-neutral-800/[0.07] dark:border-white/[0.07]",
                    rowIdx === 0 && "border-t-0",
                    rowIdx === rows - 1 && "border-b-0",
                    colIdx === 0 && "border-l-0 [clip-path:inset(0_0_0_8px)]",
                    colIdx === cols - 1 &&
                      "border-r-0 [clip-path:inset(0_8px_0_0)]"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
