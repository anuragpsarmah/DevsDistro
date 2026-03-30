import PDFDocument from "pdfkit";
import { Response } from "express";

type PurchaseReceiptPayload = {
  purchaseReference: string;
  transactionSignature: string;
  purchaseDate: string;
  projectTitle: string;
  projectType: string;
  projectTechStack: string[];
  projectPrice: string;
  purchasedPackageId: string;
  purchasedCommitSha: string;
  packagedAt: string;
  amountPaidUsd: string;
  amountPaidSol: string;
  sellerReceivedLabel: string;
  sellerReceivedValue: string;
  platformFeeLabel: string;
  platformFeeValue: string;
  solUsdRate: string;
  rateSource: string;
  rateTimestamp: string;
  buyerDisplayName: string;
  buyerUsername: string;
  buyerWallet: string;
  sellerDisplayName: string;
  sellerUsername: string;
  sellerWallet: string;
  generatedAt: string;
};

function drawDevsDistroLogo(
  doc: PDFKit.PDFDocument,
  lx: number,
  ly: number,
  size: number
): void {
  const s = size / 100;
  const buildDPath = (offsetX: number, offsetY: number): string => {
    const px = (v: number) => (lx + offsetX + v * s).toFixed(2);
    const py = (v: number) => (ly + offsetY + v * s).toFixed(2);
    return [
      `M ${px(20)} ${py(15)}`,
      `L ${px(60)} ${py(15)}`,
      `L ${px(80)} ${py(35)}`,
      `L ${px(80)} ${py(65)}`,
      `L ${px(60)} ${py(85)}`,
      `L ${px(20)} ${py(85)}`,
      `Z`,
      `M ${px(42)} ${py(37)}`,
      `L ${px(58)} ${py(37)}`,
      `L ${px(58)} ${py(63)}`,
      `L ${px(42)} ${py(63)}`,
      `Z`,
    ].join(" ");
  };

  const r = (n: number) => n.toFixed(2);
  const clipTop = `M ${r(lx)} ${r(ly)} L ${r(lx + size)} ${r(ly)} L ${r(lx)} ${r(ly + size)} Z`;
  const clipBottom = `M ${r(lx + size)} ${r(ly)} L ${r(lx + size)} ${r(ly + size)} L ${r(lx)} ${r(ly + size)} Z`;

  doc.save();
  doc.path(clipTop).clip();
  doc.path(buildDPath(0, 0)).fill("#1a1a1a", "even-odd");
  doc.restore();

  doc.save();
  doc.path(clipBottom).clip();
  doc.path(buildDPath(-6 * s, 6 * s)).fill("#FF3333", "even-odd");
  doc.restore();
}

