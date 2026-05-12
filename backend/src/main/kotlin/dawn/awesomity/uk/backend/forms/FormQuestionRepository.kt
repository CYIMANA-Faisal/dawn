package dawn.awesomity.uk.backend.forms

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface FormQuestionRepository : JpaRepository<FormQuestionEntity, UUID>
