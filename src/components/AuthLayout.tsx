'use client';

export const AUTH_LOGO =
  'https://aniportalimages.s3.amazonaws.com/media/details/NxtWave_Logo2021090907535420210909075559.jpg';

// ─── AuthLayout ───────────────────────────────────────────────────────────────
// A single small card centred on a soft gradient backdrop (login / signup / forgot password).
// The scroll container uses `margin: auto` on the child so tall cards stay reachable on short screens.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-bg auth-rp"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', padding: 16, overflowY: 'auto' }}
    >
      <div className="auth-rise" style={{ width: '100%', maxWidth: 380, margin: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
