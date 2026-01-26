import { Github } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  const socialLinks = [
    { icon: <Github size={20} />, href: "https://github.com/anuragpsarmah/DevExchange", label: "GitHub" },
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ];

  return (
    <footer className="py-12 relative z-10 border-t border-white/5">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
          <div>
            <Link to="/" className="block text-xl font-bold mb-2 hover:opacity-80 transition-opacity">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                DevExchange
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              The open source marketplace for developers to buy and sell source code.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-center">
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
            
            <div className="flex gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} DevExchange. Open source under MIT License.
          </p>
          <p className="text-gray-500 text-sm">
            Developed with ❤️ by{" "}
            <a
              target="_blank"
              href="https://github.com/anuragpsarmah"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Anurag
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
