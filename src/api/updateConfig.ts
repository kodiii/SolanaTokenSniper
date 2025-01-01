import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    // Convert frontend format to backend format
    const backendConfig = {
      liquidity_pool: {
        ignore_pump_fun: settings.liquidityPool.ignorePumpFun,
        radiyum_program_id: settings.liquidityPool.radiyumProgramId,
        wsol_pc_mint: settings.liquidityPool.wsolPcMint,
      },
      tx: {
        get_retry_interval: settings.transaction.getRetryInterval,
        get_retry_timeout: settings.transaction.getRetryTimeout,
        get_timeout: settings.transaction.getTimeout,
      },
      swap: {
        verbose_log: settings.swap.verboseLog,
        prio_fee_max_lamports: settings.swap.prioFeeMaxLamports,
        prio_level: settings.swap.prioLevel,
        amount: settings.swap.amount,
        slippageBps: settings.swap.slippageBps,
        db_name_tracker_holdings: settings.swap.dbNameTrackerHoldings,
        token_not_tradable_400_error_retries: settings.swap.tokenNotTradable400ErrorRetries,
        token_not_tradable_400_error_delay: settings.swap.tokenNotTradable400ErrorDelay,
      },
      sell: {
        prio_fee_max_lamports: settings.sell.prioFeeMaxLamports,
        prio_level: settings.sell.prioLevel,
        slippageBps: settings.sell.slippageBps,
        auto_sell: settings.sell.autoSell,
        stop_loss_percent: settings.sell.stopLossPercent,
        take_profit_percent: settings.sell.takeProfitPercent,
        track_public_wallet: settings.sell.trackPublicWallet,
      },
      rug_check: {
        verbose_log: settings.rugCheck.verboseLog,
        single_holder_ownership: settings.rugCheck.singleHolderOwnership,
        low_liquidity: settings.rugCheck.lowLiquidity,
        not_allowed: settings.rugCheck.notAllowed,
      },
    };

    // Convert config to string
    const configContent = `export const config = ${JSON.stringify(backendConfig, null, 2)};`;

    // Write to config.ts
    await fs.writeFile(
      path.resolve(process.cwd(), 'src', 'config.ts'),
      configContent
    );

    res.json({ message: 'Config updated successfully' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ 
      error: 'Failed to update config', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
};
