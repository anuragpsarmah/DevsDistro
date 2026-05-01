import React, { useMemo, useState, useEffect, useRef } from "react";
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
  const gridRef = useRef<HTMLDivElement>(null);
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);

  useEffect(() => {
    if (!autoPlayCenter || hasPlayedInitialCenterRipple) return;
    const timeoutId = setTimeout(() => {
      if (surfaceRef.current && gridRef.current) {
        const surfaceRect = surfaceRef.current.getBoundingClientRect();
        const gridRect = gridRef.current.getBoundingClientRect();
        const centerX = surfaceRect.left + surfaceRect.width / 2;
        const centerY = surfaceRect.top + surfaceRect.height / 2;
        const centerCol = Math.floor((centerX - gridRect.left) / cellSize);
        const centerRow = Math.floor((centerY - gridRect.top) / cellSize);

        setClickedCell({ row: centerRow, col: centerCol });
      } else {
        setClickedCell({
          row: Math.floor(rows / 2),
          col: Math.floor(cols / 2),
        });
      }
      setRippleKey((k) => k + 1);
      hasPlayedInitialCenterRipple = true;
    }, autoPlayDelayMs);
    return () => clearTimeout(timeoutId);
  }, [autoPlayCenter, autoPlayDelayMs, rows, cols, cellSize]);

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "absolute inset-0 h-full w-full",
        "[--cell-border-color:theme(colors.neutral.300)] [--cell-fill-color:theme(colors.neutral.100)] [--cell-shadow-color:theme(colors.neutral.500)]",
        "dark:[--cell-border-color:theme(colors.neutral.700)] dark:[--cell-fill-color:theme(colors.neutral.900)] dark:[--cell-shadow-color:theme(colors.neutral.800)]"
      )}
    >
      <div className="relative h-full w-full overflow-hidden flex flex-wrap items-start justify-center">
        <div className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden" />
        <div ref={gridRef} className="mix-blend-normal z-[3]">
          <DivGrid
            key={`base-${rippleKey}`}
            rows={rows}
            cols={cols}
            cellSize={cellSize}
            borderColor="var(--cell-border-color)"
            fillColor="var(--cell-fill-color)"
            clickedCell={clickedCell}
            onCellClick={(row, col) => {
              setClickedCell({ row, col });
              setRippleKey((k) => k + 1);
            }}
            interactive
          />
        </div>
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  "--delay"?: string;
  "--duration"?: string;
};

const DivGrid = ({
  className,
  rows,
  cols,
  cellSize,
  borderColor,
  fillColor,
  clickedCell,
  onCellClick,
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols]
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    height: rows * cellSize,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative z-[3]", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0;
        const duration = 200 + distance * 80;

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] opacity-40 transition-opacity duration-150 will-change-transform hover:opacity-80 dark:shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none",
              rowIdx === 0 && "border-t-0",
              rowIdx === rows - 1 && "border-b-0",
              colIdx === 0 && "border-l-0 [clip-path:inset(0_0_0_8px)]",
              colIdx === cols - 1 && "border-r-0 [clip-path:inset(0_8px_0_0)]"
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onClick={
              interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined
            }
          />
        );
      })}
    </div>
  );
};
