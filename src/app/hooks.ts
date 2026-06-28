import { useEffect, useState } from 'react';
import { useWondralStore } from './store';
import { gateEntitled, isEntitlementActive } from '../core/entitlement';
import { hasSupabaseConfig } from '../core/supabase';

/** Live online/offline flag (navigator.onLine + the online/offline events). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** The display-level entitlement gate (suppresses paywall flash on reload). */
export function useEntitledForDisplay(): boolean {
  return useWondralStore((s) =>
    gateEntitled({
      active: isEntitlementActive(s.entitlement),
      authStatus: s.authStatus,
      entitlementLoaded: s.entitlementLoaded,
    }),
  );
}

/**
 * Whether to SHOW the upgrade ("Go Premium") CTA at all. Hidden when the backend
 * is unconfigured, the device is offline, auth is still settling, or the user is
 * already entitled — so the button can never dead-end in a broken checkout (the
 * PianoSurge App Store lesson). The pure routing guard in resolveEntryView is the
 * second layer if it's somehow tapped anyway.
 */
export function useShowUpgrade(): boolean {
  const online = useOnline();
  const entitled = useEntitledForDisplay();
  const authStatus = useWondralStore((s) => s.authStatus);
  return hasSupabaseConfig && online && authStatus !== 'loading' && !entitled;
}

export { hasSupabaseConfig };
