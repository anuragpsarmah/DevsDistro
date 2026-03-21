import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen text-gray-900 bg-white dark:text-white dark:bg-[#050505] font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative flex items-center justify-center p-4">
      <div className="z-10 text-center max-w-4xl w-full flex flex-col items-center justify-center border-2 border-black dark:border-white py-16 px-6 md:p-24 relative bg-white dark:bg-[#050505] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-8 self-start">
          <div className="w-12 h-[2px] bg-red-500"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
            System Failure
          </span>
        </div>

        <div className="mb-12">
          <div className="w-16 h-16 bg-red-500 items-center justify-center flex">
            <span className="font-syne font-black text-white text-4xl">!</span>
          </div>
        </div>

        <div className="relative flex justify-center w-full mb-6 z-20 overflow-hidden">
          <h1 className="text-6xl sm:text-[6rem] md:text-[8rem] lg:text-[10rem] font-black uppercase tracking-widest leading-none font-syne w-max max-w-none text-black dark:text-white px-4 sm:px-8 whitespace-nowrap inline-block relative z-20">
            404
          </h1>
        </div>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-space max-w-xl mx-auto border-t-2 border-black/10 dark:border-white/10 pt-6 mb-12 uppercase tracking-widest">
          The requested resource could not be located on this server.
        </p>

        <button
          className="w-full sm:w-auto px-12 py-5 bg-black text-white dark:bg-white dark:text-black font-space font-bold uppercase tracking-widest text-sm overflow-hidden transition-all duration-300 flex items-center justify-center gap-4 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border-2 border-transparent hover:border-black dark:hover:border-white group"
          onClick={() => navigate("/")}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <span>Return to Origin</span>
          </span>
        </button>

        <div className="absolute top-0 left-8 right-8 h-[2px] bg-black dark:bg-white -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-black dark:bg-white translate-y-1/2"></div>
      </div>
    </div>
  );
}
