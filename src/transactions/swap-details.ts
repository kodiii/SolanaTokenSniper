import axios from "axios";
import { config } from "../config.js";
import { TransactionDetailsResponseArray, SwapEventDetailsResponse, HoldingRecord } from "../types.js";
import { insertHolding, selectTokenByMint } from "../tracker/db.js";

export async function fetchAndSaveSwapDetails(tx: string): Promise<boolean> {
  const txUrl = process.env.HELIUS_HTTPS_URI_TX || "";
  const priceUrl = process.env.JUP_HTTPS_PRICE_URI || "";

  try {
    const response = await axios.post<TransactionDetailsResponseArray>(
      txUrl,
      { transactions: [tx] },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (!response.data || response.data.length === 0) {
      console.log("⛔ Could not fetch swap details: No response received from API.");
      return false;
    }

    const transactions: TransactionDetailsResponseArray = response.data;
    const swapTransactionData: SwapEventDetailsResponse = {
      programInfo: transactions[0]?.events.swap.innerSwaps[0].programInfo,
      tokenInputs: transactions[0]?.events.swap.innerSwaps[0].tokenInputs,
      tokenOutputs: transactions[0]?.events.swap.innerSwaps[0].tokenOutputs,
      fee: transactions[0]?.fee,
      slot: transactions[0]?.slot,
      timestamp: transactions[0]?.timestamp,
      description: transactions[0]?.description,
    };

    // Get SOL price
    const solMint = config.liquidity_pool.wsol_pc_mint;
    const priceResponse = await axios.get<{data: {[key: string]: {price: number}}}>(
      priceUrl,
      {
        params: { ids: solMint },
        timeout: config.tx.get_timeout,
      }
    );

    if (!priceResponse.data.data[solMint]?.price) return false;

    // Calculate values in USDC
    const solUsdcPrice = priceResponse.data.data[solMint].price;
    const solPaidUsdc = swapTransactionData.tokenInputs[0].tokenAmount * solUsdcPrice;
    const solFeePaidUsdc = (swapTransactionData.fee / 1_000_000_000) * solUsdcPrice;
    const perTokenUsdcPrice = solPaidUsdc / swapTransactionData.tokenOutputs[0].tokenAmount;

    // Get token metadata
    let tokenName = "N/A";
    const tokenData = await selectTokenByMint(swapTransactionData.tokenOutputs[0].mint);
    if (tokenData) {
      tokenName = tokenData[0].name;
    }

    // Create holding record
    const newHolding: HoldingRecord = {
      Time: swapTransactionData.timestamp,
      Token: swapTransactionData.tokenOutputs[0].mint,
      TokenName: tokenName,
      Balance: swapTransactionData.tokenOutputs[0].tokenAmount,
      SolPaid: swapTransactionData.tokenInputs[0].tokenAmount,
      SolFeePaid: swapTransactionData.fee,
      SolPaidUSDC: solPaidUsdc,
      SolFeePaidUSDC: solFeePaidUsdc,
      PerTokenPaidUSDC: perTokenUsdcPrice,
      Slot: swapTransactionData.slot,
      Program: swapTransactionData.programInfo ? swapTransactionData.programInfo.source : "N/A",
    };

    await insertHolding(newHolding).catch((err: Error) => {
      console.log("⛔ Database Error: " + err.message);
      return false;
    });

    return true;
  } catch (error: unknown) {
    console.error("Error during request:", error instanceof Error ? error.message : String(error));
    return false;
  }
}