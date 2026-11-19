import { z } from 'zod'

export const leaveSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  leaveType: z.enum(['Annual', 'Sick', 'Casual', 'Maternity/Paternity', 'Unpaid'] as const),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(8, 'Reason must be at least 8 characters explaining the leave'),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  }
)

export type LeaveFormValues = z.infer<typeof leaveSchema>
