<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Banknote,
  DollarSign,
  FileText,
  Printer,
  CheckCircle2,
  X,
  ShieldCheck,
  Building,
  CreditCard,
  Eye,
  Download,
  Lock,
  Plus,
  Unlock,
  AlertTriangle,
} from '@lucide/vue'
import AppLogo from '@/components/common/AppLogo.vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import type { Payslip, Employee } from '@/types/hrms'
import { useMoney } from '@/composables/useMoney'
import { usePermissions } from '@/composables/usePermissions'

// Access from Roles & Permissions: Payroll & Tax row.
const { can } = usePermissions()
const canViewPayroll = computed(() => can('payroll', 'view'))
const canRunPayroll = computed(() => can('payroll', 'create'))
const canEditPayroll = computed(() => can('payroll', 'edit'))

const { data: payslips, isLoading } = useApiQuery<Payslip[]>(hrmsApi.endpoints.getPayslips)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { company, currencySymbol, formatMoney } = useMoney()

// Payroll runs for the current calendar month.
const currentPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const periodPayslips = computed(() => (payslips.value || []).filter((p) => p.monthYear === currentPeriod))

const [processPayroll, { isLoading: isProcessing }] = useApiMutation(hrmsApi.endpoints.processPayrollRun)
const [togglePayslipAccess] = useApiMutation(hrmsApi.endpoints.togglePayslipAccess)
const [addSalaryBreakdown, { isLoading: isSavingBreakdown }] = useApiMutation(hrmsApi.endpoints.addSalaryBreakdown)

const selectedPayslip = ref<Payslip | null>(null)
const successMsg = ref('')
const errorMsg = ref('')
const isAddBreakdownModalOpen = ref(false)

// Breakdown form inputs
const breakdownEmpId = ref('')
const breakdownBasic = ref<number | ''>('')
const breakdownHra = ref<number | ''>('')
const breakdownSpecial = ref<number | ''>('')
const breakdownBonus = ref<number | ''>('')

const handleRunPayroll = async () => {
  if (!canRunPayroll.value) {
    showNotification('Access denied: your role does not have permission to run payroll.')
    return
  }
  const { error } = await processPayroll(currentPeriod)
  if (error) return showError(error)
  showNotification(`${currentPeriod} payroll processed.`)
}

const showNotification = (msg: string) => {
  successMsg.value = msg
  setTimeout(() => {
    successMsg.value = ''
  }, 4000)
}

const showError = (error: unknown) => {
  errorMsg.value = (error as { data?: string })?.data || 'The request could not be completed'
  setTimeout(() => {
    errorMsg.value = ''
  }, 6000)
}

const handleToggleAccess = async (slipId: string) => {
  if (!canEditPayroll.value) {
    showNotification('Access denied: your role does not have permission to change payslip access.')
    return
  }
  const { error } = await togglePayslipAccess(slipId)
  if (error) return showError(error)
  showNotification('Employee download access status updated successfully!')
}

const handleCreateBreakdown = async () => {
  if (!breakdownEmpId.value || !canEditPayroll.value) return

  const { error } = await addSalaryBreakdown({
    employeeId: breakdownEmpId.value,
    basic: Number(breakdownBasic.value || 0),
    hra: Number(breakdownHra.value || 0),
    specialAllowance: Number(breakdownSpecial.value || 0),
    performanceBonus: Number(breakdownBonus.value || 0),
  })
  if (error) return showError(error)

  isAddBreakdownModalOpen.value = false
  showNotification('Salary breakdown saved and payslip issued.')
}

const canDownloadPayslip = (slip: Payslip) => {
  if (canViewPayroll.value) return true
  return !!slip.downloadAccessGranted
}

const totalGross = computed(() => periodPayslips.value.reduce((acc, p) => acc + p.breakdown.grossEarnings, 0))
const totalDeductions = computed(() => periodPayslips.value.reduce((acc, p) => acc + p.breakdown.totalDeductions, 0))
const totalNet = computed(() => periodPayslips.value.reduce((acc, p) => acc + p.breakdown.netPay, 0))

const handlePrint = () => {
  window.print()
}

