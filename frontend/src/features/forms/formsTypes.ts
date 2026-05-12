export type FormOption = {
  value: string | number | boolean
  label: string
  visibleWhen?: FormCondition | null
}

export type FormConditionRule = {
  questionKey: string
  operator?: string
  value: string | number | boolean
}

export type FormConditionGroup = {
  all?: FormCondition[]
  any?: FormCondition[]
}

export type FormCondition = FormConditionRule | FormConditionGroup

export type FormTemplate = {
  text: string
  visibleWhen?: FormCondition | null
}

export type FormRequiredWhen = {
  anyAnswered?: string[]
}

export type FormField = {
  id: string
  key?: string
  type: string
  label?: string | null
  required?: boolean
  readOnly?: boolean
  options?: FormOption[] | null
  fields?: FormField[]
  visibleWhen?: FormCondition | null
  requiredWhen?: FormRequiredWhen | null
  templates?: FormTemplate[] | null
  addButtonLabel?: string | null
  minRows?: number | null
  clearWhenHidden?: boolean
}

export type FormSection = {
  id: string
  key?: string
  title?: string | null
  questions: FormField[]
}

export type FormSchema = {
  id?: string
  formId?: string
  formKey?: string
  title: string
  subtitle?: string | null
  fields?: FormField[]
  sections?: FormSection[]
}

export type FormDropdownItem = {
  id: string
  title: string
}

export type DistributeFormRequest = {
  frontendUrlTemplate: string
}

export type DistributeFormResponse = {
  message: string
}

export type SubmitFormRequest = {
  shareholderId: string
  responses: Record<string, unknown>
  signatureImage?: string
}

export type SubmitFormResponse = {
  message?: string
}
