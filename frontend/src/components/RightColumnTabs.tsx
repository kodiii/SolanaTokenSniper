import React, { useState } from 'react';
import DocumentationTab from './DocumentationTab';
import TransactionsDashboard from './TransactionsDashboard';
import VerboseLoggingSettings from './VerboseLoggingSettings';
import BotControl from './BotControl';

const RightColumnTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documentation' | 'transactions' | 'logging'>('documentation');

  return (
    <div className="settings-docs">
      <BotControl />
      <div className="tab-buttons">
        <button
          className={activeTab === 'documentation' ? 'active' : ''}
          onClick={() => setActiveTab('documentation')}
        >
          Documentation
        </button>
        <button
          className={activeTab === 'transactions' ? 'active' : ''}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button
          className={activeTab === 'logging' ? 'active' : ''}
          onClick={() => setActiveTab('logging')}
        >
          Logging
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'documentation' && <DocumentationTab />}
        {activeTab === 'transactions' && <TransactionsDashboard />}
        {activeTab === 'logging' && <VerboseLoggingSettings />}
      </div>
    </div>
  );
};

export default RightColumnTabs;
