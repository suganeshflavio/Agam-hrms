import type { MasterDataItem, MasterDataCategory } from '@/types/mdm'

const initialMasterData: MasterDataItem[] = [
  // Employment Types
  { id: 'mdm-1', category: 'employment_type', code: 'FT', name: 'Full-time Regular', description: 'Standard permanent corporate employee', isActive: true, sortOrder: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-2', category: 'employment_type', code: 'PT', name: 'Part-time Regular', description: 'Under 30 standard weekly hours', isActive: true, sortOrder: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-3', category: 'employment_type', code: 'CT', name: 'Fixed-Term Contract', description: 'Direct fixed-term contract specialist', isActive: true, sortOrder: 3, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-4', category: 'employment_type', code: 'IN', name: 'Internship / Graduate Trainee', description: 'University co-op or graduate program', isActive: true, sortOrder: 4, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-5', category: 'employment_type', code: 'CS', name: 'External Consultant', description: 'Specialized advisory retainer', isActive: true, sortOrder: 5, createdAt: '2026-01-01', updatedAt: '2026-01-01' },

  // Document Categories
  { id: 'mdm-6', category: 'document_category', code: 'ID_PROOF', name: 'Government ID & Passport', description: 'Proof of identity and citizenship', isActive: true, sortOrder: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-7', category: 'document_category', code: 'CONTRACT', name: 'Signed Employment Agreement', description: 'Executed offer letter & NDA', isActive: true, sortOrder: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-8', category: 'document_category', code: 'EDUCATION', name: 'Degrees & Educational Certificates', description: 'University diplomas & transcripts', isActive: true, sortOrder: 3, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-9', category: 'document_category', code: 'TAX_FORM', name: 'Statutory Tax Withholding (W-4 / W-9)', description: 'Payroll tax declaration', isActive: true, sortOrder: 4, createdAt: '2026-01-01', updatedAt: '2026-01-01' },

  // Cost Centers
  { id: 'mdm-10', category: 'cost_center', code: 'CC-ENG-101', name: 'Core Cloud & Platform Engineering', description: 'Software infrastructure cost allocation', isActive: true, sortOrder: 1, metadata: { budget: 350000 }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-11', category: 'cost_center', code: 'CC-PRD-102', name: 'Product Experience & UI/UX', description: 'Product development and user research', isActive: true, sortOrder: 2, metadata: { budget: 210000 }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-12', category: 'cost_center', code: 'CC-HR-201', name: 'People Operations & Workplace', description: 'Talent, culture, and employee welfare', isActive: true, sortOrder: 3, metadata: { budget: 120000 }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-13', category: 'cost_center', code: 'CC-MKT-301', name: 'Global Sales & Enterprise Growth', description: 'Customer acquisition and marketing campaigns', isActive: true, sortOrder: 4, metadata: { budget: 280000 }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },

  // Shift Types
  { id: 'mdm-14', category: 'shift_type', code: 'SHIFT_GEN', name: 'General Business Shift (09:00 - 18:00)', description: 'Standard 40-hour office week with 1-hr break', isActive: true, sortOrder: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-15', category: 'shift_type', code: 'SHIFT_EARLY', name: 'Engineering Early Shift (08:00 - 17:00)', description: 'DevOps & infrastructure on-call coverage', isActive: true, sortOrder: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mdm-16', category: 'shift_type', code: 'SHIFT_EMEA', name: 'EMEA Overlap Shift (11:00 - 20:00)', description: 'European client customer support team', isActive: true, sortOrder: 3, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
]

export const mdmService = {
  getAll(): MasterDataItem[] {
    try {
      const raw = localStorage.getItem('agam_master_data')
      if (!raw) {
        localStorage.setItem('agam_master_data', JSON.stringify(initialMasterData))
        return initialMasterData
      }
      return JSON.parse(raw) as MasterDataItem[]
    } catch {
      return initialMasterData
    }
  },

  getByCategory(category: MasterDataCategory): MasterDataItem[] {
    return this.getAll().filter((item) => item.category === category)
  },

  addItem(payload: Omit<MasterDataItem, 'id' | 'createdAt' | 'updatedAt'>): MasterDataItem {
    const list = this.getAll()
    const now = new Date().toISOString().split('T')[0] ?? ''
    const item: MasterDataItem = {
      ...payload,
      id: `mdm-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    list.push(item)
    localStorage.setItem('agam_master_data', JSON.stringify(list))
    return item
  },

  toggleItemStatus(id: string): MasterDataItem {
    const list = this.getAll()
    const item = list.find((i) => i.id === id)
    if (!item) throw new Error(`Item ${id} not found`)
    item.isActive = !item.isActive
    item.updatedAt = new Date().toISOString().split('T')[0] ?? ''
    localStorage.setItem('agam_master_data', JSON.stringify(list))
    return item
  },

  deleteItem(id: string): boolean {
    const list = this.getAll()
    const filtered = list.filter((i) => i.id !== id)
    localStorage.setItem('agam_master_data', JSON.stringify(filtered))
    return true
  },
}
