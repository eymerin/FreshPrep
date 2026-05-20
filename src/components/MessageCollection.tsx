import { useState } from 'react';
import { useAppStore } from '../store';
import { ALL_MESSAGES, SET_CONFIG, MessageSet } from '../data/messages';

type FilterTab = 'all' | MessageSet;

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',           label: 'All' },
  { id: 'first-steps',   label: 'First Steps' },
  { id: 'prep-day',      label: 'Prep Day' },
  { id: 'clean-plate',   label: 'Clean Plate' },
  { id: 'week-champion', label: 'Week Champ' },
  { id: 'streak',        label: 'Streak' },
];

function MessageCard({
  message,
  unlocked,
  cardNumber,
}: {
  message: { id: string; set: MessageSet; text: string };
  unlocked: boolean;
  cardNumber: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SET_CONFIG[message.set];

  if (!unlocked) {
    return (
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ aspectRatio: '3/4', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-30"
          style={{ background: cfg.gradient }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div className="px-2 py-2 text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <p className="text-[10px] font-medium" style={{ color: cfg.accentColor + '60' }}>#{cardNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="rounded-xl overflow-hidden text-left flex flex-col"
      style={{ aspectRatio: expanded ? 'auto' : '3/4', background: cfg.gradient, border: `1px solid ${cfg.accentColor}40` }}
    >
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cfg.accentColor }}>
          {cfg.emoji} {cfg.label}
        </span>
        <span className="text-[10px] text-white/40">#{cardNumber}</span>
      </div>
      <div className="flex-1 px-3 pb-3 flex items-center">
        <p className={`text-white text-xs leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
          "{message.text}"
        </p>
      </div>
    </button>
  );
}

export default function MessageCollection({ onClose }: { onClose: () => void }) {
  const unlockedMessageIds = useAppStore(s => s.unlockedMessageIds);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const total = ALL_MESSAGES.length;
  const unlocked = unlockedMessageIds.length;

  const filtered = activeTab === 'all'
    ? ALL_MESSAGES
    : ALL_MESSAGES.filter(m => m.set === activeTab);

  // Group by set for display, preserving order within each set
  const setOrder: MessageSet[] = ['first-steps', 'prep-day', 'clean-plate', 'week-champion', 'streak'];
  const groups = activeTab === 'all'
    ? setOrder.map(s => ({ set: s, messages: ALL_MESSAGES.filter(m => m.set === s) }))
    : [{ set: activeTab as MessageSet, messages: filtered }];

  return (
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-muted/15 bg-brand-raised shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-brand-accent min-w-[44px] min-h-[44px] -ml-1 pr-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="text-center">
          <span className="text-base font-semibold text-brand-muted">Collection</span>
        </div>
        <div className="w-16 text-right">
          <span className="text-xs text-brand-accent font-semibold">{unlocked}/{total}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-brand-raised">
        <div
          className="h-full bg-brand-accent transition-all duration-500"
          style={{ width: `${(unlocked / total) * 100}%` }}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto shrink-0 bg-brand-surface border-b border-brand-muted/10">
        {TABS.map(tab => {
          const count = tab.id === 'all'
            ? unlockedMessageIds.length
            : unlockedMessageIds.filter(id => ALL_MESSAGES.find(m => m.id === id)?.set === tab.id).length;
          const tabTotal = tab.id === 'all' ? total : ALL_MESSAGES.filter(m => m.set === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-accent text-white'
                  : 'bg-brand-bg text-brand-muted/50 hover:text-brand-muted'
              }`}
            >
              {tab.label} <span className="opacity-60">{count}/{tabTotal}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {unlocked === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-sm font-medium text-brand-muted/60">No messages yet</p>
            <p className="text-xs text-brand-muted/40 mt-1">Log a prep session to earn your first card</p>
          </div>
        )}

        {groups.map(({ set, messages }) => {
          const cfg = SET_CONFIG[set];
          const setUnlocked = messages.filter(m => unlockedMessageIds.includes(m.id)).length;
          if (activeTab !== 'all' && setUnlocked === 0 && messages.length > 0) {
            // still show the locked cards
          }
          return (
            <div key={set}>
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{cfg.emoji}</span>
                  <p className="text-xs font-semibold text-brand-muted/70 uppercase tracking-wide">{cfg.label}</p>
                  <span className="text-xs text-brand-muted/35">{setUnlocked}/{messages.length}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {messages.map((msg, idx) => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    unlocked={unlockedMessageIds.includes(msg.id)}
                    cardNumber={idx + 1}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
