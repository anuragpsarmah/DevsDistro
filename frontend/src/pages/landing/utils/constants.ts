import { FAQItem } from "./types";

export const faqs: FAQItem[] = [
  {
    question: "How does DevDistro work?",
    answer:
      "DevDistro is a marketplace platform where developers can showcase, sell, and collaborate on GitHub repositories. You can either explore existing repositories to purchase or list your own repositories directly from GitHub.",
  },
  {
    question: "What types of repositories can I list?",
    answer:
      "You can list any GitHub repository that provides value to other developers, including frameworks, plugins, templates, tools, or complete applications. All repositories must be original work and comply with our community guidelines.",
  },
  {
    question: "How do you ensure repository quality?",
    answer:
      "As DevDistro is currently a growing passion project, we rely on our community's collective wisdom for quality assurance. While we don't yet have a formal review process, we're committed to implementing comprehensive quality checks and dedicated project reviews as our platform expands. We encourage users to thoroughly evaluate projects and engage with sellers before making purchase decisions.",
  },
  {
    question: "What are the pricing guidelines?",
    answer:
      "You have full control over your repository pricing. We recommend pricing based on repository complexity, market demand, and maintenance requirements. You keep 99% of your earnings—a 1% platform fee applies.",
  },
  {
    question: "How do payments work?",
    answer:
      "DevDistro uses Solana-based payments. Buyers complete transactions using their Solana wallets, and funds are transferred directly to the seller's wallet. Once the payment is confirmed on-chain, buyers get immediate access to the purchased project.",
  },
  {
    question: "What kind of support is available?",
    answer:
      "As a solo developer, I may not be able to provide instant support, but I’m committed to assisting you. Just send an email, and I'll make sure to address your issue as quickly as possible!",
  },
] as const;
