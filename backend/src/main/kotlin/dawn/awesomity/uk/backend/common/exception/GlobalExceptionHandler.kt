package dawn.awesomity.uk.backend.common.exception

import dawn.awesomity.uk.backend.common.response.GenericErrorResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.validation.FieldError
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.NoHandlerFoundException

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ApiException::class)
    fun handleApiException(
        ex: ApiException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = ex.status,
            message = ex.message,
            request = request
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        val errors = ex.bindingResult.allErrors.associate { error ->
            val fieldName = (error as? FieldError)?.field ?: error.objectName
            fieldName to (error.defaultMessage ?: "Invalid value")
        }

        return buildErrorResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Validation failed",
            request = request,
            validationErrors = errors
        )
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolationException(
        ex: ConstraintViolationException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        val errors = ex.constraintViolations.associate {
            it.propertyPath.toString() to it.message
        }

        return buildErrorResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Constraint violation",
            request = request,
            validationErrors = errors
        )
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleInvalidJson(
        ex: HttpMessageNotReadableException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Malformed JSON request",
            request = request
        )
    }

    @ExceptionHandler(MissingServletRequestParameterException::class)
    fun handleMissingParameter(
        ex: MissingServletRequestParameterException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Missing request parameter: ${ex.parameterName}",
            request = request
        )
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleTypeMismatch(
        ex: MethodArgumentTypeMismatchException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = HttpStatus.BAD_REQUEST,
            message = "Invalid value for parameter: ${ex.name}",
            request = request
        )
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotSupported(
        ex: HttpRequestMethodNotSupportedException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = HttpStatus.METHOD_NOT_ALLOWED,
            message = ex.message ?: "HTTP method not allowed",
            request = request
        )
    }

    @ExceptionHandler(NoHandlerFoundException::class)
    fun handleNoHandlerFound(
        ex: NoHandlerFoundException,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = HttpStatus.NOT_FOUND,
            message = "Resource not found",
            request = request
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnhandledException(
        ex: Exception,
        request: HttpServletRequest
    ): ResponseEntity<GenericErrorResponse> {
        return buildErrorResponse(
            status = HttpStatus.INTERNAL_SERVER_ERROR,
            message = "Unexpected server error",
            request = request
        )
    }

    private fun buildErrorResponse(
        status: HttpStatus,
        message: String,
        request: HttpServletRequest,
        validationErrors: Map<String, String>? = null
    ): ResponseEntity<GenericErrorResponse> {
        val response = GenericErrorResponse(
            status = status.value(),
            error = status.reasonPhrase,
            message = message,
            path = request.requestURI,
            validationErrors = validationErrors
        )

        return ResponseEntity.status(status).body(response)
    }
}
