import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import './TransactionsDashboard.css';

interface Transaction {
  token: string;
  tokenAddress: string;
  buyPrice: number;
  stopLoss: number;
  soldPrice: number | null;
  pnl: number;
  status: 'open' | 'closed';
}

const TransactionsDashboard: React.FC = () => {
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
    <div className="transactions-dashboard">
      <h3>Transactions</h3>
      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Token</th>
              <th>Buy Price</th>
              <th>Stop Loss</th>
              <th>Current/Sold Price</th>
              <th>PNL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={index}>
                <td>
                  <span className={`status-badge ${tx.status}`}>
                    {tx.status}
                  </span>
                </td>
                <td>{tx.token}</td>
                <td>${tx.buyPrice.toLocaleString()}</td>
                <td>${tx.stopLoss.toLocaleString()}</td>
                <td>${tx.soldPrice?.toLocaleString() || '-'}</td>
                <td className={tx.pnl >= 0 ? 'positive' : 'negative'}>
                  {tx.pnl >= 0 ? '+' : ''}{tx.pnl.toLocaleString()}%
                </td>
                <td>
                  {tx.status === 'open' && (
                    <button
                      className="sell-button"
                      onClick={() => handleSell(tx.tokenAddress)}
                    >
                      SELL
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TransactionsDashboard;
