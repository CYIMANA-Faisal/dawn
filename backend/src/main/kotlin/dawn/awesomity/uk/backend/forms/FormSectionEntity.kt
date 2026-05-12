package dawn.awesomity.uk.backend.forms

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "form_sections")
class FormSectionEntity(

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    var form: FormEntity? = null,

    @Column(name = "section_key", nullable = false, length = 100)
    var key: String,

    @Column(length = 255)
    var title: String? = null,

    @Column(nullable = false)
    var position: Int = 0,

    @OneToMany(mappedBy = "section", cascade = [CascadeType.ALL], orphanRemoval = true)
    @OrderBy("position ASC")
    var questions: MutableList<FormQuestionEntity> = mutableListOf(),

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    fun addQuestion(question: FormQuestionEntity) {
        questions.add(question)
        question.section = this
    }
}
