package dawn.awesomity.uk.backend.forms

import dawn.awesomity.uk.backend.mail.EmailService
import dawn.awesomity.uk.backend.projects.ProjectJpaRepository
import dawn.awesomity.uk.backend.shareholders.ShareholderRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class FormService(
    private val formRepository: FormRepository,
    private val projectRepository: ProjectJpaRepository,
    private val shareholderRepository: ShareholderRepository,
    private val emailService: EmailService,
    private val objectMapper: tools.jackson.databind.ObjectMapper
) {

    @Transactional(readOnly = true)
    fun getFormsForDropdown(): List<FormDropdownResponse> {
        return formRepository.findAll().map {
            FormDropdownResponse(
                id = it.id!!,
                title = it.title
            )
        }
    }

    @Transactional(readOnly = true)
    fun getForm(formId: UUID): FormResponse {
        val form = formRepository.findById(formId).orElseThrow { 
            IllegalArgumentException("Form not found") 
        }

        return FormResponse(
            id = form.id!!,
            formKey = form.formKey,
            title = form.title,
            subtitle = form.subtitle,
            sections = form.sections.sortedBy { it.position }.map { section ->
                FormSectionResponse(
                    id = section.id!!,
                    key = section.key,
                    title = section.title,
                    questions = buildQuestionsTree(
                        questions = section.questions,
                        questionsByParent = section.questions.groupBy { it.parentQuestionId },
                        parentId = null
                    )
                )
            }
        )
    }

    private fun buildQuestionsTree(
        questions: List<FormQuestionEntity>,
        questionsByParent: Map<UUID?, List<FormQuestionEntity>>,
        parentId: UUID?
    ): List<FormQuestionResponse> {
        val rootQuestions = questionsByParent[parentId]?.sortedBy { it.position } ?: return emptyList()

        return rootQuestions.map { q ->
            val configMap = q.config?.let { 
                objectMapper.readValue(it, Map::class.java) as Map<String, Any> 
            } ?: emptyMap()

            FormQuestionResponse(
                id = q.id!!,
                key = q.key,
                type = q.type,
                label = q.label,
                tooltip = q.tooltip,
                required = q.isRequired,
                readOnly = q.isReadonly,
                clearWhenHidden = q.clearWhenHidden,
                prefillFrom = q.prefillFrom,
                defaultFrom = q.defaultFrom,
                defaultValue = q.defaultValue,
                options = q.options?.let { objectMapper.readValue(it, Any::class.java) },
                visibleWhen = q.visibleWhen?.let { objectMapper.readValue(it, Any::class.java) },
                requiredWhen = q.requiredWhen?.let { objectMapper.readValue(it, Any::class.java) },
                templates = q.templates?.let { objectMapper.readValue(it, Any::class.java) },
                dynamicText = q.dynamicText?.let { objectMapper.readValue(it, Any::class.java) },
                dynamicOptions = q.dynamicOptions?.let { objectMapper.readValue(it, Any::class.java) },
                validationRules = q.validationRules?.let { objectMapper.readValue(it, Any::class.java) },
                fields = buildQuestionsTree(questions, questionsByParent, q.id),
                
                // Config mapping
                addButtonLabel = configMap["addButtonLabel"] as? String,
                minRows = configMap["minRows"] as? Int,
                captures = configMap["captures"],
                systemGenerated = configMap["systemGenerated"] as? String,
                transform = configMap["transform"] as? String,
                defaultWhen = configMap["defaultWhen"]
            )
        }
    }

    @Transactional
    fun distributeForm(projectId: UUID, formId: UUID, frontendUrlTemplate: String) {
        val form = formRepository.findById(formId).orElseThrow {
            IllegalArgumentException("Form not found")
        }

        val project = projectRepository.findById(projectId).orElseThrow {
            IllegalArgumentException("Project not found")
        }

        val shareholders = shareholderRepository.findAllByProjectId(projectId)
            .filter { !it.email.isNullOrBlank() }

        if (shareholders.isEmpty()) {
            throw IllegalArgumentException("No shareholders with valid emails found for this project")
        }

        for (shareholder in shareholders) {
            val personalizedLink = frontendUrlTemplate
                .replace("{projectId}", projectId.toString())
                .replace("{formId}", formId.toString())
                .replace("{shareholderId}", shareholder.id.toString())

            emailService.sendFormInvitation(
                toEmail = shareholder.email!!,
                shareholderName = shareholder.name,
                formTitle = form.title,
                projectName = project.name,
                formLink = personalizedLink
            )

            // Record status
            val formsSentList = try {
                objectMapper.readValue(shareholder.formsSent, List::class.java) as MutableList<Map<String, Any>>
            } catch (e: Exception) {
                mutableListOf()
            }

            // Update or add entry
            val existingEntry = formsSentList.find { it["formId"] == formId.toString() }
            if (existingEntry != null) {
                // If it's already Completed, maybe don't revert to Sent? 
                // But usually, a re-send means we are still tracking it.
                // Let's only update if not already Completed.
                if (existingEntry["status"] != "Completed") {
                    (existingEntry as MutableMap<String, Any>)["status"] = "Sent"
                }
            } else {
                formsSentList.add(mutableMapOf(
                    "formId" to formId.toString(),
                    "status" to "Sent"
                ))
            }

            shareholder.formsSent = objectMapper.writeValueAsString(formsSentList)
            shareholderRepository.save(shareholder)
        }
    }
}
