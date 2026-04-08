import bs58 from "bs58";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const TOKEN_ACCOUNT_SIZE = 165;

const createAssociatedTokenAccountInstruction = (
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
) =>
  new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });

const deriveAssociatedTokenAddress = (owner: PublicKey, mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];

const parseSponsorKeypair = (secretRaw: string): Keypair => {
  const trimmedSecret = secretRaw.trim();
  if (!trimmedSecret) {
    throw new Error("Sponsor secret key is empty");
  }

  try {
    const parsed = JSON.parse(trimmedSecret);
    if (Array.isArray(parsed)) {
      return Keypair.fromSecretKey(Uint8Array.from(parsed));
    }
  } catch {
    // Fall through to base58 parsing.
  }

  return Keypair.fromSecretKey(bs58.decode(trimmedSecret));
};

const getAtaCreationCostBreakdown = async (
  connection: Connection,
  txSignature: string
) => {
  const [tx, ataRentLamports] = await Promise.all([
    connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }),
    connection.getMinimumBalanceForRentExemption(
      TOKEN_ACCOUNT_SIZE,
      "confirmed"
    ),
  ]);

  const transactionFeeLamports = tx?.meta?.fee ?? null;
  const totalCostLamports =
    transactionFeeLamports === null
      ? null
      : transactionFeeLamports + ataRentLamports;

  return {
    transactionFeeLamports,
    ataRentLamports,
    totalCostLamports,
    transactionFeeSol:
      transactionFeeLamports === null
        ? null
        : transactionFeeLamports / LAMPORTS_PER_SOL,
    ataRentSol: ataRentLamports / LAMPORTS_PER_SOL,
    totalCostSol:
      totalCostLamports === null ? null : totalCostLamports / LAMPORTS_PER_SOL,
  };
};

export async function getAssociatedTokenAccountStatus({
  ownerWallet,
  mintAddress,
  rpcUrl,
}: {
  ownerWallet: string;
  mintAddress: string;
  rpcUrl: string;
}): Promise<{ exists: boolean; ataAddress: string }> {
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(ownerWallet);
  const mint = new PublicKey(mintAddress);
  const ata = deriveAssociatedTokenAddress(owner, mint);
  const info = await connection.getAccountInfo(ata, "confirmed");

  return {
    exists: Boolean(info),
    ataAddress: ata.toBase58(),
  };
}

export async function sponsorAssociatedTokenAccount({
  ownerWallet,
  mintAddress,
  rpcUrl,
  sponsorSecretKey,
}: {
  ownerWallet: string;
  mintAddress: string;
  rpcUrl: string;
  sponsorSecretKey: string;
}): Promise<{
  ataAddress: string;
  txSignature: string | null;
  transactionFeeLamports: number | null;
  ataRentLamports: number | null;
  totalCostLamports: number | null;
  transactionFeeSol: number | null;
  ataRentSol: number | null;
  totalCostSol: number | null;
}> {
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(ownerWallet);
  const mint = new PublicKey(mintAddress);
  const ata = deriveAssociatedTokenAddress(owner, mint);
  const existingAccount = await connection.getAccountInfo(ata, "confirmed");

  if (existingAccount) {
    return {
      ataAddress: ata.toBase58(),
      txSignature: null,
      transactionFeeLamports: null,
      ataRentLamports: null,
      totalCostLamports: null,
      transactionFeeSol: null,
      ataRentSol: null,
      totalCostSol: null,
    };
  }

  const sponsor = parseSponsorKeypair(sponsorSecretKey);
  const instruction = createAssociatedTokenAccountInstruction(
    sponsor.publicKey,
    ata,
    owner,
    mint
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: sponsor.publicKey,
    recentBlockhash: blockhash,
  }).add(instruction);

  transaction.sign(sponsor);

  let txSignature = "";
  try {
    txSignature = await connection.sendRawTransaction(transaction.serialize());
  } catch (error) {
    const accountAfterSendError = await connection.getAccountInfo(
      ata,
      "confirmed"
    );
    if (accountAfterSendError) {
      return {
        ataAddress: ata.toBase58(),
        txSignature: null,
        transactionFeeLamports: null,
        ataRentLamports: null,
        totalCostLamports: null,
        transactionFeeSol: null,
        ataRentSol: null,
        totalCostSol: null,
      };
    }
    throw error;
  }

  const confirmation = await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(
      `Sponsored ATA creation failed: ${JSON.stringify(confirmation.value.err)}`
    );
  }

  const createdAccount = await connection.getAccountInfo(ata, "confirmed");
  if (!createdAccount) {
    throw new Error("Sponsored ATA creation could not be verified");
  }

  const costBreakdown = await getAtaCreationCostBreakdown(
    connection,
    txSignature
  );

  return {
    ataAddress: ata.toBase58(),
    txSignature,
    ...costBreakdown,
  };
}
