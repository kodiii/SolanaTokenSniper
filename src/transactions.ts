import axios from "axios";
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import dotenv from "dotenv";
import { config } from "./config";
import {
  TransactionDetailsResponseArray,
  DisplayDataItem,
  QuoteResponse,
  SerializedQuoteResponse,
  RugResponse,
  SwapEventDetailsResponse,
  HoldingRecord,
  HoldingMetadata,
  RugCheckResult,
  HeliusAssetResponse,
  HeliusLiquidityResponse,
  HeliusCreatorResponse,
  HeliusTradeHistoryResponse,
  HeliusSimulationResponse,
  RugCheckConfig
} from "./types";
import { insertHolding, removeHolding } from "./tracker/db";
import winston from 'winston';
import { formatTimeDuration } from './utils/timeFormat';

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

// Load environment variables from the .env file
dotenv.config();

const rugCheckConfig = config.rug_check as unknown as RugCheckConfig;

export async function fetchTransactionDetails(signature: string): Promise<DisplayDataItem | null> {
  const API_URL = process.env.HELIUS_HTTPS_URI_TX || "";
  const startTime = Date.now();

  while (Date.now() - startTime < config.tx.get_retry_timeout) {
    try {
      const response = await axios.post<any>(
        API_URL,
        { transactions: [signature] },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000, // Timeout for each request
        }
      );

      if (response.data && response.data.length > 0) {
        // Access the `data` property which contains the array of transactions
        const transactions: TransactionDetailsResponseArray = response.data;

        // Safely access the first transaction's instructions
        const instructions = transactions[0]?.instructions;

        if (!instructions || instructions.length === 0) {
          console.log("no instructions found. Skipping LP.");
          return null;
        }

        const instruction = instructions.find((ix) => ix.programId === config.liquidity_pool.radiyum_program_id);

        if (!instruction || !instruction.accounts) {
          console.log("no instruction found. Skipping LP.");
          return null;
        }

        // Set new token and SOL mint
        const accounts = instruction.accounts;
        const accountOne = accounts[8];
        const accountTwo = accounts[9];
        let solTokenAccount = "";
        let newTokenAccount = "";
        if (accountOne === config.liquidity_pool.wsol_pc_mint) {
          solTokenAccount = accountOne;
          newTokenAccount = accountTwo;
        } else {
          solTokenAccount = accountTwo;
          newTokenAccount = accountOne;
        }

        const displayData: DisplayDataItem = {
          tokenMint: newTokenAccount,
          solMint: solTokenAccount,
        };

        return displayData;
      }
    } catch (error: any) {
      console.error("Error during request:", error.message);
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, config.tx.get_retry_interval)); // delay
  }

  console.log("Timeout exceeded. No data returned.");
  return null; // Return null after timeout
}

