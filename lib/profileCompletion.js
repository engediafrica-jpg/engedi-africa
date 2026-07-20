export const COMMON_REQUIRED_FIELDS = ['full_name', 'phone', 'city', 'state', 'address_line', 'bio']

export const ROLE_REQUIRED_FIELDS = {
  project_owner: [],
  artisan: ['experience_years'],
  supplier: ['company_name'],
  professional: ['company_name'],
  service_provider: ['company_name'],
  equipment_provider: ['company_name'],
  field_marketer: [],
}

const FIELD_LABELS = {
  full_name: 'Full Name',
  phone: 'Phone',
  city: 'City',
  state: 'State',
  address_line: 'Address',
  bio: 'Bio',
  company_name: 'Company Name',
  experience_years: 'Years of Experience',
}

function isFilled(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return value > 0
  return true
}

export function getMissingFields(profile) {
  if (profile?.role === 'field_marketer') return []
  const required = [...COMMON_REQUIRED_FIELDS, ...(ROLE_REQUIRED_FIELDS[profile?.role] || [])]
  return required.filter(key => !isFilled(profile?.[key])).map(key => FIELD_LABELS[key] || key)
}

export function computeProfileCompleted(profile) {
  return getMissingFields(profile).length === 0
}

export function requiresCompanyName(role) {
  return ['supplier', 'professional', 'service_provider', 'equipment_provider'].includes(role)
}
