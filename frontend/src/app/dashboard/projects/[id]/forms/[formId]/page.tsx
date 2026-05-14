'use client'

import { Fragment, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useGetFormByIdQuery, useSubmitPublicFormMutation } from '@/features/forms/formsApi'
import { useGetPublicShareholderQuery } from '@/features/projects/shareholdersApi'
import type {
  FormCondition,
  FormDefaultWhenRule,
  FormField,
  FormOption,
  FormSection,
} from '@/features/forms/formsTypes'

type FormPrimitive = string | number | boolean
type FormAnswer = FormPrimitive | FormPrimitive[]
type FormAnswers = Partial<Record<string, FormAnswer>>
type RuntimeTemplateValues = Record<string, string>
type SignatureMode = 'draw' | 'upload'

const PAPER_PANEL_CLASS =
  'rounded-sm border border-[#d7c6a7] bg-[#fffefb] shadow-[0_1px_0_rgba(255,255,255,0.8)]'
const PAPER_FIELD_TITLE_CLASS =
  'text-[0.94rem] font-semibold tracking-[0.025em] text-[#3e2f1e]'
const PAPER_FIELD_SURFACE_CLASS =
  'rounded-sm border border-[#d9ccb5] bg-[#fffefb] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'

function getFieldAnswerKey(field: FormField): string {
  return field.key || field.id
}

function flattenFields(fields: FormField[]): FormField[] {
  return fields.flatMap((field) => {
    if (field.type === 'group') {
      return flattenFields(Array.isArray(field.fields) ? field.fields : [])
    }

    if (field.type === 'repeatable_group') {
      return []
    }

    return [field]
  })
}

function normalizeOption(option: unknown): FormOption | null {
  if (typeof option === 'string') {
    const trimmedValue = option.trim()
    if (!trimmedValue) return null
    return { value: trimmedValue, label: trimmedValue }
  }

  if (!option || typeof option !== 'object') {
    return null
  }

  const maybeValue = 'value' in option ? option.value : null
  const maybeLabel = 'label' in option ? option.label : null

  const value =
    typeof maybeValue === 'string' ||
    typeof maybeValue === 'number' ||
    typeof maybeValue === 'boolean'
      ? maybeValue
      : typeof maybeLabel === 'string'
        ? maybeLabel
        : ''

  const label =
    typeof maybeLabel === 'string'
      ? maybeLabel
      : typeof maybeValue === 'string' ||
          typeof maybeValue === 'number' ||
          typeof maybeValue === 'boolean'
        ? String(maybeValue)
        : ''

  if (typeof value === 'string' && !value.trim()) return null

  return {
    value,
    label: label || String(value),
    visibleWhen:
      'visibleWhen' in option && option.visibleWhen
        ? (option.visibleWhen as FormCondition)
        : null,
  }
}

function normalizeConditionValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return value
}

function matchesConditionValue(answer: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizeConditionValue(expected)
  const normalizedAnswer = normalizeConditionValue(answer)

  if (typeof normalizedExpected === 'boolean') {
    return normalizedAnswer === normalizedExpected
  }

  if (typeof normalizedExpected === 'number') {
    if (typeof normalizedAnswer === 'number') return normalizedAnswer === normalizedExpected
    if (typeof normalizedAnswer === 'string') return Number(normalizedAnswer) === normalizedExpected
    return false
  }

  return String(normalizedAnswer ?? '') === String(normalizedExpected ?? '')
}

function evaluateCondition(condition: FormCondition | null | undefined, answers: FormAnswers): boolean {
  if (!condition) return true

  if ('all' in condition && Array.isArray(condition.all)) {
    return condition.all.every((nestedCondition) => evaluateCondition(nestedCondition, answers))
  }

  if ('any' in condition && Array.isArray(condition.any)) {
    return condition.any.some((nestedCondition) => evaluateCondition(nestedCondition, answers))
  }

  if (!('questionKey' in condition)) return true

  const answer = answers[condition.questionKey]
  const operator = condition.operator || 'equals'

  if (operator !== 'equals') return false

  return matchesConditionValue(answer, condition.value)
}

function hasAnswerValue(value: FormAnswer | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return true
  return false
}

function isFieldVisible(field: FormField, answers: FormAnswers): boolean {
  return evaluateCondition(field.visibleWhen, answers)
}

function isFieldRequired(field: FormField, answers: FormAnswers): boolean {
  if (!isFieldVisible(field, answers)) return false
  if (field.required) return true

  const requiredWhenKeys = field.requiredWhen?.anyAnswered
  if (!Array.isArray(requiredWhenKeys) || requiredWhenKeys.length === 0) return false

  return requiredWhenKeys.some((questionKey) => hasAnswerValue(answers[questionKey]))
}

function getFieldOptions(field: FormField, answers: FormAnswers): FormOption[] {
  if (!Array.isArray(field.options)) return []

  return field.options
    .map((option) => normalizeOption(option))
    .filter((option): option is FormOption => Boolean(option))
    .filter((option) => evaluateCondition(option.visibleWhen, answers))
}

function inputTypeForField(type: string): React.HTMLInputTypeAttribute {
  switch (type) {
    case 'email':
      return 'email'
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'tel':
      return 'tel'
    case 'url':
      return 'url'
    default:
      return 'text'
  }
}

