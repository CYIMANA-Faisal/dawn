package dawn.awesomity.uk.backend.projects.dto

import dawn.awesomity.uk.backend.projects.ProjectStatus
import java.time.LocalDateTime
import java.util.UUID

data class ProjectResponse(
    val id: UUID,
    val identifier: String,
    val name: String,
    val createdByUserId: UUID,
    val createdByName: String?,
    val createdAt: LocalDateTime,
    val status: ProjectStatus
)
