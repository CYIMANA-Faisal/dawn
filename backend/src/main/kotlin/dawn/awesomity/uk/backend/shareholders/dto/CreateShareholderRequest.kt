package dawn.awesomity.uk.backend.shareholders.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Email

data class CreateShareholderRequest(
    @field:NotBlank(message = "Name is required")
    val name: String,

    @field:Email(message = "Email must be a valid email address")
    val email: String? = null,

    @field:Min(value = 1, message = "Number of shares must be greater than 0")
    val numberOfShares: Long
)
