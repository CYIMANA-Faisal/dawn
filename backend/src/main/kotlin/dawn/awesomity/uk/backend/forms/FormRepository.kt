package dawn.awesomity.uk.backend.forms

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface FormRepository : JpaRepository<FormEntity, UUID> {
    fun existsByTitle(title: String): Boolean
    fun existsByFormKey(formKey: String): Boolean
}
