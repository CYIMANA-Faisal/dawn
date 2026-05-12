package dawn.awesomity.uk.backend.forms

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "form_questions")
class FormQuestionEntity(

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    var section: FormSectionEntity? = null,

    @Column(name = "parent_question_id")
    var parentQuestionId: UUID? = null,

    @Column(name = "key", nullable = false, length = 100)
    var key: String,

    @Column(nullable = false, length = 50)
    var type: String,

    @Column(columnDefinition = "TEXT")
    var label: String? = null,

    @Column(columnDefinition = "TEXT")
    var tooltip: String? = null,

    @Column(name = "is_required", nullable = false)
    var isRequired: Boolean = false,

    @Column(name = "is_readonly", nullable = false)
    var isReadonly: Boolean = false,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    var options: String? = null,

    @Column(name = "default_value", length = 255)
    var defaultValue: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_default_value", columnDefinition = "jsonb")
    var dynamicDefaultValue: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "visible_when", columnDefinition = "jsonb")
    var visibleWhen: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_when", columnDefinition = "jsonb")
    var requiredWhen: String? = null,

    @Column(name = "clear_when_hidden", nullable = false)
    var clearWhenHidden: Boolean = false,

    @Column(name = "prefill_from", columnDefinition = "TEXT")
    var prefillFrom: String? = null,

    @Column(name = "default_from", columnDefinition = "TEXT")
    var defaultFrom: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "templates", columnDefinition = "jsonb")
    var templates: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_text", columnDefinition = "jsonb")
    var dynamicText: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_options", columnDefinition = "jsonb")
    var dynamicOptions: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    var validationRules: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", columnDefinition = "jsonb")
    var config: String? = null,

    @Column(nullable = false)
    var position: Int = 0,

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