function isFieldAnswered(field: FormField, answers: FormAnswers): boolean {
  const answerKey = getFieldAnswerKey(field)
  const value = answers[answerKey]
  const options = getFieldOptions(field, answers)

  if (field.type === 'checkbox' && options.length > 0) {
    return Array.isArray(value) && value.length > 0
  }

  if (field.type === 'checkbox') {
    return value === true
  }

  if (field.type === 'number') {
    if (typeof value === 'number') return Number.isFinite(value)
    if (typeof value === 'string') return value.trim().length > 0 && Number.isFinite(Number(value))
    return false
  }

  if (field.type === 'radio' || field.type === 'select') {
    return hasAnswerValue(value)
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (typeof value === 'boolean') {
    return true
  }

  return Boolean(value)
}

function getStringAnswer(answers: FormAnswers, answerKey: string): string {
  const value = answers[answerKey]
  return typeof value === 'string' ? value : ''
}

function getPrimitiveArrayAnswer(answers: FormAnswers, answerKey: string): FormPrimitive[] {
  const value = answers[answerKey]
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is FormPrimitive =>
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
  )
}

function buildSubmissionResponses(answers: FormAnswers): Record<string, unknown> {
  const responses: Record<string, unknown> = {}

  for (const [answerKey, value] of Object.entries(answers)) {
    if (value === null || value === undefined) continue

    if (typeof value === 'string') {
      const trimmedValue = value.trim()
      if (!trimmedValue) continue
      responses[answerKey] = trimmedValue
      continue
    }

    if (Array.isArray(value)) {
      if (value.length === 0) continue
      responses[answerKey] = value
      continue
    }

    responses[answerKey] = value
  }

  return responses
}

function getSubmitErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: unknown }).data

      if (typeof data === 'string' && data.trim()) {
        return data
      }

      if (data && typeof data === 'object' && 'message' in data) {
        const message = (data as { message?: unknown }).message
        if (typeof message === 'string' && message.trim()) {
          return message
        }
      }
    }

    if ('status' in error) {
      const status = (error as { status?: unknown }).status

      if (status === 400) {
        return 'Submission failed: please review required fields and submission identifiers.'
      }

      if (status === 404) {
        return 'Submission failed: form or shareholder was not found.'
      }
    }
  }

  return 'Failed to submit form. Please try again.'
}

function renderComputedText(
  field: FormField,
  answers: FormAnswers,
  runtimeTemplateValues: RuntimeTemplateValues,
): string {
  const templates = Array.isArray(field.templates) ? field.templates : []
  if (templates.length === 0) return ''

  const selectedTemplate =
    templates.find((template) => evaluateCondition(template.visibleWhen, answers)) || templates[0]

  return interpolateTemplateTokens(selectedTemplate.text, answers, runtimeTemplateValues)
}

function normalizeFieldDescriptor(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function isSignatureSection(section: FormSection): boolean {
  const descriptors = [section.key, section.title, section.id]
    .map((descriptor) => normalizeFieldDescriptor(descriptor))
    .filter((descriptor) => descriptor.length > 0)

  if (descriptors.some((descriptor) => descriptor.includes('signature'))) {
    return true
  }

  return Array.isArray(section.questions)
    ? section.questions.some((field) => field.type === 'signature')
    : false
}

function isSignatoryNameFieldCandidate(field: FormField): boolean {
  const descriptors = [field.label, field.key, field.id]
    .map((descriptor) => normalizeFieldDescriptor(descriptor))
    .filter((descriptor) => descriptor.length > 0)

  return descriptors.some(
    (descriptor) =>
      descriptor.includes('signatory name') ||
      descriptor.includes('name in capital letters') ||
      descriptor.includes('name in capitals'),
  )
}

function getFieldTransform(field: FormField): 'uppercase' | 'lowercase' | null {
  const transform = normalizeFieldDescriptor(field.transform || '')

  if (transform === 'uppercase') return 'uppercase'
  if (transform === 'lowercase') return 'lowercase'

  return null
}

function applyStringTransform(value: string, transform: 'uppercase' | 'lowercase'): string {
  if (transform === 'uppercase') return value.toLocaleUpperCase()
  return value.toLocaleLowerCase()
}

function applyFieldTransform(field: FormField, value: FormAnswer): FormAnswer {
  const transform = getFieldTransform(field)
  if (!transform || typeof value !== 'string') return value
  return applyStringTransform(value, transform)
}

function resolveDefaultValueFromSource(
  source: string,
  shareholderName: string,
  shareholderEmail: string,
): FormPrimitive | undefined {
  const normalizedSource = normalizeFieldDescriptor(source)

  if (
    normalizedSource === 'shareholder membername' ||
    normalizedSource === 'shareholder member name' ||
    normalizedSource === 'shareholder name'
  ) {
    return shareholderName.trim() || undefined
  }

  if (normalizedSource === 'shareholder email') {
    return shareholderEmail.trim() || undefined
  }

  return undefined
}

function resolveFieldDefaultValue(
  field: FormField,
  answers: FormAnswers,
  shareholderName: string,
  shareholderEmail: string,
): FormPrimitive | undefined {
  const defaultWhenRules = Array.isArray(field.defaultWhen)
    ? (field.defaultWhen as FormDefaultWhenRule[])
    : []

  for (const rule of defaultWhenRules) {
    if (rule.when && !evaluateCondition(rule.when, answers)) continue

    if (typeof rule.valueFrom === 'string' && rule.valueFrom.trim()) {
      const sourceValue = resolveDefaultValueFromSource(
        rule.valueFrom,
        shareholderName,
        shareholderEmail,
      )
      if (sourceValue !== undefined) {
        return sourceValue
      }
    }

    if (
      typeof rule.value === 'string' ||
      typeof rule.value === 'number' ||
      typeof rule.value === 'boolean'
    ) {
      return rule.value
    }
  }

  return undefined
}

function normalizeTemplateToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function interpolateTemplateTokens(
  text: string,
  answers: FormAnswers,
  runtimeTemplateValues: RuntimeTemplateValues,
): string {
  return text.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, token) => {
    const answer = answers[token]
    if (typeof answer === 'string') return answer
    if (typeof answer === 'number' || typeof answer === 'boolean') return String(answer)

    const runtimeTemplateValue =
      runtimeTemplateValues[token] || runtimeTemplateValues[normalizeTemplateToken(token)]
    if (runtimeTemplateValue) return runtimeTemplateValue

    return `{{${token}}}`
  })
}

