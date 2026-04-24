import { Github } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import XIcon from "@/assets/icons/XIcon";
import LogoIcon from "@/assets/icons/LogoIcon";

export default function Footer() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const footerLinkClassName =
    "text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-500 md:hover:ml-2 transition-all inline-block";

  const handleScroll = (id: string) => {
    if (isHome) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-white dark:bg-[#050505] text-black dark:text-white py-20 px-6 md:px-12 font-space transition-colors duration-300">
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="max-w-[18rem] mx-auto md:mx-0">
              <h3 className="font-syne text-3xl font-black uppercase tracking-widest mb-6 flex items-center gap-3 justify-center md:justify-start">
                <LogoIcon className="w-8 h-8" />
                DevsDistro
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed transition-colors text-center md:text-left">
                A repository marketplace powered by Solana and GitHub.
              </p>
            </div>
            <div className="flex gap-4 justify-center md:justify-start">
              <a
                href="https://github.com/anuragpsarmah/DevsDistro"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-red-500 dark:hover:text-red-500 transition-all flex items-center justify-center"
                aria-label="Open DevsDistro GitHub repository"
              >
                <Github size={20} />
              </a>
              <a
                href="https://x.com/anuragpsarmah"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-red-500 dark:hover:text-red-500 transition-all flex items-center justify-center"
                aria-label="Open DevsDistro creator profile on X"
              >
                <XIcon />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-gray-500 dark:text-gray-500 transition-colors text-center md:text-left">
              Navigation
            </h4>
            <ul className="space-y-4 text-center md:text-left">
              {[
                "DevsDistro",
                "The Revelation",
                "The Mechanics",
                "Validations",
                "Query Log",
              ].map((item) => {
                let id = item.toLowerCase().replace(" ", "-");
                if (id === "devsdistro") id = "the-introduction";
                return (
                  <li key={item}>
                    <Link
                      to={isHome ? `#${id}` : `/#${id}`}
                      onClick={() => handleScroll(id)}
                      className={footerLinkClassName}
                    >
                      {item}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-gray-500 dark:text-gray-500 transition-colors text-center md:text-left">
              Developers
            </h4>
            <ul className="space-y-4 text-center md:text-left">
              <li>
                <Link
                  to="/api"
                  onClick={() => window.scrollTo(0, 0)}
                  className={footerLinkClassName}
                >
                  World Cities API
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-gray-500 dark:text-gray-500 transition-colors text-center md:text-left">
              Legal
            </h4>
            <ul className="space-y-4 text-center md:text-left">
              <li>
                <Link
                  to="/privacy"
                  onClick={() => window.scrollTo(0, 0)}
                  className={footerLinkClassName}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  onClick={() => window.scrollTo(0, 0)}
                  className={footerLinkClassName}
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-black/10 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest transition-colors">
          <p>© {new Date().getFullYear()} DevsDistro. All rights reserved.</p>
          <div className="flex gap-8 border border-black/10 dark:border-white/10 px-4 py-2 transition-colors">
            <span>
              Status:{" "}
              <span className="text-green-600 dark:text-green-500">
                Operational
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
