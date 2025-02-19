import * as sqlite3 from "sqlite3";
import chalk from "chalk";
import { ConnectionManager } from "../tracker/db/connection_manager";
import { initializePaperTradingDB } from "../tracker/paper_trading";
import { config } from "../config";

const DB_PATH = "src/tracker/paper_trading.db";
const TABLE_WIDTH = 200;
const TOKEN_COL_WIDTH = 45;
const NUM_COL_WIDTH = 18;
const TIME_COL_WIDTH = 25;
const PRICE_COL_WIDTH = 20;

interface TokenPosition {
    token_mint: string;
    token_name: string;
    amount: number;
    buy_price: number;
    volume_m5: number;
    market_cap: number;
    liquidity_usd: number;
    current_price: number;
    last_updated: number;
    buy_time: number;
    stop_loss: number;
    sell_time: number | null;
    take_profit: number;
}

interface SimulatedTrade {
    timestamp: number;
    token_mint: string;
    token_name: string;
    amount_sol: number;
    amount_token: number;
    price_per_token: number;
    type: 'buy' | 'sell';
    fees: number;
}

interface TradingStats {
    totalTrades: number;
    profitableTrades: number;
    totalProfitLoss: number;
    winRate: number;
    avgProfitPerTrade: number;
    bestTrade: { token: string; profit: number };
    worstTrade: { token: string; profit: number };
}

const BOX = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
    topT: '┬',
    bottomT: '┴',
    cross: '┼',
};

function drawBox(title: string, content: string[]): void {
    const titleBar = chalk.bold.blue(` ${title} `);
    const fullWidth = TABLE_WIDTH;
    
    // Top border with title
    console.log('\n' + BOX.topLeft + BOX.horizontal.repeat(2) +
                titleBar +
                BOX.horizontal.repeat(fullWidth - titleBar.length - 4) + BOX.topRight);
    
    // Content lines
    content.forEach(line => {
        const paddedLine = line.padEnd(fullWidth - 3); // -3 for the border chars and space
        console.log(BOX.vertical + ' ' + paddedLine + ' ' + BOX.vertical);
    });
    
    // Bottom border
    console.log(BOX.bottomLeft + BOX.horizontal.repeat(fullWidth) + BOX.bottomRight);
}

function drawTable(headers: string[], rows: string[][], title: string): void {
    const titleBar = chalk.bold.blue(` ${title} `);
    const fullWidth = TABLE_WIDTH;
    
    // Top border with title
    console.log('\n' + BOX.topLeft + BOX.horizontal.repeat(2) +
                titleBar +
                BOX.horizontal.repeat(fullWidth - titleBar.length - 4) + BOX.topRight);
    
    // Headers
    const headerLine = headers.join(BOX.vertical);
    console.log(BOX.vertical + ' ' + chalk.yellow(headerLine) + ' ' + BOX.vertical);
    
    // Separator after headers
    const separator = BOX.horizontal.repeat(fullWidth);
    console.log(BOX.leftT + separator + BOX.rightT);
    
    // Data rows
    rows.forEach(row => {
        console.log(BOX.vertical + ' ' + row.join(BOX.vertical) + ' ' + BOX.vertical);
    });
    
    // Bottom border
    console.log(BOX.bottomLeft + separator + BOX.bottomRight);
}

async function displayVirtualBalance(): Promise<void> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();
        const balance = await db.get('SELECT * FROM virtual_balance ORDER BY id DESC LIMIT 1');
        connectionManager.releaseConnection(db);

        if (balance) {
            const content = [
                `${chalk.yellow('SOL Balance:')} ${chalk.green(balance.balance_sol.toFixed(4))} SOL`,
                `${chalk.yellow('Last Updated:')} ${new Date(balance.updated_at).toLocaleString()}`
            ];
            drawBox('📊 Virtual Balance', content);
        }
    } catch (error) {
        console.error('Error fetching virtual balance:', error);
    }
}

async function displayActivePositions(): Promise<void> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();
        const positions = await db.all('SELECT * FROM token_tracking');
        connectionManager.releaseConnection(db);

        if (positions.length > 0) {
            const headers = [
                'Token'.padEnd(TOKEN_COL_WIDTH),
                'Position Size'.padEnd(NUM_COL_WIDTH),
                'Entry Price'.padEnd(PRICE_COL_WIDTH),
                'Current Price'.padEnd(PRICE_COL_WIDTH),
                'PNL'.padEnd(NUM_COL_WIDTH)
            ];

            const rows = positions.map(pos => {
                const pnlPercent = ((pos.current_price - pos.buy_price) / pos.buy_price) * 100;
                const pnlColor = pnlPercent >= 0 ? chalk.green : chalk.red;
                return [
                    pos.token_name.padEnd(TOKEN_COL_WIDTH),
                    pos.amount.toFixed(8).padEnd(NUM_COL_WIDTH),
                    pos.buy_price.toFixed(8).padEnd(PRICE_COL_WIDTH),
                    pos.current_price.toFixed(8).padEnd(PRICE_COL_WIDTH),
                    pnlColor(pnlPercent.toFixed(2) + '%').padEnd(NUM_COL_WIDTH)
                ];
            });

            drawTable(headers, rows, '🎯 Active Positions');
        } else {
            drawBox('🎯 Active Positions', [chalk.yellow('No active positions')]);
        }
    } catch (error) {
        console.error('Error fetching active positions:', error);
    }
}

