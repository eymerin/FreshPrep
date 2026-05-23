import React, { useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';
import ProfileScreen from './ProfileScreen';
import { useAppStore } from '../store';

type Tab = 'plan' | 'prep' | 'schedule' | 'meals' | 'recipes' | 'profile';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
}

// Single-color SVG icons (Heroicons outline style)
function PlanIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="12" y2="16" />
    </svg>
  );
}

function PrepIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Pot body */}
      <path d="M6 10h12v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7Z" />
      {/* Lid rim */}
      <line x1="5" y1="10" x2="19" y2="10" />
      {/* Lid dome */}
      <path d="M9 10V8.5C9 7.7 10.3 7 12 7s3 .7 3 1.5V10" />
      {/* Lid knob */}
      <circle cx="12" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      {/* Side handles */}
      <path d="M6 13.5H3.5a.5.5 0 0 1 0-1H6" />
      <path d="M18 13.5h2.5a.5.5 0 0 0 0-1H18" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MealsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 15c0 3.3 4.5 6 10 6s10-2.7 10-6" />
      <path d="M2 12c0 3.3 4.5 6 10 6s10-2.7 10-6" />
      <path d="M12 3C6.5 3 2 5.7 2 9s4.5 6 10 6 10-2.7 10-6-4.5-6-10-6Z" />
    </svg>
  );
}

function RecipesIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// Sprig SVG for sidebar brand
function SprigIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent flex-shrink-0">
      <path d="M12 21 V13" />
      <path d="M12 16 C10 14 7 14 5 15 C6 18 9 18 12 16Z" />
      <path d="M12 13 C14 11 17 11 19 12 C18 15 15 15 12 13Z" />
      <path d="M12 13 C12 11 13 9 12 7" />
    </svg>
  );
}

const navTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'plan',     label: 'Plan',     icon: <PlanIcon /> },
  { id: 'prep',     label: 'Prep',     icon: <PrepIcon /> },
  { id: 'schedule', label: 'Schedule', icon: <CalendarIcon /> },
  { id: 'meals',    label: 'Ready',    icon: <MealsIcon /> },
  { id: 'recipes',  label: 'Recipes',  icon: <RecipesIcon /> },
];

// ── Desktop Sidebar ───────────────────────────────────────────
function DesktopSidebar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const unreadCount    = useAppStore((s) => s.appNotifications.filter(n => !n.read).length);
  const userProfile    = useAppStore((s) => s.userProfile);
  const mealsEatenAllTime = useAppStore((s) => s.mealsEatenAllTime);

  const initials = userProfile.name.trim()
    ? userProfile.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="hidden lg:flex flex-col w-[232px] shrink-0 sticky top-0 h-screen bg-brand-surface border-r border-brand-muted/10">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-brand-muted/10">
        <SprigIcon />
        <span className="text-lg font-semibold text-brand-muted tracking-tight">FreshPrep</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                isActive
                  ? 'text-brand-accent'
                  : 'text-brand-muted/50 hover:text-brand-muted/80 hover:bg-brand-muted/5'
              }`}
            >
              <span className={`flex items-center justify-center w-9 h-8 rounded-xl transition-colors ${
                isActive ? 'bg-brand-accent/15 text-brand-accent' : 'text-brand-muted/40'
              }`}>
                {tab.icon}
              </span>
              <span className={`text-sm font-medium ${isActive ? 'text-brand-accent' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-brand-muted/10 pt-3">
        {/* Alerts row */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-brand-muted/50">
          <span className="relative flex items-center justify-center w-9 h-8">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-warm text-brand-bg text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span className="text-sm font-medium">Alerts</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs font-semibold text-brand-warm">{unreadCount}</span>
          )}
        </div>

        {/* Profile row */}
        <button
          onClick={() => onTabChange('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
            activeTab === 'profile'
              ? 'text-brand-accent'
              : 'text-brand-muted/50 hover:text-brand-muted/80 hover:bg-brand-muted/5'
          }`}
        >
          <div className="w-9 h-8 flex items-center justify-center shrink-0">
            <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${activeTab === 'profile' ? 'text-brand-accent' : ''}`}>
              {userProfile.name || 'Profile'}
            </p>
            <p className="text-[11px] text-brand-muted/35 leading-none mt-0.5">
              {mealsEatenAllTime} meals eaten
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile]             = useState(false);
  const insightsTipSeen    = useAppStore((s) => s.insightsTipSeen);
  const markInsightsTipSeen = useAppStore((s) => s.markInsightsTipSeen);
  const unreadCount = useAppStore((s) => s.appNotifications.filter(n => !n.read).length);

  useEffect(() => {
    if (insightsTipSeen) return;
    const t = setTimeout(markInsightsTipSeen, 4000);
    return () => clearTimeout(t);
  }, [insightsTipSeen, markInsightsTipSeen]);

  return (
    <div className="min-h-screen bg-brand-bg lg:flex lg:max-w-[1280px] lg:mx-auto">
      {/* Desktop sidebar */}
      <DesktopSidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — hidden on desktop */}
        <header className="lg:hidden bg-brand-raised border-b border-brand-muted/15 px-4 py-3 flex items-center justify-between">
          {/* Alerts bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative flex flex-col items-center gap-0.5 text-brand-muted/60 hover:text-brand-muted/90 transition-colors px-1 py-0.5 rounded-md min-w-[44px] min-h-[44px] justify-center"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="text-[9px] font-medium uppercase tracking-wide leading-none">Alerts</span>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-warm text-brand-bg text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/70 flex-shrink-0">
              <path d="M12 21 V13" />
              <path d="M12 16 C10 14 7 14 5 15 C6 18 9 18 12 16Z" />
              <path d="M12 13 C14 11 17 11 19 12 C18 15 15 15 12 13Z" />
              <path d="M12 13 C12 11 13 9 12 7" />
            </svg>
            <h1 className="text-xl font-semibold text-brand-muted tracking-tight">FreshPrep</h1>
          </div>

          {/* Profile icon button */}
          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-0.5 text-brand-muted/60 hover:text-brand-muted/90 transition-colors px-1 py-0.5 rounded-md min-w-[44px] min-h-[44px] justify-center"
            aria-label="Profile"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span className="text-[9px] font-medium uppercase tracking-wide leading-none">Profile</span>
          </button>
        </header>

        {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} onNavigate={(tab) => { setShowNotifications(false); onTabChange(tab as Tab); }} />}
        {showProfile && <ProfileScreen onClose={() => setShowProfile(false)} />}

        <main className="flex-1 p-6 pb-24 w-full lg:p-10 lg:pb-10 lg:max-w-none">{children}</main>

        {/* Mobile bottom nav — hidden on desktop */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-brand-muted/15">
          <div className="flex max-w-4xl mx-auto">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
                >
                  <span className={`flex items-center justify-center w-11 h-8 rounded-xl transition-colors ${
                    isActive ? 'bg-brand-accent/15 text-brand-accent' : 'text-brand-muted/40'
                  }`}>
                    {tab.icon}
                  </span>
                  <span className={`text-[10px] transition-colors leading-tight ${
                    isActive ? 'text-brand-accent font-semibold' : 'text-brand-muted/40 font-medium'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
