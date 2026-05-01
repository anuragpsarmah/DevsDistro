import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";
import SEO from "@/components/seo/SEO";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const privacyDescription =
  "Read the DevsDistro privacy policy covering GitHub OAuth data, repository metadata, wallet information, and how marketplace account data is handled.";

const privacyStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy",
  url: `${SITE_URL}/privacy`,
  description: privacyDescription,
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
};

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
      <SEO
        title="Privacy Policy"
        description={privacyDescription}
        path="/privacy"
        structuredData={privacyStructuredData}
      />
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

      <div className="landing-dotted-rule landing-dotted-x fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-30"></div>

      <main className="relative z-10 w-full pt-32 pb-24 px-6 md:px-12 mt-12">
        <div className="landing-dotted-rule landing-dotted-b absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl pointer-events-none z-20"></div>
        <div className="max-w-4xl mx-auto">
          <h1 className="font-syne text-5xl md:text-7xl font-black leading-none text-neutral-800 dark:text-white uppercase tracking-widest mb-16 break-words hyphens-auto">
            Privacy Policy
          </h1>

          <div className="space-y-16">
            <section>
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-neutral-800 dark:text-white mb-6 uppercase tracking-wider">
                01. Data Collection
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
                We collect information necessary to facilitate the buying and
                selling of repositories. This includes:
              </p>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-lg">
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <span>
                    <strong className="text-neutral-800 dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                      Personal Information -
                    </strong>{" "}
                    Name, email address, and profile details provided during the
                    GitHub OAuth initialization.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <span>
                    <strong className="text-neutral-800 dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                      Repository Metadata -
                    </strong>{" "}
                    We fetch listed repository metadata (names, descriptions,
                    stack, statistics) to display your listings on the
                    DevsDistro marketplace.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <span>
                    <strong className="text-neutral-800 dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                      Technical Data -
                    </strong>{" "}
                    Web3 wallet addresses used for Solana payouts and standard
                    IP/session logs for security routing.
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-neutral-800 dark:text-white mb-6 uppercase tracking-wider">
                02. App Security & Repository Storage
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-8">
                DevsDistro treats your intellectual property with the highest
                security standards. We have deliberately shifted away from
                storing long-lived personal access tokens in favor of robust
                App-level sandboxing:
              </p>
              <ul className="space-y-4 text-gray-600 dark:text-gray-400 text-lg">
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <span>
                    <strong className="text-neutral-800 dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                      GitHub App Integration -
                    </strong>{" "}
                    You authorize the DevsDistro GitHub App exclusively for the
                    repositories you choose to list. We do not have read or
                    write access to your entire GitHub account. Authentication
                    is handled via short-lived, automated JWTs defined directly
                    by GitHub's OAuth APIs.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <span>
                    <strong className="text-neutral-800 dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                      Listing Archival -
                    </strong>{" "}
                    When you list a project, we fetch your repository and
                    immediately package it into a secure ZIP archive. This
                    ensures instant delivery to buyers upon successful
                    transaction.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <span>
                    <strong className="text-neutral-800 dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                      S3 Delivery -
                    </strong>{" "}
                    Repository archives are stored in tightly restricted AWS S3
                    buckets. They are served directly to the buyer as a one-time
                    download and remain entirely inaccessible from the public
                    web.
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-neutral-800 dark:text-white mb-6 uppercase tracking-wider">
                03. Use of Information
              </h2>
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
                  Execute verifiable delivery of repository archives associated
                  with verified on-chain settlements.
                </li>
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  Send system-level transaction notifications and protocol
                  updates.
                </li>
              </ul>
              <div className="bg-neutral-800/5 dark:bg-white/5 border border-neutral-800/10 dark:border-white/10 p-6 md:p-8">
                <p className="text-neutral-800 dark:text-white font-bold tracking-wide uppercase text-center font-syne">
                  We do not interact with data brokers or sell your personal
                  data.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-neutral-800 dark:text-white mb-6 uppercase tracking-wider">
                04. User Rights
              </h2>
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
                  Instantly revoke our app integration from your GitHub
                  settings—doing so severs our ability to fetch or archive your
                  repositories dynamically.
                </li>
                <li className="flex gap-4">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  Purge your account and associated webhook subscriptions from
                  DevsDistro servers.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
