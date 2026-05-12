export type ShareholderFormSent = {
  formId: string
  status: string
}

export type Shareholder = {
  id: string
  name: string
  email?: string | null
  numberOfShares: number
  createdAt: string
  formsSent?: ShareholderFormSent[] | null
}

export type ShareholdersPageable = {
  pageNumber: number
  pageSize: number
  offset: number
  paged: boolean
  unpaged: boolean
}

export type ShareholdersPage = {
  content: Shareholder[]
  pageable: ShareholdersPageable
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  first: boolean
  numberOfElements: number
  empty: boolean
}

export type ShareholderDropdownItem = {
  id: string
  name: string
}

export type PublicShareholder = {
  id: string
  name: string
  email?: string | null
  formsSent?: ShareholderFormSent[] | null
}

export type CreateShareholderRequest = {
  name: string
  email?: string
  numberOfShares: number
}
