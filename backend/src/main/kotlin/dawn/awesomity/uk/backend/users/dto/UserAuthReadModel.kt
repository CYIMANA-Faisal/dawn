package dawn.awesomity.uk.backend.users.dto

import java.util.UUID

data class UserAuthReadModel(
    val id: UUID,
    val email: String,
    val fullName: String?,
    val enabled: Boolean,
    val roles: List<String>
)
