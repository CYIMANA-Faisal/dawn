package dawn.awesomity.uk.backend.projects

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "projects")
class ProjectEntity(

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @Column(nullable = false, unique = true, length = 50)
    var identifier: String,

    @Column(nullable = false, length = 150)
    var name: String,

    @Column(name = "created_by_user_id", nullable = false)
    var createdByUserId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var status: ProjectStatus = ProjectStatus.ACTIVE,

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "archived_at")
    var archivedAt: LocalDateTime? = null
)
