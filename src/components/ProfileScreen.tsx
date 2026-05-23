import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import StatsContent from './StatsContent';
import MessageCollection from './MessageCollection';
import { ALL_MESSAGES } from '../data/messages';

// ── Reusable sub-components ───────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand-accent' : 'bg-brand-muted/40'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-5' : 'left-1'}`}
      />
    </button>
  );
}

function Chips<T extends string | number>({ options, value, onChange }: {
  options: { v: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={String(o.v)} onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            value === o.v ? 'bg-brand-accent text-white' : 'bg-brand-raised text-brand-muted/60 hover:text-brand-muted'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GoalInput({ label, value, unit, onChange }: {
  label: string; value: number | null; unit: string; onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] text-brand-muted/50 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1.5">
        <input
          type="number" min="0" step="1"
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder="—"
          className="w-full bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2 text-sm text-brand-muted focus:outline-none focus:border-brand-accent/60 text-center"
        />
        <span className="text-xs text-brand-muted/40 shrink-0">{unit}</span>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const dim = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-9 h-9 text-sm';
  return (
    <div className={`${dim} rounded-full bg-brand-accent flex items-center justify-center font-semibold text-white shrink-0`}>
      {initials}
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────

function SettingsTab() {
  const goals        = useAppStore(s => s.nutritionGoals);
  const updateGoals  = useAppStore(s => s.updateNutritionGoals);
  const userPrefs    = useAppStore(s => s.userPrefs);
  const updatePrefs  = useAppStore(s => s.updateUserPrefs);
  const measureUnit  = useAppStore(s => s.measurementUnit);
  const setMeasure   = useAppStore(s => s.setMeasurementUnit);
  const notifSettings = useAppStore(s => s.notificationSettings);
  const updateNotif  = useAppStore(s => s.updateNotificationSettings);

  const mealTypeOptions = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

  return (
    <div className="space-y-6 p-4">

      {/* Daily nutrition goals */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wide">Daily Nutrition Goals</p>
        <p className="text-xs text-brand-muted/40 -mt-2">Leave blank to skip goal tracking for that macro.</p>
        <div className="grid grid-cols-2 gap-3">
          <GoalInput label="Calories" value={goals.calories} unit="kcal" onChange={v => updateGoals({ calories: v })} />
          <GoalInput label="Protein"  value={goals.protein}  unit="g"    onChange={v => updateGoals({ protein: v })} />
          <GoalInput label="Carbs"    value={goals.carbs}    unit="g"    onChange={v => updateGoals({ carbs: v })} />
          <GoalInput label="Fat"      value={goals.fat}      unit="g"    onChange={v => updateGoals({ fat: v })} />
        </div>
      </div>

      {/* Prep preferences */}
      {userPrefs && (
        <div className="space-y-4 pt-4 border-t border-brand-muted/10">
          <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wide">Prep Preferences</p>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-brand-muted">Meals per week</p>
            <Chips
              options={[5,7,10,14,21].map(v => ({ v, label: String(v) }))}
              value={userPrefs.mealsPerWeek}
              onChange={v => updatePrefs({ mealsPerWeek: v })}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-brand-muted">Meal types</p>
            <div className="flex gap-2 flex-wrap">
              {mealTypeOptions.map(mt => {
                const active = userPrefs.mealTypes.includes(mt as any);
                return (
                  <button key={mt} onClick={() => {
                    const updated = active
                      ? userPrefs.mealTypes.filter(t => t !== mt)
                      : [...userPrefs.mealTypes, mt as any];
                    if (updated.length > 0) updatePrefs({ mealTypes: updated as any });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    active ? 'bg-brand-accent text-white' : 'bg-brand-raised text-brand-muted/60'
                  }`}>
                    {mt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-brand-muted">Prep frequency</p>
            <Chips
              options={[
                { v: '1x' as const, label: 'Once a week' },
                { v: '2x' as const, label: 'Twice a week' },
                { v: 'flexible' as const, label: 'Flexible' },
              ]}
              value={userPrefs.prepFrequency}
              onChange={v => updatePrefs({ prepFrequency: v })}
            />
          </div>
        </div>
      )}

      {/* App preferences */}
      <div className="space-y-3 pt-4 border-t border-brand-muted/10">
        <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wide">App Preferences</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-muted">Measurement units</p>
            <p className="text-xs text-brand-muted/40 mt-0.5">Used for ingredient weights</p>
          </div>
          <div className="flex gap-1 bg-brand-bg rounded-lg p-0.5">
            {(['imperial', 'metric'] as const).map(u => (
              <button key={u} onClick={() => setMeasure(u)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  measureUnit === u ? 'bg-brand-surface text-brand-muted' : 'text-brand-muted/40'
                }`}>
                {u === 'imperial' ? 'oz' : 'g'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="space-y-4 pt-4 border-t border-brand-muted/10">
        <p className="text-xs font-semibold text-brand-muted/60 uppercase tracking-wide">Notifications</p>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-brand-muted">Enable notifications</p>
          <Toggle checked={notifSettings.enabled} onChange={v => updateNotif({ enabled: v })} />
        </div>

        {notifSettings.enabled && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs text-brand-muted/50">Delivery</p>
              <Chips
                options={[
                  { v: 'inapp' as const, label: 'In-app only' },
                  { v: 'push' as const, label: 'Push only' },
                  { v: 'both' as const, label: 'Both' },
                ]}
                value={notifSettings.delivery}
                onChange={v => updateNotif({ delivery: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-muted">Expiry alerts</p>
                <p className="text-xs text-brand-muted/40 mt-0.5">Warn when meals are expiring soon</p>
              </div>
              <Toggle checked={notifSettings.expiryEnabled} onChange={v => updateNotif({ expiryEnabled: v })} />
            </div>
            {notifSettings.expiryEnabled && (
              <div className="space-y-1.5 pl-1">
                <p className="text-xs text-brand-muted/40">Alert when meals have this many days left</p>
                <Chips
                  options={[{ v: 1 as const, label: '1 day' }, { v: 2 as const, label: '2 days' }, { v: 3 as const, label: '3 days' }]}
                  value={notifSettings.expiryThresholdDays}
                  onChange={v => updateNotif({ expiryThresholdDays: v })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-muted">Low inventory alerts</p>
                <p className="text-xs text-brand-muted/40 mt-0.5">Warn when you're running low</p>
              </div>
              <Toggle checked={notifSettings.inventoryEnabled} onChange={v => updateNotif({ inventoryEnabled: v })} />
            </div>
            {notifSettings.inventoryEnabled && (
              <div className="space-y-1.5 pl-1">
                <p className="text-xs text-brand-muted/40">Alert when fewer than this many meals remain</p>
                <Chips
                  options={[{ v: 2 as const, label: '2 meals' }, { v: 3 as const, label: '3 meals' }, { v: 5 as const, label: '5 meals' }]}
                  value={notifSettings.inventoryThreshold}
                  onChange={v => updateNotif({ inventoryThreshold: v })}
                />
              </div>
            )}

            {(notifSettings.expiryEnabled || notifSettings.inventoryEnabled) && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs text-brand-muted/50">Earliest hour for push alerts</p>
                  <Chips
                    options={[{ v: 7, label: '7am' }, { v: 8, label: '8am' }, { v: 10, label: '10am' }, { v: 12, label: 'Noon' }, { v: 18, label: '6pm' }, { v: 20, label: '8pm' }]}
                    value={notifSettings.preferredHour}
                    onChange={v => updateNotif({ preferredHour: v })}
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-brand-muted/50">Repeat interval</p>
                  <Chips
                    options={[{ v: 4 as const, label: 'Every 4h' }, { v: 8 as const, label: 'Every 8h' }, { v: 24 as const, label: 'Once daily' }]}
                    value={notifSettings.minIntervalHours}
                    onChange={v => updateNotif({ minIntervalHours: v })}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared profile body ───────────────────────────────────────

function ProfileBody({ onClose: _onClose, pageMode }: { onClose: () => void; pageMode?: boolean }) {
  const [tab, setTab]         = useState<'stats' | 'settings'>('stats');
  const userProfile           = useAppStore(s => s.userProfile);
  const updateUserProfile     = useAppStore(s => s.updateUserProfile);
  const mealsEatenAllTime     = useAppStore(s => s.mealsEatenAllTime);
  const unlockedMessageIds    = useAppStore(s => s.unlockedMessageIds);

  const [editingName, setEditingName] = useState(userProfile.name);
  const nameRef = useRef<HTMLInputElement>(null);
  const [showCollection, setShowCollection] = useState(false);

  const joinedDate = new Date(userProfile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function saveName() {
    const trimmed = editingName.trim();
    if (trimmed !== userProfile.name) updateUserProfile({ name: trimmed });
  }

  // ── Left column (avatar card + collectible) ────────────────
  const leftCol = (
    <div className="space-y-4">
      {/* Personal info card */}
      <div className="flex items-center gap-4 bg-brand-surface rounded-xl border border-brand-muted/10 px-5 py-5">
        <Avatar name={editingName || userProfile.name} size="lg" />
        <div className="flex-1 min-w-0">
          <input
            ref={nameRef}
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && nameRef.current?.blur()}
            placeholder="Add your name"
            className="w-full bg-transparent text-lg font-semibold text-brand-muted focus:outline-none border-b border-transparent focus:border-brand-muted/30 pb-0.5 truncate"
          />
          <p className="text-xs text-brand-muted/40 mt-1">Member since {joinedDate}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-brand-muted/50"><span className="font-semibold text-brand-muted">{mealsEatenAllTime}</span> meals eaten</span>
          </div>
        </div>
      </div>

      {/* Collection entry */}
      <button
        onClick={() => setShowCollection(true)}
        className="w-full flex items-center gap-3 bg-brand-surface border border-brand-muted/15 rounded-xl px-4 py-3.5 hover:border-brand-accent/40 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-brand-accent/15 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent">
            <rect x="2" y="5" width="13" height="16" rx="2"/>
            <path d="M5 2h12a2 2 0 0 1 2 2v15"/>
            <line x1="6" y1="10" x2="11" y2="10"/>
            <line x1="6" y1="14" x2="11" y2="14"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-sm font-semibold text-brand-muted">Collectible Cards</p>
            <span className="text-xs font-semibold text-brand-accent">
              {unlockedMessageIds.length} of {ALL_MESSAGES.length} unlocked
            </span>
          </div>
          <p className="text-xs text-brand-muted/40 mb-2">Earn one every time you prep, eat a full day, or hit a streak</p>
          <div className="h-1 bg-brand-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-accent rounded-full transition-all duration-500"
              style={{ width: `${(unlockedMessageIds.length / ALL_MESSAGES.length) * 100}%` }}
            />
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/30 shrink-0">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  );

  // ── Right column (tabs: Stats / Settings) ──────────────────
  const rightCol = (
    <div className="bg-brand-surface rounded-xl border border-brand-muted/10 overflow-hidden">
      <div className="flex border-b border-brand-muted/10 bg-brand-surface sticky top-0 z-10">
        {(['stats', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-brand-muted/50 hover:text-brand-muted'
            }`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'stats' ? (
        <div className="p-5">
          <StatsContent />
        </div>
      ) : (
        <SettingsTab />
      )}
    </div>
  );

  if (pageMode) {
    return (
      <>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-brand-muted">Profile</h2>
        </div>
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-7 lg:items-start space-y-4 lg:space-y-0">
          <div className="lg:sticky lg:top-6">{leftCol}</div>
          <div>{rightCol}</div>
        </div>
        {showCollection && <MessageCollection onClose={() => setShowCollection(false)} />}
      </>
    );
  }

  // Modal mode (mobile default)
  return (
    <>
      {/* Personal info */}
      <div className="px-5 py-6 flex items-center gap-4 bg-brand-surface border-b border-brand-muted/10">
        <Avatar name={editingName || userProfile.name} size="lg" />
        <div className="flex-1 min-w-0">
          <input
            ref={nameRef}
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && nameRef.current?.blur()}
            placeholder="Add your name"
            className="w-full bg-transparent text-lg font-semibold text-brand-muted focus:outline-none border-b border-transparent focus:border-brand-muted/30 pb-0.5 truncate"
          />
          <p className="text-xs text-brand-muted/40 mt-1">Member since {joinedDate}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-brand-muted/50"><span className="font-semibold text-brand-muted">{mealsEatenAllTime}</span> meals eaten</span>
          </div>
        </div>
      </div>

      {/* Collection entry */}
      <div className="px-4 pt-4 pb-1">
        <button
          onClick={() => setShowCollection(true)}
          className="w-full flex items-center gap-3 bg-brand-surface border border-brand-muted/15 rounded-xl px-4 py-3.5 hover:border-brand-accent/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-accent/15 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent">
              <rect x="2" y="5" width="13" height="16" rx="2"/>
              <path d="M5 2h12a2 2 0 0 1 2 2v15"/>
              <line x1="6" y1="10" x2="11" y2="10"/>
              <line x1="6" y1="14" x2="11" y2="14"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-sm font-semibold text-brand-muted">Collectible Cards</p>
              <span className="text-xs font-semibold text-brand-accent">
                {unlockedMessageIds.length} of {ALL_MESSAGES.length} unlocked
              </span>
            </div>
            <p className="text-xs text-brand-muted/40 mb-2">Earn one every time you prep, eat a full day, or hit a streak</p>
            <div className="h-1 bg-brand-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-accent rounded-full transition-all duration-500"
                style={{ width: `${(unlockedMessageIds.length / ALL_MESSAGES.length) * 100}%` }}
              />
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/30 shrink-0">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-muted/10 bg-brand-surface sticky top-0 z-10">
        {(['stats', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-brand-muted/50 hover:text-brand-muted'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'stats' ? (
        <div className="p-5">
          <StatsContent />
        </div>
      ) : (
        <SettingsTab />
      )}

      {showCollection && <MessageCollection onClose={() => setShowCollection(false)} />}
    </>
  );
}

// ── Main component ────────────────────────────────────────────

export default function ProfileScreen({ onClose, pageMode }: { onClose: () => void; pageMode?: boolean }) {
  // Lock body scroll while profile modal is open (modal mode only)
  useEffect(() => {
    if (pageMode) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [pageMode]);

  if (pageMode) {
    return <ProfileBody onClose={onClose} pageMode />;
  }

  return (
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-muted/15 bg-brand-raised shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-brand-accent min-w-[44px] min-h-[44px] -ml-1 pr-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <span className="text-base font-semibold text-brand-muted">Profile</span>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none">
        <ProfileBody onClose={onClose} />
      </div>
    </div>
  );
}
