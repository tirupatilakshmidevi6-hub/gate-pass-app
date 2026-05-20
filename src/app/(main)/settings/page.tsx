'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

type Building = { id: string; name: string };

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

  async function handleDeleteBuilding(id: string) {
    await fetch('/api/buildings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setBuildings((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) return <div className="text-sm text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {/* General */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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

      {/* Manage Buildings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}