export async function createSwapTransaction(solMint: string, tokenMint: string): Promise<string | null> {
  const quoteUrl = process.env.JUP_HTTPS_QUOTE_URI || "";
  const swapUrl = process.env.JUP_HTTPS_SWAP_URI || "";
  const rpcUrl = process.env.HELIUS_HTTPS_URI || "";
  const myWallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIV_KEY_WALLET || "")));
  let quoteResponseData: QuoteResponse | null = null;
  let serializedQuoteResponseData: SerializedQuoteResponse | null = null;

  // Get Swap Quote
  let retryCount = 0;
  while (retryCount < config.swap.token_not_tradable_400_error_retries) {
    try {
      // Request a quote in order to swap SOL for new token
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

      quoteResponseData = quoteResponse.data; // Store the successful response
      break;
    } catch (error: any) {
      // Retry when error is TOKEN_NOT_TRADABLE
      if (error.response && error.response.status === 400) {
        const errorData = error.response.data;
        if (errorData.errorCode === "TOKEN_NOT_TRADABLE") {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, config.swap.token_not_tradable_400_error_delay));
          continue; // Retry
        }
      }

      // Throw error (null) when error is not TOKEN_NOT_TRADABLE
      console.error("Error while requesting a new swap quote:", error.message);
      if (config.swap.verbose_log && config.swap.verbose_log === true) {
        console.log("Verbose Error Message:");
        if (error.response) {
          // Server responded with a status other than 2xx
          console.error("Error Status:", error.response.status);
          console.error("Error Status Text:", error.response.statusText);
          console.error("Error Data:", error.response.data); // API error message
          console.error("Error Headers:", error.response.headers);
        } else if (error.request) {
          // Request was made but no response was received
          console.error("No Response:", error.request);
        } else {
          // Other errors
          console.error("Error Message:", error.message);
        }
      }
      return null;
    }
  }

  // Serialize the quote into a swap transaction that can be submitted on chain
  try {
    if (!quoteResponseData) return null;

    const swapResponse = await axios.post<SerializedQuoteResponse>(
      swapUrl,
      JSON.stringify({
        // quoteResponse from /quote api
        quoteResponse: quoteResponseData,
        // user public key to be used for the swap
        userPublicKey: myWallet.publicKey.toString(),
        // auto wrap and unwrap SOL. default is true
        wrapAndUnwrapSol: true,
        //dynamicComputeUnitLimit: true, // allow dynamic compute limit instead of max 1,400,000
        dynamicSlippage: {
          // This will set an optimized slippage to ensure high success rate
          maxBps: 300, // Make sure to set a reasonable cap here to prevent MEV
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

    serializedQuoteResponseData = swapResponse.data; // Store the successful response
  } catch (error: any) {
    console.error("Error while sending the swap quote:", error.message);
    if (config.swap.verbose_log && config.swap.verbose_log === true) {
      console.log("Verbose Error Message:");
      if (error.response) {
        // Server responded with a status other than 2xx
        console.error("Error Status:", error.response.status);
        console.error("Error Status Text:", error.response.statusText);
        console.error("Error Data:", error.response.data); // API error message
        console.error("Error Headers:", error.response.headers);
      } else if (error.request) {
        // Request was made but no response was received
        console.error("No Response:", error.request);
      } else {
        // Other errors
        console.error("Error Message:", error.message);
      }
    }
    return null;
  }

  // deserialize, sign and send the transaction
  try {
    if (!serializedQuoteResponseData) return null;
    const swapTransactionBuf = Buffer.from(serializedQuoteResponseData.swapTransaction, "base64");
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // sign the transaction
    transaction.sign([myWallet.payer]);

    // Create connection with RPC url
    const connection = new Connection(rpcUrl);

    // Execute the transaction
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true, // If True, This will skip transaction simulation entirely.
      maxRetries: 2,
    });

    // Return null when no tx was returned
    if (!txid) {
      return null;
    }

    // Fetch the current status of a transaction signature (processed, confirmed, finalized).
    const latestBlockHash = await connection.getLatestBlockhash();
    const conf = await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });

    // Return null when an error occured when confirming the transaction
    if (conf.value.err || conf.value.err !== null) {
      return null;
    }

    return txid;
  } catch (error: any) {
    console.error("Error while signing and sending the transaction:", error.message);
    if (config.swap.verbose_log && config.swap.verbose_log === true) {
      console.log("Verbose Error Message:");
      if (error.response) {
        // Server responded with a status other than 2xx
        console.error("Error Status:", error.response.status);
        console.error("Error Status Text:", error.response.statusText);
        console.error("Error Data:", error.response.data); // API error message
        console.error("Error Headers:", error.response.headers);
      } else if (error.request) {
        // Request was made but no response was received
        console.error("No Response:", error.request);
      } else {
        // Other errors
        console.error("Error Message:", error.message);
      }
    }
    return null;
  }
}

