import nacl from "tweetnacl";
import bs58 from "bs58";

export const verifyWalletSignature = (
  walletAddress: string,
  signature: string,
  message: string
): boolean => {
  try {
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);
    const messageBytes = new TextEncoder().encode(message);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch {
    return false;
  }
};
