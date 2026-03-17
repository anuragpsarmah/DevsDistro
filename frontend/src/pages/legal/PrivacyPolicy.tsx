import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";

export default function PrivacyPolicy() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAuthNavigate = () => {
    navigate("/authentication");
  };

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
            Legal Documentation
          </span>
        </div>

        <h1 className="font-syne text-5xl md:text-7xl font-black leading-none text-black dark:text-white uppercase tracking-widest mb-16 break-words hyphens-auto">
          Privacy Policy
        </h1>

        <div className="space-y-16 border-l-2 border-black/10 dark:border-white/10 pl-6 md:pl-10">
          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">01. Data Collection</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              We collect information necessary to facilitate the buying and selling of source code. This includes:
            </p>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-lg">
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span><strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">Personal Information -</strong> Name, email address, and profile details provided during the GitHub OAuth initialization.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span><strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">Repository Metadata -</strong> We fetch listed repository metadata (names, descriptions, stack, statistics) to display your listings on the DevDistro marketplace.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span><strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">Technical Data -</strong> Web3 wallet addresses used for Solana payouts and standard IP/session logs for security routing.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">02. App Security & Code Storage</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-8">
              DevDistro treats your intellectual property with the highest security standards. We have deliberately shifted away from storing long-lived personal access tokens in favor of robust App-level sandboxing:
            </p>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-lg">
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span><strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">GitHub App Integration -</strong> You authorize the DevDistro GitHub App exclusively for the repositories you choose to list. We do not have read or write access to your entire GitHub account. Authentication is handled via short-lived, automated JWTs defined directly by GitHub's OAuth APIs.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span><strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">Listing Archival -</strong> When you list a project, we read your raw source code and immediately compile it into a secure ZIP archive. This ensures instant delivery to buyers upon successful transaction.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                <span><strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">S3 Delivery -</strong> Code archives are stored in tightly restricted AWS S3 buckets. They are served directly to the buyer as a one-time download and remain entirely inaccessible from the public web.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">03. Use of Information</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              We use your information to:
            </p>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-lg mb-6">
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                Facilitate marketplace queries and listings.
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                Execute verifiable delivery of code archives associated with verified SOL settlements.
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                Send system-level transaction notifications and protocol updates.
              </li>
            </ul>
            <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-6 md:p-8">
              <p className="text-black dark:text-white font-bold tracking-wide uppercase text-center font-syne">
                We do not interact with data brokers or sell your personal data.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">04. User Rights</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              You retain complete supremacy over your footprint:
            </p>
            <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-lg pb-12">
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                Access or review the metadata we project to the marketplace.
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                Instantly revoke our app integration from your GitHub settings—doing so severs our ability to fetch or archive your code dynamically.
              </li>
              <li className="flex gap-4">
                <span className="text-red-500 font-bold opacity-50">/</span>
                Purge your account and associated webhook subscriptions from DevDistro servers.
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
