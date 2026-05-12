package dawn.awesomity.uk.backend.forms

import dawn.awesomity.uk.backend.mail.EmailService
import dawn.awesomity.uk.backend.shareholders.ShareholderRepository
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.io.ByteArrayOutputStream
import java.util.UUID

data class SubmitFormRequest(
    val shareholderId: UUID,
    val responses: Map<String, Any>,
    val signatureImage: String? = null
)

@Service
class FormSubmissionService(
    private val formRepository: FormRepository,
    private val shareholderRepository: ShareholderRepository,
    private val formSubmissionRepository: FormSubmissionRepository,
    private val emailService: EmailService,
    private val templateEngine: TemplateEngine,
    private val objectMapper: tools.jackson.databind.ObjectMapper
) {

    @Transactional
    fun submitForm(formId: UUID, request: SubmitFormRequest) {
        val form = formRepository.findById(formId).orElseThrow {
            IllegalArgumentException("Form not found")
        }

        val shareholder = shareholderRepository.findById(request.shareholderId).orElseThrow {
            IllegalArgumentException("Shareholder not found")
        }

        // 1. Save submission
        val submission = FormSubmissionEntity(
            formId = formId,
            shareholderId = request.shareholderId,
            responses = objectMapper.writeValueAsString(request.responses),
            signatureImage = request.signatureImage
        )
        formSubmissionRepository.save(submission)

        // 2. Update shareholder status to Completed
        val formsSentList = try {
            objectMapper.readValue(shareholder.formsSent, List::class.java) as MutableList<Map<String, Any>>
        } catch (e: Exception) {
            mutableListOf()
        }

        val existingEntry = formsSentList.find { it["formId"] == formId.toString() }
        if (existingEntry != null) {
            (existingEntry as MutableMap<String, Any>)["status"] = "Completed"
        } else {
            formsSentList.add(mutableMapOf(
                "formId" to formId.toString(),
                "status" to "Completed"
            ))
        }
        shareholder.formsSent = objectMapper.writeValueAsString(formsSentList)
        shareholderRepository.save(shareholder)

        // 3. Generate PDF
        val pdfContent = generatePdf(form, shareholder, request)

        // 4. Send Email
        emailService.sendFormSubmissionReceipt(
            toEmail = shareholder.email!!,
            shareholderName = shareholder.name,
            formTitle = form.title,
            pdfContent = pdfContent
        )
    }

    private fun generatePdf(form: FormEntity, shareholder: dawn.awesomity.uk.backend.shareholders.ShareholderEntity, request: SubmitFormRequest): ByteArray {
        val context = Context()
        context.setVariable("form", form)
        context.setVariable("shareholder", shareholder)
        context.setVariable("responses", request.responses)
        context.setVariable("signatureImage", request.signatureImage)
        
        // Map questions for easier access in template
        val allQuestions = form.sections.flatMap { it.questions }
        val responseMap = allQuestions.associateBy({ it.key }, { q ->
            val value = request.responses[q.key]
            if (q.type == "radio" || q.type == "select") {
                // Find label for value
                val optionsJson = q.options
                if (optionsJson != null) {
                    val options = objectMapper.readValue(optionsJson, List::class.java) as List<Map<String, Any>>
                    options.find { it["value"] == value }?.get("label") ?: value
                } else value
            } else value
        })
        context.setVariable("formattedResponses", responseMap)

        val htmlContent = templateEngine.process("pdf/form_submission_pdf", context)
        
        val os = ByteArrayOutputStream()
        val builder = PdfRendererBuilder()
        builder.useFastMode()
        builder.withHtmlContent(htmlContent, "/")
        builder.toStream(os)
        builder.run()
        
        return os.toByteArray()
    }
}
