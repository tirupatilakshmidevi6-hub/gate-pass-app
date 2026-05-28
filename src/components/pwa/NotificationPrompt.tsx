'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

const PROMPTED_KEY = 'pwa-notification-prompted';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(PROMPTED_KEY)) return;

    // Show after 3 seconds post-login
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function enableNotifications() {
    localStorage.setItem(PROMPTED_KEY, '1');
    setShow(false);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Subscribe to push notifications
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }

  function dismiss() {
    localStorage.setItem(PROMPTED_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[9997] max-w-sm mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-blue-700 dark:text-blue-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Enable Notifications</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Get instant alerts for approvals and updates.
          </p>
          <div className="flex gap-2">
            <button
              onClick={enableNotifications}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-2 rounded-lg active:scale-95 transition-all"
            >
              Enable
            </button>
            <button
              onClick={dismiss}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold py-2 rounded-lg active:scale-95 transition-all"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
