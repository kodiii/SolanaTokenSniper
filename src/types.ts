export interface DisplayDataItem {
  tokenMint?: string;
  solMint?: string;
  tokenDecimals?: number;
}

export interface QuoteResponse {
  // Define the expected structure of the response here
  // Adjust based on the actual API response
  data: any; // Replace `any` with the specific type if known
}

export interface SerializedQuoteResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
  computeUnitLimit: number;
  prioritizationType: {
    computeBudget: Record<string, unknown>;
  };
  simulationSlot: number;
  dynamicSlippageReport: {
    slippageBps: number;
    otherAmount: number;
    simulatedIncurredSlippageBps: number;
    amplificationRatio: string;
    categoryName: string;
    heuristicMaxSlippageBps: number;
  };
  simulationError: string | null;
}

export interface RugResponse {
  tokenProgram: string;
  tokenType: string;
  risks: Array<{
    name: string;
    value: string;
    description: string;
    score: number;
    level: string;
  }>;
  score: number;
}

export interface WebSocketRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: Array<object>;
}

interface TransactionDetailsResponse {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers: {
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number | string;
    mint: string;
    tokenStandard: string;
  }[];
  nativeTransfers: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
  accountData: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: {
      userAccount: string;
      tokenAccount: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      mint: string;
    }[];
  }[];
  transactionError: string | null;
  instructions: {
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: {
      accounts: string[];
      data: string;
      programId: string;
    }[];
  }[];
  events: {
    swap: {
      nativeInput: {
        account: string;
        amount: string;
      } | null;
      nativeOutput: {
        account: string;
        amount: string;
      } | null;
      tokenInputs: {
        userAccount: string;
        tokenAccount: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
        mint: string;
      }[];
      tokenOutputs: {
        userAccount: string;
        tokenAccount: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
        mint: string;
      }[];
      nativeFees: {
        account: string;
        amount: string;
      }[];
      tokenFees: {
        userAccount: string;
        tokenAccount: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
        mint: string;
      }[];
      innerSwaps: {
        tokenInputs: {
          fromTokenAccount: string;
          toTokenAccount: string;
          fromUserAccount: string;
          toUserAccount: string;
          tokenAmount: number;
          mint: string;
          tokenStandard: string;
        }[];
        tokenOutputs: {
          fromTokenAccount: string;
          toTokenAccount: string;
          fromUserAccount: string;
          toUserAccount: string;
          tokenAmount: number;
          mint: string;
          tokenStandard: string;
        }[];
        tokenFees: {
          userAccount: string;
          tokenAccount: string;
          rawTokenAmount: {
            tokenAmount: string;
            decimals: number;
          };
          mint: string;
        }[];
        nativeFees: {
          account: string;
          amount: string;
        }[];
        programInfo: {
          source: string;
          account: string;
          programName: string;
          instructionName: string;
        };
      }[];
    };
  };
}

export interface SwapEventDetailsResponse {
  programInfo: {
    source: string;
    account: string;
    programName: string;
    instructionName: string;
  };
  tokenInputs: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  tokenOutputs: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  fee: number;
  slot: number;
  timestamp: number;
  description: string;
}

export interface HoldingRecord {
  id?: number; // Optional because it's added by the database
  Time: number;
  Token: string;
  TokenName: string;
  Balance: number;
  SolPaid: number;
  SolFeePaid: number;
  SolPaidUSDC: number;
  SolFeePaidUSDC: number;
  PerTokenPaidUSDC: number;
  Slot: number;
  Program: string;
  WalletAddress: string;
}

