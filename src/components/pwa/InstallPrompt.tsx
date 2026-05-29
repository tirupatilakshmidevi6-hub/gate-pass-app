'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const VISIT_COUNT_KEY = 'pwa-visit-count';
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track visit count
    const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visits));

    // Check dismissed
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as (Window & { MSStream?: unknown })).MSStream;
    setIsIOS(ios);

    if (ios && visits >= 2) {
      setShow(true);
      return;
    }

    // Android / Desktop — listen for beforeinstallprompt
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= 2) setShow(true);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 5000);
    });

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
    setShowIOSModal(false);
  }

  async function install() {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 5000);
    }
    setDeferredPrompt(null);
    setShow(false);
  }

  if (installed) return null;

  return (
    <>
      {/* Install banner */}
      {show && !showIOSModal && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl px-4 py-4 flex items-center gap-3 safe-area-bottom">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-white">NW</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Install NxtWave Gate Pass</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">For quick access from your home screen</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={dismiss}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg active:scale-95 transition-all"
            >
              {isIOS ? <Share size={15} /> : <Download size={15} />}
              {isIOS ? 'How to Install' : 'Install'}
            </button>
          </div>
        </div>
      )}

      {/* iOS install modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end justify-center px-4 pb-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Install on iPhone / iPad</h3>
              <button onClick={() => { setShowIOSModal(false); dismiss(); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Tap the Share button</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tap <Share size={12} className="inline" /> at the bottom of Safari</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Tap &quot;Add to Home Screen&quot;</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scroll down in the share menu to find it</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Tap &quot;Add&quot;</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">NxtWave GatePass will appear on your home screen</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setShowIOSModal(false); dismiss(); }}
              className="mt-5 w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl active:scale-95 transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl border border-green-500 max-w-xs text-center">
          App installed successfully! You can now open it from your home screen.
        </div>
      )}
    </>
  );
}
