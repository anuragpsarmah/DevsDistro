import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";
import SEO from "@/components/seo/SEO";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const termsDescription =
  "Review the DevsDistro terms of service for marketplace usage, GitHub app access, source code ownership, Solana payments, and delivery terms.";

const termsStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms of Service",
  url: `${SITE_URL}/terms`,
  description: termsDescription,
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
};

export default function TermsOfService() {
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
        title="Terms of Service"
        description={termsDescription}
        path="/terms"
        structuredData={termsStructuredData}
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

      <main className="relative z-10 w-full pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-[2px] bg-red-500"></div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
            Legal Documentation
          </span>
        </div>

        <h1 className="font-syne text-5xl md:text-7xl font-black leading-none text-black dark:text-white uppercase tracking-widest mb-16 break-words hyphens-auto">
          Terms of Service
        </h1>

        <div className="space-y-16 border-l-2 border-black/10 dark:border-white/10 pl-6 md:pl-10">
          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              01. Acceptance of Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              By accessing or using DevsDistro ("Platform"), you agree to be
              bound by these Terms of Service. The Platform provides a
              decentralized marketplace for developers to buy and sell source
              code securely and efficiently.
            </p>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              02. Account Security & GitHub Access
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-8">
              To use the Platform, you are required to authenticate via GitHub
              OAuth and authorize the official DevsDistro GitHub App. This is a
              mandatory requirement to verify your identity and confirm
              cryptographic ownership of the repositories you intend to list.
              The GitHub App requests scoped permissions exclusively for the
              repositories you select, ensuring we only interact with the code
              you choose to monetize.
            </p>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              03. User Obligations & Property Rights
            </h2>
            <ul className="space-y-6 text-gray-600 dark:text-gray-400 text-lg">
              <li className="flex flex-col md:flex-row gap-2 md:gap-6 items-start">
                <div className="flex gap-4 md:w-56 lg:w-64 shrink-0">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <strong className="text-black dark:text-white">
                    Ownership Assertion:
                  </strong>
                </div>
                <div className="flex-1">
                  You must exclusively own, or have explicit, verifiable legal
                  rights to sell, the intellectual property of any code you list
                  on the Platform. Copied, stolen, or improperly licensed
                  open-source code is strictly prohibited.
                </div>
              </li>
              <li className="flex flex-col md:flex-row gap-2 md:gap-6 items-start">
                <div className="flex gap-4 md:w-56 lg:w-64 shrink-0">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <strong className="text-black dark:text-white">
                    Prohibited Content:
                  </strong>
                </div>
                <div className="flex-1">
                  You agree not to list malicious code, malware, exploits, or
                  code that violates third-party intellectual property rights.
                </div>
              </li>
              <li className="flex flex-col md:flex-row gap-2 md:gap-6 items-start">
                <div className="flex gap-4 md:w-56 lg:w-64 shrink-0">
                  <span className="text-red-500 font-bold opacity-50">/</span>
                  <strong className="text-black dark:text-white">
                    Accountability:
                  </strong>
                </div>
                <div className="flex-1">
                  You remain solely responsible for maintaining the security of
                  your GitHub account and connected Web3 wallet.
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              04. Transactions & Delivery
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              <strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                Solana Settlement /
              </strong>
              You define the valuation of your codebase in USD fiat. At the time
              of execution, DevsDistro automatically converts this amount and
              processes the transaction exclusively in native SOL on the Solana
              blockchain through a connected Web3 wallet (e.g., Phantom,
              Solflare).
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              <strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                Automated Delivery /
              </strong>
              When you list a repository, we immediately pull the latest commit
              and compile it into a secure ZIP file stored in our AWS S3
              infrastructure. Upon on-chain confirmation of payment, this
              pre-packaged archive is served directly to the buyer for immediate
              download. DevsDistro facilitates the pipeline but relies on the
              immutability of the blockchain for settlement.
            </p>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              05. Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              The Platform is provided "AS IS" without warranty of any kind. We
              are not liable for any direct, indirect, incidental, or
              consequential damages arising from your use of the Platform,
              including but not limited to loss of data, unauthorized access to
              your GitHub account or Web3 wallet, smart contract
              vulnerabilities, market volatility of SOL, or any other financial
              loss.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
              <strong className="text-black dark:text-white uppercase text-sm tracking-widest font-syne mr-2">
                Platform Errors & Software Defects /
              </strong>
              DevsDistro makes reasonable efforts to maintain the integrity,
              security, and reliability of the Platform. However, all software
              may contain defects, bugs, or vulnerabilities. To the maximum
              extent permitted by applicable law, DevsDistro shall not be held
              responsible or liable for any loss of funds, digital assets,
              cryptocurrency, or financial damages of any nature arising from
              software errors, bugs, platform malfunctions, failed transactions,
              incorrect price calculations, or any other technical deficiency —
              whether or not such deficiency was known or foreseeable by
              DevsDistro at the time of the incident.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              By using the Platform and initiating any financial transaction,
              you expressly acknowledge and accept that all transactions are
              executed at your own risk. You are solely responsible for
              independently verifying transaction details — including recipient
              addresses and SOL amounts — prior to authorizing any payment
              through your connected Web3 wallet. DevsDistro strongly recommends
              transacting only amounts you are prepared to lose in the event of
              an unforeseen technical failure.
            </p>
          </section>

          <section>
            <h2 className="font-syne text-2xl md:text-3xl font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
              06. Changes to Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg pb-12">
              We reserve the right to modify these terms at any time. Continued
              use of the Platform following changes constitutes acceptance of
              the newly deployed terms.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
