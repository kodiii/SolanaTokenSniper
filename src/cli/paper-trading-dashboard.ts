import * as sqlite3 from "sqlite3";
import chalk from "chalk";
import { ConnectionManager } from "../tracker/db/connection_manager";
import { initializePaperTradingDB } from "../tracker/paper_trading";

const DB_PATH = "src/tracker/paper_trading.db";

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

async function displayVirtualBalance(): Promise<void> {
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    try {
        const db = await connectionManager.getConnection();
        const balance = await db.get('SELECT * FROM virtual_balance ORDER BY id DESC LIMIT 1');
        connectionManager.releaseConnection(db);

        if (balance) {
            console.log('\n' + chalk.bold.blue('📊 Virtual Balance'));
            console.log('━'.repeat(50));
            console.log(`${chalk.yellow('SOL Balance:')} ${chalk.green(balance.balance_sol.toFixed(4))} SOL`);
            console.log(`${chalk.yellow('Last Updated:')} ${new Date(balance.updated_at).toLocaleString()}`);
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
            console.log('\n' + chalk.bold.blue('🎯 Active Positions'));
            console.log('━'.repeat(120));
            console.log(
                chalk.yellow(
                    'Token'.padEnd(20) +
                    'Amount'.padEnd(15) +
                    'Buy Price'.padEnd(15) +
                    'Current Price'.padEnd(15) +
                    'PNL'.padEnd(15) +
                    'Stop Loss'.padEnd(15) +
                    'Take Profit'.padEnd(15)
                )
            );
            console.log('━'.repeat(120));

            for (const pos of positions) {
                const pnlPercent = ((pos.current_price - pos.buy_price) / pos.buy_price) * 100;
                const pnlColor = pnlPercent >= 0 ? chalk.green : chalk.red;
                console.log(
                    pos.token_name.padEnd(20) +
                    pos.amount.toFixed(4).padEnd(15) +
                    pos.buy_price.toFixed(4).padEnd(15) +
                    pos.current_price.toFixed(4).padEnd(15) +
                    pnlColor(pnlPercent.toFixed(2) + '%').padEnd(15) +
                    pos.stop_loss.toFixed(4).padEnd(15) +
                    pos.take_profit.toFixed(4).padEnd(15)
                );
            }
        } else {
            console.log('\n' + chalk.yellow('No active positions'));
        }
    } catch (error) {
        console.error('Error fetching active positions:', error);
    }
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
            console.log('\n' + chalk.bold.blue('📈 Recent Trades'));
            console.log('━'.repeat(100));
            console.log(
                chalk.yellow(
                    'Time'.padEnd(25) +
                    'Type'.padEnd(10) +
                    'Token'.padEnd(20) +
                    'Amount SOL'.padEnd(15) +
                    'Price/Token'.padEnd(15) +
                    'Fees'.padEnd(15)
                )
            );
            console.log('━'.repeat(100));

            for (const trade of trades) {
                const typeColor = trade.type === 'buy' ? chalk.green : chalk.red;
                console.log(
                    new Date(trade.timestamp).toLocaleString().padEnd(25) +
                    typeColor(trade.type.toUpperCase().padEnd(10)) +
                    trade.token_name.padEnd(20) +
                    trade.amount_sol.toFixed(4).padEnd(15) +
                    trade.price_per_token.toFixed(4).padEnd(15) +
                    trade.fees.toFixed(4).padEnd(15)
                );
            }
        } else {
            console.log('\n' + chalk.yellow('No trades recorded yet'));
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
    await displayRecentTrades();

    console.log('\n' + chalk.gray('Press Ctrl+C to exit'));
}

// Auto-refresh the dashboard every 30 seconds
async function startDashboard(): Promise<void> {
    // Initialize the ConnectionManager and database before starting
    const connectionManager = ConnectionManager.getInstance(DB_PATH);
    await connectionManager.initialize();
    
    // Initialize the database tables and set initial balance
    const success = await initializePaperTradingDB();
    if (!success) {
        console.error('Failed to initialize paper trading database');
        return;
    }

    await displayDashboard();
    setInterval(displayDashboard, 30000);
}

// If running this file directly
if (require.main === module) {
    startDashboard();
}

export { startDashboard };