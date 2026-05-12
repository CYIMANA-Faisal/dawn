# Spring Boot Kotlin Backend Setup Plan

## 1. Goal

Configure the backend foundation with:

- Kotlin Spring Boot
- PostgreSQL
- Flyway migrations
- jOOQ Kotlin class generation
- Generated jOOQ classes committed to repo
- Application YAML configuration
- Shared common package
- Generic API response wrapper
- Generic error response wrapper
- Global exception handling
- Initial Spring Modulith event publication table

Do not add request tracing, request ID, MDC, correlation ID, or OpenTelemetry yet.

---

## 2. Package Structure

Use this base package:

```text
dawn.awesomity.uk.backend
````

Shared code must go under:

```text
src/main/kotlin/dawn/awesomity/uk/backend/common
```

Target structure:

```text
src/main/kotlin/dawn/awesomity/uk/backend
├── Application.kt
├── common
│   ├── response
│   │   ├── GenericApiResponse.kt
│   │   └── GenericErrorResponse.kt
│   └── exception
│       ├── ApiException.kt
│       ├── BadRequestException.kt
│       ├── UnauthorizedException.kt
│       ├── ForbiddenException.kt
│       ├── NotFoundException.kt
│       ├── ConflictException.kt
│       ├── InternalServerException.kt
│       └── GlobalExceptionHandler.kt
└── jooq
    └── generated
```

Generated jOOQ package:

```kotlin
dawn.awesomity.uk.backend.jooq.generated
```

---

## 3. Flyway Initial Migration

Create this file:

```text
src/main/resources/db/migration/V20260504202557__init.sql
```

Add:

```sql
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

