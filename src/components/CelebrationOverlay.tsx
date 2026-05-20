import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { SET_CONFIG } from '../data/messages';
import type { MessageSet } from '../data/messages';

export default function CelebrationOverlay() {
  const pendingCelebrations = useAppStore(s => s.pendingCelebrations);
  const dismissCelebration  = useAppStore(s => s.dismissCelebration);
  const [visible, setVisible] = useState(false);

  const current = pendingCelebrations[0] ?? null;

  useEffect(() => {
    if (current) {
      // Brief delay so the animation fires after mount
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [current?.id]);

  if (!current) return null;

  const cfg = SET_CONFIG[current.set as MessageSet];

  function handleDismiss() {
    setVisible(false);
    setTimeout(dismissCelebration, 220);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{
        background: 'rgba(0,0,0,0.75)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(20px)',
          transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
          opacity: visible ? 1 : 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Set header */}
        <div
          className="px-6 pt-6 pb-5 text-center"
          style={{ background: cfg.gradient }}
        >
          <div className="text-3xl mb-2">{cfg.emoji}</div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: cfg.accentColor }}>
            {cfg.label}
          </p>
          <p className="text-white/60 text-xs">
            Card {current.cardNumber} of {cfg.cardCount}
          </p>
        </div>

        {/* Message body */}
        <div className="bg-brand-surface px-6 py-6 text-center">
          <p className="text-brand-muted text-base leading-relaxed font-medium">
            "{current.text}"
          </p>
        </div>

        {/* Footer */}
        <div className="bg-brand-surface border-t border-brand-muted/10 px-6 pb-6 pt-4 text-center space-y-3">
          <p className="text-xs text-brand-muted/40">
            ⭐ {current.totalUnlocked} message{current.totalUnlocked !== 1 ? 's' : ''} collected
          </p>
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: cfg.gradient }}
          >
            Collect it!
          </button>
        </div>
      </div>
    </div>
  );
}
