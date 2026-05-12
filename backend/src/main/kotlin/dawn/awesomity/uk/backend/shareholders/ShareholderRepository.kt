package dawn.awesomity.uk.backend.shareholders

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ShareholderRepository : JpaRepository<ShareholderEntity, UUID> {
    fun findAllByProjectId(projectId: UUID): List<ShareholderEntity>
}
