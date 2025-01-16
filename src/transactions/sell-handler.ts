import axios from "axios";
import { Connection, Keypair, VersionedTransaction, PublicKey } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { config } from "../config.js";
import { QuoteResponse, SerializedQuoteResponse, createSellTransactionResponse } from "../types.js";
import { removeHolding } from "../tracker/db.js";

export async function createSellTransaction(
  solMint: string,
  tokenMint: string,
  amount: string
): Promise<createSellTransactionResponse> {
  const quoteUrl = process.env.JUP_HTTPS_QUOTE_URI || "";
  const swapUrl = process.env.JUP_HTTPS_SWAP_URI || "";
  const rpcUrl = process.env.HELIUS_HTTPS_URI || "";
  const myWallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIV_KEY_WALLET || "")));
  const connection = new Connection(rpcUrl);

  try {
    // Check token balance
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(myWallet.publicKey, {
      mint: new PublicKey(tokenMint),
    });

    const totalBalance = tokenAccounts.value.reduce((sum, account) => {
      const tokenAmount = account.account.data.parsed.info.tokenAmount.amount;
      return sum + BigInt(tokenAmount);
    }, BigInt(0));

    if (totalBalance <= 0n) {
      await removeHolding(tokenMint).catch((err: Error) => {
        console.log("⛔ Database Error: " + err.message);
      });
      throw new Error(`Token has 0 balance - Already sold elsewhere. Removing from tracking.`);
    }

    if (totalBalance !== BigInt(amount)) {
      throw new Error(`Wallet and tracker balance mismatch. Sell manually and token will be removed during next price check.`);
    }

    // Get sell quote
    const quoteResponse = await axios.get<QuoteResponse>(quoteUrl, {
      params: {
        inputMint: tokenMint,
        outputMint: solMint,
        amount: amount,
        slippageBps: config.sell.slippageBps,
      },
      timeout: config.tx.get_timeout,
    });

    if (!quoteResponse.data) {
      throw new Error("No valid quote for selling the token was received from Jupiter!");
    }

    // Create swap transaction
    const swapTransaction = await axios.post<SerializedQuoteResponse>(
      swapUrl,
      JSON.stringify({
        quoteResponse: quoteResponse.data,
        userPublicKey: myWallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicSlippage: {
          maxBps: 300,
        },
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: config.sell.prio_fee_max_lamports,
            priorityLevel: config.sell.prio_level,
          },
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: config.tx.get_timeout,
      }
    );

    if (!swapTransaction.data) {
      throw new Error("No valid swap transaction was received from Jupiter!");
    }

    // Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapTransaction.data.swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([myWallet.payer]);

    // Execute transaction
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });

    if (!txid) {
      throw new Error("Could not send transaction that was signed and serialized!");
    }

    // Confirm transaction
    const latestBlockHash = await connection.getLatestBlockhash();
    const conf = await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });

    if (conf.value.err || conf.value.err !== null) {
      throw new Error("Transaction was not successfully confirmed!");
    }

    // Remove holding from database
    await removeHolding(tokenMint).catch((err: Error) => {
      console.log("⛔ Database Error: " + err.message);
    });

    return {
      success: true,
      msg: null,
      tx: txid,
    };
  } catch (error: unknown) {
    return {
      success: false,
      msg: error instanceof Error ? error.message : "Unknown error",
      tx: null,
    };
  }
}