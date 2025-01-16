import axios from "axios";
import { config } from "../config.js";
import { TransactionDetailsResponseArray, MintsDataReponse } from "../types.js";

export async function fetchTransactionDetails(signature: string): Promise<MintsDataReponse | null> {
  const txUrl = process.env.HELIUS_HTTPS_URI_TX || "";
  const maxRetries = config.tx.fetch_tx_max_retries;
  let retryCount = 0;

  console.log("Waiting " + config.tx.fetch_tx_initial_delay / 1000 + " seconds for transaction to be confirmed...");
  await new Promise((resolve) => setTimeout(resolve, config.tx.fetch_tx_initial_delay));

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1} of ${maxRetries} to fetch transaction details...`);

      const response = await axios.post<TransactionDetailsResponseArray>(
        txUrl,
        {
          transactions: [signature],
          commitment: "finalized",
          encoding: "jsonParsed",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: config.tx.get_timeout,
        }
      );

      if (!response.data) throw new Error("No response data received");
      if (!Array.isArray(response.data) || response.data.length === 0) throw new Error("Response data array is empty");

      const transactions: TransactionDetailsResponseArray = response.data;
      if (!transactions[0]) throw new Error("Transaction not found");

      const instructions = transactions[0].instructions;
      if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
        throw new Error("No instructions found in transaction");
      }

      const instruction = instructions.find((ix) => ix.programId === config.liquidity_pool.radiyum_program_id);
      if (!instruction || !instruction.accounts) throw new Error("No market maker instruction found");
      if (!Array.isArray(instruction.accounts) || instruction.accounts.length < 10) {
        throw new Error("Invalid accounts array in instruction");
      }

      const accountOne = instruction.accounts[8];
      const accountTwo = instruction.accounts[9];
      if (!accountOne || !accountTwo) throw new Error("Required accounts not found");

      let solTokenAccount = "";
      let newTokenAccount = "";
      if (accountOne === config.liquidity_pool.wsol_pc_mint) {
        solTokenAccount = accountOne;
        newTokenAccount = accountTwo;
      } else {
        solTokenAccount = accountTwo;
        newTokenAccount = accountOne;
      }

      console.log("Successfully fetched transaction details!");
      console.log(`SOL Token Account: ${solTokenAccount}`);
      console.log(`New Token Account: ${newTokenAccount}`);

      console.log(`\x1b[32mPHOTON TRACKER: https://photon-sol.tinyastro.io/en/lp/${newTokenAccount}\x1b[0m`);
      console.log(`\x1b[94mDEXSCREENER TRACKER: https://dexscreener.com/solana/${newTokenAccount}\x1b[0m`);

      return {
        tokenMint: newTokenAccount,
        solMint: solTokenAccount,
      };
    } catch (error: unknown) {
      console.log(`Attempt ${retryCount + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
      retryCount++;

      if (retryCount < maxRetries) {
        const delay = Math.min(4000 * Math.pow(1.5, retryCount), 15000);
        console.log(`Waiting ${delay / 1000} seconds before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.log("All attempts to fetch transaction details failed");
  return null;
}