package dawn.awesomity.uk.backend.forms

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "form_submissions")
class FormSubmissionEntity(
    @Id
    @GeneratedValue
    var id: UUID? = null,

    @Column(name = "form_id", nullable = false)
    var formId: UUID,

    @Column(name = "shareholder_id", nullable = false)
    var shareholderId: UUID,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "responses", columnDefinition = "jsonb", nullable = false)
    var responses: String,

    @Column(name = "signature_image", columnDefinition = "TEXT")
    var signatureImage: String? = null,

    @Column(name = "submitted_at", nullable = false)
    var submittedAt: LocalDateTime = LocalDateTime.now()
)