CREATE TABLE IF NOT EXISTS event_publication
(
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    listener_id            TEXT NOT NULL,
    event_type             TEXT NOT NULL,
    serialized_event       TEXT NOT NULL,
    publication_date       TIMESTAMP WITH TIME ZONE NOT NULL,
    completion_date        TIMESTAMP WITH TIME ZONE,
    status                 TEXT,
    completion_attempts    INT,
    last_resubmission_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS event_publication_serialized_event_hash_idx
    ON event_publication USING hash (serialized_event);

CREATE INDEX IF NOT EXISTS event_publication_by_completion_date_idx
    ON event_publication (completion_date);
```

Important:

If `pg_uuidv7` is not installed on the PostgreSQL server, this migration will fail.

Fallback option:

```sql
id UUID PRIMARY KEY
```

Then UUID v7 can be generated from the application layer later.

---

## 4. jOOQ Generation Configuration

Do not rewrite the full Gradle configuration.

Only add or update the jOOQ generation configuration in `build.gradle.kts`.

```kotlin
jooq {
    configurations {
        create("main") {
            generateSchemaSourceOnCompilation.set(false)

            jooqConfiguration.apply {
                logging = org.jooq.meta.jaxb.Logging.WARN

                generator = org.jooq.meta.jaxb.Generator()
                    .withName("org.jooq.codegen.KotlinGenerator")
                    .withDatabase(
                        org.jooq.meta.jaxb.Database()
                            .withName("org.jooq.meta.extensions.ddl.DDLDatabase")
                            .withProperties(
                                org.jooq.meta.jaxb.Property()
                                    .withKey("scripts")
                                    .withValue("src/main/resources/db/migration/*.sql"),
                                org.jooq.meta.jaxb.Property()
                                    .withKey("sort")
                                    .withValue("flyway"),
                                org.jooq.meta.jaxb.Property()
                                    .withKey("defaultNameCase")
                                    .withValue("lower")
                            )
                    )
                    .withGenerate(
                        org.jooq.meta.jaxb.Generate()
                            .withKotlinNotNullPojoAttributes(true)
                            .withKotlinNotNullRecordAttributes(true)
                            .withKotlinNotNullInterfaceAttributes(true)
                            .withRecords(true)
                            .withPojos(false)
                            .withDaos(false)
                            .withFluentSetters(true)
                    )
                    .withTarget(
                        org.jooq.meta.jaxb.Target()
                            .withPackageName("dawn.awesomity.uk.backend.jooq.generated")
                            .withDirectory("src/main/kotlin")
                    )
            }
        }
    }
}
```

Generate jOOQ classes manually:

```bash
./gradlew generateJooq
```

Commit generated classes:

```bash
git add src/main/kotlin/dawn/awesomity/uk/backend/jooq/generated
git commit -m "Generate jOOQ classes from Flyway migrations"
```

Generated classes must not be added to `.gitignore`.

---

## 5. application.yml

Create or update:

```text
src/main/resources/application.yml
```

Use:

```yaml
server:
  port: ${SERVER_PORT:8080}

spring:
  application:
    name: uk-backend

  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/uk_backend}
    username: ${DATABASE_USERNAME:postgres}
    password: ${DATABASE_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: ${DB_POOL_MAX_SIZE:10}
      minimum-idle: ${DB_POOL_MIN_IDLE:2}
      connection-timeout: ${DB_CONNECTION_TIMEOUT:30000}
      idle-timeout: ${DB_IDLE_TIMEOUT:600000}
      max-lifetime: ${DB_MAX_LIFETIME:1800000}

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    validate-on-migrate: true
    clean-disabled: true

  jooq:
    sql-dialect: postgres

  mail:
    host: ${MAIL_HOST:smtp.gmail.com}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
          connectiontimeout: 5000
          timeout: 5000
          writetimeout: 5000

  mvc:
    throw-exception-if-no-handler-found: true

  web:
    resources:
      add-mappings: false

springdoc:
  api-docs:
    enabled: true
    path: /v3/api-docs
  swagger-ui:
    enabled: true
    path: /swagger-ui.html
    operations-sorter: method
    tags-sorter: alpha

logging:
  level:
    root: INFO
    dawn.awesomity.uk.backend: DEBUG
    org.jooq.tools.LoggerListener: DEBUG
```

---

## 6. Generic API Response

Create:

```text
src/main/kotlin/dawn/awesomity/uk/backend/common/response/GenericApiResponse.kt
```

```kotlin
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
```

---

## 7. Generic Error Response

Create:

```text
src/main/kotlin/dawn/awesomity/uk/backend/common/response/GenericErrorResponse.kt
```

```kotlin
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
```

---

## 8. API Exception Base Class

Create:

```text
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/ApiException.kt
```

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

open class ApiException(
    val status: HttpStatus,
    override val message: String
) : RuntimeException(message)
```

---

## 9. Custom HTTP Exceptions

Create individual files:

```text
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/BadRequestException.kt
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/UnauthorizedException.kt
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/ForbiddenException.kt
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/NotFoundException.kt
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/ConflictException.kt
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/InternalServerException.kt
```

Content:

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class BadRequestException(message: String) : ApiException(HttpStatus.BAD_REQUEST, message)
```

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class UnauthorizedException(message: String) : ApiException(HttpStatus.UNAUTHORIZED, message)
```

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class ForbiddenException(message: String) : ApiException(HttpStatus.FORBIDDEN, message)
```

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class NotFoundException(message: String) : ApiException(HttpStatus.NOT_FOUND, message)
```

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class ConflictException(message: String) : ApiException(HttpStatus.CONFLICT, message)
```

```kotlin
package dawn.awesomity.uk.backend.common.exception

import org.springframework.http.HttpStatus

class InternalServerException(message: String) : ApiException(HttpStatus.INTERNAL_SERVER_ERROR, message)
```

---

## 10. Global Exception Handler

Create:

```text
src/main/kotlin/dawn/awesomity/uk/backend/common/exception/GlobalExceptionHandler.kt
```

```kotlin
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
```

---

## 11. Example Health Controller

Create:

```text
src/main/kotlin/dawn/awesomity/uk/backend/health/HealthController.kt
```

```kotlin
package dawn.awesomity.uk.backend.health

import dawn.awesomity.uk.backend.common.response.GenericApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/health")
class HealthController {

    @GetMapping
    fun health(): GenericApiResponse<Map<String, String>> {
        return GenericApiResponse.success(
            message = "Application is running",
            data = mapOf("status" to "UP")
        )
    }
}
```

---

## 12. Validation Checklist

Run:

```bash
./gradlew clean build
```

Run the application:

```bash
./gradlew bootRun
```

Generate jOOQ classes:

```bash
./gradlew generateJooq
```

Test health endpoint:

```bash
curl http://localhost:8080/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "message": "Application is running",
  "data": {
    "status": "UP"
  }
}
```

Test unknown endpoint:

```bash
curl http://localhost:8080/api/v1/unknown
```

Expected response:

```json
{
  "success": false,
  "status": 404,
  "error": "Not Found",
  "message": "Resource not found",
  "path": "/api/v1/unknown",
  "timestamp": "..."
}
```

---

## 13. Final Requirements

Codex must ensure that:

* `V20260504202557__init.sql` exists.
* Spring Modulith `event_publication` table is created.
* The table uses UUID v7 if PostgreSQL supports `pg_uuidv7`.
* jOOQ generation reads from Flyway migration files.
* Generated jOOQ classes are Kotlin classes.
* Generated jOOQ classes are committed to the repo.
* Shared code is under `dawn.awesomity.uk.backend.common`.
* Every controller can use `GenericApiResponse`.
* Global exceptions use `GenericErrorResponse`.
* `application.yml` includes:

  * datasource
  * Flyway
  * jOOQ
  * OpenAPI
  * Java Mail
* Do not add request tracing yet.

