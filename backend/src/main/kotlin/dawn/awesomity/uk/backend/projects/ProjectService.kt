package dawn.awesomity.uk.backend.projects

import dawn.awesomity.uk.backend.projects.dto.CreateProjectRequest
import dawn.awesomity.uk.backend.projects.dto.ProjectResponse
import dawn.awesomity.uk.backend.projects.dto.UpdateProjectRequest
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.util.UUID

@Service
class ProjectService(
    private val projectJpaRepository: ProjectJpaRepository,
    private val projectReadRepository: ProjectReadRepository,
    private val identifierGenerator: ProjectIdentifierGenerator
) {

    fun findAll(): List<ProjectResponse> {
        return projectReadRepository.findAll()
    }

    fun findById(id: UUID): ProjectResponse {
        return projectReadRepository.findById(id)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
    }

    @Transactional
    fun create(request: CreateProjectRequest, authenticatedUserId: UUID): ProjectResponse {
        val identifier = generateUniqueIdentifier()

        val project = projectJpaRepository.saveAndFlush(
            ProjectEntity(
                identifier = identifier,
                name = request.name.trim(),
                createdByUserId = authenticatedUserId,
                status = ProjectStatus.ACTIVE,
                createdAt = LocalDateTime.now(),
                updatedAt = LocalDateTime.now()
            )
        )

        return findById(project.id!!)
    }

    @Transactional
    fun updateName(id: UUID, request: UpdateProjectRequest): ProjectResponse {
        val project = projectJpaRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
            }

        if (project.status == ProjectStatus.ARCHIVED) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Archived projects cannot be edited")
        }

        project.name = request.name.trim()
        project.updatedAt = LocalDateTime.now()

        projectJpaRepository.save(project)

        return findById(id)
    }

    @Transactional
    fun archive(id: UUID): ProjectResponse {
        val project = projectJpaRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
            }

        if (project.status == ProjectStatus.ARCHIVED) {
            return findById(id)
        }

        project.status = ProjectStatus.ARCHIVED
        project.archivedAt = LocalDateTime.now()
        project.updatedAt = LocalDateTime.now()

        projectJpaRepository.save(project)

        return findById(id)
    }

    private fun generateUniqueIdentifier(): String {
        repeat(5) {
            val identifier = identifierGenerator.generate()
            if (!projectJpaRepository.existsByIdentifier(identifier)) {
                return identifier
            }
        }

        throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate unique project identifier")
    }
}
