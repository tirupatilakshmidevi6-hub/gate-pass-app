// ─── Building options ─────────────────────────────────────────────────────────
export const BUILDING_OPTIONS = ['Brigade Towers', 'iSprout', 'WeWork'] as const;
export type BuildingOption = (typeof BUILDING_OPTIONS)[number];

// ─── Role options ─────────────────────────────────────────────────────────────
export const ROLE_OPTIONS = [
  'SDF',
  'SDFT',
  'Aptitude Instructor',
  'Associate English Instructor',
  'English Instructor',
  'Data Science Instructor',
  'Full Stack Instructor',
  'Team Lead',
  'Admin Staff',
  'Visitor',
] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

// ─── Role badge colours (inline styles — for both Tailwind pages and HTML emails)
export const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'SDF':                          { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'SDFT':                         { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  'Aptitude Instructor':          { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Associate English Instructor': { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  'English Instructor':           { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  'Data Science Instructor':      { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
  'Full Stack Instructor':        { bg: '#f5f3ff', text: '#6d28d9', border: '#c4b5fd' },
  'Team Lead':                    { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
  'Admin Staff':                  { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'Visitor':                      { bg: '#faf5ff', text: '#7c3aed', border: '#d8b4fe' },
};

export function getRoleStyle(role: string) {
  return ROLE_COLORS[role] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
}
