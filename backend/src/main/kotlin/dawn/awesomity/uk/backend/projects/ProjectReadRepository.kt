package dawn.awesomity.uk.backend.projects

import dawn.awesomity.uk.backend.projects.dto.ProjectResponse
import jooq.tables.references.PROJECTS
import jooq.tables.references.USERS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ProjectReadRepository(
    private val dsl: DSLContext
) {

    fun findAll(): List<ProjectResponse> {
        return dsl
            .select(
                PROJECTS.ID,
                PROJECTS.IDENTIFIER,
                PROJECTS.NAME,
                PROJECTS.CREATED_BY_USER_ID,
                USERS.FULL_NAME,
                PROJECTS.CREATED_AT,
                PROJECTS.STATUS
            )
            .from(PROJECTS)
            .leftJoin(USERS)
            .on(PROJECTS.CREATED_BY_USER_ID.eq(USERS.ID))
            .orderBy(PROJECTS.CREATED_AT.desc())
            .fetch { record ->
                ProjectResponse(
                    id = record[PROJECTS.ID]!!,
                    identifier = record[PROJECTS.IDENTIFIER]!!,
                    name = record[PROJECTS.NAME]!!,
                    createdByUserId = record[PROJECTS.CREATED_BY_USER_ID]!!,
                    createdByName = record[USERS.FULL_NAME],
                    createdAt = record[PROJECTS.CREATED_AT]!!,
                    status = ProjectStatus.valueOf(record[PROJECTS.STATUS]!!)
                )
            }
    }

    fun findById(id: UUID): ProjectResponse? {
        return dsl
            .select(
                PROJECTS.ID,
                PROJECTS.IDENTIFIER,
                PROJECTS.NAME,
                PROJECTS.CREATED_BY_USER_ID,
                USERS.FULL_NAME,
                PROJECTS.CREATED_AT,
                PROJECTS.STATUS
            )
            .from(PROJECTS)
            .leftJoin(USERS)
            .on(PROJECTS.CREATED_BY_USER_ID.eq(USERS.ID))
            .where(PROJECTS.ID.eq(id))
            .fetchOne { record ->
                ProjectResponse(
                    id = record[PROJECTS.ID]!!,
                    identifier = record[PROJECTS.IDENTIFIER]!!,
                    name = record[PROJECTS.NAME]!!,
                    createdByUserId = record[PROJECTS.CREATED_BY_USER_ID]!!,
                    createdByName = record[USERS.FULL_NAME],
                    createdAt = record[PROJECTS.CREATED_AT]!!,
                    status = ProjectStatus.valueOf(record[PROJECTS.STATUS]!!)
                )
            }
    }
}