async function displayRecentTrades(limit: number = 20): Promise<void> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();
        const trades = await db.all(
            'SELECT * FROM simulated_trades ORDER BY timestamp DESC LIMIT ?',
            [limit * 2] // Fetch more to ensure we get both buy and sell
        );
        connectionManager.releaseConnection(db);

        if (trades.length > 0) {
            const headers = [
                'Token Name'.padEnd(TOKEN_COL_WIDTH),
                'Volume m5'.padEnd(NUM_COL_WIDTH),
                'MarketCap'.padEnd(NUM_COL_WIDTH),
                'Liquidity USD'.padEnd(NUM_COL_WIDTH),
                'Buy Price'.padEnd(PRICE_COL_WIDTH),
                'Buy Fees'.padEnd(NUM_COL_WIDTH),
                'Amount'.padEnd(NUM_COL_WIDTH),
                'Time Buy'.padEnd(TIME_COL_WIDTH),
                'Sell Price'.padEnd(PRICE_COL_WIDTH),
                'Sell Fees'.padEnd(NUM_COL_WIDTH),
                'Time Sold'.padEnd(TIME_COL_WIDTH),
                'PNL'.padEnd(NUM_COL_WIDTH)
            ];

            // Create a map to store unique trades by token
            const tradeMap = new Map();
            
            // Process trades in chronological order to ensure buys come before sells
            trades.sort((a, b) => a.timestamp - b.timestamp).forEach(trade => {
                if (trade.type === 'buy' && !tradeMap.has(trade.token_mint)) {
                    tradeMap.set(trade.token_mint, {
                        token_name: trade.token_name || trade.token_mint,
                        volume_m5: Number(trade.volume_m5) || 0,
                        market_cap: Number(trade.market_cap) || 0,
                        liquidity_usd: Number(trade.liquidity_usd) || 0,
                        buy_price: Number(trade.price_per_token),
                        buy_fees: Number(trade.fees),
                        amount: Number(trade.amount_token),
                        buy_time: trade.timestamp,
                        sell_price: null,
                        sell_fees: null,
                        sell_time: null
                    });
                } else if (trade.type === 'sell') {
                    const existingTrade = tradeMap.get(trade.token_mint);
                    if (existingTrade && !existingTrade.sell_time) {
                        existingTrade.sell_price = Number(trade.price_per_token);
                        existingTrade.sell_fees = Number(trade.fees);
                        existingTrade.sell_time = trade.timestamp;
                    }
                }
            });

            const rows = Array.from(tradeMap.entries())
                .sort(([, a], [, b]) => (b.buy_time || 0) - (a.buy_time || 0))
                .slice(0, limit)
                .map(([, trade]) => {
                    const pnl = trade.sell_price
                        ? ((trade.sell_price - trade.buy_price) / trade.buy_price * 100)
                        : 0;
                    const pnlFormatted = trade.sell_price
                        ? (pnl >= 0 ? chalk.green : chalk.red)(`${pnl.toFixed(2)}%`)
                        : '0%';

                    return [
                        trade.token_name.padEnd(TOKEN_COL_WIDTH),
                        (trade.volume_m5 ? trade.volume_m5.toFixed(2) : '0').padEnd(NUM_COL_WIDTH),
                        (trade.market_cap ? trade.market_cap.toFixed(2) : '0').padEnd(NUM_COL_WIDTH),
                        (trade.liquidity_usd ? trade.liquidity_usd.toFixed(2) : '0').padEnd(NUM_COL_WIDTH),
                        trade.buy_price.toFixed(8).padEnd(PRICE_COL_WIDTH),
                        trade.buy_fees.toFixed(8).padEnd(NUM_COL_WIDTH),
                        trade.amount.toFixed(8).padEnd(NUM_COL_WIDTH),
                        new Date(trade.buy_time).toLocaleString().padEnd(TIME_COL_WIDTH),
                        (trade.sell_price ? trade.sell_price.toFixed(8) : '0').padEnd(PRICE_COL_WIDTH),
                        (trade.sell_fees ? trade.sell_fees.toFixed(8) : '0').padEnd(NUM_COL_WIDTH),
                        (trade.sell_time ? new Date(trade.sell_time).toLocaleString() : '').padEnd(TIME_COL_WIDTH),
                        pnlFormatted.padEnd(NUM_COL_WIDTH)
                    ];
                });

            drawTable(headers, rows, '📈 Recent Trades');
        } else {
            drawBox('📈 Recent Trades', [chalk.yellow('No trades recorded yet')]);
        }
    } catch (error) {
        console.error('Error fetching recent trades:', error);
    }
}

