package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class NotFoundException(message: String) : ApiException(HttpStatus.NOT_FOUND, message)
