package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class ConflictException(message: String) : ApiException(HttpStatus.CONFLICT, message)
