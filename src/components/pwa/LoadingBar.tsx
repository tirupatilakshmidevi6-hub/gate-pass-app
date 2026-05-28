'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function LoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    setVisible(true);
    setProgress(10);

    if (intervalRef.current !== undefined) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) {
          if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
          return p;
        }
        return p + Math.random() * 12;
      });
    }, 200);

    if (timerRef.current !== undefined) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 600);

    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99998] h-0.5">
      <div
        className="h-full bg-blue-400 shadow-sm transition-all duration-200 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
