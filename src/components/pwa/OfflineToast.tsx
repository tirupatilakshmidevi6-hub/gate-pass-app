'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export default function OfflineToast() {
  const [status, setStatus] = useState<'online' | 'offline' | 'back-online' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let backOnlineTimer: ReturnType<typeof setTimeout>;

    function handleOffline() {
      clearTimeout(backOnlineTimer);
      setStatus('offline');
    }

    function handleOnline() {
      setStatus('back-online');
      backOnlineTimer = setTimeout(() => setStatus(null), 4000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearTimeout(backOnlineTimer);
    };
  }, []);

  if (!status) return null;

  const isOffline = status === 'offline';

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border transition-all duration-300 text-sm font-medium ${
        isOffline
          ? 'bg-orange-600 border-orange-500 text-white'
          : 'bg-green-600 border-green-500 text-white'
      }`}
      role="alert"
    >
      {isOffline ? (
        <>
          <WifiOff size={16} className="flex-shrink-0" />
          <span>You are offline. Some features may not be available.</span>
        </>
      ) : (
        <>
          <Wifi size={16} className="flex-shrink-0" />
          <span>You are back online</span>
        </>
      )}
      {isOffline && (
        <button
          onClick={() => setStatus(null)}
          className="ml-2 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
