import React from 'react';
import { Activity, Search, BrainCircuit, ShieldAlert, Menu, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: '情绪', desktopLabel: '市场情绪 (Sentiment)', icon: <Activity size={20} /> },
    { id: 'screener', label: '猎龙', desktopLabel: '寻找真龙 (Screener)', icon: <Search size={20} /> },
    { id: 'ai', label: '策略', desktopLabel: 'AI 策略 (AI Analyst)', icon: <BrainCircuit size={20} /> },
    { id: 'risk', label: '风控', desktopLabel: '风控计算 (Risk)', icon: <ShieldAlert size={20} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-ashare-dark text-gray-200 font-sans overflow-hidden">
      {/* Sidebar (Desktop Only) */}
      <aside className="w-64 bg-ashare-card border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white tracking-wider">
            <span className="text-ashare-red">养家</span>量化体系
          </h1>
          <p className="text-xs text-gray-500 mt-1">AI-Driven Alpha Strategy</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.desktopLabel}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-600 text-center">
                Powered by Gemini AI <br/> & React
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0f172a] relative pb-20 md:pb-0">
         {/* Header (Always Visible, Mobile Optimized) */}
         <div className="bg-ashare-card p-4 flex justify-between items-center border-b border-gray-800 sticky top-0 z-20 safe-top">
            <div className="flex items-center gap-2">
                <span className="md:hidden w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">家</span>
                <h1 className="font-bold text-white md:text-lg">养家量化系统</h1>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
                    <User size={16} />
                </div>
            </div>
         </div>

         <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
         </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b]/95 backdrop-blur-md border-t border-gray-800 px-2 py-1 flex justify-around items-center z-50 safe-bottom shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-1 w-1/4 transition-all duration-200 ${
              activeTab === item.id 
                ? 'text-blue-400' 
                : 'text-gray-500'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === item.id ? 'bg-blue-500/10' : ''}`}>
                {item.icon}
            </div>
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;