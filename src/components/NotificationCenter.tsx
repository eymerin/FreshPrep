import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationCenter({ onClose, onNavigate }: {
  onClose: () => void;
  onNavigate: (tab: string) => void;
}) {
  const notifications      = useAppStore(s => s.appNotifications);
  const markRead           = useAppStore(s => s.markNotificationRead);
  const markAllRead        = useAppStore(s => s.markAllNotificationsRead);
  const clearNotifications = useAppStore(s => s.clearNotifications);

  // Drive the slide-in animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Defer one frame so the transition fires
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280); // wait for slide-out
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Sidebar */}
      <div
        className={`relative flex flex-col w-80 max-w-[85vw] h-full bg-brand-surface shadow-2xl transition-transform duration-[280ms] ease-in-out ${visible ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-brand-raised border-b border-brand-muted/15 shrink-0">
          <h2 className="text-base font-semibold text-brand-muted">Alerts</h2>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-brand-muted/50 hover:text-brand-muted hover:bg-brand-muted/10 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Actions row */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-brand-muted/10 shrink-0">
            <button onClick={markAllRead} className="text-xs text-brand-muted/50 hover:text-brand-muted transition-colors">
              Mark all read
            </button>
            <span className="text-brand-muted/20 text-xs">·</span>
            <button onClick={clearNotifications} className="text-xs text-brand-muted/50 hover:text-red-400 transition-colors">
              Clear all
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto overscroll-none">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 pb-12">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-brand-muted/20">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p className="text-sm font-medium text-brand-muted/40">No alerts yet</p>
              <p className="text-xs text-brand-muted/25">You're all caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-muted/10">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.type === 'expiry') { handleClose(); onNavigate('meals'); }
                  }}
                  className={`w-full text-left px-5 py-4 hover:bg-brand-raised/30 transition-colors ${n.read ? 'opacity-45' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-base">
                      {n.type === 'expiry' ? '⏰' : '📦'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-muted leading-snug">{n.title}</p>
                      <p className="text-xs text-brand-muted/60 mt-1 leading-relaxed">{n.body}</p>
                      <p className="text-[11px] text-brand-muted/35 mt-1.5">{timeAgo(n.timestamp)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop — tap to close */}
      <div
        className={`flex-1 bg-black/50 transition-opacity duration-[280ms] ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
    </div>
  );
}
