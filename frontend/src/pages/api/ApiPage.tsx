import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";

export default function ApiPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAuthNavigate = () => {
    navigate("/authentication");
  };

  const codeClassName =
    "font-mono text-sm bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-red-500";

  const blockCodeClassName =
    "font-mono text-sm bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 overflow-x-auto text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre block w-full";

  return (
    <div className="min-h-screen text-gray-900 bg-white dark:text-white dark:bg-[#050505] font-space selection:bg-red-500 selection:text-white transition-colors duration-300 relative">
      <Header
        handleAuthNavigate={handleAuthNavigate}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <MobileMenu
        handleAuthNavigate={handleAuthNavigate}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <main className="relative z-10 w-full pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-[2px] bg-red-500"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
            Public API
          </span>
        </div>

        <h1 className="font-syne text-5xl md:text-7xl font-black leading-none text-black dark:text-white uppercase tracking-widest mb-6 break-words hyphens-auto">
          World Cities API
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-8">
          A free, public REST API for fast trie based look up for cities around
          the world . No authentication required.
        </p>

        <div className="space-y-16 border-l-2 border-black/10 dark:border-white/10 pl-6 md:pl-10">
          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              01. Base URL
            </h2>
            <pre className={blockCodeClassName}>
              https://cities.devsdistro.com
            </pre>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              02. Endpoint
            </h2>
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center gap-4">
                <span className="font-syne font-black text-xs uppercase tracking-widest text-green-600 dark:text-green-400 border border-green-600/30 dark:border-green-400/30 px-2 py-1">
                  GET
                </span>
                <code className={codeClassName}>/searchCities</code>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-8">
              Search for cities by prefix. Returns a list of matching city names
              with their ISO 3166-1 alpha-2 country codes.
            </p>

            <h3 className="font-syne text-lg font-bold text-black dark:text-white mb-4 uppercase tracking-wider">
              Query Parameters
            </h3>
            <div className="border border-black/10 dark:border-white/10 overflow-hidden mb-8">
              <div className="grid grid-cols-4 bg-black/5 dark:bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-500">
                <span>Parameter</span>
                <span>Type</span>
                <span>Required</span>
                <span>Description</span>
              </div>
              <div className="grid grid-cols-4 px-4 py-4 border-t border-black/10 dark:border-white/10 text-sm items-start gap-2">
                <code className="text-red-500 font-mono">q</code>
                <span className="text-gray-500">string</span>
                <span className="text-green-600 dark:text-green-400 font-bold">
                  Yes
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Search term. Minimum 2 characters.
                </span>
              </div>
              <div className="grid grid-cols-4 px-4 py-4 border-t border-black/10 dark:border-white/10 text-sm items-start gap-2">
                <code className="text-red-500 font-mono">limit</code>
                <span className="text-gray-500">number</span>
                <span className="text-gray-500">No</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Max results to return. Default: 10. Max: 1000.
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              03. Response Format
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              A successful <code className={codeClassName}>200</code> response
              returns a JSON object with the following shape:
            </p>
            <pre className={blockCodeClassName}>{`{
  "filteredResults": ["London, GB", "Long Beach, US", "Londrina, BR"],
  "count": 3,
  "limit": 10
}`}</pre>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
              Each entry in{" "}
              <code className={codeClassName}>filteredResults</code> is
              formatted as{" "}
              <code className={codeClassName}>"City Name, ISO2"</code>.
            </p>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              04. Error Codes
            </h2>
            <div className="border border-black/10 dark:border-white/10 overflow-hidden">
              <div className="grid grid-cols-3 bg-black/5 dark:bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-500">
                <span>Status</span>
                <span>Code</span>
                <span>Reason</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-4 border-t border-black/10 dark:border-white/10 text-sm items-start gap-2">
                <code className="text-yellow-500 font-mono font-bold">400</code>
                <span className="text-gray-500">Bad Request</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Query is shorter than 2 characters or{" "}
                  <code className={codeClassName}>limit</code> is invalid.
                </span>
              </div>
              <div className="grid grid-cols-3 px-4 py-4 border-t border-black/10 dark:border-white/10 text-sm items-start gap-2">
                <code className="text-red-500 font-mono font-bold">429</code>
                <span className="text-gray-500">Too Many Requests</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Per-IP rate limit exceeded. Back off and retry.
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              05. Examples
            </h2>

            <h3 className="font-syne text-base font-bold text-black dark:text-white mb-3 uppercase tracking-wider">
              JavaScript (Fetch)
            </h3>
            <pre className={blockCodeClassName}>{`const res = await fetch(
  "https://cities.devsdistro.com/searchCities?q=par&limit=5"
);
const data = await res.json();
// data.filteredResults => ["Paris, FR", "Paramaribo, SR", ...]`}</pre>

            <h3 className="font-syne text-base font-bold text-black dark:text-white mb-3 mt-10 uppercase tracking-wider">
              React Query
            </h3>
            <pre
              className={blockCodeClassName}
            >{`import { useQuery } from "@tanstack/react-query";

const { data, isLoading } = useQuery({
  queryKey: ["cities", query],
  queryFn: async () => {
    const res = await fetch(
      \`https://cities.devsdistro.com/searchCities?q=\${query}&limit=10\`
    );
    return res.json();
  },
  enabled: query.length >= 2,
});

// data?.filteredResults => ["Paris, FR", "Paramaribo, SR", ...]`}</pre>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              06. Notes
            </h2>
            <ul className="space-y-6 text-gray-600 dark:text-gray-400 text-lg pb-12">
              <li className="flex flex-col md:flex-row gap-2 md:gap-6 items-start">
                <div className="flex gap-4 md:w-48 shrink-0">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <strong className="text-black dark:text-white">
                    Free to use
                  </strong>
                </div>
                <div className="flex-1">
                  No API key or authentication is required. CORS is enabled for
                  all origins. Intended for browser-based consumption only —
                  server-side or CLI requests are blocked by Cloudflare bot
                  protection.
                </div>
              </li>
              <li className="flex flex-col md:flex-row gap-2 md:gap-6 items-start">
                <div className="flex gap-4 md:w-48 shrink-0">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <strong className="text-black dark:text-white">
                    Rate limiting
                  </strong>
                </div>
                <div className="flex-1">
                  Requests are rate-limited per IP address to prevent abuse. For
                  high-volume use cases, consider caching results client-side.
                </div>
              </li>
              <li className="flex flex-col md:flex-row gap-2 md:gap-6 items-start">
                <div className="flex gap-4 md:w-48 shrink-0">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <strong className="text-black dark:text-white">
                    Open source
                  </strong>
                </div>
                <div className="flex-1">
                  The source code is available on{" "}
                  <a
                    href="https://github.com/anuragpsarmah/World-Cities-API"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-500 hover:underline"
                  >
                    GitHub
                  </a>
                  .
                </div>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
