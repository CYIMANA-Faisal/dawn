package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class InternalServerException(message: String) : ApiException(HttpStatus.INTERNAL_SERVER_ERROR, message)
