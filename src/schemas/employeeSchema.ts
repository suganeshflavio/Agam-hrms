import { z } from 'zod'

export const employeeSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid work email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  department: z.string().min(1, 'Please select a department'),
  designation: z.string().min(2, 'Designation is required'),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Intern'] as const),
  status: z.enum(['Active', 'On Leave', 'Terminated', 'Probation'] as const),
  joiningDate: z.string().min(1, 'Joining date is required'),
  salary: z.coerce.number().min(1000, 'Salary must be a positive number'),
  branch: z.string().optional(),
  grade: z.string().optional(),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>
