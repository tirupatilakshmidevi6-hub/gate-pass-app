'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Only show splash in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isStandalone) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 500);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-blue-800 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      {/* Logo */}
      <div className="w-28 h-28 bg-blue-700 rounded-3xl flex items-center justify-center shadow-2xl border border-blue-500 mb-6">
        <span className="text-5xl font-black text-white tracking-tight">NW</span>
      </div>

      {/* App name */}
      <h1 className="text-2xl font-bold text-white mb-1">NxtWave GatePass</h1>
      <p className="text-blue-300 text-sm mb-10">Office Entry Management</p>

      {/* Spinner */}
      <div className="w-8 h-8 border-4 border-blue-400 border-t-white rounded-full animate-spin" />
    </div>
  );
}