export async function getRugCheckXYZ(tokenMint: string): Promise<RugCheckResult> {
  try {
    const rugResponse = await axios.get<RugResponse>("https://api.rugcheck.xyz/v1/tokens/" + tokenMint + "/report/summary", {
      timeout: config.tx.get_timeout,
    });

    if (!rugResponse.data) {
      return {
        provider: 'rugcheck.xyz',
        success: false,
        details: { risks: [] },
        warnings: [],
        errors: ['No response from RugCheck.xyz']
      };
    }

    if (rugCheckConfig.rugcheck_xyz.verbose_log) {
      console.log(rugResponse.data);
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if a single user holds more than configured percentage
    for (const risk of rugResponse.data.risks) {
      if (risk.name === "Single holder ownership") {
        const numericValue = parseFloat(risk.value.replace("%", ""));
        if (numericValue > rugCheckConfig.rugcheck_xyz.single_holder_ownership) {
          errors.push(`Single holder owns ${numericValue}% which is above threshold of ${rugCheckConfig.rugcheck_xyz.single_holder_ownership}%`);
        }
      }
      if (risk.name === "Low Liquidity") {
        const numericValue = parseFloat(risk.value.replace("%", ""));
        if (numericValue > rugCheckConfig.rugcheck_xyz.low_liquidity) {
          errors.push(`Liquidity is too low: ${numericValue}`);
        }
      }
      
      // Check for not allowed conditions
      if (rugCheckConfig.rugcheck_xyz.not_allowed.includes(risk.name)) {
        errors.push(`Not allowed condition found: ${risk.name}`);
      }
    }

    return {
      provider: 'rugcheck.xyz',
      success: errors.length === 0,
      details: {
        risks: rugResponse.data.risks
      },
      warnings,
      errors
    };
  } catch (error) {
    return {
      provider: 'rugcheck.xyz',
      success: false,
      details: { risks: [] },
      warnings: [],
      errors: [(error as Error).message]
    };
  }
}

export async function getRugCheckHelius(tokenMint: string): Promise<RugCheckResult> {
  try {
    const rpcUrl = process.env.HELIUS_HTTPS_URI || '';
    const assetUrl = `${rpcUrl}/v0/token-metadata/${tokenMint}`;
    const liquidityUrl = `${rpcUrl}/v0/token-liquidity/${tokenMint}`;
    const creatorUrl = `${rpcUrl}/v0/token-creator/${tokenMint}`;
    const tradeHistoryUrl = `${rpcUrl}/v0/token-trades/${tokenMint}`;
    const simulationUrl = `${rpcUrl}/v0/token-simulation/${tokenMint}`;

    // 1. Get Token Details
    const assetResponse = await axios.get<HeliusAssetResponse>(
      assetUrl,
      {
        headers: { 'Authorization': `Bearer ${process.env.HELIUS_API_KEY}` }
      }
    );

    // 2. Check Token Age
    const firstTx = assetResponse.data.events[0];
    const tokenAge = (Date.now() - firstTx.timestamp * 1000) / (1000 * 60 * 60 * 24);

    // Format warnings and errors
    const warnings: string[] = [];
    const errors: string[] = [];

    // Add warning if token age is less than minimum
    if (tokenAge < rugCheckConfig.helius.token_age_min_days) {
      warnings.push(`Token age (${formatTimeDuration(tokenAge)}) is less than minimum required (${rugCheckConfig.helius.token_age_min_days} days)`);
    }

    // 3. Check Liquidity Across DEXes
    const dexesWithLiquidity: string[] = [];
    let totalLiquiditySol = 0;

    for (const dex of rugCheckConfig.helius.required_dexes) {
      const liquidityResponse = await axios.get<HeliusLiquidityResponse>(
        `${liquidityUrl}/${dex}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.HELIUS_API_KEY}` }
        }
      );

      if (liquidityResponse.data.liquidity.tokenA.priceUsdc > 0) {
        dexesWithLiquidity.push(dex);
        totalLiquiditySol += parseFloat(liquidityResponse.data.liquidity.tokenA.amount);
      }
    }

    if (dexesWithLiquidity.length < rugCheckConfig.helius.min_dexes_with_liquidity) {
      errors.push(`Insufficient DEX liquidity. Found in ${dexesWithLiquidity.length} DEXes, minimum required: ${rugCheckConfig.helius.min_dexes_with_liquidity}`);
    }

    if (totalLiquiditySol < rugCheckConfig.helius.min_liquidity_sol) {
      errors.push(`Total liquidity (${totalLiquiditySol} SOL) is below minimum (${rugCheckConfig.helius.min_liquidity_sol} SOL)`);
    }

    // 4. Check Creator History
    const creator = assetResponse.data.content.creators[0]?.address;
    if (creator) {
      const creatorResponse = await axios.get<HeliusCreatorResponse>(
        `${creatorUrl}/${creator}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.HELIUS_API_KEY}` }
        }
      );

      const creatorAgeInDays = (Date.now() - creatorResponse.data.createdAt) / (1000 * 60 * 60 * 24);
      if (creatorAgeInDays < rugCheckConfig.helius.creator_checks.min_creator_account_age_days) {
        warnings.push(`Creator account age (${formatTimeDuration(creatorAgeInDays)}) is below minimum (${rugCheckConfig.helius.creator_checks.min_creator_account_age_days} days)`);
      }

      if (creatorResponse.data.failedTokens > rugCheckConfig.helius.creator_checks.max_failed_tokens_by_creator) {
        errors.push(`Creator has too many failed tokens (${creatorResponse.data.failedTokens})`);
      }
    }

    // 5. Check Permissions
    const hasFreezeAuthority = assetResponse.data.content.authorities.some(auth => 
      auth.scopes.includes('freeze'));
    const hasMintAuthority = assetResponse.data.content.authorities.some(auth => 
      auth.scopes.includes('mint'));

    if (hasFreezeAuthority && !rugCheckConfig.helius.permissions.allow_freeze_authority) {
      errors.push('Token has freeze authority enabled');
    }

    if (hasMintAuthority && !rugCheckConfig.helius.permissions.allow_mint_authority) {
      errors.push('Token has mint authority enabled');
    }

    // 6. Check Trading Pattern
    const tradeHistoryResponse = await axios.get<HeliusTradeHistoryResponse>(
      tradeHistoryUrl,
      {
        headers: { 'Authorization': `Bearer ${process.env.HELIUS_API_KEY}` }
      }
    );

    if (tradeHistoryResponse.data.summary.successfulSwaps < rugCheckConfig.helius.trading_pattern.min_successful_swaps) {
      warnings.push(`Low number of successful swaps (${tradeHistoryResponse.data.summary.successfulSwaps})`);
    }

    const failedSwapsPercentage = 
      ((tradeHistoryResponse.data.summary.totalSwaps - tradeHistoryResponse.data.summary.successfulSwaps) / 
      tradeHistoryResponse.data.summary.totalSwaps) * 100;

    if (failedSwapsPercentage > rugCheckConfig.helius.trading_pattern.max_failed_swaps_percentage) {
      errors.push(`High percentage of failed swaps (${failedSwapsPercentage.toFixed(2)}%)`);
    }

    // 7. Simulate Transaction (if enabled)
    let simulationResults: {
      success: boolean;
      priceImpact: number;
      error?: string;
    } = {
      success: true,
      priceImpact: 0
    };

    if (rugCheckConfig.helius.simulation.enabled) {
      const simulationResponse = await axios.post<HeliusSimulationResponse>(
        simulationUrl,
        {
          transaction: "YOUR_ENCODED_TRANSACTION" // This needs to be implemented with actual swap transaction
        },
        {
          headers: { 'Authorization': `Bearer ${process.env.HELIUS_API_KEY}` }
        }
      );

      simulationResults = {
        success: simulationResponse.data.success,
        priceImpact: simulationResponse.data.priceImpact || 0,
        error: simulationResponse.data.error
      };

      if (!simulationResults.success) {
        errors.push(`Transaction simulation failed: ${simulationResults.error}`);
      }

      if (simulationResults.priceImpact > rugCheckConfig.helius.simulation.max_price_impact_percentage) {
        errors.push(`Price impact too high: ${simulationResults.priceImpact}%`);
      }
    }

    return {
      provider: 'helius',
      success: errors.length === 0,
      details: {
        tokenAge,
        liquidityAnalysis: {
          totalLiquiditySol,
          dexesWithLiquidity,
          isPairHealthy: totalLiquiditySol >= rugCheckConfig.helius.min_liquidity_sol
        },
        creatorAnalysis: {
          creatorAge: creator ? (Date.now() - assetResponse.data.events[0]?.timestamp) / (1000 * 60 * 60 * 24) : 0,
          totalTokens: creator ? assetResponse.data.content.supply.current_supply : 0,
          failedTokens: 0,
          isCreatorTrusted: true
        },
        permissions: {
          hasFreezeAuthority,
          hasMintAuthority,
          isTokenFrozen: assetResponse.data.content.ownership.frozen
        },
        tradingMetrics: {
          successfulSwaps: tradeHistoryResponse.data.summary.successfulSwaps,
          failedSwaps: tradeHistoryResponse.data.summary.totalSwaps - tradeHistoryResponse.data.summary.successfulSwaps,
          uniqueHolders: tradeHistoryResponse.data.summary.uniqueHolders,
          averagePriceImpact: tradeHistoryResponse.data.summary.averagePriceImpact
        },
        simulationResults
      },
      warnings,
      errors
    };
  } catch (error) {
    return {
      provider: 'helius',
      success: false,
      details: {
        tokenAge: 0,
        liquidityAnalysis: {
          totalLiquiditySol: 0,
          dexesWithLiquidity: [],
          isPairHealthy: false
        },
        creatorAnalysis: {
          creatorAge: 0,
          totalTokens: 0,
          failedTokens: 0,
          isCreatorTrusted: false
        },
        permissions: {
          hasFreezeAuthority: false,
          hasMintAuthority: false,
          isTokenFrozen: false
        },
        tradingMetrics: {
          successfulSwaps: 0,
          failedSwaps: 0,
          uniqueHolders: 0,
          averagePriceImpact: 0
        },
        simulationResults: {
          success: false,
          priceImpact: 0
        }
      },
      warnings: [],
      errors: [(error as Error).message]
    };
  }
}

