package dawn.awesomity.uk.backend.auth.dto

import java.util.UUID

data class AuthUserResponse(
    val id: UUID,
    val email: String,
    val fullName: String?,
    val roles: List<String>
)
