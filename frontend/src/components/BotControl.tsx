import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import './BotControl.css';

interface BotStatus {
  status: 'running' | 'stopped';
  message?: string;
}

const BotControl: React.FC = () => {
  const { connected } = useWallet();
  const [status, setStatus] = useState<BotStatus>({ status: 'stopped' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/bot/status');
      if (!response.ok) {
        throw new Error('Failed to fetch bot status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bot status');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStop = async () => {
    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const endpoint = status.status === 'running' ? '/api/bot/stop' : '/api/bot/start';
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to control bot');
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to control bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bot-control">
      <div className="bot-status">
        <div className={`status-indicator ${status.status}`} />
        <span className="status-text">
          Bot is {status.status}
        </span>
      </div>

      {error && (
        <div className="bot-error">
          {error}
        </div>
      )}

      <button
        className={`bot-button ${status.status} ${loading ? 'loading' : ''}`}
        onClick={handleStartStop}
        disabled={loading || !connected}
      >
        {loading ? (
          <span className="loading-spinner" />
        ) : status.status === 'running' ? (
          'Stop Bot'
        ) : (
          'Start Bot'
        )}
      </button>

      {!connected && (
        <div className="bot-warning">
          Connect your wallet to control the bot
        </div>
      )}
    </div>
  );
};

export default BotControl;
