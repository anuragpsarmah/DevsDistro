import { useMemo } from "react";

export default function BackgroundDots() {
  const dots = useMemo(() => {
    return [...Array(50)].map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${1 * 4 + 1}px`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z">
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute bg-blue-500 rounded-full opacity-20"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
          }}
        />
      ))}
    </div>
  );
}
