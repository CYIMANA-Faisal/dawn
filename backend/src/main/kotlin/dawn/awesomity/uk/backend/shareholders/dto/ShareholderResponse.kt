package dawn.awesomity.uk.backend.shareholders.dto

import java.util.UUID

data class ShareholderResponse(
    val id: UUID,
    val name: String,
    val email: String?,
    val numberOfShares: Long,
    val formsSent: List<FormSentStatusResponse>
)

data class FormSentStatusResponse(
    val formId: UUID,
    val status: String
)
