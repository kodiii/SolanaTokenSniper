import * as sqlite3 from "sqlite3";
import chalk from "chalk";
import { ConnectionManager } from "../tracker/db/connection_manager";
import { initializePaperTradingDB } from "../tracker/paper_trading";
import { config } from "../config";

const DB_PATH = "src/tracker/paper_trading.db";
const TABLE_WIDTH = 150;
const TOKEN_COL_WIDTH = 45;
const NUM_COL_WIDTH = 15;
const TIME_COL_WIDTH = 25;

interface TokenPosition {
    token_mint: string;
    token_name: string;
    amount: number;
    buy_price: number;
    current_price: number;
    last_updated: number;
    stop_loss: number;
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
    // Top border with title
    console.log('\n' + BOX.topLeft + BOX.horizontal.repeat(2) + 
                chalk.bold.blue(` ${title} `) + 
                BOX.horizontal.repeat(TABLE_WIDTH - title.length - 4) + BOX.topRight);
    
    // Content with side borders
    content.forEach(line => {
        console.log(BOX.vertical + ' ' + line + ' '.repeat(Math.max(0, TABLE_WIDTH - line.length - 2)) + BOX.vertical);
    });
    
    // Bottom border
    console.log(BOX.bottomLeft + BOX.horizontal.repeat(TABLE_WIDTH) + BOX.bottomRight);
}

function drawTable(headers: string[], rows: string[][], title: string): void {
    const headerLine = headers.join(BOX.vertical);
    const separator = BOX.horizontal.repeat(TABLE_WIDTH);
    
    console.log('\n' + BOX.topLeft + BOX.horizontal.repeat(2) + 
                chalk.bold.blue(` ${title} `) + 
                BOX.horizontal.repeat(TABLE_WIDTH - title.length - 4) + BOX.topRight);
    
    // Headers
    console.log(BOX.vertical + ' ' + chalk.yellow(headerLine) + ' ' + BOX.vertical);
    
    // Separator after headers
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
                'Amount'.padEnd(NUM_COL_WIDTH),
                'Buy Price'.padEnd(NUM_COL_WIDTH),
                'Current Price'.padEnd(NUM_COL_WIDTH),
                'PNL'.padEnd(NUM_COL_WIDTH),
                'Stop Loss'.padEnd(NUM_COL_WIDTH),
                'Take Profit'.padEnd(NUM_COL_WIDTH)
            ];

            const rows = positions.map(pos => {
                const pnlPercent = ((pos.current_price - pos.buy_price) / pos.buy_price) * 100;
                const pnlColor = pnlPercent >= 0 ? chalk.green : chalk.red;
                return [
                    pos.token_mint.padEnd(TOKEN_COL_WIDTH),
                    pos.amount.toFixed(4).padEnd(NUM_COL_WIDTH),
                    pos.buy_price.toFixed(4).padEnd(NUM_COL_WIDTH),
                    pos.current_price.toFixed(4).padEnd(NUM_COL_WIDTH),
                    pnlColor(pnlPercent.toFixed(2) + '%'.padEnd(NUM_COL_WIDTH - 3)),
                    pos.stop_loss.toFixed(4).padEnd(NUM_COL_WIDTH),
                    pos.take_profit.toFixed(4).padEnd(NUM_COL_WIDTH)
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

async function displayRecentTrades(limit: number = 10): Promise<void> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();
        const trades = await db.all(
            'SELECT * FROM simulated_trades ORDER BY timestamp DESC LIMIT ?',
            [limit]
        );
        connectionManager.releaseConnection(db);

        if (trades.length > 0) {
            const headers = [
                'Time'.padEnd(TIME_COL_WIDTH),
                'Type'.padEnd(10),
                'Token'.padEnd(TOKEN_COL_WIDTH),
                'Amount SOL'.padEnd(NUM_COL_WIDTH),
                'Price/Token'.padEnd(NUM_COL_WIDTH),
                'Fees'.padEnd(NUM_COL_WIDTH)
            ];

            const rows = trades.map(trade => [
                new Date(trade.timestamp).toLocaleString().padEnd(TIME_COL_WIDTH),
                (trade.type === 'buy' ? chalk.green : chalk.red)(trade.type.toUpperCase().padEnd(10)),
                trade.token_mint.padEnd(TOKEN_COL_WIDTH),
                trade.amount_sol.toFixed(4).padEnd(NUM_COL_WIDTH),
                trade.price_per_token.toFixed(4).padEnd(NUM_COL_WIDTH),
                trade.fees.toFixed(4).padEnd(NUM_COL_WIDTH)
            ]);

            drawTable(headers, rows, '📈 Recent Trades');
        } else {
            drawBox('📈 Recent Trades', [chalk.yellow('No trades recorded yet')]);
        }
    } catch (error) {
        console.error('Error fetching recent trades:', error);
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