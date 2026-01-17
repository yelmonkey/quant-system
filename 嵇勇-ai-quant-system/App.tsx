import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StockScreener from './components/StockScreener';
import AIAnalyst from './components/AIAnalyst';
import RiskCalculator from './components/RiskCalculator';
import { INITIAL_MARKET_DATA } from './constants';
import { MarketMetrics } from './types';

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
