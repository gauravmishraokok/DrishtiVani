import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, User, Settings, LayoutDashboard, Database, BarChart, Menu, X } from 'lucide-react';

const Sidebar = ({ percent = 0, chapterTitle = "" }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // START COLLAPSED FOR MAX SPACE

  const navigationSections = [
    {
      title: 'Learning',
      items: [
        { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'My Dashboard' }
      ]
    },
    {
      title: 'Management',
      items: [
        { to: '/admin', icon: <Database size={18} />, label: 'Admin Panel' }
      ]
    }
  ];

  return (
    <div className={`bg-white border-r border-[#E8D5C4] transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'} h-full shrink-0`}>
      {/* Header with Toggle */}
      <div className="p-4 border-b border-[#E8D5C4] bg-white flex items-center justify-between min-h-[64px]">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[#F97316] rounded-lg flex items-center justify-center shadow-md">
              <BookOpen className="text-white" size={16} />
            </div>
            <h1 className="font-bold text-base font-display text-[#1A1A1A] tracking-tight">DrishtiVani</h1>
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <BookOpen className="text-[#F97316]" size={20} />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:text-[#F97316] transition-colors"
        >
          {isCollapsed ? <Menu size={18} /> : <X size={16} />}
        </button>
      </div>


      {/* Navigation Sections */}
      <nav className="flex-1 p-2 space-y-4 overflow-y-auto custom-scrollbar">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1 mt-4">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={`${section.title}-${item.label}-${item.to}`}
                  to={item.to}
                  className={({ isActive }) => `
                     flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium
                     ${isActive
                      ? 'bg-[#FFF1E6] text-[#F97316] border-l-4 border-l-[#F97316] rounded-l-none'
                      : 'text-[#6B7280] hover:bg-[#FFF8F3] hover:text-[#1A1A1A]'}
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

      {/* Status Footer */}
      <div className="p-4 border-t border-[#E8D5C4] bg-[#FFF8F3]/50">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-[#16A34A] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
