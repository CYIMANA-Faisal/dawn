package dawn.awesomity.uk.backend.forms

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.ResponseEntity
import org.springframework.http.HttpStatus
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.util.UUID

data class DistributeFormRequest(
    @field:NotBlank
    val frontendUrlTemplate: String
)

data class FormDropdownResponse(
    val id: UUID,
    val title: String
)

data class FormResponse(
    val id: UUID,
    val formKey: String,
    val title: String,
    val subtitle: String?,
    val sections: List<FormSectionResponse>
)

data class FormSectionResponse(
    val id: UUID,
    val key: String,
    val title: String?,
    val questions: List<FormQuestionResponse>
)

data class FormQuestionResponse(
    val id: UUID,
    val key: String,
    val type: String,
    val label: String?,
    val tooltip: String?,
    val required: Boolean,
    val readOnly: Boolean,
    val clearWhenHidden: Boolean?,
    val prefillFrom: String?,
    val defaultFrom: String?,
    val defaultValue: Any?,
    val options: Any?,
    val visibleWhen: Any?,
    val requiredWhen: Any?,
    val templates: Any?,
    val dynamicText: Any?,
    val dynamicOptions: Any?,
    val validationRules: Any?,
    val fields: List<FormQuestionResponse>? = null,
    
    // Config/Behavioral fields (flattened from JSON config)
    val addButtonLabel: String? = null,
    val minRows: Int? = null,
    val captures: Any? = null,
    val systemGenerated: String? = null,
    val transform: String? = null,
    val defaultWhen: Any? = null
)

@RestController
@RequestMapping("/api/v1/forms")
class FormController(
    private val formService: FormService
) {

    @GetMapping("/dropdown")
    fun getFormsForDropdown(): List<FormDropdownResponse> {
        return formService.getFormsForDropdown()
    }

    @GetMapping("/{id}")
    fun getForm(@PathVariable id: UUID): FormResponse {
        return formService.getForm(id)
    }

    @PostMapping("/projects/{projectId}/forms/{formId}/distribute")
    fun distributeForm(
        @PathVariable projectId: UUID,
        @PathVariable formId: UUID,
        @Valid @RequestBody request: DistributeFormRequest
    ): ResponseEntity<Map<String, String>> {
        
        formService.distributeForm(projectId, formId, request.frontendUrlTemplate)
        
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
            mapOf("message" to "Form distribution started successfully.")
        )
    }
}
