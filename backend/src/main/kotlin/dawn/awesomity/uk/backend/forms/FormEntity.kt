package dawn.awesomity.uk.backend.forms

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "forms")
class FormEntity(

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @Column(name = "form_key", nullable = false, length = 100)
    var formKey: String,

    @Column(nullable = false, length = 255)
    var title: String,

    @Column(length = 255)
    var subtitle: String? = null,

    @OneToMany(mappedBy = "form", cascade = [CascadeType.ALL], orphanRemoval = true)
    @OrderBy("position ASC")
    var sections: MutableList<FormSectionEntity> = mutableListOf(),

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    fun addSection(section: FormSectionEntity) {
        sections.add(section)
        section.form = this
    }
}
