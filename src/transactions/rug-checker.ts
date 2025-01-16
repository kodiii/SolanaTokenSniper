import axios from "axios";
import { config } from "../config.js";
import { RugResponseExtended, NewTokenRecord } from "../types.js";
import { insertNewToken, selectTokenByNameAndCreator } from "../tracker/db.js";

interface Market {
  liquidityA: string | undefined;
  liquidityB: string | undefined;
}

interface Holder {
  address: string;
  insider: boolean;
  pct: number;
}

interface TokenRecord {
  name: string;
  creator: string;
}

interface Risk {
  name: string;
}

export async function getRugCheckConfirmed(tokenMint: string): Promise<boolean> {
  const rugResponse = await axios.get<RugResponseExtended>(
    `https://api.rugcheck.xyz/v1/tokens/${tokenMint}/report`,
    { timeout: config.tx.get_timeout }
  );

  if (!rugResponse.data) return false;

  if (config.rug_check.verbose_log && config.rug_check.verbose_log === true) {
    console.log(rugResponse.data);
  }

  const tokenReport: RugResponseExtended = rugResponse.data;
  const tokenCreator = tokenReport.creator ? tokenReport.creator : tokenMint;
  const mintAuthority = tokenReport.token.mintAuthority;
  const freezeAuthority = tokenReport.token.freezeAuthority;
  const isInitialized = tokenReport.token.isInitialized;
  const tokenName = tokenReport.tokenMeta.name;
  const tokenSymbol = tokenReport.tokenMeta.symbol;
  const tokenMutable = tokenReport.tokenMeta.mutable;
  let topHolders = tokenReport.topHolders;
  const marketsLength = tokenReport.markets ? tokenReport.markets.length : 0;
  const totalLPProviders = tokenReport.totalLPProviders;
  const totalMarketLiquidity = tokenReport.totalMarketLiquidity;
  const isRugged = tokenReport.rugged;
  const rugScore = tokenReport.score;
  const rugRisks = tokenReport.risks || [{
    name: "Good",
    value: "",
    description: "",
    score: 0,
    level: "good",
  }];

  // Filter out LP addresses from top holders if configured
  if (config.rug_check.exclude_lp_from_topholders && tokenReport.markets) {
    const liquidityAddresses = tokenReport.markets
      .flatMap((market: Market) => [market.liquidityA, market.liquidityB])
      .filter((address: string | undefined) => !!address) as string[];
    
    topHolders = topHolders.filter((holder: Holder) => !liquidityAddresses.includes(holder.address));
  }

  // Check for duplicate tokens if configured
  if (config.rug_check.block_returning_token_names || config.rug_check.block_returning_token_creators) {
    const duplicate = await selectTokenByNameAndCreator(tokenName, tokenCreator);
    if (duplicate.length !== 0) {
      if (config.rug_check.block_returning_token_names && duplicate.some((token: TokenRecord) => token.name === tokenName)) {
        console.log("🚫 Token with this name was already created");
        return false;
      }
      if (config.rug_check.block_returning_token_creators && duplicate.some((token: TokenRecord) => token.creator === tokenCreator)) {
        console.log("🚫 Token from this creator was already created");
        return false;
      }
    }
  }

  // Create new token record
  const newToken: NewTokenRecord = {
    time: Date.now(),
    mint: tokenMint,
    name: tokenName,
    creator: tokenCreator,
  };
  await insertNewToken(newToken).catch((err: Error) => {
    if (config.rug_check.block_returning_token_names || config.rug_check.block_returning_token_creators) {
      console.log("⛔ Unable to store new token for tracking duplicate tokens: " + err.message);
    }
  });

  // Validate conditions
  interface Condition {
    check: boolean;
    message: string;
  }

  const conditions: Condition[] = [
    {
      check: !config.rug_check.allow_mint_authority && mintAuthority !== null,
      message: "🚫 Mint authority should be null",
    },
    {
      check: !config.rug_check.allow_not_initialized && !isInitialized,
      message: "🚫 Token is not initialized",
    },
    {
      check: !config.rug_check.allow_freeze_authority && freezeAuthority !== null,
      message: "🚫 Freeze authority should be null",
    },
    {
      check: !config.rug_check.allow_mutable && tokenMutable !== false,
      message: "🚫 Mutable should be false",
    },
    {
      check: !config.rug_check.allow_insider_topholders && topHolders.some((holder: Holder) => holder.insider),
      message: "🚫 Insider accounts should not be part of the top holders",
    },
    {
      check: topHolders.some((holder: Holder) => holder.pct > config.rug_check.max_alowed_pct_topholders),
      message: "🚫 An individual top holder cannot hold more than the allowed percentage of the total supply",
    },
    {
      check: topHolders.reduce((sum: number, holder: Holder) => sum + holder.pct, 0) > config.rug_check.max_alowed_pct_all_topholders,
      message: `🚫 Ownership Centralization: Top holders control ${topHolders.reduce((sum: number, holder: Holder) => sum + holder.pct, 0).toFixed(2)}%, exceeding the ${config.rug_check.max_alowed_pct_all_topholders}% safety threshold`,
    },
    {
      check: totalLPProviders < config.rug_check.min_total_lp_providers,
      message: "🚫 Not enough LP Providers.",
    },
    {
      check: marketsLength < config.rug_check.min_total_markets,
      message: "🚫 Not enough Markets.",
    },
    {
      check: totalMarketLiquidity < config.rug_check.min_total_market_Liquidity,
      message: "🚫 Not enough Market Liquidity.",
    },
    {
      check: !config.rug_check.allow_rugged && isRugged,
      message: "🚫 Token is rugged",
    },
    {
      check: config.rug_check.block_symbols.includes(tokenSymbol),
      message: "🚫 Symbol is blocked",
    },
    {
      check: config.rug_check.block_names.includes(tokenName),
      message: "🚫 Name is blocked",
    },
    {
      check: rugScore > config.rug_check.max_score && config.rug_check.max_score !== 0,
      message: "🚫 Rug score to high.",
    },
    {
      check: rugRisks.some((risk: Risk) => config.rug_check.legacy_not_allowed.includes(risk.name)),
      message: "🚫 Token has legacy risks that are not allowed.",
    },
  ];

  for (const condition of conditions) {
    if (condition.check) {
      console.log(condition.message);
      return false;
    }
  }

  return true;
}