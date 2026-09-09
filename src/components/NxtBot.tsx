'use client';

import { useState, useEffect } from 'react';

interface NxtBotProps {
  size?: number;
  float?: boolean;
  className?: string;
}

export default function NxtBot({ size = 72, float = false, className = '' }: NxtBotProps) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) return;

    let t: ReturnType<typeof setTimeout>;

    const doBlink = (isDouble = false) => {
      setBlinking(true);
      setTimeout(() => {
        setBlinking(false);
        if (isDouble) {
          setTimeout(() => {
            setBlinking(true);
            setTimeout(() => { setBlinking(false); scheduleNext(); }, 130);
          }, 220);
        } else {
          scheduleNext();
        }
      }, 140);
    };

    const scheduleNext = () => {
      const delay = 2800 + Math.random() * 3200;
      const isDouble = Math.random() < 0.12;
      t = setTimeout(() => doBlink(isDouble), delay);
    };

    scheduleNext();
    return () => clearTimeout(t);
  }, []);

  const h = size * 1.52;

  return (
    <div
      className={`nxt-bot-enter ${float ? 'nxt-bot-float' : ''} ${className} hover:nxt-bot-lift`}
      style={{ width: size, height: h, flexShrink: 0 }}
    >
      <svg
        viewBox="0 0 100 152"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(20,110,245,0.25))' }}
      >
        {/* ── Head cube ── */}
        <rect x="17" y="6" width="66" height="66" rx="11" fill="#146EF5" />
        <rect x="17" y="6" width="66" height="66" rx="11" fill="none" stroke="white" strokeWidth="3.8" />
        {/* Head highlight top edge */}
        <path d="M23 11 Q50 8 77 11" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />

        {/* ── Eyes (grouped so entire group scales on blink) ── */}
        {/* Left eye group */}
        <g
          className={`nxt-eye-group${blinking ? ' blink' : ''}`}
          style={{ transformOrigin: '35px 36px' }}
        >
          <ellipse cx="35" cy="36" rx="11.5" ry="14.5" fill="white" />
          <ellipse cx="35" cy="39.5" rx="5.5" ry="7" fill="#0B1324" />
          <ellipse cx="38.5" cy="32" rx="3" ry="3.5" fill="white" />
        </g>
        {/* Right eye group */}
        <g
          className={`nxt-eye-group${blinking ? ' blink' : ''}`}
          style={{ transformOrigin: '65px 36px' }}
        >
          <ellipse cx="65" cy="36" rx="11.5" ry="14.5" fill="white" />
          <ellipse cx="65" cy="39.5" rx="5.5" ry="7" fill="#0B1324" />
          <ellipse cx="68.5" cy="32" rx="3" ry="3.5" fill="white" />
        </g>

        {/* ── Neck connector ── */}
        <rect x="39" y="72" width="22" height="10" rx="5" fill="#0D62E0" />

        {/* ── Body cube ── */}
        <rect x="9" y="84" width="82" height="62" rx="11" fill="#146EF5" />
        <rect x="9" y="84" width="82" height="62" rx="11" fill="none" stroke="white" strokeWidth="3.8" />
        {/* Body highlight */}
        <path d="M15 89 Q50 86 85 89" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
        {/* Body detail line */}
        <line x1="20" y1="114" x2="80" y2="114" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
