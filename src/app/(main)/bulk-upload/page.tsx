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
  const trimmedLines = text.split('\n').map((l) => l.trim());
  // Find the header line (first non-blank line)
  const headerIdx = trimmedLines.findIndex(Boolean);
  if (headerIdx === -1 || trimmedLines.filter(Boolean).length < 2) return { rows: [], missingCols: [] };
  const fileHeaders = trimmedLines[headerIdx].split(',').map((h) => stripQuotes(h).toLowerCase());
  const missingCols = REQUIRED.filter((r) => !fileHeaders.includes(r));
  const rows: ParsedRow[] = [];
  // Iterate every line after the header, preserving original file row numbers
  // so that row numbers shown to users match the actual CSV line numbers.
  for (let i = headerIdx + 1; i < trimmedLines.length; i++) {
    const line = trimmedLines[i];
    if (!line) continue; // skip blank lines silently
    const values = line.split(',').map((v) => stripQuotes(v));
    const row: ParsedRow = {};
    fileHeaders.forEach((h, j) => { row[h] = values[j] ?? ''; });
    // Skip rows where every field is empty or whitespace-only
    if (Object.values(row).every((v) => v === '')) continue;
    // _row_num = position in file relative to header (1 = first data row)
    row._row_num = String(i - headerIdx);
    rows.push(row);
  }
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
  const [rows,          setRows]          = useState<ParsedRow[]>([]);
  const [fileName,      setFileName]      = useState('');
  const [parseError,    setParseError]    = useState('');
  const [uploading,     setUploading]     = useState(false);
  const [results,       setResults]       = useState<{
    total: number; sent: number;
    failed: RowResult[]; skipped: RowResult[]; emailFailed: RowResult[];
  } | null>(null);
  const [error,         setError]         = useState('');
  const [emailWarnings, setEmailWarnings] = useState<{ row: string; email: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResults(null); setError(''); setParseError(''); setEmailWarnings([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, missingCols } = parseCSV(ev.target?.result as string);
      if (missingCols.length > 0) {
        setParseError(`Missing required columns: ${missingCols.join(', ')}`);
        setRows([]);
        return;
      }
      // Flag rows where email format looks invalid so admin can review before uploading
      const bad = parsed
        .filter((r) => r.email && !EMAIL_RE.test(r.email.trim()))
        .map((r) => ({ row: r._row_num ?? '?', email: r.email.trim() }));
      setEmailWarnings(bad);
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
      if (data.failed?.length === 0 && data.skipped?.length === 0 && data.emailFailed?.length === 0) {
        setRows([]); setFileName(''); setEmailWarnings([]);
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally { setUploading(false); }
  }

  const sentCount        = results?.sent ?? 0;
  const failedCount      = results?.failed?.length ?? 0;
  const skippedCount     = results?.skipped?.length ?? 0;
  const emailFailedCount = results?.emailFailed?.length ?? 0;

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
            {/* Summary bar — 4 states */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-xl font-bold text-green-700">{sentCount}</div>
                <div className="text-[11px] sm:text-xs text-green-600 font-medium leading-tight">Email Sent</div>
              </div>
              <div className={`border rounded-xl p-2.5 sm:p-3 text-center ${emailFailedCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xl font-bold ${emailFailedCount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{emailFailedCount}</div>
                <div className={`text-[11px] sm:text-xs font-medium leading-tight ${emailFailedCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Email Failed</div>
              </div>
              <div className={`border rounded-xl p-2.5 sm:p-3 text-center ${skippedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xl font-bold ${skippedCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{skippedCount}</div>
                <div className={`text-[11px] sm:text-xs font-medium leading-tight ${skippedCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Skipped</div>
              </div>
              <div className={`border rounded-xl p-2.5 sm:p-3 text-center ${failedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xl font-bold ${failedCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{failedCount}</div>
                <div className={`text-[11px] sm:text-xs font-medium leading-tight ${failedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>Failed</div>
              </div>
            </div>

            {/* Email failed — entry exists in DB but email not sent */}
            {results.emailFailed.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-700 uppercase tracking-wider">
                  <AlertTriangle size={13} /> Entry Saved — Email Not Sent
                </div>
                <p className="text-xs text-orange-800 mb-2 leading-relaxed">
                  {results.emailFailed.length} candidate{results.emailFailed.length !== 1 ? 's were' : ' was'} added to the system,
                  but the invite email could not be sent (SMTP error or rate limit).
                  Their entries are saved — use the <strong>Resend</strong> button in the entry list to retry.
                </p>
                <div className="space-y-1">
                  {results.emailFailed.map((f, i) => (
                    <div key={i} className="text-xs text-orange-700">
                      <span className="font-medium">{rowLabel(f)}</span>
                      {' '}(<span className="font-mono">{f.email}</span>)
                      {f.error ? <> — {f.error}</> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped — duplicate entries */}
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
                    <AlertTriangle size={13} /> Already Exists — Skipped
                  </div>
                  <div className="space-y-1">
                    {Object.entries(byDate).map(([date, count]) => (
                      <div key={date} className="text-xs text-amber-800">
                        <span className="font-medium">{count} invitation{count !== 1 ? 's' : ''} skipped</span> — entry already exists for {formatDisplayDate(date)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Failed — could not create entry */}
            {results.failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                  <XCircle size={13} /> Could Not Process
                </div>
                <p className="text-xs text-red-700 mb-2">
                  {results.failed.length} row{results.failed.length !== 1 ? 's' : ''} could not be added — fix errors and re-upload these rows.
                </p>
                <div className="space-y-1">
                  {results.failed.map((f, i) => {
                    const isMissingFields = /^missing fields?:/i.test(f.error ?? '');
                    return (
                      <div key={i} className="text-xs text-red-700">
                        <span className="font-medium">{rowLabel(f)}</span>
                        {isMissingFields
                          ? <> — missing: {parseMissingFields(f.error ?? '')}</>
                          : <> — {f.error ?? 'Unknown error'}</>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All clear */}
            {sentCount > 0 && failedCount === 0 && skippedCount === 0 && emailFailedCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={16} /> All {sentCount} invitation email{sentCount !== 1 ? 's' : ''} sent successfully.
              </div>
            )}
          </div>
        )}

        {/* Email review warning — shown whenever rows are loaded */}
        {rows.length > 0 && (
          <div className={`rounded-xl p-3 border text-xs space-y-1 ${emailWarnings.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`flex items-center gap-1.5 font-semibold ${emailWarnings.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
              <AlertTriangle size={13} />
              {emailWarnings.length > 0
                ? `${emailWarnings.length} row${emailWarnings.length !== 1 ? 's' : ''} with invalid email format — fix before uploading`
                : 'Review all email addresses before uploading'}
            </div>
            <p className={emailWarnings.length > 0 ? 'text-red-600' : 'text-amber-600'}>
              Typos or wrong email addresses will bounce — the invitation will never reach the candidate.
            </p>
            {emailWarnings.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {emailWarnings.map((w, i) => (
                  <li key={i} className="text-red-700">Row {w.row}: <span className="font-mono">{w.email}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button onClick={handleUpload} disabled={rows.length === 0 || uploading || !!parseError || emailWarnings.length > 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Upload size={15} />
          {uploading ? 'Processing…' : `Upload & Send Invites${rows.length > 0 ? ` (${rows.length} rows)` : ''}`}
        </button>
      </div>
    </div>
  );
}