export interface HoldingMetadata {
  jsonrpc: string;
  id: string;
  result: {
    interface: string;
    id: string;
    content: {
      $schema: string;
      json_uri: string;
      files: Array<any>; // This can be an array of any type since no specific structure is defined for files
      metadata: {
        name: string;
        symbol: string;
      };
    };
    authorities: Array<{
      address: string;
      scopes: Array<string>;
    }>;
    compression: {
      eligible: boolean;
      compressed: boolean;
      data_hash: string;
      creator_hash: string;
      asset_hash: string;
      tree: string;
      seq: number;
      leaf_id: number;
    };
    grouping: Array<{
      group_key: string;
      group_value: string;
    }>;
    royalty: {
      royalty_model: string;
      target: string;
      percent: number;
      basis_points: number;
      primary_sale_happened: boolean;
      locked: boolean;
    };
    creators: Array<{
      address: string;
      share: number;
      verified: boolean;
    }>;
    ownership: {
      frozen: boolean;
      delegated: boolean;
      delegate: string;
      ownership_model: string;
      owner: string;
    };
    supply: {
      print_max_supply: number;
      print_current_supply: number;
      edition_nonce: number;
    };
    mutable: boolean;
    burnt: boolean;
    token_info: {
      supply: number;
      decimals: number;
      token_program: string;
      mint_authority: string;
      freeze_authority: string;
    };
  };
}

// Update to reflect an array of transactions
export type TransactionDetailsResponseArray = TransactionDetailsResponse[];

// Helius API Response Types
export interface HeliusAssetResponse {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    owner: {
      address: string;
      associatedTokenAccount: string;
    };
    authorities: {
      address: string;
      scopes: string[];
    }[];
    supply: {
      print_max_supply: number;
      current_supply: number;
    };
    mutable: boolean;
    burnt: boolean;
    compression: {
      compressed: boolean;
      data_hash: string;
      creator_hash: string;
      asset_hash: string;
      tree: string;
      seq: number;
      leaf_id: number;
    };
    grouping: {
      group_key: string;
      group_value: string;
    }[];
    royalty: {
      royalty_model: string;
      target: string | null;
      percent: number;
      basis_points: number;
      primary_sale_happened: boolean;
      locked: boolean;
    };
    creators: {
      address: string;
      share: number;
      verified: boolean;
    }[];
    ownership: {
      frozen: boolean;
      delegated: boolean;
      delegate: string | null;
      ownership_model: string;
    };
    supplyDetails: {
      edition_nonce: number;
      print_current_supply: number;
      print_max_supply: number;
    };
    uses: {
      use_method: string;
      remaining: number;
      total: number;
    };
  };
  interfaces: string[];
  events: {
    source: string;
    type: string;
    amount: number;
    slot: number;
    timestamp: number;
    signer: string;
    txId: string;
  }[];
}

export interface HeliusLiquidityResponse {
  dex: string;
  poolAddress: string;
  liquidity: {
    tokenA: {
      mint: string;
      amount: string;
      decimals: number;
      priceUsdc: number;
    };
    tokenB: {
      mint: string;
      amount: string;
      decimals: number;
      priceUsdc: number;
    };
  };
}

export interface HeliusCreatorResponse {
  address: string;
  createdAt: number;
  totalTokens: number;
  successfulTokens: number;
  failedTokens: number;
  transactions: {
    signature: string;
    type: string;
    timestamp: number;
    success: boolean;
  }[];
}

export interface HeliusTradeHistoryResponse {
  swaps: {
    signature: string;
    timestamp: number;
    success: boolean;
    amountIn: number;
    amountOut: number;
    priceImpact: number;
    holder: string;
  }[];
  summary: {
    totalSwaps: number;
    successfulSwaps: number;
    uniqueHolders: number;
    averagePriceImpact: number;
  };
}

export interface HeliusSimulationResponse {
  success: boolean;
  logs: string[];
  unitsConsumed: number;
  error?: string;
  priceImpact?: number;
  expectedOutput?: {
    amount: number;
    decimals: number;
    usdValue: number;
  };
}

// Combined Rug Check Types
export interface RugCheckResult {
  provider: 'helius' | 'rugcheck.xyz';
  success: boolean;
  details: HeliusRugCheckDetails | RugCheckXYZDetails;
  warnings: string[];
  errors: string[];
}

