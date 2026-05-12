package dawn.awesomity.uk.backend.auth.dto

data class AuthResponse(
    val appAccessToken: String,
    val user: AuthUserResponse
)
