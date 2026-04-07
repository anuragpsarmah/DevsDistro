// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletConnect } from "@/pages/sellerDashboard/sub-components/WalletConnect";

describe("WalletConnect", () => {
  it("does not show ATA-specific messaging in the wallet tab", () => {
    render(
      <WalletConnect
        detectedWallets={[]}
        otherWallets={[]}
        isProcessing={false}
        onSelectWallet={vi.fn()}
        onWalletRedirect={vi.fn()}
      />
    );

    expect(screen.getByText("Connect Your Wallet")).toBeInTheDocument();
    expect(screen.queryByText(/ata/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/associated token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sponsored/i)).not.toBeInTheDocument();
  });
});
