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

  const [submitStep, setSubmitStep] = useState<SubmitStep>(null);
  const [error,      setError]      = useState('');

  // Revoke object URL when component unmounts to free memory
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  useEffect(() => {
    fetch(`/api/register/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setNotFound(true);
        } else if (data.isExpired) {
          setIsExpired(true);
        } else if (data.alreadySubmitted) {
          setAlreadySubmitted(true);
          setEntry(data.entry);
          if (data.entry?.status === 'Approved') router.replace(`/register/${token}/success`);
        } else {
          setEntry(data.entry);
        }
      })
      .catch(() => setNotFound(true))
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading registration form…</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 space-y-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Registration Link Expired</h2>
          <p className="text-sm text-slate-500">This registration link has expired. Please contact HR to get a new invitation link.</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Invalid Link</h2>
          <p className="text-sm text-slate-500">This registration link is invalid or has expired. Please contact the HR team.</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted && entry?.status !== 'Approved') {
    const isRejected = entry?.status === 'Rejected';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 space-y-4">
          <div className={`w-14 h-14 ${isRejected ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto`}>
            <svg className={`w-7 h-7 ${isRejected ? 'text-red-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRejected ? 'M6 18L18 6M6 6l12 12' : 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'} />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">{isRejected ? 'Entry Rejected' : 'Pending Approval'}</h2>
          <p className="text-sm text-slate-500">
            {isRejected
              ? `Sorry ${entry?.name}, your entry request was not approved. Please contact HR.`
              : 'You have already completed your registration. Your gate pass request is being reviewed by the Facilities Team. Please check your email for updates.'
            }
          </p>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
              alt="NxtWave"
              className="h-14 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-slate-500 mt-1">Office Entry Registration</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
          <p className="font-semibold mb-1">Hello, {entry?.name}!</p>
          <p className="text-blue-700 text-xs leading-relaxed">Please upload your photo to complete registration. Once submitted, the Facilities Team will review and send your gate pass to your email.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="divide-y divide-slate-100">

            {/* Error banner */}
            {error && (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Read-only personal info */}
            <div className="px-5 py-4 space-y-3">
              <SectionLabel>Your Details (Pre-filled)</SectionLabel>
              {[
                { label: 'Full Name',     value: entry?.name ?? '' },
                { label: 'Email',         value: entry?.email ?? '' },
                { label: 'Mobile Number', value: entry?.mobile_number ?? '' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                  <input value={f.value} readOnly className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm cursor-not-allowed" />
                </div>
              ))}
            </div>

            {/* Photo upload */}
            <div className="px-5 py-4 space-y-3">
              <SectionLabel>Photo Upload *</SectionLabel>
              <p className="text-xs text-slate-500 -mt-1">Upload a clear frontal photo. Your photo will be automatically compressed before upload.</p>

              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-36 h-36 rounded-full object-cover object-top border-4 border-blue-500 shadow-md"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-full bg-slate-100 border-4 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1">
                      <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <span className="text-xs text-slate-400">Your photo</span>
                    </div>
                  )}
                </div>

                {photoPreview && (
                  <p className="text-xs text-center text-slate-500 max-w-[220px]">
                    Is your face clearly visible and centered in the circle? If not, re-upload a better photo.
                  </p>
                )}

                <div className="flex flex-col items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-input"
                    disabled={submitting}
                  />
                  <label
                    htmlFor="photo-input"
                    className={`inline-block px-5 py-2 text-white text-sm font-medium rounded-lg ${submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 cursor-pointer hover:bg-slate-700'}`}
                  >
                    {photoFile ? 'Change Photo' : 'Choose from Gallery'}
                  </label>
                  {photoFile && <p className="text-xs text-slate-500 max-w-[220px] truncate text-center">{photoFile.name}</p>}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                <strong>Tips:</strong> Use a front-facing photo with good lighting. Avoid sunglasses or hats. Face should fill most of the circle.
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 py-4 space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-200"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {STEP_LABEL[submitStep!]}
                  </span>
                ) : 'Submit Registration'}
              </button>

              {/* Progress steps shown while submitting */}
              {submitting && (
                <div className="flex items-center justify-center gap-4 pt-1">
                  {(['compressing', 'uploading', 'submitting'] as const).map((step, i) => {
                    const steps: SubmitStep[] = ['compressing', 'uploading', 'submitting'];
                    const currentIdx = steps.indexOf(submitStep);
                    const isDone    = i < currentIdx;
                    const isActive  = i === currentIdx;
                    return (
                      <div key={step} className="flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone   ? 'bg-green-500 text-white' :
                          isActive ? 'bg-blue-600 text-white' :
                                     'bg-slate-200 text-slate-400'
                        }`}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className={`text-[10px] ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
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

        <p className="text-center text-xs text-slate-400 mt-5">NxtWave &copy; {new Date().getFullYear()} &nbsp;|&nbsp; Gate Pass System</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</p>;
}
