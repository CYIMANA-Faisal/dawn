package dawn.awesomity.uk.backend.common.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

@JsonInclude(JsonInclude.Include.NON_NULL)
data class GenericErrorResponse(
    val success: Boolean = false,
    val status: Int,
    val error: String,
    val message: String,
    val path: String? = null,
    val validationErrors: Map<String, String>? = null,
    val timestamp: Instant = Instant.now()
)
