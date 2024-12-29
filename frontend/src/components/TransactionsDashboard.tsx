import React from 'react';

interface Transaction {
  token: string;
  buyPrice: number;
  stopLoss: number;
  soldPrice: number;
  pnl: number;
}

const TransactionsDashboard: React.FC = () => {
  // TODO: Fetch actual transaction data from backend
  const transactions: Transaction[] = [
    // Example data
    {
      token: 'SOL',
      buyPrice: 100,
      stopLoss: 90,
      soldPrice: 110,
      pnl: 10
    },
    {
      token: 'BTC',
      buyPrice: 50000,
      stopLoss: 45000,
      soldPrice: 52000,
      pnl: 2000
    }
  ];

  return (
    <div className="transactions-dashboard">
      <h3>Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Buy Price</th>
            <th>Stop Loss</th>
            <th>Sold Price</th>
            <th>PNL</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => (
            <tr key={index}>
              <td>{tx.token}</td>
              <td>${tx.buyPrice.toLocaleString()}</td>
              <td>${tx.stopLoss.toLocaleString()}</td>
              <td>${tx.soldPrice?.toLocaleString() || '-'}</td>
              <td className={tx.pnl >= 0 ? 'positive' : 'negative'}>
                ${tx.pnl.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionsDashboard;
