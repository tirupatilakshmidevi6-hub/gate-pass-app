'use client';

import { useState, useRef } from 'react';
import { Upload, Download } from 'lucide-react';

const HEADERS = ['name', 'email', 'mobile', 'purpose', 'reporting_date', 'building_name', 'poc_name', 'contact_no', 'role'];

type ParsedRow = Record<string, string>;
type RowResult = { name: string; email: string; success: boolean; error?: string };

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

function downloadSampleCSV() {
  const sample = [
    HEADERS.join(','),
    'John Doe,john@example.com,9876543210,Interview,2026-05-26,Brigade Towers,Jane Smith,9876543211,New Joiner',
    'Alice Brown,alice@example.com,9876543212,Onboarding,2026-05-26,iSprout,Mike Ross,9876543213,Intern',
  ].join('\n');
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sample_entries.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function BulkUploadPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ total: number; sent: number; failed: RowResult[] } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResults(null); setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setRows(parseCSV(ev.target?.result as string));
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
      if (data.failed?.length === 0) { setRows([]); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }
    } finally { setUploading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Bulk Upload via CSV</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-700">Upload CSV File</h2>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <Upload size={15} />Choose File
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          <span className="text-sm text-gray-500">{fileName || 'No file chosen'}</span>
        </div>

        <button onClick={downloadSampleCSV} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <Download size={14} />Download Sample CSV
        </button>

        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          <strong>Required columns:</strong> {HEADERS.join(', ')}
          <br /><span className="text-gray-400 mt-1 block">Each candidate gets a unique registration form link sent to their email automatically.</span>
        </div>

        {rows.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">{rows.length} row(s) found. Preview (first 5):</p>
            <div className="overflow-x-auto max-h-48 border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>{['Name','Email','Mobile','Purpose','Date','Building','Role'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-gray-700">{r.name}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.email}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.mobile}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.purpose}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.reporting_date}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.building_name}</td>
                      <td className="px-3 py-1.5 text-gray-700">{r.role}</td>
                    </tr>
                  ))}
                  {rows.length > 5 && <tr><td colSpan={7} className="px-3 py-1.5 text-gray-400 text-center">…and {rows.length - 5} more rows</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <div className="text-sm rounded-lg px-4 py-2 bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {results && (
          <div className="space-y-2">
            <div className={`text-sm rounded-lg px-4 py-3 ${results.failed.length === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <p className="font-semibold">
                {results.sent} of {results.total} registration emails sent successfully.
                {results.failed.length > 0 && ` ${results.failed.length} failed.`}
              </p>
            </div>
            {results.failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-red-700">Failed rows:</p>
                {results.failed.map((f, i) => (
                  <div key={i} className="text-red-600">{f.name} ({f.email}): {f.error}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={handleUpload} disabled={rows.length === 0 || uploading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          <Upload size={15} />{uploading ? 'Processing…' : `Upload & Send ${rows.length > 0 ? `(${rows.length} entries)` : ''}`}
        </button>
      </div>
    </div>
  );
}
