package dawn.awesomity.uk.backend.shareholders

import dawn.awesomity.uk.backend.shareholders.dto.FormSentStatusResponse
import dawn.awesomity.uk.backend.shareholders.dto.ShareholderDropdownResponse
import dawn.awesomity.uk.backend.shareholders.dto.ShareholderResponse
import jooq.tables.references.SHAREHOLDERS
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.springframework.stereotype.Repository
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@Repository
class ShareholderReadRepository(
    private val dsl: DSLContext,
    private val objectMapper: ObjectMapper
) {

    private val FORMS_SENT = field("forms_sent", String::class.java)

    fun findAllByProjectId(projectId: UUID, limit: Int, offset: Int): List<ShareholderResponse> {
        return dsl
            .select(
                SHAREHOLDERS.ID,
                SHAREHOLDERS.NAME,
                SHAREHOLDERS.EMAIL,
                SHAREHOLDERS.NUMBER_OF_SHARES,
                FORMS_SENT
            )
            .from(SHAREHOLDERS)
            .where(SHAREHOLDERS.PROJECT_ID.eq(projectId))
            .orderBy(SHAREHOLDERS.CREATED_AT.desc())
            .limit(limit)
            .offset(offset)
            .fetch { record ->
                val formsSentJson = record[FORMS_SENT] ?: "[]"
                val formsSent = try {
                    val list = objectMapper.readValue(formsSentJson, List::class.java) as List<Map<String, Any>>
                    list.map {
                        FormSentStatusResponse(
                            formId = UUID.fromString(it["formId"] as String),
                            status = it["status"] as String
                        )
                    }
                } catch (e: Exception) {
                    emptyList<FormSentStatusResponse>()
                }

                ShareholderResponse(
                    id = record[SHAREHOLDERS.ID]!!,
                    name = record[SHAREHOLDERS.NAME]!!,
                    email = record[SHAREHOLDERS.EMAIL],
                    numberOfShares = record[SHAREHOLDERS.NUMBER_OF_SHARES]!!,
                    formsSent = formsSent
                )
            }
    }
    
    fun countByProjectId(projectId: UUID): Long {
        return dsl
            .selectCount()
            .from(SHAREHOLDERS)
            .where(SHAREHOLDERS.PROJECT_ID.eq(projectId))
            .fetchOne(0, Long::class.java) ?: 0L
    }

    fun findDropdownByProjectId(projectId: UUID): List<ShareholderDropdownResponse> {
        return dsl
            .select(
                SHAREHOLDERS.ID,
                SHAREHOLDERS.NAME
            )
            .from(SHAREHOLDERS)
            .where(SHAREHOLDERS.PROJECT_ID.eq(projectId))
            .orderBy(SHAREHOLDERS.NAME.asc())
            .fetch { record ->
                ShareholderDropdownResponse(
                    id = record[SHAREHOLDERS.ID]!!,
                    name = record[SHAREHOLDERS.NAME]!!
                )
            }
    }
}
