import { Request, Response } from 'express';
import { config } from '../config';

export const getConfig = async (req: Request, res: Response) => {
  try {
    // Convert config to frontend format
    const frontendConfig = {
      liquidityPool: {
        ignorePumpFun: config.liquidity_pool.ignore_pump_fun,
        radiyumProgramId: config.liquidity_pool.radiyum_program_id,
        wsolPcMint: config.liquidity_pool.wsol_pc_mint,
      },
      transaction: {
        getRetryInterval: config.tx.get_retry_interval,
        getRetryTimeout: config.tx.get_retry_timeout,
        getTimeout: config.tx.get_timeout,
      },
      swap: {
        verboseLog: config.swap.verbose_log,
        prioFeeMaxLamports: config.swap.prio_fee_max_lamports,
        prioLevel: config.swap.prio_level,
        amount: config.swap.amount,
        slippageBps: config.swap.slippageBps,
        dbNameTrackerHoldings: config.swap.db_name_tracker_holdings,
        tokenNotTradable400ErrorRetries: config.swap.token_not_tradable_400_error_retries,
        tokenNotTradable400ErrorDelay: config.swap.token_not_tradable_400_error_delay,
      },
      sell: {
        prioFeeMaxLamports: config.sell.prio_fee_max_lamports,
        prioLevel: config.sell.prio_level,
        slippageBps: config.sell.slippageBps,
        autoSell: config.sell.auto_sell,
        stopLossPercent: config.sell.stop_loss_percent,
        takeProfitPercent: config.sell.take_profit_percent,
        trackPublicWallet: config.sell.track_public_wallet,
      },
      rugCheck: {
        verboseLog: config.rug_check.verbose_log,
        singleHolderOwnership: config.rug_check.single_holder_ownership,
        lowLiquidity: config.rug_check.low_liquidity,
        notAllowed: config.rug_check.not_allowed,
      },
    };

    res.json(frontendConfig);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ 
      error: 'Failed to get config', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
};
