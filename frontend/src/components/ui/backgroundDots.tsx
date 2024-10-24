import React from "react";

export default function BackgroundDots() {
  const dots = [
    { top: "12%", left: "85%", size: "5px" },
    { top: "24%", left: "15%", size: "5px" },
    { top: "36%", left: "65%", size: "5px" },
    { top: "48%", left: "35%", size: "5px" },
    { top: "72%", left: "75%", size: "5px" },
    { top: "18%", left: "45%", size: "5px" },
    { top: "89%", left: "25%", size: "5px" },
    { top: "65%", left: "92%", size: "5px" },
    { top: "42%", left: "8%", size: "5px" },
    { top: "91%", left: "55%", size: "5px" },
    { top: "8%", left: "32%", size: "5px" },
    { top: "28%", left: "88%", size: "5px" },
    { top: "52%", left: "18%", size: "5px" },
    { top: "76%", left: "42%", size: "5px" },
    { top: "15%", left: "68%", size: "5px" },
    { top: "82%", left: "12%", size: "5px" },
    { top: "38%", left: "95%", size: "5px" },
    { top: "62%", left: "28%", size: "5px" },
    { top: "95%", left: "48%", size: "5px" },
    { top: "5%", left: "78%", size: "5px" },
    { top: "33%", left: "52%", size: "5px" },
    { top: "67%", left: "5%", size: "5px" },
    { top: "45%", left: "82%", size: "5px" },
    { top: "88%", left: "38%", size: "5px" },
    { top: "22%", left: "72%", size: "5px" },
    { top: "58%", left: "62%", size: "5px" },
    { top: "78%", left: "22%", size: "5px" },
    { top: "15%", left: "95%", size: "5px" },
    { top: "92%", left: "15%", size: "5px" },
    { top: "3%", left: "45%", size: "5px" },
    { top: "85%", left: "85%", size: "5px" },
    { top: "35%", left: "25%", size: "5px" },
    { top: "55%", left: "92%", size: "5px" },
    { top: "73%", left: "58%", size: "5px" },
    { top: "25%", left: "35%", size: "5px" },
    { top: "97%", left: "72%", size: "5px" },
    { top: "42%", left: "48%", size: "5px" },
    { top: "68%", left: "15%", size: "5px" },
    { top: "12%", left: "22%", size: "5px" },
    { top: "82%", left: "65%", size: "5px" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
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
