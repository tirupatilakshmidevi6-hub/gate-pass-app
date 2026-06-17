'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Wifi, WifiOff, Bell, BellOff, Download, RefreshCw, CheckCircle, XCircle, Send } from 'lucide-react';

type Building = { id: string; name: string };

type PWAStatus = {
  swRegistered: boolean;
  swScope: string | null;
  swState: string | null;
  notifPermission: NotificationPermission | null;
  isInstalled: boolean;
  isOnline: boolean;
  cacheNames: string[];
};

function usePWAStatus(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    swRegistered: false, swScope: null, swState: null,
    notifPermission: null, isInstalled: false, isOnline: true, cacheNames: [],
  });

  useEffect(() => {
    async function check() {
      let swRegistered = false, swScope = null, swState = null;
      let cacheNames: string[] = [];

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
        if (reg) {
          swRegistered = true;
          swScope = reg.scope;
          swState = reg.active?.state ?? reg.installing?.state ?? reg.waiting?.state ?? 'unknown';
        }
      }

      if ('caches' in window) {
        cacheNames = await caches.keys();
      }

      setStatus({
        swRegistered,
        swScope,
        swState,
        notifPermission: 'Notification' in window ? Notification.permission : null,
        isInstalled: window.matchMedia('(display-mode: standalone)').matches,
        isOnline: navigator.onLine,
        cacheNames,
      });
    }
    check();

    window.addEventListener('online', () => setStatus((s) => ({ ...s, isOnline: true })));
    window.addEventListener('offline', () => setStatus((s) => ({ ...s, isOnline: false })));
  }, []);

  return status;
}

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('NxtWave Technologies');
  const [facilitiesEmail, setFacilitiesEmail] = useState('facilities@nxtwave.com');
  const [validityDays, setValidityDays] = useState('7');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [newBuilding, setNewBuilding] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingBuilding, setAddingBuilding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const pwa = usePWAStatus();

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/buildings').then((r) => r.json()),
    ]).then(([settings, bldgs]) => {
      if (settings.organization_name) setOrgName(settings.organization_name);
      if (settings.facilities_email)  setFacilitiesEmail(settings.facilities_email);
      if (settings.pass_validity_days) setValidityDays(settings.pass_validity_days);
      if (Array.isArray(bldgs)) setBuildings(bldgs);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_name: orgName, facilities_email: facilitiesEmail, pass_validity_days: validityDays }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleAddBuilding() {
    const name = newBuilding.trim();
    if (!name) return;
    setAddingBuilding(true);
    const res = await fetch('/api/buildings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const b = await res.json();
      setBuildings((prev) => [...prev, b]);
      setNewBuilding('');
    }
    setAddingBuilding(false);
  }

  async function handleSendTestEmail() {
    if (!testEmailTo.trim()) return;
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailTo.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailResult({ ok: true, message: `Test email sent successfully via Gmail. Message ID: ${data.messageId}` });
      } else {
        setTestEmailResult({ ok: false, message: data.error ?? 'Unknown error' });
      }
    } catch {
      setTestEmailResult({ ok: false, message: 'Network error — could not reach server' });
    }
    setTestEmailSending(false);
  }

  async function handleDeleteBuilding(id: string) {
    await fetch('/api/buildings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setBuildings((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) return <div className="page-container text-sm text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg mx-auto px-3 sm:px-0 py-4 sm:py-5 space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Settings</h1>

      {/* General */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">General</h2>

        <Field label="Organization Name">
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" />
        </Field>
        <Field label="Facilities Team Email">
          <input type="email" value={facilitiesEmail} onChange={(e) => setFacilitiesEmail(e.target.value)} className="input" />
          <p className="text-xs text-gray-400 mt-1">Notification emails are sent to this address when candidates submit registration forms.</p>
        </Field>
        <Field label="Pass Validity (days)">
          <input type="number" min="1" max="365" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} className="input w-24" />
          <p className="text-xs text-gray-400 mt-1">Gate pass is valid from reporting date for this many days.</p>
        </Field>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
          <Save size={14} />{saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <p className="text-sm text-green-600 font-medium">Settings saved successfully.</p>}
      </div>

      {/* Email Configuration Test */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Send size={16} className="text-blue-600" />
          Email Configuration
        </h2>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
          <p><strong>SMTP Provider:</strong> Gmail (smtp.gmail.com:587)</p>
          <p><strong>From:</strong> tirupatilakshmidevi6@gmail.com</p>
          <p><strong>CC:</strong> moru.vidyapraveen@nxtwave.co.in</p>
        </div>
        <Field label="Send Test Email To">
          <input
            type="email"
            value={testEmailTo}
            onChange={(e) => setTestEmailTo(e.target.value)}
            placeholder="Enter recipient email address"
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1">Sends a test email via Gmail SMTP to verify email delivery is working.</p>
        </Field>
        <button
          onClick={handleSendTestEmail}
          disabled={testEmailSending || !testEmailTo.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          <Send size={14} />{testEmailSending ? 'Sending…' : 'Send Test Email'}
        </button>
        {testEmailResult && (
          <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${testEmailResult.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {testEmailResult.ok
              ? <CheckCircle size={16} className="mt-0.5 shrink-0 text-green-600" />
              : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
            <span>{testEmailResult.message}</span>
          </div>
        )}
      </div>

      {/* Manage Buildings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Manage Buildings</h2>

        <div className="space-y-2">
          {buildings.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-800">{b.name}</span>
              <button onClick={() => handleDeleteBuilding(b.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {buildings.length === 0 && <p className="text-sm text-gray-400">No buildings configured.</p>}
        </div>

        <div className="flex gap-2">
          <input
            value={newBuilding}
            onChange={(e) => setNewBuilding(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBuilding()}
            placeholder="Add new building…"
            className="input flex-1"
          />
          <button onClick={handleAddBuilding} disabled={addingBuilding || !newBuilding.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Plus size={14} />{addingBuilding ? '…' : 'Add'}
          </button>
        </div>
        </div>

      {/* PWA Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Download size={16} className="text-blue-600" />
          PWA Status
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <StatusCard
            label="Service Worker"
            icon={pwa.swRegistered ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-400" />}
            value={pwa.swRegistered ? (pwa.swState ?? 'Active') : 'Not registered'}
            sub={pwa.swScope ? `Scope: ${pwa.swScope.replace(location.origin, '')}` : undefined}
            good={pwa.swRegistered}
          />
          <StatusCard
            label="Notifications"
            icon={pwa.notifPermission === 'granted' ? <Bell size={16} className="text-green-500" /> : <BellOff size={16} className="text-gray-400" />}
            value={pwa.notifPermission ?? 'Not supported'}
            good={pwa.notifPermission === 'granted'}
          />
          <StatusCard
            label="Network"
            icon={pwa.isOnline ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-orange-500" />}
            value={pwa.isOnline ? 'Online' : 'Offline'}
            good={pwa.isOnline}
          />
          <StatusCard
            label="Install Mode"
            icon={pwa.isInstalled ? <CheckCircle size={16} className="text-blue-500" /> : <Download size={16} className="text-gray-400" />}
            value={pwa.isInstalled ? 'Installed PWA' : 'Browser tab'}
            good={pwa.isInstalled}
          />
        </div>

        {pwa.cacheNames.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Active Caches ({pwa.cacheNames.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {pwa.cacheNames.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-mono truncate max-w-[200px]">{c}</span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw size={13} /> Refresh status
        </button>
      </div>
    </div>
  );
}

function StatusCard({ label, icon, value, sub, good }: {
  label: string; icon: React.ReactNode; value: string; sub?: string; good: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${good ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <div className={`text-sm font-semibold capitalize ${good ? 'text-gray-900' : 'text-gray-500'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}
