import dotenv from 'dotenv';
dotenv.config();

interface LiquidityPoolConfig {
  radiyum_program_id: string;
  wsol_pc_mint: string;
}

interface HealthCheckConfig {
  interval: number;
  timeout: number;
  max_failures: number;
  preferred_region: string;
  endpoint_discovery: {
    enabled: boolean;
    interval: number;
    providers: string[];
  };
  fallback_endpoints: Array<{
    url: string;
    region: string;
    weight: number;
  }>;
  rate_limiting: {
    enabled: boolean;
    max_requests_per_minute: number;
    initial_backoff_ms: number;
    max_backoff_ms: number;
    backoff_factor: number;
    error_threshold: number;
    header_names: {
      limit: string;
      remaining: string;
      reset: string;
    };
  };
  metrics: {
    enabled: boolean;
    collection_interval: number;
    retention_period: number;
  };
}

interface BatchingConfig {
  enabled: boolean;
  min_batch_size: number;
  max_batch_size: number;
  congestion_threshold: number;
  check_interval: number;
  backoff_factor: number;
  growth_factor: number;
}

interface MevConfig {
  enabled: boolean;
  jito_endpoint: string;
  tip_percentage: number;
  max_tip_lamports: number;
  min_tip_lamports: number;
}

interface PreSigningConfig {
  enabled: boolean;
  max_queue_size: number;
  max_signature_age: number;
  retry_interval: number;
  max_retries: number;
}

interface SwapConfig {
  verbose_log: boolean;
  prio_fee_max_lamports: number;
  prio_level: string;
  amount: string;
  slippageBps: string;
  db_name_tracker_holdings: string;
  token_not_tradable_400_error_retries: number;
  token_not_tradable_400_error_delay: number;
}

interface SellConfig {
  price_source: string;
  prio_fee_max_lamports: number;
  prio_level: string;
  slippageBps: string;
  auto_sell: boolean;
  stop_loss_percent: number;
  take_profit_percent: number;
  track_public_wallet: string;
}

interface RugCheckConfig {
  verbose_log: boolean;
  simulation_mode: boolean;
  allow_mint_authority: boolean;
  allow_not_initialized: boolean;
  allow_freeze_authority: boolean;
  allow_rugged: boolean;
  allow_mutable: boolean;
  block_returning_token_names: boolean;
  block_returning_token_creators: boolean;
  block_symbols: string[];
  block_names: string[];
  only_contain_string: boolean;
  contain_string: string[];
  allow_insider_topholders: boolean;
  max_alowed_pct_topholders: number;
  max_alowed_pct_all_topholders: number;
  exclude_lp_from_topholders: boolean;
  min_total_markets: number;
  min_total_lp_providers: number;
  min_total_market_Liquidity: number;
  ignore_pump_fun: boolean;
  max_score: number;
  legacy_not_allowed: string[];
}

interface WalletMonitoringConfig {
  check_interval: number;
  max_wallet_history: number;
  suspicious_activity: {
    max_transactions_per_minute: number;
    large_transfer_threshold: number;
    new_token_threshold: number;
    token_drain_threshold: number;
  };
}

interface ParallelConfig {
  max_workers: number;
  worker_timeout: number;
}

interface TxConfig {
  fetch_tx_max_retries: number;
  fetch_tx_initial_delay: number;
  swap_tx_initial_delay: number;
  get_timeout: number;
  concurrent_transactions: number;
  retry_delay: number;
  health_check: HealthCheckConfig;
  batching: BatchingConfig;
  mev: MevConfig;
  pre_signing: PreSigningConfig;
}

interface AppConfig {
  liquidity_pool: LiquidityPoolConfig;
  tx: TxConfig;
  swap: SwapConfig;
  sell: SellConfig;
  rug_check: RugCheckConfig;
  monitoring: {
    wallet: WalletMonitoringConfig;
  };
  parallel: ParallelConfig;
}

/**
 * Application configuration object
 */
