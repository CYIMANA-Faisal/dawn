package dawn.awesomity.uk.backend.shareholders.dto

data class PublicShareholderResponse(
    val name: String,
    val email: String?,
    val formsSent: List<FormSentStatusResponse>
)
