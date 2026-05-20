// ─── Building options ─────────────────────────────────────────────────────────
export const BUILDING_OPTIONS = ['Brigade Towers', 'iSprout', 'WeWork'] as const;
export type BuildingOption = (typeof BUILDING_OPTIONS)[number];

// ─── Role options ─────────────────────────────────────────────────────────────
export const ROLE_OPTIONS = [
  'New Joiner',
  'Intern',
  'Contractor',
  'Vendor',
  'Visitor',
  'Rehire',
] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

// ─── Role badge colours (inline styles — for both Tailwind pages and HTML emails)
export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'New Joiner': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Intern':     { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'Contractor': { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  'Vendor':     { bg: '#f3e8ff', text: '#7c3aed', border: '#d8b4fe' },
  'Visitor':    { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'Rehire':     { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
};

export function getRoleStyle(role: string) {
  return ROLE_COLORS[role] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
}