export const config: AppConfig = {
  liquidity_pool: {
    radiyum_program_id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    wsol_pc_mint: "So11111111111111111111111111111111111111112",
  },
  tx: {
    fetch_tx_max_retries: 5,
    fetch_tx_initial_delay: 1000,
    swap_tx_initial_delay: 500,
    get_timeout: 10000,
    concurrent_transactions: 4,
    retry_delay: 500,
    health_check: {
      interval: 30000,
      timeout: 5000,
      max_failures: 3,
      preferred_region: "auto",
      endpoint_discovery: {
        enabled: true,
        interval: 600000,
        providers: [
          process.env.HELIUS_RPC_URL || "https://rpc.helius.xyz",
          "https://api.mainnet-beta.solana.com",
          "https://rpcpool.com"
        ]
      },
      fallback_endpoints: [
        {
          url: process.env.HELIUS_RPC_URL || "https://rpc.helius.xyz",
          region: "us-east-1",
          weight: 1.5
        },
        {
          url: "https://api.mainnet-beta.solana.com",
          region: "us-west-1",
          weight: 1.0
        },
        {
          url: "https://solana-api.projectserum.com",
          region: "us-west-1",
          weight: 1.0
        },
        {
          url: "https://eu.rpcpool.com",
          region: "eu-central-1",
          weight: 1.0
        },
        {
          url: "https://asia.rpcpool.com",
          region: "ap-southeast-1",
          weight: 1.0
        }
      ],
      rate_limiting: {
        enabled: true,
        max_requests_per_minute: 120,
        initial_backoff_ms: 1000,
        max_backoff_ms: 60000,
        backoff_factor: 2,
        error_threshold: 3,
        header_names: {
          limit: "x-rate-limit-limit",
          remaining: "x-rate-limit-remaining",
          reset: "x-rate-limit-reset"
        }
      },
      metrics: {
        enabled: true,
        collection_interval: 60000,
        retention_period: 604800000
      }
    },
    batching: {
      enabled: true,
      min_batch_size: 1,
      max_batch_size: 5,
      congestion_threshold: 0.7,
      check_interval: 10000,
      backoff_factor: 1.5,
      growth_factor: 1.2
    },
    mev: {
      enabled: true,
      jito_endpoint: "https://mainnet.block-engine.jito.wtf",
      tip_percentage: 0.1,
      max_tip_lamports: 1000000,
      min_tip_lamports: 50000
    },
    pre_signing: {
      enabled: true,
      max_queue_size: 10,
      max_signature_age: 30000,
      retry_interval: 1000,
      max_retries: 3
    }
  },
  swap: {
    verbose_log: false,
    prio_fee_max_lamports: 1000000,
    prio_level: "medium",
    amount: "10000000",
    slippageBps: "200",
    db_name_tracker_holdings: "src/tracker/holdings.db",
    token_not_tradable_400_error_retries: 5,
    token_not_tradable_400_error_delay: 2000,
  },
  sell: {
    price_source: "dex",
    prio_fee_max_lamports: 1000000,
    prio_level: "medium",
    slippageBps: "200",
    auto_sell: true,
    stop_loss_percent: 30,
    take_profit_percent: 25,
    track_public_wallet: "",
  },
  rug_check: {
    verbose_log: false,
    simulation_mode: true,
    allow_mint_authority: false,
    allow_not_initialized: false,
    allow_freeze_authority: false,
    allow_rugged: false,
    allow_mutable: false,
    block_returning_token_names: true,
    block_returning_token_creators: true,
    block_symbols: ["XXX"],
    block_names: ["XXX"],
    only_contain_string: false,
    contain_string: ["AI", "GPT", "AGENT"],
    allow_insider_topholders: false,
    max_alowed_pct_topholders: 15,
    max_alowed_pct_all_topholders: 30,
    exclude_lp_from_topholders: true,
    min_total_markets: 0,
    min_total_lp_providers: 0,
    min_total_market_Liquidity: 30000,
    ignore_pump_fun: true,
    max_score: 11400,
    legacy_not_allowed: [
      "Single holder ownership",
      "High holder concentration",
      "Freeze Authority still enabled",
      "Copycat token",
    ],
  },
  monitoring: {
    wallet: {
      check_interval: 60000,
      max_wallet_history: 100,
      suspicious_activity: {
        max_transactions_per_minute: 10,
        large_transfer_threshold: 1000000000,
        new_token_threshold: 3,
        token_drain_threshold: 0.8
      }
    }
  },
  parallel: {
    max_workers: 4,
    worker_timeout: 30000
  }
};
