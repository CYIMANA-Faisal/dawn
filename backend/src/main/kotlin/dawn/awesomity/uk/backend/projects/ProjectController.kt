package dawn.awesomity.uk.backend.projects

import dawn.awesomity.uk.backend.projects.dto.CreateProjectRequest
import dawn.awesomity.uk.backend.projects.dto.ProjectResponse
import dawn.awesomity.uk.backend.projects.dto.UpdateProjectRequest
import dawn.awesomity.uk.backend.forms.FormStatisticsService
import dawn.awesomity.uk.backend.forms.dto.FormStatisticsResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/projects")
class ProjectController(
    private val projectService: ProjectService,
    private val formStatisticsService: FormStatisticsService
) {

    @GetMapping("/{projectId}/forms/{formId}/statistics")
    fun getStatistics(
        @PathVariable projectId: UUID,
        @PathVariable formId: UUID,
        @RequestParam(defaultValue = "headcount") basis: String
    ): FormStatisticsResponse {
        return formStatisticsService.getStatistics(projectId, formId, basis)
    }

    @GetMapping
    fun findAll(): List<ProjectResponse> {
        return projectService.findAll()
    }

    @GetMapping("/{id}")
    fun findById(@PathVariable id: UUID): ProjectResponse {
        return projectService.findById(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @Valid @RequestBody request: CreateProjectRequest,
        authentication: Authentication
    ): ProjectResponse {
        val userId = UUID.fromString(authentication.name)
        return projectService.create(request, userId)
    }

    @PatchMapping("/{id}")
    fun updateName(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateProjectRequest
    ): ProjectResponse {
        return projectService.updateName(id, request)
    }

    @PatchMapping("/{id}/archive")
    fun archive(@PathVariable id: UUID): ProjectResponse {
        return projectService.archive(id)
    }
}