export interface HeliusRugCheckDetails {
  tokenAge: number;
  liquidityAnalysis: {
    totalLiquiditySol: number;
    dexesWithLiquidity: string[];
    isPairHealthy: boolean;
  };
  creatorAnalysis: {
    creatorAge: number;
    totalTokens: number;
    failedTokens: number;
    isCreatorTrusted: boolean;
  };
  permissions: {
    hasFreezeAuthority: boolean;
    hasMintAuthority: boolean;
    isTokenFrozen: boolean;
  };
  tradingMetrics: {
    successfulSwaps: number;
    failedSwaps: number;
    uniqueHolders: number;
    averagePriceImpact: number;
  };
  simulationResults: {
    success: boolean;
    priceImpact: number;
    error?: string;
  };
}

export interface RugCheckXYZDetails {
  risks: {
    name: string;
    value: string;
    description: string;
    score: number;
    level: string;
  }[];
}

// Configuration Types
export interface HeliusConfig {
  verbose_log: boolean;
  token_age_min_days: number;
  min_liquidity_sol: number;
  min_holders: number;
  max_single_holder_percentage: number;
  required_dexes: string[];
  min_dexes_with_liquidity: number;
  creator_checks: {
    min_creator_account_age_days: number;
    check_creator_other_tokens: boolean;
    max_failed_tokens_by_creator: number;
  };
  permissions: {
    allow_freeze_authority: boolean;
    allow_mint_authority: boolean;
  };
  trading_pattern: {
    min_successful_swaps: number;
    max_failed_swaps_percentage: number;
    min_unique_holders_traded: number;
  };
  simulation: {
    enabled: boolean;
    min_success_rate: number;
    max_price_impact_percentage: number;
  };
}

export interface RugCheckXYZConfig {
  verbose_log: boolean;
  single_holder_ownership: number;
  low_liquidity: number;
  not_allowed: string[];
}

export interface RugCheckConfig {
  provider: 'helius' | 'rugcheck_xyz';
  rugcheck_xyz: RugCheckXYZConfig;
  helius: HeliusConfig;
}

export interface LiquidityPoolConfig {
  ignore_pump_fun: boolean;
  radiyum_program_id: string;
  wsol_pc_mint: string;
}

export interface TransactionConfig {
  get_retry_interval: number;
  get_retry_timeout: number;
  get_timeout: number;
}

export interface SwapConfig {
  verbose_log: boolean;
  prio_fee_max_lamports: number;
  prio_level: string;
  amount: string;
  slippageBps: string;
  db_name_tracker_holdings: string;
  token_not_tradable_400_error_retries: number;
  token_not_tradable_400_error_delay: number;
}

export interface SellConfig {
  prio_fee_max_lamports: number;
  prio_level: string;
  slippageBps: string;
  auto_sell: boolean;
  stop_loss_percent: number;
  take_profit_percent: number;
  track_public_wallet: string;
}

export interface Config {
  liquidity_pool: LiquidityPoolConfig;
  tx: TransactionConfig;
  swap: SwapConfig;
  sell: SellConfig;
  rug_check: RugCheckConfig;
}

// Frontend Configuration Types
export interface FrontendLiquidityPoolConfig {
  ignorePumpFun: boolean;
  radiyumProgramId: string;
  wsolPcMint: string;
}

export interface FrontendTransactionConfig {
  getRetryInterval: number;
  getRetryTimeout: number;
  getTimeout: number;
}

export interface FrontendSwapConfig {
  verboseLog: boolean;
  prioFeeMaxLamports: number;
  prioLevel: string;
  amount: string;
  slippageBps: string;
  dbNameTrackerHoldings: string;
  tokenNotTradable400ErrorRetries: number;
  tokenNotTradable400ErrorDelay: number;
}

export interface FrontendSellConfig {
  prioFeeMaxLamports: number;
  prioLevel: string;
  slippageBps: string;
  autoSell: boolean;
  stopLossPercent: number;
  takeProfitPercent: number;
  trackPublicWallet: string;
}

export interface FrontendRugCheckConfig {
  provider: 'helius' | 'rugcheck_xyz';
  verboseLog: boolean;
  singleHolderOwnership: number;
  lowLiquidity: number;
  notAllowed: string[];
}

export interface FrontendConfig {
  liquidityPool: FrontendLiquidityPoolConfig;
  transaction: FrontendTransactionConfig;
  swap: FrontendSwapConfig;
  sell: FrontendSellConfig;
  rugCheck: FrontendRugCheckConfig;
}
