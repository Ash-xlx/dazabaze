import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
})
export type SignupInput = z.infer<typeof signupSchema>

export const organizationCreateSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(2).max(8),
})
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>

export const issueSchema = z.object({
  organizationId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']),
  assigneeId: z.string().optional().nullable(),
  parentIssueId: z.string().optional().nullable(),
})
export type IssueInput = z.infer<typeof issueSchema>

