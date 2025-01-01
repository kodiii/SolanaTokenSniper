import { config } from "./../config"; // Configuration parameters for our bot
import axios from "axios";
import * as sqlite3 from "sqlite3";
import dotenv from "dotenv";
import { open } from "sqlite";
import { createTableHoldings } from "./db";
import { HoldingRecord } from "../types";
import { DateTime } from "luxon";
import { createSellTransaction } from "../transactions";
import { Connection } from "@solana/web3.js";

// Load environment variables from the .env file
dotenv.config();

async function main() {
  const priceUrl = process.env.JUP_HTTPS_PRICE_URI || "";

  // Connect to database and create if not exists
  const db = await open({
    filename: config.swap.db_name_tracker_holdings,
    driver: sqlite3.Database,
  });

  // Create Table if not exists
  const holdingsTableExist = await createTableHoldings(db);
  if (!holdingsTableExist) {
    console.log("Holdings table not present.");
    // Close the database connection when done
    await db.close();
  }

  // Proceed with tracker
  if (holdingsTableExist) {
    // Create a place to store our updated holdings before showing them.
    const holdingLogs: string[] = [];
    const saveLog = (...args: unknown[]): void => {
      const message = args.map((arg) => String(arg)).join(" ");
      holdingLogs.push(message);
    };

    // Get all our current holdings
    const holdings = await db.all("SELECT * FROM holdings");
    if (holdings.length !== 0) {
      // Get all token ids
      const tokenValues = holdings.map((holding) => holding.Token).join(",");

      // @TODO, add more sources for current prices. Now our price is the current price based on the Jupiter Last Swap (sell/buy) price

      // Get latest tokens Price
      const solMint = config.liquidity_pool.wsol_pc_mint;
      const priceResponse = await axios.get<any>(priceUrl, {
        params: {
          ids: tokenValues + "," + solMint,
          showExtraInfo: true,
        },
        timeout: config.tx.get_timeout,
      });

      // Verify if we received the latest prices
      const currentPrices = priceResponse.data.data;
      if (!currentPrices) {
        console.log("⛔ Latest price could not be fetched. Trying again...");
        return;
      }

      // Loop trough all our current holdings
      await Promise.all(
        holdings.map(async (row) => {
          const holding: HoldingRecord = row;
          const token = holding.Token;
          const tokenName = holding.TokenName === "N/A" ? token : holding.TokenName;
          const tokenTime = holding.Time;
          const tokenBalance = holding.Balance;
          const tokenSolPaid = holding.SolPaid;
          const tokenSolFeePaid = holding.SolFeePaid;
          const tokenSolPaidUSDC = holding.SolPaidUSDC;
          const tokenSolFeePaidUSDC = holding.SolFeePaidUSDC;
          const tokenPerTokenPaidUSDC = holding.PerTokenPaidUSDC;
          const tokenSlot = holding.Slot;
          const tokenProgram = holding.Program;

          // Conver Trade Time
          const centralEuropenTime = DateTime.fromMillis(tokenTime).toLocal();
          const hrTradeTime = centralEuropenTime.toFormat("HH:mm:ss");

          // Get current price
          const tokenCurrentPrice = currentPrices[token]?.extraInfo?.lastSwappedPrice?.lastJupiterSellPrice;

          // Calculate PnL and profit/loss
          const unrealizedPnLUSDC = (tokenCurrentPrice - tokenPerTokenPaidUSDC) * tokenBalance - tokenSolFeePaidUSDC;
          const unrealizedPnLPercentage = (unrealizedPnLUSDC / (tokenPerTokenPaidUSDC * tokenBalance)) * 100;
          const iconPnl = unrealizedPnLUSDC > 0 ? "🟢" : "🔴";

          // Check SL/TP
          let sltpMessage = "";
          if (config.sell.auto_sell && config.sell.auto_sell === true) {
            const amountIn = tokenBalance.toString().replace(".", "");
            if (unrealizedPnLPercentage >= config.sell.take_profit_percent) {
              const connection = new Connection(process.env.HELIUS_HTTPS_URI || "");
              const tx = await createSellTransaction(holding.Token, holding.WalletAddress, connection, config);
              if (!tx) {
                sltpMessage = "⛔ Could not take profit. Trying again in 5 seconds.";
              }
              if (tx) {
                sltpMessage = "Took Profit: " + tx;
              }
            }
            if (unrealizedPnLPercentage <= -config.sell.stop_loss_percent) {
              const connection = new Connection(process.env.HELIUS_HTTPS_URI || "");
              const tx = await createSellTransaction(holding.Token, holding.WalletAddress, connection, config);
              if (!tx) {
                sltpMessage = "⛔ Could not sell stop loss. Trying again in 5 seconds.";
              }
              if (tx) {
                sltpMessage = "Stop Loss triggered: " + tx;
              }
            }
          }

          // Get the current price
          saveLog(
            `${hrTradeTime} Buy ${tokenBalance} ${tokenName} for $${tokenSolPaidUSDC.toFixed(2)}. ${iconPnl} Unrealized PnL: $${unrealizedPnLUSDC.toFixed(
              2
            )} (${unrealizedPnLPercentage.toFixed(2)}%) ${sltpMessage}`
          );
        })
      );
    }

    // Output updated holdings
    console.clear();
    console.log(holdingLogs.join("\n"));
    if (holdings.length === 0) console.log("No token holdings yet as of", new Date().toISOString());

    // Output wallet tracking if set in config
    if (config.sell.track_public_wallet) {
      console.log("\nCheck your wallet: https://gmgn.ai/sol/address/" + config.sell.track_public_wallet);
    }

    // Close the database connection when done
    console.log("Last Update: ", new Date().toISOString());
    await db.close();
  }

  setTimeout(main, 5000); // Call main again after 5 seconds
}

main().catch((err) => {
  console.error(err);
});
