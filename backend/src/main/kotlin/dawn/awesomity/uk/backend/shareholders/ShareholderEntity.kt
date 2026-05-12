package dawn.awesomity.uk.backend.shareholders

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "shareholders")
class ShareholderEntity(

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @Column(name = "project_id", nullable = false)
    var projectId: UUID,

    @Column(nullable = false, length = 255)
    var name: String,

    @Column(length = 255)
    var email: String? = null,

    @Column(name = "number_of_shares", nullable = false)
    var numberOfShares: Long,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "forms_sent", columnDefinition = "jsonb")
    var formsSent: String = "[]",

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