function isMemberNameFieldCandidate(field: FormField): boolean {
  if (field.type === 'signature' || field.type === 'computed_text') return false

  const descriptors = [field.label, field.key, field.id]
    .map((descriptor) => normalizeFieldDescriptor(descriptor))
    .filter((descriptor) => descriptor.length > 0)

  return descriptors.some(
    (descriptor) =>
      descriptor.includes('name of member') ||
      descriptor.includes('member name') ||
      descriptor.includes('shareholder name'),
  )
}

function renderField(
  field: FormField,
  answers: FormAnswers,
  onAnswerChange: (answerKey: string, value: FormAnswer) => void,
  forcedReadOnlyAnswerKeys: Set<string>,
  runtimeTemplateValues: RuntimeTemplateValues,
): React.ReactNode {
  if (!isFieldVisible(field, answers)) return null

  const answerKey = getFieldAnswerKey(field)
  const label = field.label || field.key || field.id
  const requiredMark = isFieldRequired(field, answers) ? ' *' : ''
  const options = getFieldOptions(field, answers)
  const isReadOnly = Boolean(field.readOnly || forcedReadOnlyAnswerKeys.has(answerKey))

  if (field.type === 'signature') {
    return null
  }

  if (field.type === 'computed_text') {
    const computedText = renderComputedText(field, answers, runtimeTemplateValues)
    if (!computedText) return null

    return (
      <div
        key={field.id}
        className="rounded-sm border border-[#d9ccb4] bg-[#fbf6eb] px-4 py-3 text-[0.95rem] leading-7 text-[#3d2f1c] italic"
      >
        {computedText}
      </div>
    )
  }

  if (field.type === 'group' || field.type === 'repeatable_group') {
    return (
      <Card key={field.id} className={PAPER_PANEL_CLASS}>
        <CardHeader className="border-b border-dashed border-[#dbcdb3] pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a5537]">
            {label || 'Group'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {(Array.isArray(field.fields) ? field.fields : []).map((childField) => (
            <Fragment key={childField.id}>
              {renderField(
                childField,
                answers,
                onAnswerChange,
                forcedReadOnlyAnswerKeys,
                runtimeTemplateValues,
              )}
            </Fragment>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (field.type === 'radio') {
    const value = answers[answerKey]

    return (
      <div key={field.id} className="space-y-2">
        <label className={PAPER_FIELD_TITLE_CLASS}>{label + requiredMark}</label>
        <div className={`space-y-2 p-3 ${PAPER_FIELD_SURFACE_CLASS}`}>
          {options.map((option) => (
            <label
              key={String(option.value)}
              className="flex cursor-pointer items-center gap-2 text-[0.95rem] text-[#4c3b27]"
            >
              <input
                type="radio"
                name={answerKey}
                checked={value === option.value}
                onChange={() => onAnswerChange(answerKey, option.value)}
                disabled={isReadOnly}
                className="h-4 w-4 accent-[#7a5a2f]"
              />
              <span>{interpolateTemplateTokens(option.label, answers, runtimeTemplateValues)}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'checkbox' && options.length > 0) {
    const selectedValues = getPrimitiveArrayAnswer(answers, answerKey)

    const handleToggle = (optionValue: FormPrimitive, checked: boolean) => {
      if (checked) {
        onAnswerChange(answerKey, [...selectedValues, optionValue])
        return
      }
      onAnswerChange(
        answerKey,
        selectedValues.filter((value) => value !== optionValue),
      )
    }

    return (
      <div key={field.id} className="space-y-2">
        <label className={PAPER_FIELD_TITLE_CLASS}>{label + requiredMark}</label>
        <div className={`space-y-2 p-3 ${PAPER_FIELD_SURFACE_CLASS}`}>
          {options.map((option) => (
            <label
              key={String(option.value)}
              className="flex cursor-pointer items-center gap-2 text-[0.95rem] text-[#4c3b27]"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(event) => handleToggle(option.value, event.target.checked)}
                disabled={isReadOnly}
                className="h-4 w-4 accent-[#7a5a2f]"
              />
              <span>{interpolateTemplateTokens(option.label, answers, runtimeTemplateValues)}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'checkbox') {
    const checked = answers[answerKey] === true

    return (
      <label
        key={field.id}
        className={`flex cursor-pointer items-center gap-2 p-3 text-[0.95rem] text-[#4c3b27] ${PAPER_FIELD_SURFACE_CLASS}`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onAnswerChange(answerKey, event.target.checked)}
          disabled={isReadOnly}
          className="h-4 w-4 accent-[#7a5a2f]"
        />
        <span>{label + requiredMark}</span>
      </label>
    )
  }

  if (field.type === 'select' || options.length > 0) {
    const selectedValue = answers[answerKey]
    const selectValue =
      typeof selectedValue === 'string' ||
      typeof selectedValue === 'number' ||
      typeof selectedValue === 'boolean'
        ? String(selectedValue)
        : ''

    return (
      <div key={field.id} className="space-y-2">
        <label className={PAPER_FIELD_TITLE_CLASS}>{label + requiredMark}</label>
        <select
          value={selectValue}
          onChange={(event) => {
            const matchedOption = options.find(
              (option) => String(option.value) === event.target.value,
            )
            onAnswerChange(answerKey, matchedOption ? matchedOption.value : event.target.value)
          }}
          disabled={isReadOnly}
          className="h-10 w-full rounded-sm border border-[#d9ccb5] bg-[#fffefb] px-3 text-[0.95rem] text-[#322515] outline-none focus-visible:ring-2 focus-visible:ring-[#c8b08b]"
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {interpolateTemplateTokens(option.label, answers, runtimeTemplateValues)}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'textarea') {
    const value = getStringAnswer(answers, answerKey)
    return (
      <div key={field.id} className="space-y-2">
        <label className={PAPER_FIELD_TITLE_CLASS}>{label + requiredMark}</label>
        <textarea
          value={value}
          onChange={(event) =>
            onAnswerChange(answerKey, applyFieldTransform(field, event.target.value))
          }
          rows={4}
          placeholder="Type your answer"
          readOnly={isReadOnly}
          className="w-full rounded-sm border border-[#d9ccb5] bg-[#fffefb] px-3 py-2 text-[0.95rem] text-[#322515] outline-none focus-visible:ring-2 focus-visible:ring-[#c8b08b]"
        />
      </div>
    )
  }

  const inputType = inputTypeForField(field.type)
  const value = getStringAnswer(answers, answerKey)

  return (
    <div key={field.id} className="space-y-2">
      <label className={PAPER_FIELD_TITLE_CLASS}>{label + requiredMark}</label>
      <Input
        type={inputType}
        value={value}
        onChange={(event) => onAnswerChange(answerKey, applyFieldTransform(field, event.target.value))}
        placeholder="Your answer"
        readOnly={isReadOnly}
        className="h-10 rounded-sm border-[#d9ccb5] bg-[#fffefb] text-[0.95rem] text-[#322515] shadow-none focus-visible:ring-[#c8b08b]"
      />
    </div>
  )
}

export default function ProjectFormRenderPage() {
  const params = useParams<{ id: string; formId: string }>()
  const searchParams = useSearchParams()
  const projectId = typeof params.id === 'string' ? params.id : ''
  const formId = typeof params.formId === 'string' ? params.formId : ''
  const shareholderIdParam = searchParams.get('shareholderId')
  const shareholderId = shareholderIdParam?.trim() || ''
  const meetingDateParam = searchParams.get('meetingDate')?.trim() || ''
  const proposedLiquidatorsNamesParam =
    searchParams.get('proposedLiquidatorsNames')?.trim() || ''
  const proposedLiquidatorsFirmAddressParam =
    searchParams.get('proposedLiquidatorsFirmAddress')?.trim() || ''

  const {
    data: formSchema,
    isLoading,
    isError,
    refetch,
  } = useGetFormByIdQuery(formId, { skip: !formId })
  const { data: shareholderDetails } = useGetPublicShareholderQuery(
    {
      projectId,
      shareholderId,
    },
    { skip: !projectId || !shareholderId },
  )
  const [submitPublicForm, { isLoading: isSubmittingForm }] = useSubmitPublicFormMutation()

  const [answers, setAnswers] = useState<FormAnswers>({})
  const [showValidation, setShowValidation] = useState(false)
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw')
  const [signatureImageData, setSignatureImageData] = useState('')
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  const formSections = useMemo<FormSection[]>(() => {
    if (!formSchema) return []

    if (Array.isArray(formSchema.sections) && formSchema.sections.length > 0) {
      return formSchema.sections
    }

    if (Array.isArray(formSchema.fields) && formSchema.fields.length > 0) {
      return [
        {
          id: 'legacy-fields-section',
          key: 'legacy-fields',
          title: null,
          questions: formSchema.fields,
        },
      ]
    }

    return []
  }, [formSchema])

  const signatureSections = useMemo(() => {
    return formSections.filter((section) => isSignatureSection(section))
  }, [formSections])

  const nonSignatureSections = useMemo(() => {
    return formSections.filter((section) => !isSignatureSection(section))
  }, [formSections])

  const topLevelFields = useMemo(() => {
    return formSections.flatMap((section) =>
      Array.isArray(section.questions) ? section.questions : [],
    )
  }, [formSections])

  const nonSignatureTopLevelFields = useMemo(() => {
    return nonSignatureSections.flatMap((section) =>
      Array.isArray(section.questions) ? section.questions : [],
    )
  }, [nonSignatureSections])

  const signatureTopLevelFields = useMemo(() => {
    return signatureSections.flatMap((section) =>
      Array.isArray(section.questions) ? section.questions : [],
    )
  }, [signatureSections])

  const shareholderName = useMemo(() => shareholderDetails?.name?.trim() || '', [shareholderDetails])
  const shareholderEmail = useMemo(
    () => shareholderDetails?.email?.trim() || '',
    [shareholderDetails],
  )
  const currentFormSubmissionStatus = useMemo(() => {
    return (
      shareholderDetails?.formsSent
        ?.find((formSent) => formSent.formId === formId)
        ?.status?.trim() || ''
    )
  }, [shareholderDetails, formId])
  const hasAlreadySubmittedThisForm = useMemo(() => {
    const normalizedStatus = currentFormSubmissionStatus.toLowerCase()
    return normalizedStatus === 'completed' || normalizedStatus === 'complete'
  }, [currentFormSubmissionStatus])

  const memberNameFieldAnswerKey = useMemo(() => {
    if (!shareholderName) return null

    const memberNameField = flattenFields(nonSignatureTopLevelFields).find((field) =>
      isMemberNameFieldCandidate(field),
    )

    return memberNameField ? getFieldAnswerKey(memberNameField) : null
  }, [nonSignatureTopLevelFields, shareholderName])

  const signatoryNameFieldAnswerKey = useMemo(() => {
    const signatoryNameField = flattenFields(signatureTopLevelFields).find((field) =>
      isSignatoryNameFieldCandidate(field),
    )

    return signatoryNameField ? getFieldAnswerKey(signatoryNameField) : null
  }, [signatureTopLevelFields])

  const forcedReadOnlyAnswerKeys = useMemo(() => {
    if (!memberNameFieldAnswerKey) return new Set<string>()
    return new Set<string>([memberNameFieldAnswerKey])
  }, [memberNameFieldAnswerKey])

  const resolvedAnswers = useMemo<FormAnswers>(() => {
    let nextAnswers: FormAnswers | null = null

    const getCurrentAnswers = () => nextAnswers ?? answers
    const setAnswer = (answerKey: string, value: FormAnswer) => {
      if (!nextAnswers) nextAnswers = { ...answers }
      nextAnswers[answerKey] = value
    }
    const clearAnswer = (answerKey: string) => {
      if (!nextAnswers) nextAnswers = { ...answers }
      delete nextAnswers[answerKey]
    }

    if (memberNameFieldAnswerKey && shareholderName) {
      const currentValue = getCurrentAnswers()[memberNameFieldAnswerKey]
      if (typeof currentValue !== 'string' || currentValue.trim() !== shareholderName) {
        setAnswer(memberNameFieldAnswerKey, shareholderName)
      }
    }

    const flattenedFields = flattenFields(topLevelFields)

    for (const field of flattenedFields) {
      const answerKey = getFieldAnswerKey(field)
      const currentValue = getCurrentAnswers()[answerKey]
      const isVisible = isFieldVisible(field, getCurrentAnswers())

      if (field.clearWhenHidden && !isVisible && hasAnswerValue(currentValue)) {
        clearAnswer(answerKey)
      }
    }

    for (const field of flattenedFields) {
      const answerKey = getFieldAnswerKey(field)
      const currentValue = getCurrentAnswers()[answerKey]
      if (hasAnswerValue(currentValue)) continue
      if (!isFieldVisible(field, getCurrentAnswers())) continue

      const defaultValue = resolveFieldDefaultValue(
        field,
        getCurrentAnswers(),
        shareholderName,
        shareholderEmail,
      )
      if (defaultValue === undefined) continue

      setAnswer(answerKey, applyFieldTransform(field, defaultValue))
    }

    for (const field of flattenedFields) {
      const answerKey = getFieldAnswerKey(field)
      const currentValue = getCurrentAnswers()[answerKey]
      if (typeof currentValue !== 'string') continue

      const transformedValue = applyFieldTransform(field, currentValue)
      if (typeof transformedValue === 'string' && transformedValue !== currentValue) {
        setAnswer(answerKey, transformedValue)
      }
    }

    return nextAnswers ?? answers
  }, [
    answers,
    memberNameFieldAnswerKey,
    shareholderEmail,
    shareholderName,
    topLevelFields,
  ])

  const runtimeTemplateValues = useMemo<RuntimeTemplateValues>(() => {
    const values: RuntimeTemplateValues = {}

    const addRuntimeValue = (key: string, rawValue: string) => {
      const trimmedValue = rawValue.trim()
      if (!trimmedValue) return
      values[key] = trimmedValue
      values[normalizeTemplateToken(key)] = trimmedValue
    }

    for (const [key, value] of searchParams.entries()) {
      addRuntimeValue(key, value)
    }

    addRuntimeValue('meetingDate', meetingDateParam)
    addRuntimeValue('proposedLiquidatorsNames', proposedLiquidatorsNamesParam)
    addRuntimeValue(
      'proposedLiquidatorsFirmAddress',
      proposedLiquidatorsFirmAddressParam,
    )

    const normalizedPluralLiquidatorsKey = normalizeTemplateToken('proposedLiquidatorsNames')
    const normalizedSingularLiquidatorsKey = normalizeTemplateToken('proposedLiquidatorNames')
    const normalizedPluralFirmKey = normalizeTemplateToken('proposedLiquidatorsFirmAddress')
    const normalizedSingularFirmKey = normalizeTemplateToken('proposedLiquidatorFirmAddress')

    if (
      !values[normalizedPluralLiquidatorsKey] &&
      values[normalizedSingularLiquidatorsKey]
    ) {
      values[normalizedPluralLiquidatorsKey] = values[normalizedSingularLiquidatorsKey]
      values.proposedLiquidatorsNames = values[normalizedSingularLiquidatorsKey]
    }

    if (!values[normalizedPluralFirmKey] && values[normalizedSingularFirmKey]) {
      values[normalizedPluralFirmKey] = values[normalizedSingularFirmKey]
      values.proposedLiquidatorsFirmAddress = values[normalizedSingularFirmKey]
    }

    return values
  }, [
    meetingDateParam,
    proposedLiquidatorsNamesParam,
    proposedLiquidatorsFirmAddressParam,
    searchParams,
  ])

  const hasSignatureField = useMemo(() => {
    return flattenFields(topLevelFields).some((field) => field.type === 'signature')
  }, [topLevelFields])

  const signatureDisplayName = useMemo(() => {
    if (signatoryNameFieldAnswerKey) {
      const signatoryNameValue = resolvedAnswers[signatoryNameFieldAnswerKey]
      if (typeof signatoryNameValue === 'string' && signatoryNameValue.trim()) {
        return signatoryNameValue.trim()
      }
    }

    if (memberNameFieldAnswerKey) {
      const memberNameValue = resolvedAnswers[memberNameFieldAnswerKey]
      if (typeof memberNameValue === 'string' && memberNameValue.trim()) {
        return memberNameValue.trim()
      }
    }

    return shareholderName.trim()
  }, [
    memberNameFieldAnswerKey,
    resolvedAnswers,
    shareholderName,
    signatoryNameFieldAnswerKey,
  ])

  const signatureDisplayNameInCaps = useMemo(
    () => signatureDisplayName.toLocaleUpperCase(),
    [signatureDisplayName],
  )

  const requiredFields = useMemo(() => {
    return flattenFields(topLevelFields).filter((field) => {
      if (field.type === 'signature' || field.type === 'computed_text') return false
      return isFieldRequired(field, resolvedAnswers)
    })
  }, [topLevelFields, resolvedAnswers])

  const missingRequiredFields = useMemo(() => {
    return requiredFields.filter((field) => !isFieldAnswered(field, resolvedAnswers))
  }, [requiredFields, resolvedAnswers])

  const hasSignature = signatureImageData.length > 0
  const isFormReady = missingRequiredFields.length === 0 && (!hasSignatureField || hasSignature)

  const onAnswerChange = (fieldId: string, value: FormAnswer) => {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value,
    }))
  }

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  const switchSignatureMode = (mode: SignatureMode) => {
    setSignatureMode(mode)
    setSignatureImageData('')
    setSubmitFeedback(null)
    clearSignatureCanvas()
  }

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setSubmitFeedback({
        type: 'error',
        message: 'Please upload an image file for the signature.',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      setSignatureImageData(reader.result)
      setSubmitFeedback(null)
    }
    reader.readAsDataURL(file)
  }

  const getSignaturePoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handleStartDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw') return

    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    const point = getSignaturePoint(event)
    if (!context || !point) return

    isDrawingRef.current = true
    context.strokeStyle = '#0f172a'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const handleDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || signatureMode !== 'draw') return

    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    const point = getSignaturePoint(event)
    if (!context || !point) return

    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const handleStopDrawing = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const canvas = signatureCanvasRef.current
    if (!canvas) return
    setSignatureImageData(canvas.toDataURL('image/png'))
    setSubmitFeedback(null)
  }

  const handleClearSignature = () => {
    clearSignatureCanvas()
    setSignatureImageData('')
    setSubmitFeedback(null)
  }

  const handleSubmit = async () => {
    setShowValidation(true)

    if (hasAlreadySubmittedThisForm) {
      setSubmitFeedback({
        type: 'error',
        message: 'You have already filled and signed this form.',
      })
      return
    }

    if (missingRequiredFields.length > 0) {
      setSubmitFeedback({
        type: 'error',
        message: 'Please answer all required questions before submitting.',
      })
      return
    }

    if (hasSignatureField && !hasSignature) {
      setSubmitFeedback({
        type: 'error',
        message: 'Please upload or draw a signature before submitting.',
      })
      return
    }

    if (!shareholderId) {
      setSubmitFeedback({
        type: 'error',
        message: 'Missing shareholder identifier in the form link. Please use the email link again.',
      })
      return
    }

    try {
      const responses = buildSubmissionResponses(resolvedAnswers)
      const response = await submitPublicForm({
        formId,
        body: {
          shareholderId,
          responses,
          signatureImage: signatureImageData || undefined,
        },
      }).unwrap()

      setSubmitFeedback({
        type: 'success',
        message:
          response.message ||
          'Form submitted successfully. PDF generation and delivery have started.',
      })
      setIsSubmissionSuccessful(true)
    } catch (error) {
      setSubmitFeedback({
        type: 'error',
        message: getSubmitErrorMessage(error),
      })
    }
  }

  if (isSubmissionSuccessful) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-b from-[#ede0c8] via-[#f5ecdb] to-[#e6d6bb] px-4 py-8 font-serif text-[#2f2417] md:px-8">
        <Card className="mx-auto w-full max-w-2xl rounded-sm border-[#b7c5a5] bg-[#fffefb] shadow-[0_24px_48px_rgba(66,49,25,0.2)]">
          <CardHeader className="space-y-2 border-b border-dashed border-[#d7c8ae] pb-4">
            <CardTitle className="text-xl font-semibold tracking-[0.025em] text-[#2f2417] md:text-2xl">
              Thank You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm text-[#365a2e]">
              Your form has been submitted successfully.
            </p>
            <p className="text-sm text-[#5f4c35]">
              An email containing your signed copy will be delivered shortly.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (hasAlreadySubmittedThisForm) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-b from-[#ede0c8] via-[#f5ecdb] to-[#e6d6bb] px-4 py-8 font-serif text-[#2f2417] md:px-8">
        <Card className="mx-auto w-full max-w-2xl rounded-sm border-[#d2bb95] bg-[#fffefb] shadow-[0_24px_48px_rgba(66,49,25,0.2)]">
          <CardHeader className="space-y-2 border-b border-dashed border-[#d7c8ae] pb-4">
            <CardTitle className="text-xl font-semibold tracking-[0.025em] text-[#2f2417] md:text-2xl">
              Form Already Submitted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm text-[#7a5a23]">
              You have already filled and signed this form.
            </p>
            <p className="text-sm text-[#5f4c35]">
              Status: {currentFormSubmissionStatus || 'Completed'}
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#ede0c8] via-[#f5ecdb] to-[#e6d6bb] px-4 py-8 font-serif text-[#2f2417] md:px-8">
      {isLoading && (
        <Card className="mx-auto w-full max-w-4xl rounded-sm border-[#d6c3a4] bg-[#fffdf8] shadow-[0_14px_28px_rgba(70,50,22,0.14)]">
          <CardContent className="p-5">
            <p className="text-sm text-[#5b4932]">Loading form...</p>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="mx-auto w-full max-w-4xl rounded-sm border-[#cfb7a6] bg-[#fff4ea] shadow-[0_12px_22px_rgba(92,60,20,0.12)]">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-[#8a3f2a]">Failed to load this form.</p>
            <Button
              type="button"
              variant="outline"
              className="border-[#b68961] text-[#5a3d1f]"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {formSchema && (
        <article className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[3px] border border-[#d6c3a4] bg-[#fffdf8] shadow-[0_24px_48px_rgba(66,49,25,0.2)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-55"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 33px, rgba(122,89,50,0.08) 33px, rgba(122,89,50,0.08) 34px), linear-gradient(to right, transparent 0, transparent 36px, rgba(152,112,70,0.15) 36px, rgba(152,112,70,0.15) 37px, transparent 37px)',
            }}
          />

          <div className="relative z-10 space-y-8 p-5 sm:p-7 md:p-10">
            <Card className="rounded-sm border-[#d6c4a7] bg-[#fffefb]/90 shadow-none">
              <CardHeader className="space-y-2 border-b border-dashed border-[#d7c8ae] pb-4">
                <CardTitle className="text-xl font-semibold tracking-[0.025em] text-[#2f2417] md:text-2xl">
                {formSchema.title}
                </CardTitle>
                {formSchema.subtitle && (
                  <p className="text-[0.96rem] italic text-[#5c4933]">{formSchema.subtitle}</p>
                )}
                {shareholderId && (
                  <p className="text-xs tracking-[0.08em] text-[#7f6748]">
                    Shareholder: {shareholderName || shareholderId}
                  </p>
                )}
                {shareholderEmail && (
                  <p className="text-xs tracking-[0.08em] text-[#7f6748]">
                    Email: {shareholderEmail}
                  </p>
                )}
              </CardHeader>
            </Card>

            <Card className="rounded-sm border-[#d6c4a7] bg-[#fffefb]/90 shadow-none">
              <CardContent className="space-y-6 pt-6">
                {nonSignatureSections.length === 0 ? (
                  <p className="text-sm text-[#5d4a33]">
                    No non-signature questions are available for this form.
                  </p>
                ) : (
                  nonSignatureSections.map((section) => (
                    <div key={section.id} className="space-y-3">
                      {section.title && (
                        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#705b3d]">
                          {section.title}
                        </h3>
                      )}
                      <div className="space-y-5">
                        {section.questions.map((field) => (
                          <Fragment key={field.id}>
                            {renderField(
                              field,
                              resolvedAnswers,
                              onAnswerChange,
                              forcedReadOnlyAnswerKeys,
                              runtimeTemplateValues,
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {showValidation && (
                  <Card
                    className={
                      isFormReady
                        ? 'rounded-sm border-[#b7c5a5] bg-[#eef5e4]'
                        : 'rounded-sm border-[#d2bb95] bg-[#fbf3df]'
                    }
                  >
                    <CardContent className="space-y-2 p-3">
                      {isFormReady ? (
                        <p className="text-sm text-[#365a2e]">
                          {hasSignatureField
                            ? 'All required fields are filled and signature is provided.'
                            : 'All required fields are filled.'}
                        </p>
                      ) : (
                        <>
                          {missingRequiredFields.length > 0 && (
                            <>
                              <p className="text-sm text-[#7a5a23]">
                                Missing required fields: {missingRequiredFields.length}
                              </p>
                              <ul className="list-disc pl-4 text-xs text-[#7a5a23]">
                                {missingRequiredFields.map((field) => (
                                  <li key={field.id}>{field.label || field.key || field.id}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

          {hasSignatureField && (
            <Card className="rounded-sm border-[#d6c4a7] bg-[#fffefb]/90 shadow-none">
              <CardHeader className="border-b border-dashed border-[#d7c8ae] pb-3">
                <CardTitle className="text-base font-semibold text-[#2f2417]">
                  Signature *
                </CardTitle>
                <p className="text-[0.95rem] text-[#5f4c35]">
                  Shareholders can either upload a signature image or draw a signature below.
                </p>
                <p className="text-xs tracking-[0.08em] text-[#7f6748]">
                  Signature is required before submission.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {signatureSections.map((section) => (
                  <div key={section.id} className="space-y-3">
                    {section.title &&
                      normalizeFieldDescriptor(section.title) !== 'signature' && (
                        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#705b3d]">
                          {section.title}
                        </h3>
                      )}
                    <div className="space-y-5">
                      {section.questions.map((field) => (
                        <Fragment key={field.id}>
                          {renderField(
                            field,
                            resolvedAnswers,
                            onAnswerChange,
                            forcedReadOnlyAnswerKeys,
                            runtimeTemplateValues,
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={signatureMode === 'draw' ? 'default' : 'outline'}
                    className={
                      signatureMode === 'draw'
                        ? 'bg-[#3f2c16] text-[#f4ece0] hover:bg-[#32220f]'
                        : 'border-[#b59169] text-[#5a3e20]'
                    }
                    onClick={() => switchSignatureMode('draw')}
                  >
                    Draw Signature
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={signatureMode === 'upload' ? 'default' : 'outline'}
                    className={
                      signatureMode === 'upload'
                        ? 'bg-[#3f2c16] text-[#f4ece0] hover:bg-[#32220f]'
                        : 'border-[#b59169] text-[#5a3e20]'
                    }
                    onClick={() => switchSignatureMode('upload')}
                  >
                    Upload Signature
                  </Button>
                </div>

                {signatureMode === 'upload' && (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="h-10 rounded-sm border-[#d9ccb5] bg-[#fffefb] text-[0.95rem] text-[#322515] shadow-none focus-visible:ring-[#c8b08b]"
                    />
                    <p className="text-xs text-[#796345]">
                      Accepted format: image files only (PNG, JPG, JPEG, etc.).
                    </p>
                  </div>
                )}

                {signatureMode === 'draw' && (
                  <div className="space-y-2">
                    <canvas
                      ref={signatureCanvasRef}
                      width={720}
                      height={220}
                      onPointerDown={handleStartDrawing}
                      onPointerMove={handleDraw}
                      onPointerUp={handleStopDrawing}
                      onPointerLeave={handleStopDrawing}
                      onPointerCancel={handleStopDrawing}
                      className="h-44 w-full touch-none rounded-sm border border-[#cfbda0] bg-[#fffefb]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[#b59169] text-[#5a3e20]"
                      onClick={handleClearSignature}
                    >
                      Clear Signature
                    </Button>
                  </div>
                )}

                {showValidation && !hasSignature && (
                  <div className="rounded-sm border border-[#cfb7a6] bg-[#fff4ea] px-3 py-2">
                    <p className="text-xs text-[#8a3f2a]">
                      Please upload or draw your signature to continue.
                    </p>
                  </div>
                )}

                <div className="space-y-2 rounded-sm border border-[#ddcfb6] bg-[#fbf6eb] px-3 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#755f40]">
                    Signed By
                  </p>
                  <p className="text-sm font-semibold tracking-[0.06em] text-[#3d2f1c] uppercase">
                    {signatureDisplayNameInCaps || '—'}
                  </p>
                  {signatureImageData ? (
                    <Image
                      src={signatureImageData}
                      alt="Signature preview"
                      width={320}
                      height={112}
                      unoptimized
                      className="max-h-28 rounded-sm border border-[#d9ccb4] bg-[#fffefb]"
                    />
                  ) : (
                    <p className="text-xs text-[#796345]">Signature not provided yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {submitFeedback && (
            <Card
              className={
                submitFeedback.type === 'success'
                  ? 'rounded-sm border-[#b7c5a5] bg-[#eef5e4]'
                  : 'rounded-sm border-[#cfb7a6] bg-[#fff4ea]'
              }
            >
              <CardContent className="p-4">
                <p
                  className={
                    submitFeedback.type === 'success'
                      ? 'text-sm text-[#365a2e]'
                      : 'text-sm text-[#8a3f2a]'
                  }
                >
                  {submitFeedback.message}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-sm border-[#d2bb95] bg-[#fbf3df] shadow-none">
            <CardContent className="p-4">
              <p className="text-sm text-[#7a5a23]">
                Once you submit, your responses are locked. You will receive a PDF copy of your
                answers by email and your responses shared with the Company&apos;s representative
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end border-t border-dashed border-[#d7c8ae] pt-6">
            <Button
              type="button"
              size="sm"
              className="bg-[#3f2c16] px-6 text-[#f4ece0] hover:bg-[#32220f]"
              disabled={isSubmittingForm}
              onClick={handleSubmit}
            >
              {isSubmittingForm ? 'Submitting...' : 'Submit Form'}
            </Button>
          </div>
          </div>
        </article>
      )}
    </main>
  )
}
