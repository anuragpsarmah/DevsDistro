import { FAQItem } from "./types";

export const faqs: FAQItem[] = [
  {
    question: "How does DevExchange work?",
    answer:
      "DevExchange is a marketplace platform where developers can showcase, sell, and collaborate on GitHub projects. You can either explore existing projects to purchase or list your own projects directly from GitHub.",
  },
  {
    question: "What types of projects can I list?",
    answer:
      "You can list any GitHub project that provides value to other developers, including frameworks, plugins, templates, tools, or complete applications. All projects must be original work and comply with our community guidelines.",
  },
  {
    question: "How do you ensure project quality?",
    answer:
      "As DevExchange is currently a growing passion project, we rely on our community's collective wisdom for quality assurance. While we don't yet have a formal review process, we're committed to implementing comprehensive quality checks and dedicated project reviews as our platform expands. We encourage users to thoroughly evaluate projects and engage with sellers before making purchase decisions.",
  },
  {
    question: "What are the pricing guidelines?",
    answer:
      "You have full control over your project pricing. We recommend pricing based on project complexity, market demand, and maintenance requirements. You keep 100% of your earnings—there are no platform fees!",
  },
  {
    question: "How do payments work?",
    answer:
      "DevExchange uses Solana-based payments. Buyers complete transactions using their Solana wallets, and funds are transferred directly to the seller's wallet. Once the payment is confirmed on-chain, buyers get immediate access to the purchased project.",
  },
  {
    question: "How do you securely store GitHub access tokens?",
    answer:
      "GitHub access tokens are encrypted and stored in the database, ensuring your account's safety even in the unlikely event of a data breach. We use AES-256-CBC encryption with a randomly generated encryption key that is securely set at the production launch. This ensures a robust layer of security for sensitive information.",
  },
  {
    question: "What kind of support is available?",
    answer:
      "As a solo developer, I may not be able to provide instant support, but I’m committed to assisting you. Just send an email, and I'll make sure to address your issue as quickly as possible!",
  },
] as const;
