import React from "react";

const BrutalistBackground: React.FC = () => {
  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.055] dark:hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,1) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
        }}
        aria-hidden="true"
      ></div>

      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.055] hidden dark:block"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
        }}
        aria-hidden="true"
      ></div>
    </>
  );
};

export default BrutalistBackground;