async function displayTradingStats(stats: TradingStats): Promise<void> {
    const content = [
        `${chalk.yellow('Total Trades:')} ${stats.totalTrades}`,
        `${chalk.yellow('Win Rate:')} ${stats.winRate >= 50 ? chalk.green(stats.winRate.toFixed(1)) : chalk.red(stats.winRate.toFixed(1))}%`,
        `${chalk.yellow('Total P/L:')} ${stats.totalProfitLoss >= 0 ? chalk.green(stats.totalProfitLoss.toFixed(4)) : chalk.red(stats.totalProfitLoss.toFixed(4))} SOL`,
        `${chalk.yellow('Avg P/L per Trade:')} ${stats.avgProfitPerTrade >= 0 ? chalk.green(stats.avgProfitPerTrade.toFixed(4)) : chalk.red(stats.avgProfitPerTrade.toFixed(4))} SOL`,
    ];

    if (stats.bestTrade.profit !== -Infinity) {
        const bestTradeColor = stats.bestTrade.profit >= 0 ? chalk.green : chalk.red;
        content.push(`${chalk.yellow('Best Trade:')} ${stats.bestTrade.token} (${bestTradeColor(stats.bestTrade.profit.toFixed(4))} SOL)`);
    }
    if (stats.worstTrade.profit !== Infinity) {
        const worstTradeColor = stats.worstTrade.profit >= 0 ? chalk.green : chalk.red;
        content.push(`${chalk.yellow('Worst Trade:')} ${stats.worstTrade.token} (${worstTradeColor(stats.worstTrade.profit.toFixed(4))} SOL)`);
    }

    drawBox('📈 Trading Statistics', content);
}

async function calculateTradingStats(): Promise<TradingStats | null> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();
        const trades = await db.all('SELECT * FROM simulated_trades');
        connectionManager.releaseConnection(db);

        if (trades.length === 0) return null;

        const tokenTrades = new Map<string, SimulatedTrade[]>();
        trades.forEach(trade => {
            if (!tokenTrades.has(trade.token_mint)) {
                tokenTrades.set(trade.token_mint, []);
            }
            tokenTrades.get(trade.token_mint)?.push(trade);
        });

        let totalProfitLoss = 0;
        let profitableTrades = 0;
        let bestTrade = { token: '', profit: -Infinity };
        let worstTrade = { token: '', profit: Infinity };

        tokenTrades.forEach((trades, tokenMint) => {
            let buyTotal = 0;
            let sellTotal = 0;
            let buyFees = 0;
            let sellFees = 0;

            trades.forEach(trade => {
                if (trade.type === 'buy') {
                    buyTotal += trade.amount_sol;
                    buyFees += trade.fees;
                } else {
                    sellTotal += trade.amount_sol;
                    sellFees += trade.fees;
                }
            });

            const profit = sellTotal - buyTotal - (buyFees + sellFees);
            if (profit > 0) profitableTrades++;

            if (profit > bestTrade.profit) {
                bestTrade = { token: trades[0].token_mint, profit };
            }
            if (profit < worstTrade.profit && trades.some(t => t.type === 'sell')) {
                worstTrade = { token: trades[0].token_mint, profit };
            }

            totalProfitLoss += profit;
        });

        return {
            totalTrades: tokenTrades.size,
            profitableTrades,
            totalProfitLoss,
            winRate: (profitableTrades / tokenTrades.size) * 100,
            avgProfitPerTrade: totalProfitLoss / tokenTrades.size,
            bestTrade,
            worstTrade
        };
    } catch (error) {
        console.error('Error calculating trading stats:', error);
        return null;
    }
}

async function displayDashboard(): Promise<void> {
    console.clear();
    console.log(chalk.bold.cyan('\n=== Paper Trading Dashboard ==='));
    
    await displayVirtualBalance();
    await displayActivePositions();
    
    const stats = await calculateTradingStats();
    if (stats) {
        await displayTradingStats(stats);
    }
    
    await displayRecentTrades();

    console.log('\n' + chalk.gray(`Auto-refreshing every ${config.paper_trading.dashboard_refresh/1000} seconds. Press Ctrl+C to exit`));
}

async function startDashboard(): Promise<void> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    await connectionManager.initialize();
    
    const success = await initializePaperTradingDB();
    if (!success) {
        console.error('Failed to initialize paper trading database');
        return;
    }

    await displayDashboard();
    setInterval(displayDashboard, config.paper_trading.dashboard_refresh);
}

async function resetPaperTrading(): Promise<boolean> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();

        await db.exec(`
            DELETE FROM virtual_balance;
            DELETE FROM simulated_trades;
            DELETE FROM token_tracking;
        `);

        await db.run(
            'INSERT INTO virtual_balance (balance_sol, updated_at) VALUES (?, ?)',
            [config.paper_trading.initial_balance, Date.now()]
        );

        connectionManager.releaseConnection(db);
        console.log('🔄 Paper trading data reset successfully');
        console.log(`💰 Initial balance set to ${config.paper_trading.initial_balance} SOL`);
        return true;
    } catch (error) {
        console.error('Error resetting paper trading data:', error);
        return false;
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--reset')) {
        resetPaperTrading().then(() => process.exit(0));
    } else {
        startDashboard();
    }
}

export { startDashboard, resetPaperTrading };