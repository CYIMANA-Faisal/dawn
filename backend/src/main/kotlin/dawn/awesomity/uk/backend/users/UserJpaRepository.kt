package dawn.awesomity.uk.backend.users

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface UserJpaRepository : JpaRepository<UserEntity, UUID> {

    fun findByProviderAndProviderTenantIdAndProviderSubject(
        provider: String,
        providerTenantId: String?,
        providerSubject: String
    ): UserEntity?
}
