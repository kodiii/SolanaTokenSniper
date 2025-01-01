import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import './Transactions.css';

interface Transaction {
  id: number;
  tokenName: string;
  tokenAddress: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
  pnl: number;
  status: 'open' | 'closed';
  timestamp: string;
}

export const Transactions: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTransactions();
    }
  }, [connected, publicKey]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async (tokenAddress: string) => {
    if (!connected || !publicKey) {
      console.error('Wallet not connected');
      return;
    }

    try {
      const response = await fetch('/api/sell-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenAddress,
          walletAddress: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sell token');
      }

      // Refresh transactions after selling
      await fetchTransactions();
    } catch (error) {
      console.error('Error selling token:', error);
    }
  };

  return (
    <div className="transactions-container">
      <h2>Transactions</h2>
      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : (
        <div className="transactions-table">
          <div className="table-header">
            <div className="header-cell">Status</div>
            <div className="header-cell">Token</div>
            <div className="header-cell">Amount</div>
            <div className="header-cell">Buy Price</div>
            <div className="header-cell">Current Price</div>
            <div className="header-cell">PNL</div>
            <div className="header-cell">Action</div>
          </div>
          {transactions.map((tx) => (
            <div key={tx.id} className="table-row">
              <div className="cell">
                <span className={`status-badge ${tx.status}`}>
                  {tx.status}
                </span>
              </div>
              <div className="cell">{tx.tokenName}</div>
              <div className="cell">{tx.amount.toFixed(4)}</div>
              <div className="cell">${tx.buyPrice.toFixed(4)}</div>
              <div className="cell">${tx.currentPrice.toFixed(4)}</div>
              <div className={`cell pnl ${tx.pnl >= 0 ? 'positive' : 'negative'}`}>
                {tx.pnl >= 0 ? '+' : ''}{tx.pnl.toFixed(2)}%
              </div>
              <div className="cell">
                {tx.status === 'open' && (
                  <button
                    className="sell-button"
                    onClick={() => handleSell(tx.tokenAddress)}
                  >
                    SELL
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
