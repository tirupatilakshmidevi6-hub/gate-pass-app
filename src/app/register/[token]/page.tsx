'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

type EntryData = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string;
  poc_name: string; building_name: string; status: string; pass_id: string | null;
};

type SubmitStep = 'compressing' | 'uploading' | 'submitting' | null;

const STEP_LABEL: Record<NonNullable<SubmitStep>, string> = {
  compressing: 'Compressing photo…',
  uploading:   'Uploading photo…',
  submitting:  'Completing registration…',
};

// ── Image compression ──────────────────────────────────────────────────────────
// Resizes to max 800×800 px and compresses as JPEG ≤ 500 KB.
// Uses only Canvas + Blob APIs — works in Chrome, Safari, and Samsung Browser.
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_DIM = 800;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
        else                 { width  = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Your browser does not support image processing. Please try a different browser.')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const MAX_BYTES = 500 * 1024;
      function tryCompress(quality: number) {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Could not compress the image. Please try a different photo.')); return; }
          if (blob.size <= MAX_BYTES || quality <= 0.3) resolve(blob);
          else tryCompress(quality - 0.1);
        }, 'image/jpeg', quality);
      }
      tryCompress(0.85);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the photo. Please try a different image file.'));
    };

    img.src = objectUrl;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const params = useParams();
  const token  = params.token as string;
  const router = useRouter();

  const [entry,            setEntry]            = useState<EntryData | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isExpired,        setIsExpired]        = useState(false);
  const [notFound,         setNotFound]         = useState(false);

  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const previewUrlRef  = useRef<string | null>(null);

  const [submitStep,   setSubmitStep]   = useState<SubmitStep>(null);
  const [error,        setError]        = useState('');
  const [serverError,  setServerError]  = useState(false);

  // Revoke object URL when component unmounts to free memory
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  useEffect(() => {
    fetch(`/api/register/${token}`)
      .then(async (r) => {
        let data: Record<string, unknown> = {};
        try { data = await r.json(); } catch { /* non-JSON 500 */ }
        if (r.status >= 500) {
          setServerError(true);
        } else if (data.error || r.status === 404) {
          setNotFound(true);
        } else if (data.isExpired) {
          setIsExpired(true);
        } else if (data.alreadySubmitted) {
          setAlreadySubmitted(true);
          setEntry(data.entry as EntryData);
          if ((data.entry as EntryData)?.status === 'Approved') router.replace(`/register/${token}/success`);
        } else {
          setEntry(data.entry as EntryData);
        }
      })
      .catch(() => setServerError(true))
      .finally(() => setLoading(false));
  }, [token, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      // Use createObjectURL — faster than FileReader and works in all mobile browsers
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!photoFile) { setError('Please upload your photo before submitting.'); return; }
    setError('');

    // ── Step 1: Compress photo in the browser ──────────────────────────────
    setSubmitStep('compressing');
    let compressed: Blob;
    try {
      compressed = await compressImage(photoFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image. Please try a different photo.');
      setSubmitStep(null);
      return;
    }

    // ── Step 2: Upload photo to Supabase Storage via /photo endpoint ───────
    setSubmitStep('uploading');
    const uploadCtrl = new AbortController();
    const uploadTimer = setTimeout(() => uploadCtrl.abort(), 60_000); // 60 s upload timeout
    let photoUrl: string;
    try {
      const fd = new FormData();
      fd.append('photo', compressed, 'photo.jpg');
      const res = await fetch(`/api/register/${token}/photo`, {
        method: 'POST', body: fd, signal: uploadCtrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Photo upload failed (${res.status}). Please try again.`);
        setSubmitStep(null);
        return;
      }
      photoUrl = data.photoUrl;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Upload timed out — your connection may be slow. Please try again on a stronger network.');
      } else {
        setError('Could not reach the server. Please check your internet connection and try again.');
      }
      setSubmitStep(null);
      return;
    } finally {
      clearTimeout(uploadTimer);
    }

    // ── Step 3: Complete registration (tiny JSON payload — fast even on 2G) ─
    setSubmitStep('submitting');
    const submitCtrl = new AbortController();
    const submitTimer = setTimeout(() => submitCtrl.abort(), 30_000); // 30 s submit timeout
    try {
      const res = await fetch(`/api/register/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
        signal: submitCtrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Registration failed (${res.status}). Please try again.`);
        setSubmitStep(null);
        return;
      }
      router.push(`/register/${token}/success`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Registration timed out. Please try again.');
      } else {
        setError('Could not complete registration. Please try again.');
      }
      setSubmitStep(null);
    } finally {
      clearTimeout(submitTimer);
    }
  }

  const submitting = submitStep !== null;

  const PageShell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #e8f0fe 0%, #f8faff 50%, #eef2ff 100%)' }}>
      {children}
    </div>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading your registration…</p>
        </div>
      </PageShell>
    );
  }

  if (isExpired) {
    return (
      <PageShell>
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-100 space-y-4">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div><h2 className="text-lg font-bold text-slate-800">Link Expired</h2>
          <p className="text-sm text-slate-500 mt-1">This registration link has expired. Please contact HR to get a new invitation.</p></div>
        </div>
      </PageShell>
    );
  }

  if (serverError) {
    return (
      <PageShell>
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-100 space-y-4">
          <div className="w-14 h-14 bg-yellow-50 border border-yellow-200 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div><h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
          <p className="text-sm text-slate-500 mt-1">The server encountered an error. Please refresh the page and try again.</p></div>
          <button onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell>
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-100 space-y-4">
          <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <div><h2 className="text-lg font-bold text-slate-800">Invalid Link</h2>
          <p className="text-sm text-slate-500 mt-1">This registration link is invalid or has already been used. Please contact the HR team.</p></div>
        </div>
      </PageShell>
    );
  }

  if (alreadySubmitted && entry?.status !== 'Approved') {
    const isRejected = entry?.status === 'Rejected';
    return (
      <PageShell>
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-100 space-y-4">
          <div className={`w-14 h-14 ${isRejected ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'} rounded-full flex items-center justify-center mx-auto`}>
            <svg className={`w-7 h-7 ${isRejected ? 'text-red-500' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRejected ? 'M6 18L18 6M6 6l12 12' : 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'} />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{isRejected ? 'Entry Rejected' : 'Pending Approval'}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {isRejected
                ? `Sorry ${entry?.name}, your entry request was not approved. Please contact HR.`
                : 'Your registration is complete and is being reviewed by the Facilities Team. You will receive an email once approved.'
              }
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Card header — branded */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)' }} className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span style={{ fontFamily: 'Arial Black, sans-serif', fontWeight: 900, letterSpacing: '-0.5px' }}
                  className="text-white text-lg">NXT</span>
                <span style={{ fontFamily: 'Arial Black, sans-serif', fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(90deg,#60a5fa,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  className="text-lg">WAVE</span>
              </div>
              <span className="text-blue-300 text-xs">•</span>
              <span className="text-blue-200 text-xs font-medium">Office Entry</span>
            </div>
            <h1 className="text-white font-bold text-xl leading-tight">Hello, {entry?.name}!</h1>
            <p className="text-blue-200 text-xs mt-1 leading-relaxed">Upload your photo to complete registration. The Facilities Team will review and send your gate pass by email.</p>
            {/* Visit summary pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1 bg-white/15 text-white text-xs px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                {entry?.reporting_date}
              </span>
              <span className="inline-flex items-center gap-1 bg-white/15 text-white text-xs px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {entry?.building_name}
              </span>
              <span className="inline-flex items-center gap-1 bg-white/15 text-white text-xs px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                {entry?.purpose}
              </span>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit}>

            {/* Error banner */}
            {error && (
              <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Read-only personal info */}
            <div className="px-6 pt-5 pb-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Your Details</p>
              {[
                { label: 'Full Name',     value: entry?.name ?? '' },
                { label: 'Email',         value: entry?.email ?? '' },
                { label: 'Mobile Number', value: entry?.mobile_number ?? '' },
              ].filter((f) => f.value).map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                  <input value={f.value} readOnly
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm cursor-not-allowed select-none" />
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-slate-100" />

            {/* Photo upload */}
            <div className="px-6 pt-4 pb-5 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Photo <span className="text-red-400">*</span></p>

              <div className="flex flex-col items-center gap-4 py-2">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview"
                    className="w-28 h-28 rounded-full object-cover object-top border-4 border-blue-500 shadow-md" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1.5">
                    <svg className="w-9 h-9 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="text-[11px] text-slate-400">Your photo</span>
                  </div>
                )}

                <input ref={fileInputRef} type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                  onChange={handlePhotoChange} className="hidden" id="photo-input" disabled={submitting} />
                <div className="flex flex-col items-center gap-1">
                  <label htmlFor="photo-input"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${submitting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white cursor-pointer hover:bg-slate-700'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {photoFile ? 'Change Photo' : 'Choose from Gallery'}
                  </label>
                  {photoFile && <p className="text-xs text-slate-400 max-w-[200px] truncate text-center">{photoFile.name}</p>}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="px-6 pb-6">
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {STEP_LABEL[submitStep!]}
                  </span>
                ) : 'Submit Registration'}
              </button>

              {/* Progress steps */}
              {submitting && (
                <div className="flex items-center justify-center gap-6 mt-3">
                  {(['compressing', 'uploading', 'submitting'] as const).map((step, i) => {
                    const steps: SubmitStep[] = ['compressing', 'uploading', 'submitting'];
                    const currentIdx = steps.indexOf(submitStep);
                    const isDone    = i < currentIdx;
                    const isActive  = i === currentIdx;
                    return (
                      <div key={step} className="flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>{isDone ? '✓' : i + 1}</div>
                        <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                          {step === 'compressing' ? 'Compress' : step === 'uploading' ? 'Upload' : 'Submit'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">NxtWave &copy; {new Date().getFullYear()} &nbsp;·&nbsp; Gate Pass System</p>
      </div>
    </PageShell>
  );
}
