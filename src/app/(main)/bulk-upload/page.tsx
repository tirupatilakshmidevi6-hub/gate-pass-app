'use client';

import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const CSV_HEADERS = [
  'name', 'email', 'mobile_number', 'role', 'purpose',
  'reporting_date', 'valid_until', 'poc_name', 'employee_id', 'contact_no', 'building_name',
];

const REQUIRED = ['name', 'email', 'purpose', 'reporting_date', 'poc_name', 'contact_no', 'building_name'];

type ParsedRow = Record<string, string>;
type RowResult = { name: string; email: string; success: boolean; skipped?: boolean; error?: string; rowIndex?: number };

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', email: 'Email', purpose: 'Purpose',
  reporting_date: 'Reporting Date', poc_name: 'Point of Contact',
  contact_no: 'Contact Number', building_name: 'Building',
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function rowLabel(r: RowResult): string {
  const clean = (s: string | null | undefined) => (s ?? '').replace(/^["']+|["']+$/g, '').trim();
  return clean(r.name) || clean(r.email) || `Row ${r.rowIndex ?? '?'}`;
}

function parseMissingFields(error: string): string {
  const match = error.match(/Missing fields?: (.+)/i);
  if (!match) return error;
  return match[1].split(',').map((f) => FIELD_LABELS[f.trim()] ?? f.trim()).join(', ');
}

function stripQuotes(s: string) { return s.replace(/^["']+|["']+$/g, '').trim(); }

function parseCSV(text: string): { rows: ParsedRow[]; missingCols: string[] } {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], missingCols: [] };
  const fileHeaders = lines[0].split(',').map((h) => stripQuotes(h).toLowerCase());
  const missingCols = REQUIRED.filter((r) => !fileHeaders.includes(r));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => stripQuotes(v));
    const row: ParsedRow = {};
    fileHeaders.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { rows, missingCols };
}

function downloadSampleCSV() {
  const sample = [
    CSV_HEADERS.join(','),
    'Ravi Kumar,ravi@example.com,+919876543210,New Joiner,Onboarding,2026-06-01,2026-06-08,Syam Kumar,NW0000001,+919876543211,Brigade Towers',
    'Priya Sharma,priya@example.com,+919876543212,Intern,Interview,2026-06-02,2026-06-09,Anjali Rao,NW0000002,+919876543213,iSprout',
  ].join('\n');
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sample_bulk_entries.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function BulkUploadPage() {
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [fileName,   setFileName]   = useState('');
  const [parseError, setParseError] = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [results,    setResults]    = useState<{
    total: number; sent: number;
    failed: RowResult[]; skipped: RowResult[];
  } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResults(null); setError(''); setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, missingCols } = parseCSV(ev.target?.result as string);
      if (missingCols.length > 0) {
        setParseError(`Missing required columns: ${missingCols.join(', ')}`);
        setRows([]);
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (rows.length === 0) return;
    setUploading(true); setResults(null); setError('');
    try {
      const res = await fetch('/api/bulk-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return; }
      setResults(data);
      if (data.failed?.length === 0 && data.skipped?.length === 0) {
        setRows([]); setFileName('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally { setUploading(false); }
  }

  const sentCount    = results?.sent ?? 0;
  const failedCount  = results?.failed?.length ?? 0;
  const skippedCount = results?.skipped?.length ?? 0;

  return (
    <div className="page-container max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Bulk Upload via CSV</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload size={15} /> Choose CSV File
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          <span className="text-sm text-gray-500">{fileName || 'No file chosen'}</span>
        </div>

        <button onClick={downloadSampleCSV}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline">
          <Download size={14} /> Download Sample CSV
        </button>

        <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4 space-y-1.5">
          <p className="font-semibold text-gray-600 text-xs uppercase tracking-wider mb-2">Required CSV columns</p>
          <div className="flex flex-wrap gap-1.5">
            {CSV_HEADERS.map((h) => (
              <span key={h} className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                REQUIRED.includes(h) ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>{h}</span>
            ))}
          </div>
          <p className="text-gray-400 mt-2">Blue = required &nbsp;·&nbsp; Gray = optional</p>
        </div>

        {parseError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <XCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div><strong>CSV Error:</strong> {parseError}</div>
          </div>
        )}

        {rows.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">{rows.length} row(s) found — Preview (first 3):</p>
            <p className="text-xs text-gray-400 mb-1.5 sm:hidden">← Scroll left/right to see all columns</p>
            <div className="overflow-x-auto max-h-52 border border-gray-200 rounded-xl touch-scroll-x">
              <table className="w-full text-xs" style={{ minWidth: 640 }}>
                <thead className="bg-gray-50 sticky top-0">
                  <tr>{['Name','Email','Mobile','Role','Purpose','Date','Valid Until','POC','Emp ID','Contact','Building'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 3).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-gray-700">{r.name}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.email}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.mobile_number}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.role}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.purpose}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.reporting_date}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.valid_until}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.poc_name}</td>
                      <td className="px-3 py-1.5 text-gray-700 font-mono">{r.employee_id}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.contact_no}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.building_name}</td>
                    </tr>
                  ))}
                  {rows.length > 3 && (
                    <tr><td colSpan={11} className="px-3 py-1.5 text-gray-400 text-center">…and {rows.length - 3} more rows</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <div className="text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {results && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-xl font-bold text-green-700">{sentCount}</div>
                <div className="text-[11px] sm:text-xs text-green-600 font-medium leading-tight">Sent</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-xl font-bold text-amber-700">{skippedCount}</div>
                <div className="text-[11px] sm:text-xs text-amber-600 font-medium leading-tight">Skipped</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-xl font-bold text-red-700">{failedCount}</div>
                <div className="text-[11px] sm:text-xs text-red-600 font-medium leading-tight">Failed</div>
              </div>
            </div>

            {results.skipped.length > 0 && (() => {
              const byDate = results.skipped.reduce<Record<string, number>>((acc, s) => {
                const m = s.error?.match(/for (\d{4}-\d{2}-\d{2})/);
                const key = m ? m[1] : 'unknown date';
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
              }, {});
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                    <AlertTriangle size={13} /> Already Sent — Skipped
                  </div>
                  <div className="space-y-1">
                    {Object.entries(byDate).map(([date, count]) => (
                      <div key={date} className="text-xs text-amber-800">
                        <span className="font-medium">{count} invitation{count !== 1 ? 's' : ''} skipped</span> — already sent for {formatDisplayDate(date)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {results.failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                  <XCircle size={13} /> Could Not Send
                </div>
                <p className="text-xs text-red-700 mb-2">
                  {results.failed.length} invitation{results.failed.length !== 1 ? 's' : ''} could not be sent due to missing information.
                </p>
                <div className="space-y-1">
                  {results.failed.map((f, i) => (
                    <div key={i} className="text-xs text-red-700">
                      <span className="font-medium">{rowLabel(f)}</span> — missing: {parseMissingFields(f.error ?? '')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentCount > 0 && failedCount === 0 && skippedCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={16} /> All {sentCount} invitation emails sent successfully.
              </div>
            )}
          </div>
        )}

        <button onClick={handleUpload} disabled={rows.length === 0 || uploading || !!parseError}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Upload size={15} />
          {uploading ? 'Processing…' : `Upload & Send Invites${rows.length > 0 ? ` (${rows.length} rows)` : ''}`}
        </button>
      </div>
    </div>
  );
}
