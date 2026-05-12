package dawn.awesomity.uk.backend.projects.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class UpdateProjectRequest(
    @field:NotBlank(message = "Project name is required")
    @field:Size(min = 2, max = 150, message = "Project name must be between 2 and 150 characters")
    val name: String
)
