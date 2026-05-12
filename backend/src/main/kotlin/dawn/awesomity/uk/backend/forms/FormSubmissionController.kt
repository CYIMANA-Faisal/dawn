package dawn.awesomity.uk.backend.forms

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/forms")
class FormSubmissionController(
    private val formSubmissionService: FormSubmissionService
) {

    @PostMapping("/{formId}/submit")
    @ResponseStatus(HttpStatus.CREATED)
    fun submitForm(
        @PathVariable formId: UUID,
        @RequestBody request: SubmitFormRequest
    ) {
        formSubmissionService.submitForm(formId, request)
    }
}
