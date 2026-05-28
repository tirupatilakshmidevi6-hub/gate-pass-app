'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, Wifi, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    document.title = 'Offline — NxtWave Gate Pass';
  }, []);

  async function retryConnection() {
    setChecking(true);
    setChecked(false);
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok || res.status === 401) {
        router.push('/');
        return;
      }
    } catch {
      // still offline
    }
    setChecked(true);
    setChecking(false);
  }

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center px-6 text-white">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-2xl border border-blue-500">
          <span className="text-4xl font-black text-white tracking-tight">NW</span>
        </div>
        <h1 className="text-xl font-bold text-blue-100">NxtWave GatePass</h1>
      </div>

      {/* Offline icon */}
      <div className="mb-6 bg-orange-500/20 border border-orange-400/40 rounded-full p-5">
        <WifiOff size={48} className="text-orange-300" />
      </div>

      <h2 className="text-2xl font-bold mb-2 text-center">You are currently offline</h2>
      <p className="text-blue-200 text-sm mb-8 text-center max-w-xs">
        No internet connection detected. Some features are still available.
      </p>

      {/* Available offline */}
      <div className="w-full max-w-sm bg-blue-800/60 rounded-2xl p-5 mb-4 border border-blue-600/40">
        <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
          <CheckCircle size={16} /> Available offline
        </h3>
        <ul className="space-y-2 text-sm text-blue-100">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            View previously loaded dashboard
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            View downloaded gate passes
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            Your login session is saved
          </li>
        </ul>
      </div>

      {/* Needs internet */}
      <div className="w-full max-w-sm bg-blue-800/60 rounded-2xl p-5 mb-8 border border-blue-600/40">
        <h3 className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
          <XCircle size={16} /> Needs internet connection
        </h3>
        <ul className="space-y-2 text-sm text-blue-200">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            Creating new entries
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            Sending emails
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            Approving requests
          </li>
        </ul>
      </div>

      {/* Retry button */}
      <button
        onClick={retryConnection}
        disabled={checking}
        className="flex items-center gap-2 bg-white text-blue-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-60 shadow-lg"
      >
        {checking ? (
          <>
            <RefreshCw size={18} className="animate-spin" />
            Checking connection…
          </>
        ) : (
          <>
            <Wifi size={18} />
            Retry Connection
          </>
        )}
      </button>

      {checked && (
        <p className="mt-4 text-sm text-orange-300">
          Still offline. Please check your internet connection.
        </p>
      )}

      <p className="mt-10 text-xs text-blue-400 text-center">
        NxtWave Gate Pass System · PWA v1.0
      </p>
    </div>
  );
}
