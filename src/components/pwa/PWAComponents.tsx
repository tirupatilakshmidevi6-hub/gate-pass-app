'use client';

import dynamic from 'next/dynamic';

const OfflineToast = dynamic(() => import('./OfflineToast'), { ssr: false });
const InstallPrompt = dynamic(() => import('./InstallPrompt'), { ssr: false });
const SplashScreen = dynamic(() => import('./SplashScreen'), { ssr: false });
const LoadingBar = dynamic(() => import('./LoadingBar'), { ssr: false });
const NotificationPrompt = dynamic(() => import('./NotificationPrompt'), { ssr: false });

export default function PWAComponents() {
  return (
    <>
      <SplashScreen />
      <LoadingBar />
      <OfflineToast />
      <InstallPrompt />
      <NotificationPrompt />
    </>
  );
}
