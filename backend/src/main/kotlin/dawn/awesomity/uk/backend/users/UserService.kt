package dawn.awesomity.uk.backend.users

import dawn.awesomity.uk.backend.users.dto.UserAuthReadModel
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.util.UUID

@Service
class UserService(
    private val userJpaRepository: UserJpaRepository,
    private val userReadRepository: UserReadRepository
) {

    @Transactional
    fun createMicrosoftUser(
        tenantId: String?,
        subject: String,
        email: String,
        fullName: String?
    ): UserEntity {
        return userJpaRepository.save(
            UserEntity(
                provider = "MICROSOFT",
                providerTenantId = tenantId,
                providerSubject = subject,
                email = email,
                fullName = fullName,
                enabled = true,
                lastLoginAt = LocalDateTime.now(),
                roles = mutableSetOf(UserRole.STANDARD.name)
            )
        )
    }

    @Transactional
    fun updateLastLogin(userId: UUID) {
        val user = userJpaRepository.findById(userId)
            .orElseThrow { IllegalArgumentException("User not found: $userId") }
        user.lastLoginAt = LocalDateTime.now()
        userJpaRepository.save(user)
    }

    fun findByMicrosoftIdentity(tenantId: String?, subject: String): UserAuthReadModel? =
        userReadRepository.findUserByMicrosoftIdentity(tenantId, subject)

    fun findById(userId: UUID): UserAuthReadModel? =
        userReadRepository.findById(userId)
}