export function renderPurchaseReceiptPdf(
  res: Response,
  payload: PurchaseReceiptPayload
): void {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const safeRef = payload.purchaseReference.slice(0, 16).toUpperCase();
  const filename = `devsdistro-receipt-${safeRef}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - 100;
  const PAGE_BOTTOM_MARGIN = 100;

  const ensurePageRoom = (currentY: number, needed = 60): number => {
    if (currentY + needed > doc.page.height - PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      return 50;
    }
    return currentY;
  };

  const row = (label: string, value: string, yPos: number): number => {
    const safeY = ensurePageRoom(yPos, 20);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#333333")
      .text(label, 50, safeY, { width: 160, lineGap: 2 });
    const labelEndY = doc.y;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#000000")
      .text(value, 215, safeY, { width: pageWidth - 165, lineGap: 2 });
    const valueEndY = doc.y;
    return Math.max(labelEndY, valueEndY) + 6;
  };

  drawDevsDistroLogo(doc, 50, 46, 28);

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#000000")
    .text("DEVSDISTRO", 84, 50);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#666666")
    .text("A repository marketplace powered by Solana and GitHub.", 84, 78);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#000000")
    .text("PURCHASE RECEIPT", 50, 110);

  doc
    .moveTo(50, 135)
    .lineTo(doc.page.width - 50, 135)
    .lineWidth(2)
    .stroke("#000000");

  doc.moveDown(1);
  let y = 150;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("TRANSACTION DETAILS", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  y = row("Purchase Reference:", payload.purchaseReference, y);
  y = row("Transaction Signature:", payload.transactionSignature, y);
  y = row("Purchase Date:", payload.purchaseDate, y);
  y = row("Status:", "CONFIRMED", y);
  y += 12;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("PROJECT", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  y = row("Title:", payload.projectTitle, y);
  y = row("Type:", payload.projectType, y);
  y = row("Tech Stack:", payload.projectTechStack.join(", ") || "N/A", y);
  y = row("Listed Price:", payload.projectPrice, y);
  y += 12;

  y = ensurePageRoom(y);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("PACKAGE DETAILS", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  y = row("Purchased Package ID:", payload.purchasedPackageId, y);
  y = row("Purchased Commit SHA:", payload.purchasedCommitSha, y);
  y = row("Packaged At:", payload.packagedAt, y);
  y += 12;

  y = ensurePageRoom(y);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("FINANCIAL SUMMARY", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  y = row("Amount Paid (USD):", payload.amountPaidUsd, y);
  y = row("Amount Paid (SOL):", payload.amountPaidSol, y);
  y = row(payload.sellerReceivedLabel, payload.sellerReceivedValue, y);
  y = row(payload.platformFeeLabel, payload.platformFeeValue, y);
  y = row("SOL/USD Rate at Purchase:", payload.solUsdRate, y);
  y = row("Rate Source:", payload.rateSource, y);
  y = row("Rate Timestamp:", payload.rateTimestamp, y);
  y += 12;

  y = ensurePageRoom(y, 100);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("PARTIES", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#333333")
    .text("BUYER", 50, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#333333")
    .text("SELLER", doc.page.width / 2, y);
  y += 14;

  const halfWidth = pageWidth / 2 - 10;
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text(`Name: ${payload.buyerDisplayName}`, 50, y, { width: halfWidth });
  doc.text(`Name: ${payload.sellerDisplayName}`, doc.page.width / 2, y, {
    width: halfWidth,
  });
  y += 14;
  doc.text(`@${payload.buyerUsername}`, 50, y, { width: halfWidth });
  doc.text(`@${payload.sellerUsername}`, doc.page.width / 2, y, {
    width: halfWidth,
  });
  y += 14;
  doc.font("Helvetica").fontSize(8).fillColor("#555555");
  doc.text(`Wallet: ${payload.buyerWallet}`, 50, y, { width: halfWidth });
  doc.text(`Wallet: ${payload.sellerWallet}`, doc.page.width / 2, y, {
    width: halfWidth,
  });
  y += 20;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 14;

  y = ensurePageRoom(y, 120);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("TERMS & CONDITIONS", 50, y);
  y += 18;

  const terms = [
    "1. This receipt confirms that the above purchase was executed on the DevsDistro marketplace and settled via the Solana blockchain as identified by the transaction signature above.",
    "2. DevsDistro automates repository archive delivery, but sellers remain responsible for repository ownership and for having the legal rights required to list and sell the repository content.",
    "3. The purchased package details above identify the exact packaged repository state retained for this transaction, including the package identifier and Git commit SHA captured at purchase time.",
    "4. DevsDistro provides the platform and delivery pipeline on an AS IS basis and does not guarantee the quality, functionality, security, fitness for purpose, or legal compliance of any repository sold through the platform.",
    "5. By using DevsDistro, users accept the platform risks described in the Terms of Service, including wallet, transaction, software, and digital asset risks. The current Terms of Service are available at devsdistro.com/terms.",
    "6. This document is generated automatically by DevsDistro as proof of purchase for the transaction described herein and does not require a physical signature.",
  ];

  doc.font("Helvetica").fontSize(8.5).fillColor("#222222");
  for (const term of terms) {
    y = ensurePageRoom(y, 40);
    doc.text(term, 50, y, { width: pageWidth, lineGap: 2 });
    y = doc.y + 8;
  }

  y += 10;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(2)
    .stroke("#000000");
  y += 12;

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#888888")
    .text(`Generated by DevsDistro · ${payload.generatedAt}`, 50, y, {
      width: pageWidth,
      align: "center",
    });

  doc.end();
}
