package dawn.awesomity.uk.backend.projects

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ProjectJpaRepository : JpaRepository<ProjectEntity, UUID> {
    fun existsByIdentifier(identifier: String): Boolean
}
