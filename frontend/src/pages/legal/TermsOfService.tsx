import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundDots from "@/components/ui/backgroundDots";
import Header from "@/pages/landing/components/header";
import MobileMenu from "@/pages/landing/components/mobileMenu";
import Footer from "@/pages/landing/components/footer";

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
    <div className="min-h-screen text-white relative overflow-hidden bg-[#030712]">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 0%, rgba(88, 28, 135, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
            #030712
          `,
        }}
      />
      
      <BackgroundDots />

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

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-12 max-w-4xl text-gray-300">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-8">
          Terms of Service
        </h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DevExchange ("Platform"), you agree to be bound by these Terms of Service. 
              The Platform provides a marketplace for developers to buy and sell source code.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Account Security & GitHub Access</h2>
            <p className="mb-4">
              To use the Platform, you are required to connect your GitHub account and provide a GitHub Access Key. This is a mandatory requirement for all users to verify identity and repository ownership.
              While we employ industry-standard encryption to secure your credentials, you acknowledge the inherent risks associated with sharing access credentials.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
              <p className="text-red-200 text-sm">
                <strong>Important Recommendation:</strong> We strongly advise users to create a dedicated, separate GitHub account 
                for use with DevExchange. Do not connect your primary personal or organizational GitHub account containing sensitive 
                private repositories that are not intended for sale.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. User Obligations</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must have the legal right to sell any code you list on the Platform.</li>
              <li>You agree not to list malicious code, malware, or code that violates third-party intellectual property rights.</li>
              <li>You remain solely responsible for maintaining the security of your account credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Intellectual Property</h2>
            <p>
              <strong>Platform Content:</strong> The DevExchange interface, logo, and branding are the property of DevExchange.
            </p>
            <p className="mt-2">
              <strong>User Content:</strong> You retain ownership of the source code you list. By listing code, you grant DevExchange 
              a limited license to display snippets or descriptions for marketing purposes on the Platform. 
              When a sale occurs, the license transfers to the buyer according to the terms agreed upon at sale.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Limitation of Liability</h2>
            <p>
              The Platform is provided "AS IS" without warranty of any kind. 
              We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the Platform, 
              including but not limited to loss of data, unauthorized access to your GitHub account (due to user negligence or unforeseen breaches), 
              or financial loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the Platform following changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
