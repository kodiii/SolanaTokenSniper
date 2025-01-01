import React, { useState, useEffect } from 'react';
import './VerboseLoggingSettings.css';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: any; // For additional fields
}

const VerboseLoggingSettings: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);

  const getLogLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error':
        return '#ff4444';
      case 'warn':
        return '#ffbb33';
      case 'info':
        return '#00c851';
      case 'debug':
        return '#33b5e5';
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="verbose-logging-settings">
      <div className="log-header">
        <h3>Verbose Logs</h3>
        <div className="log-controls">
          <button onClick={fetchLogs} disabled={loading}>
            Refresh
          </button>
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {error && (
        <div className="log-error">
          Error: {error}
        </div>
      )}

      <div className="log-container">
        {loading && logs.length === 0 ? (
          <div className="log-loading">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="log-empty">No logs available</div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              className="log-entry"
              style={{ borderLeft: `4px solid ${getLogLevelColor(log.level)}` }}
            >
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-level" style={{ color: getLogLevelColor(log.level) }}>
                [{log.level}]
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VerboseLoggingSettings;
