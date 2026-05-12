package dawn.awesomity.uk.backend.users

import dawn.awesomity.uk.backend.users.dto.UserAuthReadModel
import jooq.tables.references.USER_ROLES
import jooq.tables.references.USERS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class UserReadRepository(
    private val dsl: DSLContext
) {

    fun findUserByMicrosoftIdentity(tenantId: String?, subject: String): UserAuthReadModel? {
        val userRecord = dsl
            .select(USERS.ID, USERS.EMAIL, USERS.FULL_NAME, USERS.ENABLED)
            .from(USERS)
            .where(USERS.PROVIDER.eq("MICROSOFT"))
            .and(USERS.PROVIDER_TENANT_ID.eq(tenantId))
            .and(USERS.PROVIDER_SUBJECT.eq(subject))
            .fetchOne()
            ?: return null

        val roles = dsl
            .select(USER_ROLES.ROLE)
            .from(USER_ROLES)
            .where(USER_ROLES.USER_ID.eq(userRecord[USERS.ID]))
            .fetchInto(String::class.java)

        return UserAuthReadModel(
            id = userRecord[USERS.ID]!!,
            email = userRecord[USERS.EMAIL]!!,
            fullName = userRecord[USERS.FULL_NAME],
            enabled = userRecord[USERS.ENABLED]!!,
            roles = roles
        )
    }

    fun findById(userId: UUID): UserAuthReadModel? {
        val userRecord = dsl
            .select(USERS.ID, USERS.EMAIL, USERS.FULL_NAME, USERS.ENABLED)
            .from(USERS)
            .where(USERS.ID.eq(userId))
            .fetchOne()
            ?: return null

        val roles = dsl
            .select(USER_ROLES.ROLE)
            .from(USER_ROLES)
            .where(USER_ROLES.USER_ID.eq(userId))
            .fetchInto(String::class.java)

        return UserAuthReadModel(
            id = userRecord[USERS.ID]!!,
            email = userRecord[USERS.EMAIL]!!,
            fullName = userRecord[USERS.FULL_NAME],
            enabled = userRecord[USERS.ENABLED]!!,
            roles = roles
        )
    }
}
