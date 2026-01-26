import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundDots from "@/components/ui/backgroundDots";
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
          Privacy Policy
        </h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Data Collection</h2>
            <p>
              We collect information necessary to facilitate the buying and selling of source code. This includes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, and profile details provided during authentication.</li>
              <li><strong>Technical Data:</strong> IP addresses and browser information for security purposes.</li>
              <li>
                <strong>Third-Party Credentials:</strong> We require a <strong>GitHub Access Token</strong> from all users to verification identity and ownership of repositories associated with the account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Security of GitHub Credentials</h2>
            <p className="mb-4">
              We understand the sensitivity of your GitHub Access Token. We implement strict security measures to protect it:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Encryption:</strong> Access tokens are stored in our database in an encrypted format using industry-standard AES-256 encryption.</li>
              <li><strong>Limited Scope:</strong> We only request the minimum permissions necessary to list your repositories.</li>
              <li><strong>Transmission:</strong> All data is transmitted over secure SSL/TLS connections.</li>
            </ul>
            <div className="mt-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Our Recommendation</h3>
              <p className="text-blue-200 text-sm">
                To maximize your privacy and security, we strongly recommend creating a <strong>secondary GitHub account</strong> dedicated solely to DevExchange. 
                Do not connect a GitHub account that has access to sensitive private repositories unrelated to the projects you intend to sell.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Use of Information</h2>
            <p>
              We use your information to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Facilitate transactions between buyers and sellers.</li>
              <li>Verify ownership of listed projects.</li>
              <li>Send transaction notifications and platform updates.</li>
            </ul>
            <p className="mt-4">
              We <strong>do not sell</strong> your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. User Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request deletion of your account and associated data (including access tokens).</li>
              <li>Revoke our access to your GitHub account at any time via your GitHub settings.</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
