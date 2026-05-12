package dawn.awesomity.uk.backend.auth

import dawn.awesomity.uk.backend.auth.dto.AuthResponse
import dawn.awesomity.uk.backend.auth.dto.AuthUserResponse
import dawn.awesomity.uk.backend.auth.dto.MicrosoftLoginRequest
import dawn.awesomity.uk.backend.common.exception.BadRequestException
import dawn.awesomity.uk.backend.common.exception.ForbiddenException
import dawn.awesomity.uk.backend.users.UserService
import org.springframework.stereotype.Service

@Service
class MicrosoftAuthService(
    private val microsoftTokenValidator: MicrosoftTokenValidator,
    private val userService: UserService,
    private val jwtService: JwtService
) {

    fun login(request: MicrosoftLoginRequest): AuthResponse {
        val claims = microsoftTokenValidator.validate(request.token)

        val tenantId = claims["tid"] as String?
        val subject = (claims["oid"] as String?)
            ?: (claims["sub"] as String?)
            ?: throw BadRequestException("Microsoft token missing subject claim")

        val email = (claims["email"] as String?)
            ?: (claims["preferred_username"] as String?)
            ?: throw BadRequestException("Microsoft token does not contain email")

        val fullName = claims["name"] as String?

        val existingUser = userService.findByMicrosoftIdentity(tenantId, subject)

        if (existingUser == null) {
            userService.createMicrosoftUser(
                tenantId = tenantId,
                subject = subject,
                email = email,
                fullName = fullName
            )
        } else {
            if (!existingUser.enabled) {
                throw ForbiddenException("User account is disabled")
            }
            userService.updateLastLogin(existingUser.id)
        }

        val user = userService.findByMicrosoftIdentity(tenantId, subject)
            ?: throw IllegalStateException("User not found after login")

        return AuthResponse(
            appAccessToken = jwtService.generateAccessToken(user),
            user = AuthUserResponse(
                id = user.id,
                email = user.email,
                fullName = user.fullName,
                roles = user.roles
            )
        )
    }
}
