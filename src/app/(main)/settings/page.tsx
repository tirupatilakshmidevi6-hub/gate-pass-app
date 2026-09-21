'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Wifi, WifiOff, Bell, BellOff, Download, RefreshCw, CheckCircle, XCircle, Send, Building2, Settings2, Mail, Smartphone } from 'lucide-react';

type Building = { id: string; name: string };

type PWAStatus = {
  swRegistered: boolean; swScope: string | null; swState: string | null;
  notifPermission: NotificationPermission | null;
  isInstalled: boolean; isOnline: boolean; cacheNames: string[];
};

function usePWAStatus(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    swRegistered: false, swScope: null, swState: null,
    notifPermission: null, isInstalled: false, isOnline: true, cacheNames: [],
  });
  useEffect(() => {
    async function check() {
      let swRegistered = false, swScope = null, swState = null, cacheNames: string[] = [];
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
        if (reg) { swRegistered = true; swScope = reg.scope; swState = reg.active?.state ?? reg.installing?.state ?? reg.waiting?.state ?? 'unknown'; }
      }
      if ('caches' in window) cacheNames = await caches.keys();
      setStatus({ swRegistered, swScope, swState, notifPermission: 'Notification' in window ? Notification.permission : null, isInstalled: window.matchMedia('(display-mode: standalone)').matches, isOnline: navigator.onLine, cacheNames });
    }
    check();
    window.addEventListener('online',  () => setStatus((s) => ({ ...s, isOnline: true })));
    window.addEventListener('offline', () => setStatus((s) => ({ ...s, isOnline: false })));
  }, []);
  return status;
}

