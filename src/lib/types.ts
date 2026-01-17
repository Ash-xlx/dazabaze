export type User = {
  _id: string
  email: string
  name: string
}

export type AuthResponse = {
  token: string
  user: User
}

export type Organization = {
  _id: string
  name: string
  key: string
  ownerId: string
  memberIds: string[]
}

export type Issue = {
  _id: string
  organizationId: string
  title: string
  description: string
  status: string
  parentIssueId?: string | null
}

