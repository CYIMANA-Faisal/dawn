package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class UnauthorizedException(message: String) : ApiException(HttpStatus.UNAUTHORIZED, message)
