package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

open class ApiException(
    val status: HttpStatus,
    override val message: String
) : RuntimeException(message)
