import React, { useState } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import StockScreener from './components/StockScreener.tsx';
import AIAnalyst from './components/AIAnalyst.tsx';
import RiskCalculator from './components/RiskCalculator.tsx';
import { INITIAL_MARKET_DATA } from './constants.ts';
import { MarketMetrics } from './types.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState<MarketMetrics>(INITIAL_MARKET_DATA);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard metrics={metrics} setMetrics={setMetrics} />;
      case 'screener':
        return <StockScreener />;
      case 'ai':
        return <AIAnalyst metrics={metrics} />;
      case 'risk':
        return <RiskCalculator />;
      default:
        return <Dashboard metrics={metrics} setMetrics={setMetrics} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;