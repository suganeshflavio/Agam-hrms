<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Database,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Layers,
  FileCheck,
  Award,
  DollarSign,
  Clock,
  X,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import type { MasterDataItem, MasterDataCategory } from '@/types/mdm'

const selectedCategory = ref<MasterDataCategory>('employment_type')

const { data: allItems, isLoading } = useApiQuery<MasterDataItem[]>(
  hrmsApi.endpoints.getMasterData,
  () => ({ category: selectedCategory.value })
)

const [addItem, { isLoading: isAdding }] = useApiMutation(hrmsApi.endpoints.addMasterDataItem)
const [toggleStatus] = useApiMutation(hrmsApi.endpoints.toggleMasterDataItem)
const [deleteItem] = useApiMutation(hrmsApi.endpoints.deleteMasterDataItem)

const isModalOpen = ref(false)
const itemName = ref('')
const itemCode = ref('')
const itemDescription = ref('')

const categories: { id: MasterDataCategory; label: string; icon: any }[] = [
  { id: 'employment_type', label: 'Employment Types', icon: Layers },
  { id: 'document_category', label: 'Document Categories', icon: FileCheck },
  { id: 'cost_center', label: 'Cost Centers', icon: DollarSign },
  { id: 'shift_type', label: 'Shift Templates', icon: Clock },
]

const handleCreateItem = async () => {
  if (!itemName.value || !itemCode.value) return
  await addItem({
    category: selectedCategory.value,
    code: itemCode.value.toUpperCase().trim(),
    name: itemName.value.trim(),
    description: itemDescription.value.trim() || undefined,
    isActive: true,
    sortOrder: (allItems.value?.length ?? 0) + 1,
  })
  itemName.value = ''
  itemCode.value = ''
  itemDescription.value = ''
  isModalOpen.value = false
}

const handleToggle = async (id: string) => {
  await toggleStatus(id)
}

const handleDelete = async (id: string, name: string) => {
  if (confirm(`Are you sure you want to delete lookup record "${name}"?`)) {
    await deleteItem(id)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Master Data Management (MDM)
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure centralized corporate lookup tables, cost centers, document taxonomies, and operational templates
        </p>
      </div>

      <button
        @click="isModalOpen = true"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all self-start sm:self-auto"
      >
        <Plus class="w-4 h-4" />
        <span>Add Lookup Item</span>
      </button>
    </div>

    <!-- Category Selector Tabs -->
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectedCategory = cat.id"
        :class="[
          'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
          selectedCategory === cat.id
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <component :is="cat.icon" class="w-4 h-4" />
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <!-- Master Items Table -->
    <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
              <th class="py-3 px-6">Lookup Code</th>
              <th class="py-3 px-6">Name / Title</th>
              <th class="py-3 px-6">Description</th>
              <th class="py-3 px-6">Status</th>
              <th class="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr v-if="!allItems || allItems.length === 0">
              <td colspan="5" class="py-12 text-center text-slate-400 text-xs">
                No items configured in this master data category yet.
              </td>
            </tr>
            <tr
              v-for="item in allItems"
              :key="item.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="py-4 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {{ item.code }}
              </td>
              <td class="py-4 px-6 font-bold text-slate-900 dark:text-white">
                {{ item.name }}
              </td>
              <td class="py-4 px-6 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                {{ item.description || '—' }}
              </td>
              <td class="py-4 px-6">
                <button
                  @click="handleToggle(item.id)"
                  :class="[
                    'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors',
                    item.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                  ]"
                >
                  {{ item.isActive ? 'Active' : 'Disabled' }}
                </button>
              </td>
              <td class="py-4 px-6 text-right">
                <button
                  @click="handleDelete(item.id, item.name)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Item Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Add Master Record</h3>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 mb-1">Target Category</label>
            <input :value="selectedCategory" disabled class="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono text-slate-500" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 mb-1">Item Code / Identifier</label>
            <input v-model="itemCode" placeholder="e.g. CONTRACT_SPECIALIST" class="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-transparent font-mono" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
            <input v-model="itemName" placeholder="e.g. Contract Specialist" class="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-transparent" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <textarea v-model="itemDescription" rows="2" placeholder="Policy details or notes..." class="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-transparent" />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isModalOpen = false" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button @click="handleCreateItem" :disabled="isAdding" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white disabled:opacity-50">Save Record</button>
        </div>
      </div>
    </div>
  </div>
</template>
