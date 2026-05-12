package dawn.awesomity.uk.backend.common.response

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class GenericApiResponse<T>(
    val success: Boolean = true,
    val message: String,
    val data: T? = null,
    val errors: Any? = null
) {
    companion object {
        fun <T> success(
            message: String,
            data: T? = null
        ): GenericApiResponse<T> {
            return GenericApiResponse(
                success = true,
                message = message,
                data = data
            )
        }

        fun failure(
            message: String,
            errors: Any? = null
        ): GenericApiResponse<Nothing> {
            return GenericApiResponse(
                success = false,
                message = message,
                errors = errors
            )
        }
    }
}
