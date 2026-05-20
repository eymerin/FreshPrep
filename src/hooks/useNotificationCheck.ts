import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAppStore } from '../store';

async function requestPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch { return false; }
}

async function fireLocalNotification(id: number, title: string, body: string) {
  const granted = await requestPermissions();
  if (!granted) return;
  await LocalNotifications.schedule({
    notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + 1000) } }],
  });
}

export function useNotificationCheck() {
  useEffect(() => {
    const state = useAppStore.getState();
    const { notificationSettings: settings, preparedMeals, lastNotifiedAt,
            addAppNotification, setLastNotifiedAt, getDaysRemaining } = state;

    if (!settings.enabled) return;

    const now      = Date.now();
    const nowHour  = new Date().getHours();
    const intervalMs = settings.minIntervalHours * 3_600_000;
    const pushOk   = settings.delivery !== 'inapp';

    // Only fire push notifications after the user's preferred hour
    const canPush  = nowHour >= settings.preferredHour && pushOk;

    const available = preparedMeals.filter(m => m.servingsRemaining > 0);

    // ── Expiry check ──────────────────────────────────────────
    if (settings.expiryEnabled) {
      const expiring = available.filter(m => {
        const daysLeft = getDaysRemaining(m);
        return daysLeft >= 0 && daysLeft <= settings.expiryThresholdDays;
      });

      if (expiring.length > 0) {
        const last = lastNotifiedAt.expiry;
        if (!last || now - last > intervalMs) {
          const title = expiring.length === 1
            ? `${expiring[0].recipeName} expiring soon`
            : `${expiring.length} meals expiring soon`;
          const body = expiring.length === 1
            ? `${getDaysRemaining(expiring[0])} day${getDaysRemaining(expiring[0]) !== 1 ? 's' : ''} left — eat it before it goes to waste.`
            : `Use them within ${settings.expiryThresholdDays} day${settings.expiryThresholdDays > 1 ? 's' : ''} to avoid waste.`;

          addAppNotification({ type: 'expiry', title, body });
          setLastNotifiedAt('expiry', now);
          if (canPush) fireLocalNotification(1001, title, body);
        }
      }
    }

    // ── Inventory check ───────────────────────────────────────
    if (settings.inventoryEnabled) {
      const count = available.length;
      if (count <= settings.inventoryThreshold) {
        const last = lastNotifiedAt.inventory;
        if (!last || now - last > intervalMs) {
          const title = count === 0 ? 'No meals left' : 'Running low on meals';
          const body  = count === 0
            ? 'Your inventory is empty. Time to prep!'
            : `Only ${count} meal${count !== 1 ? 's' : ''} left. Consider prepping more soon.`;

          addAppNotification({ type: 'inventory', title, body });
          setLastNotifiedAt('inventory', now);
          if (canPush) fireLocalNotification(1002, title, body);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