export default function SettingsPage() {
  const [orgName,          setOrgName]          = useState('NxtWave Technologies');
  const [facilitiesEmail,  setFacilitiesEmail]  = useState('facilities@nxtwave.com');
  const [validityDays,     setValidityDays]     = useState('7');
  const [buildings,        setBuildings]        = useState<Building[]>([]);
  const [newBuilding,      setNewBuilding]      = useState('');
  const [saving,           setSaving]           = useState(false);
  const [addingBuilding,   setAddingBuilding]   = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [testEmailTo,      setTestEmailTo]      = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult,  setTestEmailResult]  = useState<{ ok: boolean; message: string } | null>(null);
  const pwa = usePWAStatus();

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/buildings').then((r) => r.json()),
    ]).then(([settings, bldgs]) => {
      if (settings.organization_name)  setOrgName(settings.organization_name);
      if (settings.facilities_email)   setFacilitiesEmail(settings.facilities_email);
      if (settings.pass_validity_days) setValidityDays(settings.pass_validity_days);
      if (Array.isArray(bldgs))        setBuildings(bldgs);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_name: orgName, facilities_email: facilitiesEmail, pass_validity_days: validityDays }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleAddBuilding() {
    const name = newBuilding.trim();
    if (!name) return;
    setAddingBuilding(true);
    const res = await fetch('/api/buildings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) { const b = await res.json(); setBuildings((prev) => [...prev, b]); setNewBuilding(''); }
    setAddingBuilding(false);
  }

  async function handleSendTestEmail() {
    if (!testEmailTo.trim()) return;
    setTestEmailSending(true); setTestEmailResult(null);
    try {
      const res = await fetch('/api/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testEmailTo.trim() }) });
      const data = await res.json();
      setTestEmailResult(res.ok
        ? { ok: true,  message: `Test email sent successfully. Message ID: ${data.messageId}` }
        : { ok: false, message: data.error ?? 'Unknown error' });
    } catch {
      setTestEmailResult({ ok: false, message: 'Network error — could not reach server' });
    }
    setTestEmailSending(false);
  }

  async function handleDeleteBuilding(id: string) {
    await fetch('/api/buildings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setBuildings((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) return (
    <div className="page-container flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-400">Loading settings…</p>
      </div>
    </div>
  );

  return (
    <div className="page-container max-w-2xl space-y-5">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your gate pass system configuration</p>
      </div>

      {/* ── General Settings ───────────────────────────────────────────────── */}
      <Card icon={<Settings2 size={16} className="text-blue-600" />} title="General" desc="Organization details and gate pass defaults">
        <div className="space-y-4">
          <FormField label="Organization Name">
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
          </FormField>

          <FormField label="Facilities Team Email" hint="Notification emails are sent here when candidates submit registration forms.">
            <input type="email" value={facilitiesEmail} onChange={(e) => setFacilitiesEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
          </FormField>

          <FormField label="Default Pass Validity (days)" hint="Gate pass is valid from the reporting date for this many days.">
            <input type="number" min="1" max="365" value={validityDays} onChange={(e) => setValidityDays(e.target.value)}
              className="w-24 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
          </FormField>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? <><RefreshCw size={13} className="animate-spin" />Saving…</> : <><Save size={13} />Save Changes</>}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle size={14} />Saved successfully
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Manage Buildings ───────────────────────────────────────────────── */}
      <Card icon={<Building2 size={16} className="text-blue-600" />} title="Buildings" desc="Locations available in the gate pass dropdown">
        <div className="space-y-3">
          {buildings.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No buildings added yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {buildings.map((b, i) => (
                <div key={b.id}
                  className={`flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors ${i < buildings.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{b.name}</span>
                  </div>
                  <button onClick={() => handleDeleteBuilding(b.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2 pt-1">
            <input value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBuilding()}
              placeholder="New building name…"
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
            <button onClick={handleAddBuilding} disabled={addingBuilding || !newBuilding.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {addingBuilding ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              {addingBuilding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Email Configuration ────────────────────────────────────────────── */}
      <Card icon={<Mail size={16} className="text-blue-600" />} title="Email" desc="SMTP configuration and delivery test">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Provider</p>
              <p className="text-sm font-medium text-gray-800">Gmail SMTP</p>
              <p className="text-xs text-gray-400">smtp.gmail.com : 587</p>
            </div>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle size={13} />Configured
              </span>
            </div>
          </div>

          <FormField label="Send Test Email" hint="Sends a test email via Gmail SMTP to verify delivery is working.">
            <div className="flex gap-2">
              <input type="email" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" />
              <button onClick={handleSendTestEmail} disabled={testEmailSending || !testEmailTo.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
                {testEmailSending ? <><RefreshCw size={13} className="animate-spin" />Sending…</> : <><Send size={13} />Send Test</>}
              </button>
            </div>
          </FormField>

          {testEmailResult && (
            <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${testEmailResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {testEmailResult.ok
                ? <CheckCircle size={15} className="mt-0.5 flex-shrink-0 text-green-600" />
                : <XCircle    size={15} className="mt-0.5 flex-shrink-0 text-red-500" />}
              <span className="text-xs leading-relaxed">{testEmailResult.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── PWA Status ─────────────────────────────────────────────────────── */}
      <Card icon={<Smartphone size={16} className="text-blue-600" />} title="App Status" desc="Progressive Web App and connectivity status">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Service Worker', good: pwa.swRegistered,              value: pwa.swRegistered ? (pwa.swState ?? 'Active') : 'Not registered', icon: pwa.swRegistered ? <CheckCircle size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-400" /> },
              { label: 'Notifications',  good: pwa.notifPermission==='granted', value: pwa.notifPermission ?? 'Not supported',                          icon: pwa.notifPermission==='granted' ? <Bell size={13} className="text-green-500" /> : <BellOff size={13} className="text-gray-400" /> },
              { label: 'Network',        good: pwa.isOnline,                   value: pwa.isOnline ? 'Online' : 'Offline',                              icon: pwa.isOnline ? <Wifi size={13} className="text-green-500" /> : <WifiOff size={13} className="text-orange-500" /> },
              { label: 'Install Mode',   good: pwa.isInstalled,                value: pwa.isInstalled ? 'Installed PWA' : 'Browser tab',                icon: pwa.isInstalled ? <CheckCircle size={13} className="text-blue-500" /> : <Download size={13} className="text-gray-400" /> },
            ].map((item) => (
              <div key={item.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${item.good ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex-shrink-0">{item.icon}</div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-medium">{item.label}</p>
                  <p className={`text-xs font-semibold capitalize truncate ${item.good ? 'text-gray-800' : 'text-gray-400'}`}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {pwa.cacheNames.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-gray-400 mb-1.5">Active caches ({pwa.cacheNames.length})</p>
              <div className="flex flex-wrap gap-1">
                {pwa.cacheNames.map((c) => (
                  <span key={c} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-mono truncate max-w-[180px]">{c}</span>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors pt-1">
            <RefreshCw size={12} />Refresh status
          </button>
        </div>
      </Card>

    </div>
  );
}

function Card({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}