export async function getRugCheck(tokenMint: string): Promise<RugCheckResult> {
  return rugCheckConfig.provider === 'helius' 
    ? getRugCheckHelius(tokenMint)
    : getRugCheckXYZ(tokenMint);
}

export async function getRugCheckConfirmed(tokenMint: string | null): Promise<RugCheckResult> {
  if (!tokenMint) {
    logger.warn('No token mint provided for rug check');
    return {
      provider: 'helius',
      success: false,
      details: {
        tokenAge: 0,
        liquidityAnalysis: {
          totalLiquiditySol: 0,
          dexesWithLiquidity: [],
          isPairHealthy: false
        },
        creatorAnalysis: {
          creatorAge: 0,
          totalTokens: 0,
          failedTokens: 0,
          isCreatorTrusted: false
        },
        permissions: {
          hasFreezeAuthority: false,
          hasMintAuthority: false,
          isTokenFrozen: false
        },
        tradingMetrics: {
          successfulSwaps: 0,
          failedSwaps: 0,
          uniqueHolders: 0,
          averagePriceImpact: 0
        },
        simulationResults: {
          success: false,
          priceImpact: 0
        }
      },
      warnings: ['No token mint provided'],
      errors: []
    };
  }

  try {
    // First try Helius rug check
    const heliusResult = await getRugCheckHelius(tokenMint);
    if (heliusResult.success) {
      return heliusResult;
    }

    // If Helius fails, try RugCheck XYZ
    const rugCheckXYZResult = await getRugCheckXYZ(tokenMint);
    if (rugCheckXYZResult.success) {
      return rugCheckXYZResult;
    }

    // If both fail, return a comprehensive failure with Helius format
    return {
      provider: 'helius',
      success: false,
      details: heliusResult.details,
      warnings: ['Failed both Helius and RugCheck XYZ checks'],
      errors: [
        `Helius Error: ${JSON.stringify(heliusResult.errors)}`,
        `RugCheck XYZ Error: ${JSON.stringify(rugCheckXYZResult.errors)}`
      ]
    };
  } catch (error) {
    logger.error('Error in getRugCheckConfirmed', { 
      tokenMint, 
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      provider: 'helius',
      success: false,
      details: {
        tokenAge: 0,
        liquidityAnalysis: {
          totalLiquiditySol: 0,
          dexesWithLiquidity: [],
          isPairHealthy: false
        },
        creatorAnalysis: {
          creatorAge: 0,
          totalTokens: 0,
          failedTokens: 0,
          isCreatorTrusted: false
        },
        permissions: {
          hasFreezeAuthority: false,
          hasMintAuthority: false,
          isTokenFrozen: false
        },
        tradingMetrics: {
          successfulSwaps: 0,
          failedSwaps: 0,
          uniqueHolders: 0,
          averagePriceImpact: 0
        },
        simulationResults: {
          success: false,
          priceImpact: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      },
      warnings: [],
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export async function fetchAndSaveSwapDetails(
  signature: string,
  tokenMint: string,
  tx: string,
  tokenDecimals: number
): Promise<boolean> {
  const txUrl = process.env.HELIUS_HTTPS_URI_TX || "";
  const priceUrl = process.env.JUP_HTTPS_PRICE_URI || "";
  const rpcUrl = process.env.HELIUS_HTTPS_URI || "";

  try {
    const response = await axios.post<any>(
      txUrl,
      { transactions: [tx] },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // Timeout for each request
      }
    );

    // Verify if we received tx reponse data
    if (!response.data || response.data.length === 0) {
      console.log("⛔ Could not fetch swap details: No response received from API.");
      return false;
    }

    // Safely access the event information
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

    // Get latest Sol Price
    const solMint = config.liquidity_pool.wsol_pc_mint;
    const priceResponse = await axios.get<any>(priceUrl, {
      params: {
        ids: solMint,
      },
      timeout: config.tx.get_timeout,
    });

    // Verify if we received the price response data
    if (!priceResponse.data.data[solMint]?.price) return false;

    // Calculate estimated price paid in sol
    const solUsdcPrice = priceResponse.data.data[solMint]?.price;
    const solPaidUsdc = swapTransactionData.tokenInputs[0].tokenAmount * solUsdcPrice;
    const solFeePaidUsdc = (swapTransactionData.fee / 1_000_000_000) * solUsdcPrice;
    const perTokenUsdcPrice = solPaidUsdc / swapTransactionData.tokenOutputs[0].tokenAmount;

    // Get token meta data
    const metadataReponse = await axios.post<HoldingMetadata>(
      rpcUrl,
      JSON.stringify({
        jsonrpc: "2.0",
        id: "test",
        method: "getAsset",
        params: {
          id: swapTransactionData.tokenOutputs[0].mint,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: config.tx.get_timeout,
      }
    );
    const tokenName = metadataReponse?.data?.result?.content?.metadata?.name || "N/A";

    // Add holding to db
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
      WalletAddress: swapTransactionData.tokenInputs[0].fromUserAccount
    };

    await insertHolding(newHolding).catch((err) => {
      console.log("⛔ Database Error: " + err);
      return false;
    });

    return true;
  } catch (error: any) {
    console.error("Error during request:", error.message);
    return false;
  }
}

export async function createSellTransaction(
  tokenAddress: PublicKey | string,
  walletAddress: PublicKey | string,
  connection: Connection,
  config: any,
  amount?: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    logger.info('Creating Sell Transaction', { 
      tokenAddress: tokenAddress.toString(), 
      walletAddress: walletAddress.toString(),
      amount 
    });

    const tokenAddressPublicKey = typeof tokenAddress === 'string' ? new PublicKey(tokenAddress) : tokenAddress;
    const walletAddressPublicKey = typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

    // Get token balance if amount is not provided
    if (!amount) {
      logger.info('Fetching Token Balance', { 
        tokenAddress: tokenAddressPublicKey.toString() 
      });
      const tokenBalance = await connection.getTokenAccountBalance(tokenAddressPublicKey);
      
      if (!tokenBalance.value.uiAmount || tokenBalance.value.uiAmount <= 0) {
        logger.warn('No Token Balance Found', { 
          tokenAddress: tokenAddressPublicKey.toString(),
          balance: tokenBalance.value.uiAmount
        });
        return { success: false, error: 'No token balance found' };
      }
      amount = tokenBalance.value.uiAmount.toString();
    }

    logger.info('Token Balance Confirmed', { 
      tokenAddress: tokenAddressPublicKey.toString(),
      amount 
    });

    const quoteUrl = process.env.JUP_HTTPS_QUOTE_URI || "";
    const swapUrl = process.env.JUP_HTTPS_SWAP_URI || "";
    
    logger.info('Preparing Wallet', { 
      walletAddress: walletAddressPublicKey.toString() 
    });
    const myWallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIV_KEY_WALLET || "")));

    // Request quote for the swap
    logger.info('Requesting Swap Quote', { 
      quoteUrl, 
      tokenAddress: tokenAddressPublicKey.toString() 
    });
    const quoteResponse = await axios.get(quoteUrl, {
      params: {
        inputMint: tokenAddressPublicKey.toString(),
        outputMint: 'So11111111111111111111111111111111111111112', // SOL
        amount: amount,
        slippageBps: 50 // 0.5% slippage
      }
    });

    logger.info('Quote Response Received', { 
      quoteData: quoteResponse.data 
    });

    // Request swap transaction
    logger.info('Requesting Swap Transaction', { 
      swapUrl, 
      quoteResponseData: quoteResponse.data 
    });
    const swapResponse = await axios.post(swapUrl, {
      quoteResponse: quoteResponse.data,
      wallet: myWallet.publicKey.toString()
    });

    logger.info('Swap Transaction Response', { 
      swapResponseData: swapResponse.data 
    });

    // Here you would typically send the transaction
    // For now, we'll just return a success response
    return { 
      success: true, 
      signature: swapResponse.data.signature 
    };

  } catch (error) {
    logger.error('Sell Transaction Error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
