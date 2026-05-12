package dawn.awesomity.uk.backend.forms

import tools.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.core.io.Resource
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class FormSeederService(
    private val formRepository: FormRepository,
    private val formSectionRepository: FormSectionRepository,
    private val formQuestionRepository: FormQuestionRepository,
    private val objectMapper: ObjectMapper,
    @Value("classpath:forms/proxy_appointment.json") private val proxyFormResource: Resource
) {

    @EventListener(ApplicationReadyEvent::class)
    @Transactional
    fun seedForms() {
        if (!proxyFormResource.exists()) {
            println("Proxy form JSON not found. Skipping seeding.")
            return
        }

        val jsonString = proxyFormResource.inputStream.bufferedReader().use { it.readText() }
        val formMap = objectMapper.readValue(jsonString, Map::class.java) as Map<String, Any>

        val formKey = formMap["formKey"] as? String ?: "default_form_key"
        val title = formMap["title"] as String
        
        if (formRepository.existsByFormKey(formKey)) {
            println("Form with key '$formKey' already exists. Skipping seeding.")
            return
        }

        val subtitle = formMap["subtitle"] as? String

        val formEntity = FormEntity(
            formKey = formKey,
            title = title,
            subtitle = subtitle
        )

        val savedForm = formRepository.save(formEntity)

        val sections = formMap["sections"] as? List<Map<String, Any>> ?: emptyList()
        sections.forEachIndexed { index, sectionMap ->
            val sectionKey = sectionMap["key"] as String
            val sectionTitle = sectionMap["title"] as? String
            
            val sectionEntity = FormSectionEntity(
                form = savedForm,
                key = sectionKey,
                title = sectionTitle,
                position = index
            )
            val savedSection = formSectionRepository.save(sectionEntity)
            
            val questions = sectionMap["questions"] as? List<Map<String, Any>> ?: emptyList()
            processQuestions(questions, savedSection, null)
        }
        
        println("Successfully seeded form '$title' (key: $formKey).")
    }

    private fun processQuestions(questions: List<Map<String, Any>>, section: FormSectionEntity, parentId: UUID?, startPosition: Int = 0): Int {
        var currentPosition = startPosition
        
        for (qMap in questions) {
            val key = qMap["key"] as String
            val type = qMap["type"] as String
            val label = qMap["label"] as? String
            val tooltip = qMap["tooltip"] as? String
            val isRequired = qMap["required"] as? Boolean ?: false
            val isReadonly = qMap["readOnly"] as? Boolean ?: false
            val defaultValue = qMap["defaultValue"] as? String
            val clearWhenHidden = qMap["clearWhenHidden"] as? Boolean ?: false
            val prefillFrom = qMap["prefillFrom"] as? String
            val defaultFrom = qMap["defaultFrom"] as? String

            val options = qMap["options"]?.let { objectMapper.writeValueAsString(it) }
            val dynamicDefaultValue = qMap["dynamicDefaultValue"]?.let { objectMapper.writeValueAsString(it) }
            val visibleWhen = qMap["visibleWhen"]?.let { objectMapper.writeValueAsString(it) }
            val requiredWhen = qMap["requiredWhen"]?.let { objectMapper.writeValueAsString(it) }
            val templates = qMap["templates"]?.let { objectMapper.writeValueAsString(it) }
            val dynamicText = qMap["dynamicText"]?.let { objectMapper.writeValueAsString(it) }
            val dynamicOptions = qMap["dynamicOptions"]?.let { objectMapper.writeValueAsString(it) }
            val validationRules = qMap["validationRules"]?.let { objectMapper.writeValueAsString(it) }
            
            // Collect other config-like fields (repeatable_group settings, captures, etc.)
            val configMap = mutableMapOf<String, Any>()
            qMap["addButtonLabel"]?.let { configMap["addButtonLabel"] = it }
            qMap["minRows"]?.let { configMap["minRows"] = it }
            qMap["captures"]?.let { configMap["captures"] = it }
            qMap["systemGenerated"]?.let { configMap["systemGenerated"] = it }
            qMap["transform"]?.let { configMap["transform"] = it }
            qMap["defaultWhen"]?.let { configMap["defaultWhen"] = it }
            
            val config = if (configMap.isNotEmpty()) objectMapper.writeValueAsString(configMap) else null

            val questionEntity = FormQuestionEntity(
                section = section,
                parentQuestionId = parentId,
                key = key,
                type = type,
                label = label,
                tooltip = tooltip,
                isRequired = isRequired,
                isReadonly = isReadonly,
                options = options,
                defaultValue = defaultValue,
                dynamicDefaultValue = dynamicDefaultValue,
                visibleWhen = visibleWhen,
                requiredWhen = requiredWhen,
                clearWhenHidden = clearWhenHidden,
                prefillFrom = prefillFrom,
                defaultFrom = defaultFrom,
                templates = templates,
                dynamicText = dynamicText,
                dynamicOptions = dynamicOptions,
                validationRules = validationRules,
                config = config,
                position = currentPosition++
            )

            val savedQuestion = formQuestionRepository.save(questionEntity)

            // Handle nested fields (for repeater or groups)
            val nestedFields = qMap["fields"] as? List<Map<String, Any>>
            if (nestedFields != null && nestedFields.isNotEmpty()) {
                processQuestions(nestedFields, section, savedQuestion.id)
            }
        }
        
        return currentPosition
    }
}
