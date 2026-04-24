import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, User, Terminal, Brain, Menu, X, Home, Settings, BarChart3 } from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const navigationSections = [
    {
      title: 'Neural Core',
      items: [
        { to: '/dashboard', icon: <Home size={18} />, label: 'Neural Dashboard' },
        { to: '/dashboard', icon: <BookOpen size={18} />, label: 'Classroom' },
      ]
    },
    {
      title: 'Interface Control',
      items: [
        { to: '/admin', icon: <Terminal size={18} />, label: 'Admin Terminal' },
        { to: '/dashboard', icon: <BarChart3 size={18} />, label: 'Biometrics' },
      ]
    },
    {
      title: 'User Link',
      items: [
        { to: '/dashboard', icon: <User size={18} />, label: 'Student Profile' },
        { to: '/dashboard', icon: <Settings size={18} />, label: 'System Config' },
      ]
    }
  ];

  return (
    <div className={`bg-surface border-r border-border transition-all duration-300 z-50 flex flex-col ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Header with Toggle */}
      <div className="p-6 border-b border-border bg-background flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(47,129,247,0.3)]">
               <Brain className="text-bright" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">DRISHTI VANI</h1>
              <p className="text-[10px] mono text-accent uppercase tracking-widest">Active_Uplink</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <Brain className="text-accent" size={24} />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:text-accent transition-colors"
        >
          {isCollapsed ? <Menu size={20} /> : <X size={18} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!isCollapsed && (
              <h3 className="px-4 mono text-[10px] text-muted uppercase tracking-[0.2em] mb-4">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
               {section.items.map((item) => (
                 <NavLink
                   key={`${section.title}-${item.label}-${item.to}`}
                   to={item.to}
                   className={({ isActive }) => `
                     flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
                     ${isActive 
                       ? 'bg-accent/10 text-accent border border-accent/20' 
                       : 'text-muted hover:bg-surface-hover hover:text-bright'}
                   `}
                 >
                   <div className="flex-shrink-0">{item.icon}</div>
                   {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                 </NavLink>
               ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - Minimal Status */}
      <div className="p-6 border-t border-border bg-background/50">
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="h-2.5 w-2.5 bg-success rounded-full animate-pulse" />
             <div className="absolute inset-0 h-2.5 w-2.5 bg-success rounded-full animate-ping opacity-75" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
               <span className="text-[10px] mono text-success uppercase">Node_Healthy</span>
               <span className="text-[9px] text-muted uppercase">Ping: 24ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
