import axios from "axios";
import { VersionedTransaction, Keypair } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { config } from "../config.js";
import { QuoteResponse, SerializedQuoteResponse } from "../types.js";

export async function createSwapTransaction(solMint: string, tokenMint: string): Promise<VersionedTransaction | null> {
  const quoteUrl = process.env.JUP_HTTPS_QUOTE_URI || "";
  const swapUrl = process.env.JUP_HTTPS_SWAP_URI || "";
  let quoteResponseData: QuoteResponse | null = null;
  let serializedQuoteResponseData: SerializedQuoteResponse | null = null;
  const myWallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIV_KEY_WALLET || "")));

  // Get Swap Quote
  let retryCount = 0;
  while (retryCount < config.swap.token_not_tradable_400_error_retries) {
    try {
      const quoteResponse = await axios.get<QuoteResponse>(quoteUrl, {
        params: {
          inputMint: solMint,
          outputMint: tokenMint,
          amount: config.swap.amount,
          slippageBps: config.swap.slippageBps,
        },
        timeout: config.tx.get_timeout,
      });

      if (!quoteResponse.data) return null;

      if (config.swap.verbose_log && config.swap.verbose_log === true) {
        console.log("\nVerbose log:");
        console.log(quoteResponse.data);
      }

      quoteResponseData = quoteResponse.data;
      break;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.errorCode === "TOKEN_NOT_TRADABLE") {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, config.swap.token_not_tradable_400_error_delay));
          continue;
        }
      }

      console.error("Error while requesting a new swap quote:", error instanceof Error ? error.message : String(error));
      if (config.swap.verbose_log && config.swap.verbose_log === true) {
        console.log("Verbose Error Message:");
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error("Error Status:", error.response.status);
            console.error("Error Status Text:", error.response.statusText);
            console.error("Error Data:", error.response.data);
            console.error("Error Headers:", error.response.headers);
          } else if (error.request) {
            console.error("No Response:", error.request);
          } else {
            console.error("Error Message:", error.message);
          }
        } else {
          console.error("Error:", error instanceof Error ? error.message : String(error));
        }
      }
      return null;
    }
  }

  if (quoteResponseData) console.log("✅ Swap quote received.");

  // Serialize the quote into a swap transaction
  try {
    if (!quoteResponseData) return null;

    const swapResponse = await axios.post<SerializedQuoteResponse>(
      swapUrl,
      JSON.stringify({
        quoteResponse: quoteResponseData,
        userPublicKey: myWallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicSlippage: {
          maxBps: 300,
        },
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: config.swap.prio_fee_max_lamports,
            priorityLevel: config.swap.prio_level,
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

    if (!swapResponse.data) return null;

    if (config.swap.verbose_log && config.swap.verbose_log === true) {
      console.log(swapResponse.data);
    }

    serializedQuoteResponseData = swapResponse.data;
  } catch (error: unknown) {
    console.error("Error while sending the swap quote:", error instanceof Error ? error.message : String(error));
    if (config.swap.verbose_log && config.swap.verbose_log === true) {
      console.log("Verbose Error Message:");
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Error Status:", error.response.status);
          console.error("Error Status Text:", error.response.statusText);
          console.error("Error Data:", error.response.data);
          console.error("Error Headers:", error.response.headers);
        } else if (error.request) {
          console.error("No Response:", error.request);
        } else {
          console.error("Error Message:", error.message);
        }
      } else {
        console.error("Error:", error instanceof Error ? error.message : String(error));
      }
    }
    return null;
  }

  if (serializedQuoteResponseData) console.log("✅ Swap quote serialized.");

  // Deserialize and sign the transaction
  try {
    if (!serializedQuoteResponseData) return null;
    const swapTransactionBuf = Buffer.from(serializedQuoteResponseData.swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([myWallet.payer]);
    return transaction;
  } catch (error: unknown) {
    console.error("Error while signing and sending the transaction:", error instanceof Error ? error.message : String(error));
    if (config.swap.verbose_log && config.swap.verbose_log === true) {
      console.log("Verbose Error Message:");
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Error Status:", error.response.status);
          console.error("Error Status Text:", error.response.statusText);
          console.error("Error Data:", error.response.data);
          console.error("Error Headers:", error.response.headers);
        } else if (error.request) {
          console.error("No Response:", error.request);
        } else {
          console.error("Error Message:", error.message);
        }
      } else {
        console.error("Error:", error instanceof Error ? error.message : String(error));
      }
    }
    return null;
  }
}