package dawn.awesomity.uk.backend.mail

import jakarta.mail.internet.MimeMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context

@Service
class EmailService(
    private val mailSender: JavaMailSender,
    private val templateEngine: TemplateEngine
) {

    @Async
    fun sendFormInvitation(
        toEmail: String,
        shareholderName: String,
        formTitle: String,
        projectName: String,
        formLink: String
    ) {
        try {
            val context = Context()
            context.setVariable("shareholderName", shareholderName)
            context.setVariable("formTitle", formTitle)
            context.setVariable("projectName", projectName)
            context.setVariable("formLink", formLink)

            val process = templateEngine.process("form_invitation", context)

            val mimeMessage: MimeMessage = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(mimeMessage, true, "UTF-8")
            
            helper.setTo(toEmail)
            helper.setSubject("Action Required: $formTitle")
            helper.setText(process, true) // true indicates HTML content

            mailSender.send(mimeMessage)
            println("Successfully sent form invitation to $toEmail")
            
        } catch (e: Exception) {
            println("Failed to send form invitation to $toEmail. Error: ${e.message}")
        }
    }

    @Async
    fun sendFormSubmissionReceipt(
        toEmail: String,
        shareholderName: String,
        formTitle: String,
        pdfContent: ByteArray
    ) {
        try {
            val context = Context()
            context.setVariable("shareholderName", shareholderName)
            context.setVariable("formTitle", formTitle)

            val process = templateEngine.process("form_submission_receipt_email", context)

            val mimeMessage: MimeMessage = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(mimeMessage, true, "UTF-8")
            
            helper.setTo(toEmail)
            helper.setSubject("Copy of your signed form: $formTitle")
            helper.setText(process, true)
            
            // Add attachment
            helper.addAttachment("${formTitle.replace(" ", "_")}_signed.pdf", { 
                java.io.ByteArrayInputStream(pdfContent) 
            })

            mailSender.send(mimeMessage)
            println("Successfully sent submission receipt to $toEmail")
            
        } catch (e: Exception) {
            println("Failed to send submission receipt to $toEmail. Error: ${e.message}")
        }
    }
}