const formatCurrency = (val: number) => formatMoney(val)
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Payroll & Compensation
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Salary structures, statutory deductions (PF, TDS, PT), monthly payroll runs, and payslips
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Add Salary Breakdown (Payroll & Tax: Write) -->
        <button
          v-if="canEditPayroll"
          @click="isAddBreakdownModalOpen = true"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#1989d9] text-slate-800 dark:text-slate-100 font-bold text-xs shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus class="w-4 h-4 text-[#1989d9]" />
          <span>Add Salary Breakdown</span>
        </button>

        <!-- Run Payroll Batch (Payroll & Tax: Write) -->
        <button
          v-if="canRunPayroll"
          @click="handleRunPayroll"
          :disabled="isProcessing"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
        >
          <Banknote class="w-4 h-4" />
          <span v-if="isProcessing">Processing Batch...</span>
          <span v-else>Run {{ currentPeriod }} Payroll</span>
        </button>
      </div>
    </div>

    <!-- Alert / Toast -->
    <div
      v-if="successMsg"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ successMsg }}</span>
    </div>
    <div
      v-if="errorMsg"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-medium"
      role="alert"
    >
      <AlertTriangle class="w-5 h-5 text-rose-500 shrink-0" />
      <span>{{ errorMsg }}</span>
    </div>

    <!-- Financial Stats Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gross Payroll</p>
        <p class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
          {{ formatCurrency(totalGross) }}
        </p>
        <p class="text-xs text-slate-400 mt-1">{{ currentPeriod }} · {{ periodPayslips.length }} payslip(s)</p>
      </div>

      <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statutory Deductions</p>
        <p class="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
          -{{ formatCurrency(totalDeductions) }}
        </p>
        <p class="text-xs text-slate-400 mt-1">{{ currentPeriod }} · PF, TDS, PT and other deductions</p>
      </div>

      <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Take-Home</p>
        <p class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
          {{ formatCurrency(totalNet) }}
        </p>
        <p class="text-xs text-slate-400 mt-1">{{ currentPeriod }}</p>
      </div>
    </div>

    <!-- Access note (from Roles & Permissions) -->
    <div class="p-4 rounded-2xl bg-[#1989d9]/10 border border-[#1989d9]/25 flex items-center justify-between text-xs text-[#044663] dark:text-[#38a5e4]">
      <div class="flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 shrink-0 text-[#1989d9]" />
        <span>
          <strong>Access:</strong> Running payroll, salary breakdowns and payslip download access follow the Payroll &amp; Tax permissions in Roles &amp; Permissions.
        </span>
      </div>
      <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-800 shrink-0">
        {{ canEditPayroll || canRunPayroll ? 'Can manage payroll' : 'Read-only' }}
      </span>
    </div>

    <!-- Processed Payslips Table -->
    <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Processed Payroll & Salary Statements</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Payslips from all payroll runs, with download authorization controls</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
          {{ payslips?.length || 0 }} Statements
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
              <th class="py-3.5 px-6">Voucher #</th>
              <th class="py-3.5 px-6">Employee</th>
              <th class="py-3.5 px-6">Department</th>
              <th class="py-3.5 px-6">Gross Pay</th>
              <th class="py-3.5 px-6">Deductions</th>
              <th class="py-3.5 px-6">Net Take-Home</th>
              <th class="py-3.5 px-6">Download Permission</th>
              <th class="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr
              v-for="slip in payslips"
              :key="slip.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="py-4 px-6 font-mono font-bold text-[#0e6db3] dark:text-[#38a5e4]">
                {{ slip.payslipNumber }}
              </td>
              <td class="py-4 px-6">
                <p class="font-bold text-slate-900 dark:text-white">{{ slip.employeeName }}</p>
                <p class="text-[11px] text-slate-400 font-mono">{{ slip.employeeCode }}</p>
              </td>
              <td class="py-4 px-6 text-slate-600 dark:text-slate-300">
                {{ slip.department }}
              </td>
              <td class="py-4 px-6 font-mono text-slate-900 dark:text-white font-semibold">
                {{ formatCurrency(slip.breakdown.grossEarnings) }}
              </td>
              <td class="py-4 px-6 font-mono text-rose-500">
                -{{ formatCurrency(slip.breakdown.totalDeductions) }}
              </td>
              <td class="py-4 px-6 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatCurrency(slip.breakdown.netPay) }}
              </td>

              <!-- Download Permission Toggle (Super Admin Exclusive) -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1',
                      slip.downloadAccessGranted
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    ]"
                  >
                    <Unlock v-if="slip.downloadAccessGranted" class="w-3 h-3" />
                    <Lock v-else class="w-3 h-3" />
                    <span>{{ slip.downloadAccessGranted ? 'Access Granted' : 'Restricted' }}</span>
                  </span>

                  <!-- Payslip download access (Payroll & Tax: Write) -->
                  <button
                    v-if="canEditPayroll"
                    @click="handleToggleAccess(slip.id)"
                    title="Toggle employee download permission"
                    class="text-[10px] font-bold text-[#1989d9] hover:underline cursor-pointer"
                  >
                    {{ slip.downloadAccessGranted ? 'Revoke' : 'Allow' }}
                  </button>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="selectedPayslip = slip"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    <Eye class="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>

                  <button
                    v-if="canDownloadPayslip(slip)"
                    @click="() => { selectedPayslip = slip; handlePrint() }"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1989d9]/10 hover:bg-[#1989d9]/20 text-[#0e6db3] dark:text-[#38a5e4] text-xs font-semibold cursor-pointer"
                  >
                    <Printer class="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <span
                    v-else
                    title="Super Admin has restricted download for this voucher"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs cursor-not-allowed"
                  >
                    <Lock class="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && !payslips?.length">
              <td colspan="8" class="py-10 text-center text-slate-400">No payslips yet. Run payroll to generate them.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal 1: Inspect Salary Statement Voucher -->
    <div
      v-if="selectedPayslip"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[92vh] animate-scaleUp print:p-0 print:border-none print:shadow-none">
        <!-- Top Actions -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div class="flex items-center gap-2 text-[#0e6db3] dark:text-[#38a5e4] text-xs font-bold">
            <FileText class="w-4 h-4" />
            <span>Official Salary Voucher</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="canDownloadPayslip(selectedPayslip)"
              @click="handlePrint"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <span v-else class="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
              Download Locked by Super Admin
            </span>
            <button
              @click="selectedPayslip = null"
              class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Voucher Body -->
        <div class="mt-6 space-y-6">
          <div class="flex items-start justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div class="flex items-center gap-2">
                <AppLogo variant="full" className="h-9 w-auto max-w-[180px]" />
              </div>
              <p class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-2">
                {{ company?.legalName || company?.name || '—' }}
              </p>
              <p v-if="company?.headquarters" class="text-[11px] text-slate-500 dark:text-slate-400">{{ company.headquarters }}</p>
              <p v-if="company?.taxId" class="text-[11px] text-slate-400">Tax ID: {{ company.taxId }}</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Pay Voucher</span>
              <p class="text-sm font-extrabold text-[#0e6db3] dark:text-[#38a5e4] font-mono mt-0.5">
                {{ selectedPayslip.payslipNumber }}
              </p>
              <p class="text-xs text-slate-500 mt-0.5">Period: {{ selectedPayslip.monthYear }}</p>
            </div>
          </div>

          <!-- Metadata -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <div>
              <span class="text-slate-400 block">Employee Name</span>
              <span class="font-bold text-slate-900 dark:text-white text-sm">{{ selectedPayslip.employeeName }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Employee Code</span>
              <span class="font-bold text-[#0e6db3] dark:text-[#38a5e4] font-mono">{{ selectedPayslip.employeeCode }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Department</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedPayslip.department }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Designation</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedPayslip.designation }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Bank Account</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedPayslip.bankAccount || '—' }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Paid Days / LOP</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedPayslip.paidDays }} Days / {{ selectedPayslip.lossOfPayDays }} LOP</span>
            </div>
          </div>

          <!-- Breakdown Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div class="space-y-2">
              <h3 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800">
                Gross Earnings
              </h3>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Basic Salary</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.basic) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">House Rent Allowance (HRA)</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.hra) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Special Allowance</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.specialAllowance) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Conveyance Allowance</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.conveyance) }}</span>
              </div>
              <div class="flex justify-between py-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                <span>Total Earnings</span>
                <span class="font-mono text-emerald-600 dark:text-emerald-400">{{ formatCurrency(selectedPayslip.breakdown.grossEarnings) }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <h3 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800">
                Statutory Deductions
              </h3>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Provident Fund (PF)</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.providentFund) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Income Tax (TDS)</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.incomeTaxTds) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Professional Tax (PT)</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.professionalTax) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Other Deductions</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.medicalInsurance) }}</span>
              </div>
              <div class="flex justify-between py-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                <span>Total Deductions</span>
                <span class="font-mono text-rose-500">-{{ formatCurrency(selectedPayslip.breakdown.totalDeductions) }}</span>
              </div>
            </div>
          </div>

          <!-- Net Pay Banner -->
          <div class="p-4 rounded-2xl bg-[#044663] text-white flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-wider text-sky-200 font-semibold">Net Take-Home Pay</p>
              <p class="text-2xl font-black font-mono mt-0.5">{{ formatCurrency(selectedPayslip.breakdown.netPay) }}</p>
            </div>
            <div class="text-right text-xs text-sky-200">
              <p>{{ selectedPayslip.paymentStatus }}</p>
              <p class="text-[10px] text-sky-300">{{ selectedPayslip.paymentDate || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 2: Add Custom Salary Breakdown (Super Admin Exclusive) -->
    <div
      v-if="isAddBreakdownModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-5 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              Super Admin Control
            </div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Add Custom Salary Breakdown</h2>
            <p class="text-xs text-slate-500">Configure custom monthly compensation structure and issue voucher</p>
          </div>
          <button @click="isAddBreakdownModalOpen = false" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1">Select Employee</label>
            <select
              v-model="breakdownEmpId"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden"
            >
              <option value="" disabled>Choose an employee...</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">
                {{ e.firstName }} {{ e.lastName }} ({{ e.employeeCode }} • {{ e.department }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Basic Pay{{ currencySymbol ? ` (${currencySymbol})` : '' }}</label>
              <input type="number" v-model="breakdownBasic" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">HRA{{ currencySymbol ? ` (${currencySymbol})` : '' }}</label>
              <input type="number" v-model="breakdownHra" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Special Allowance{{ currencySymbol ? ` (${currencySymbol})` : '' }}</label>
              <input type="number" v-model="breakdownSpecial" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Performance Bonus{{ currencySymbol ? ` (${currencySymbol})` : '' }}</label>
              <input type="number" v-model="breakdownBonus" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="isAddBreakdownModalOpen = false"
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleCreateBreakdown"
            :disabled="!breakdownEmpId || isSavingBreakdown"
            class="px-5 py-2.5 rounded-xl bg-[#044663] hover:bg-[#065578] text-white font-bold text-xs shadow-md shadow-[#044663]/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {{ isSavingBreakdown ? 'Generating...' : 'Save & Issue Statement' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
