/** 
 *  * Detailed Explanations (To be continued)
 *  ...
**/
export const config = {
  paper_trading: {
    initial_balance: 3, // Initial paper trading balance in SOL
    dashboard_refresh: 1500, // Update dashboard every 5 seconds
    price_check: {
      max_retries: 15, // Maximum number of retries for price fetching
      initial_delay: 1000, // Start with 1 second delay
      max_delay: 15000, // Maximum delay between retries (5 seconds)
    }
  },
  // Paper trading price validation
  price_validation: {
    enabled: true,
    window_size: 12, // Number of price points to maintain (1 minute of history at 5-second intervals)
    max_deviation: 0.05, // Maximum 5% deviation from rolling average
    min_data_points: 6, // Minimum number of price points needed for validation
    fallback_to_single_source: true, // If true, will still execute trades with only one price source
  },
  liquidity_pool: {
    radiyum_program_id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    wsol_pc_mint: "So11111111111111111111111111111111111111112",
  },
  tx: {
    fetch_tx_max_retries: 5,
    fetch_tx_initial_delay: 1000, // Initial delay before fetching LP creation transaction details (3 seconds)
    swap_tx_initial_delay: 500, // Initial delay before first buy (1 second)
    get_timeout: 10000, // Timeout for API requests
    concurrent_transactions: 1, // Number of simultaneous transactions
    retry_delay: 500, // Delay between retries (0.5 seconds)
  },
  swap: {
    verbose_log: false,
    prio_fee_max_lamports: 10000000, // 0.01 SOL
    prio_level: "medium", // If you want to land transaction fast, set this to use `veryHigh`. You will pay on average higher priority fee.
    amount: "100000000", //0.01 SOL
    slippageBps: "200", // 2%
    db_name_tracker_holdings: "src/tracker/holdings.db", // Sqlite Database location
    token_not_tradable_400_error_retries: 5, // How many times should the bot try to get a quote if the token is not tradable yet
    token_not_tradable_400_error_delay: 2000, // How many seconds should the bot wait before retrying to get a quote again
  },
  sell: {
    price_source: "dex", // dex=Dexscreener,jup=Jupiter Agregator (Dex is most accurate and Jupiter is always used as fallback)
    prio_fee_max_lamports: 10000000, // 0.01 SOL
    prio_level: "medium", // If you want to land transaction fast, set this to use `veryHigh`. You will pay on average higher priority fee.
    slippageBps: "200", // 2%
    auto_sell: true, // If set to true, stop loss and take profit triggers automatically when set.
    stop_loss_percent: 10,
    take_profit_percent: 25,
    track_public_wallet: "", // If set an additional log line will be shown with a link to track your wallet
  },
  rug_check: {
    verbose_log: false,
    simulation_mode: true,
    // Dangerous
    allow_mint_authority: false, // The mint authority is the address that has permission to mint (create) new tokens. Strongly Advised to set to false.
    allow_not_initialized: false, // This indicates whether the token account is properly set up on the blockchain. Strongly Advised to set to false
    allow_freeze_authority: false, // The freeze authority is the address that can freeze token transfers, effectively locking up funds. Strongly Advised to set to false
    allow_rugged: false,
    // Critical
    allow_mutable: true,
    block_returning_token_names: true,
    block_returning_token_creators: true,
    block_symbols: ["XXX"],
    block_names: ["XXX"],
    only_contain_string: false, // Enable/disable string containment filter
    contain_string: ["AI", "GPT", "AGENT"], // Strings to match in token names (case insensitive)
    allow_insider_topholders: false, // Allow inseder accounts to be part of the topholders
    max_alowed_pct_topholders: 50, // Max allowed percentage an individual topholder might hold
    max_alowed_pct_all_topholders: 50, // Max allowed totalpercentage all topholders in total might hold related to supply
    exclude_lp_from_topholders: true, // If true, Liquidity Pools will not be seen as top holders
    // Warning
    min_total_markets: 0,
    min_total_lp_providers: 0,
    min_total_market_Liquidity: 5000,
    // Misc
    ignore_pump_fun: false,
    max_score: 20000, // Set to 0 to ignore
    legacy_not_allowed: [
      //"Low Liquidity",
      "Freeze Authority still enabled",
      "Single holder ownership",
      //"High holder concentration",
      "Freeze Authority still enabled",
      //"Large Amount of LP Unlocked",
      //"Low Liquidity",
      "Copycat token",
      //"Low amount of LP Providers",
    ],
  },
}
