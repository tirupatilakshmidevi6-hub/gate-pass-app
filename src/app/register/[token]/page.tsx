'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

type EntryData = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string;
  poc_name: string; building_name: string; status: string; pass_id: string | null;
};

export default function RegisterPage() {
  const params  = useParams();
  const token   = params.token as string;
  const router  = useRouter();

  const [entry,           setEntry]           = useState<EntryData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [notFound,        setNotFound]        = useState(false);

  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    fetch(`/api/register/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setNotFound(true);
        } else if (data.alreadySubmitted) {
          setAlreadySubmitted(true);
          setEntry(data.entry);
          // If approved, redirect to success page to view gate pass
          if (data.entry?.status === 'Approved') {
            router.replace(`/register/${token}/success`);
          }
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
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else setPhotoPreview(null);
  }

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    if (!photoFile) { setError('Please upload your photo'); return; }
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const res = await fetch(`/api/register/${token}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Submission failed.'); return; }
      router.push(`/register/${token}/success`);
    } catch { setError('Network error. Please try again.'); }
    finally  { setSubmitting(false); }
  }

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
              : `Hi ${entry?.name}, your registration is submitted and pending review. You will receive your gate pass by email once approved.`
            }
          </p>
        </div>
      </div>
    );
  }

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
            {error && <div className="px-5 py-3 bg-red-50 border-b border-red-100"><p className="text-sm text-red-600">{error}</p></div>}

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
              <p className="text-xs text-slate-500 -mt-1">Upload a clear frontal photo. Make sure your face is centered and fills the circle below.</p>

              {/* Large circular preview — mirrors the gate pass appearance */}
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
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoChange} className="hidden" id="photo-input" />
                  <label htmlFor="photo-input" className="inline-block px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-slate-700">
                    {photoFile ? 'Change Photo' : 'Choose from Gallery'}
                  </label>
                  {photoFile && <p className="text-xs text-slate-500 max-w-[220px] truncate text-center">{photoFile.name}</p>}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                <strong>Tips:</strong> Use a front-facing photo with good lighting. Avoid sunglasses or hats. Face should fill most of the circle.
              </div>
            </div>

            <div className="px-5 py-4">
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-200">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…
                  </span>
                ) : 'Submit Registration'}
              </button>
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
