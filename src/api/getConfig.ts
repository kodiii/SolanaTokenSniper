import { Request, Response } from 'express';
import { config } from '../config';
import { FrontendConfig, RugCheckConfig } from '../types';

export const getConfig = async (req: Request, res: Response) => {
  try {
    // Get the current rug check provider and its config
    const rugCheckConfig = config.rug_check as unknown as RugCheckConfig;
    const currentProvider = rugCheckConfig.provider;

    // Convert config to frontend format
    const frontendConfig: FrontendConfig = {
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
        provider: currentProvider,
        verboseLog: currentProvider === 'rugcheck_xyz' 
          ? rugCheckConfig.rugcheck_xyz.verbose_log 
          : rugCheckConfig.helius.verbose_log,
        singleHolderOwnership: currentProvider === 'rugcheck_xyz' 
          ? rugCheckConfig.rugcheck_xyz.single_holder_ownership 
          : rugCheckConfig.helius.max_single_holder_percentage,
        lowLiquidity: currentProvider === 'rugcheck_xyz' 
          ? rugCheckConfig.rugcheck_xyz.low_liquidity 
          : rugCheckConfig.helius.min_liquidity_sol,
        notAllowed: currentProvider === 'rugcheck_xyz' 
          ? rugCheckConfig.rugcheck_xyz.not_allowed 
          : [
            rugCheckConfig.helius.permissions.allow_freeze_authority ? '' : 'Freeze Authority still enabled',
            rugCheckConfig.helius.permissions.allow_mint_authority ? '' : 'Mint Authority still enabled'
          ].filter(Boolean),
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
