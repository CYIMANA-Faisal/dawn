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

export type FormDefaultWhenRule = {
  when?: FormCondition | null
  value?: string | number | boolean | null
  valueFrom?: string | null
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
  transform?: string | null
  defaultWhen?: FormDefaultWhenRule[] | null
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

export type FormStatisticsBasis = 'headcount' | 'shares'

export type FormStatisticsSegmentTone = 'green' | 'red' | 'amber' | 'grey'

export type FormStatisticsSegment = {
  key?: string
  label: string
  tone?: FormStatisticsSegmentTone | string | null
  percentage?: number | null
  count?: number | null
  shares?: number | null
}

export type FormStatisticsBlock = {
  key?: string
  title: string
  segments?: FormStatisticsSegment[] | null
}

export type FormStatisticsPopulation = {
  eligibleShareholders?: number | null
  eligibleShares?: number | null
  sentShareholders?: number | null
  completedShareholders?: number | null
}

export type FormStatisticsResponse = {
  projectId?: string
  formId?: string
  generatedAt?: string | null
  basis?: FormStatisticsBasis | string | null
  population?: FormStatisticsPopulation | null
  blocks?: FormStatisticsBlock[] | null
}
