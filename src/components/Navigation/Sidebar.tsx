import React from 'react';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  Sun,
  Moon,
  ExternalLink,
  X,
} from 'lucide-react';

export type NavTab = 'overview' | 'campaigns' | 'leads' | 'analytics' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'leads', label: 'Leads', icon: <Users className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-md shadow-blue-500/20">
              ∞
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">Meta Ads</div>
              <div className="text-[11px] font-medium text-slate-400">Results & Leads</div>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-blue-400" />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </span>
          <span className="text-[10px] text-slate-500">Toggle</span>
        </button>

        <a
          href="https://adsmanager.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between text-[11px] text-slate-400 hover:text-blue-400 px-1 transition-colors"
        >
          <span>Open Ads Manager</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-300 flex-col select-none min-h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col justify-between shadow-2xl z-10 select-none h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
