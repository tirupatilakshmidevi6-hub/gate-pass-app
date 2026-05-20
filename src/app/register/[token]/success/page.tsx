'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function SuccessPage() {
  const params = useParams();
  const token  = params.token as string;

  const [status, setStatus]           = useState<'pending' | 'approved' | 'rejected' | 'loading'>('loading');
  const [gatePassHtml, setGatePassHtml] = useState<string | null>(null);
  const [passId, setPassId]           = useState('gate-pass');
  const [downloading, setDownloading] = useState(false);
  const gatePassRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/register/${token}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.entry?.status ?? '';
        if (s === 'Approved' && data.gatePassBodyHtml) {
          setGatePassHtml(data.gatePassBodyHtml);
          setPassId(data.entry?.pass_id ?? 'gate-pass');
          setStatus('approved');
        } else if (s === 'Rejected') {
          setStatus('rejected');
        } else {
          setStatus('pending');
        }
      })
      .catch(() => setStatus('pending'));
  }, [token]);

  async function handleDownload() {
    if (!gatePassRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF }       = await import('jspdf');

      const canvas = await html2canvas(gatePassRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f1f5f9',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pxWidth  = canvas.width  / 2;
      const pxHeight = canvas.height / 2;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [pxWidth, pxHeight] });
      pdf.addImage(imgData, 'PNG', 0, 0, pxWidth, pxHeight);
      pdf.save(`${passId}.pdf`);
    } catch (err) {
      console.error('Download failed:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 space-y-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Entry Not Approved</h2>
          <p className="text-sm text-slate-500">Your entry request was not approved. Please contact the HR team for assistance.</p>
          <p className="text-xs text-slate-400">NxtWave &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Registration Submitted!</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Your registration has been submitted. The <strong>Facilities Team</strong> will review and send your <strong>Gate Pass via email</strong> once approved.</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
            <p className="font-semibold">Status: Pending Approval</p>
            <p className="text-xs text-orange-600 mt-1">Check your email inbox after approval.</p>
          </div>
          <div className="text-left space-y-1.5 text-sm text-slate-600">
            <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">✓</span><span>Registration form received</span></div>
            <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-orange-400 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">2</span><span>Facilities Team reviews your request</span></div>
            <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">3</span><span>Gate pass emailed to you on approval</span></div>
          </div>
          <p className="text-xs text-slate-400">NxtWave &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    );
  }

  // Approved — show gate pass with download button
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Your Gate Pass is Ready!</p>
            <p className="text-xs text-green-700 mt-0.5">Present this gate pass at the entrance on your reporting date.</p>
          </div>
        </div>

        {/* Download button */}
        <div className="flex gap-3 no-print">
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-200 transition-colors">
            {downloading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating PDF…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download Gate Pass (PDF)</>
            )}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>

        {/* Gate pass */}
        <div ref={gatePassRef} id="gate-pass-download"
          dangerouslySetInnerHTML={{ __html: gatePassHtml ?? '' }} />

        <p className="text-center text-xs text-slate-400 mt-4 no-print">NxtWave &copy; {new Date().getFullYear()} &bull; Gate Pass System</p>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
