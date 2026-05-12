package dawn.awesomity.uk.backend.users

import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(
    name = "users",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_users_provider_identity",
            columnNames = ["provider", "provider_tenant_id", "provider_subject"]
        )
    ]
)
class UserEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false)
    var provider: String = "MICROSOFT",

    @Column(name = "provider_subject", nullable = false)
    var providerSubject: String,

    @Column(name = "provider_tenant_id")
    var providerTenantId: String? = null,

    @Column(nullable = false)
    var email: String,

    @Column(name = "full_name")
    var fullName: String? = null,

    @Column(nullable = false)
    var enabled: Boolean = true,

    @Column(name = "last_login_at")
    var lastLoginAt: LocalDateTime? = null,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "user_roles",
        joinColumns = [JoinColumn(name = "user_id")]
    )
    @Column(name = "role")
    var roles: MutableSet<String> = mutableSetOf(UserRole.STANDARD.name)
)
