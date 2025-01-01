export const config = {
  "liquidity_pool": {
    "ignore_pump_fun": false,
    "radiyum_program_id": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "wsol_pc_mint": "So11111111111111111111111111111111111111112"
  },
  "tx": {
    "get_retry_interval": 750,
    "get_retry_timeout": 20000,
    "get_timeout": 10000
  },
  "swap": {
    "verbose_log": true,
    "prio_fee_max_lamports": 1000000,
    "prio_level": "veryHigh",
    "amount": "10000000",
    "slippageBps": "200",
    "db_name_tracker_holdings": "src/tracker/holdings.db",
    "token_not_tradable_400_error_retries": 5,
    "token_not_tradable_400_error_delay": 2000
  },
  "sell": {
    "prio_fee_max_lamports": 1000000,
    "prio_level": "veryHigh",
    "slippageBps": "200",
    "auto_sell": true,
    "stop_loss_percent": 2,
    "take_profit_percent": 10,
    "track_public_wallet": ""
  },
  "rug_check": {
    "verbose_log": true,
    "single_holder_ownership": 30,
    "low_liquidity": 1000,
    "not_allowed": [
      "Freeze Authority still enabled",
      "Copycat token"
    ]
  }
};