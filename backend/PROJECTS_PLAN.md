````md
# Backend Plan: Projects Feature

## Paths

```text
Feature package:
dawn/awesomity/uk/backend/projects

Migration file:
db/migration/V20260505115010__create_projects_table.sql
````

## Requirements

Projects must:

* Have a name/company name
* Have a system-generated unique identifier
* Track the authenticated user who created the project
* Track the creation timestamp
* Allow project name edits
* Allow archiving
* Never be deleted

Persistence rule:

```text
Read queries  → jOOQ
Write queries → JPA
```

---

# 1. Backend Endpoints

Implement:

```http
GET    /projects
GET    /projects/{id}
POST   /projects
PATCH  /projects/{id}
PATCH  /projects/{id}/archive
```

Do not implement:

```http
DELETE /projects/{id}
```

---

# 2. Migration

Create:

```text
src/main/resources/db/migration/V20260505115010__create_projects_table.sql
```

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    identifier VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,

    created_by_user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,

    CONSTRAINT fk_projects_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id),

    CONSTRAINT chk_projects_status
        CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX idx_projects_identifier ON projects(identifier);
CREATE INDEX idx_projects_created_by_user_id ON projects(created_by_user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

---

# 3. Package Structure

Create:

```text
dawn/awesomity/uk/backend/projects/
  ProjectEntity.kt
  ProjectStatus.kt
  ProjectJpaRepository.kt
  ProjectReadRepository.kt
  ProjectService.kt
  ProjectController.kt
  ProjectIdentifierGenerator.kt

dawn/awesomity/uk/backend/projects/dto/
  CreateProjectRequest.kt
  UpdateProjectRequest.kt
  ProjectResponse.kt
```

---

# 4. Project Status Enum

```kotlin
package dawn.awesomity.uk.backend.projects

enum class ProjectStatus {
    ACTIVE,
    ARCHIVED
}
```

---

# 5. JPA Entity for Writes

```kotlin
package dawn.awesomity.uk.backend.projects

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "projects")
class ProjectEntity(

    @Id
    @GeneratedValue
    var id: UUID? = null,

    @Column(nullable = false, unique = true, length = 50)
    var identifier: String,

    @Column(nullable = false, length = 150)
    var name: String,

    @Column(name = "created_by_user_id", nullable = false)
    var createdByUserId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var status: ProjectStatus = ProjectStatus.ACTIVE,

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "archived_at")
    var archivedAt: LocalDateTime? = null
)
```

---

# 6. JPA Repository for Writes

```kotlin
package dawn.awesomity.uk.backend.projects

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ProjectJpaRepository : JpaRepository<ProjectEntity, UUID> {
    fun existsByIdentifier(identifier: String): Boolean
}
```

Use JPA for:

```text
create project
update project name
archive project
```

---

# 7. DTOs

## CreateProjectRequest

```kotlin
package dawn.awesomity.uk.backend.projects.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CreateProjectRequest(
    @field:NotBlank(message = "Project name is required")
    @field:Size(min = 2, max = 150, message = "Project name must be between 2 and 150 characters")
    val name: String
)
```

## UpdateProjectRequest

```kotlin
package dawn.awesomity.uk.backend.projects.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class UpdateProjectRequest(
    @field:NotBlank(message = "Project name is required")
    @field:Size(min = 2, max = 150, message = "Project name must be between 2 and 150 characters")
    val name: String
)
```

## ProjectResponse

```kotlin
package dawn.awesomity.uk.backend.projects.dto

import dawn.awesomity.uk.backend.projects.ProjectStatus
import java.time.LocalDateTime
import java.util.UUID

data class ProjectResponse(
    val id: UUID,
    val identifier: String,
    val name: String,
    val createdByUserId: UUID,
    val createdByName: String?,
    val createdAt: LocalDateTime,
    val status: ProjectStatus
)
```

---

# 8. Identifier Generator

Create a system-generated identifier like:

```text
PRJ-20260505-000001
```

Simple first version:

```kotlin
package dawn.awesomity.uk.backend.projects

import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.random.Random

@Component
class ProjectIdentifierGenerator {

    fun generate(): String {
        val date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)
        val random = Random.nextInt(100000, 999999)
        return "PRJ-$date-$random"
    }
}
```

In the service, retry if identifier already exists.

---

# 9. jOOQ Read Repository

Create:

```kotlin
package dawn.awesomity.uk.backend.projects

import dawn.awesomity.uk.backend.projects.dto.ProjectResponse
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
                    id = record[PROJECTS.ID],
                    identifier = record[PROJECTS.IDENTIFIER],
                    name = record[PROJECTS.NAME],
                    createdByUserId = record[PROJECTS.CREATED_BY_USER_ID],
                    createdByName = record[USERS.FULL_NAME],
                    createdAt = record[PROJECTS.CREATED_AT],
                    status = ProjectStatus.valueOf(record[PROJECTS.STATUS])
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
                    id = record[PROJECTS.ID],
                    identifier = record[PROJECTS.IDENTIFIER],
                    name = record[PROJECTS.NAME],
                    createdByUserId = record[PROJECTS.CREATED_BY_USER_ID],
                    createdByName = record[USERS.FULL_NAME],
                    createdAt = record[PROJECTS.CREATED_AT],
                    status = ProjectStatus.valueOf(record[PROJECTS.STATUS])
                )
            }
    }
}
```

Codex must adjust generated jOOQ imports based on your generated package.

---

# 10. Project Service

```kotlin
package dawn.awesomity.uk.backend.projects

import dawn.awesomity.uk.backend.projects.dto.CreateProjectRequest
import dawn.awesomity.uk.backend.projects.dto.ProjectResponse
import dawn.awesomity.uk.backend.projects.dto.UpdateProjectRequest
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.util.UUID

@Service
class ProjectService(
    private val projectJpaRepository: ProjectJpaRepository,
    private val projectReadRepository: ProjectReadRepository,
    private val identifierGenerator: ProjectIdentifierGenerator
) {

    fun findAll(): List<ProjectResponse> {
        return projectReadRepository.findAll()
    }

    fun findById(id: UUID): ProjectResponse {
        return projectReadRepository.findById(id)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
    }

    @Transactional
    fun create(request: CreateProjectRequest, authenticatedUserId: UUID): ProjectResponse {
        val identifier = generateUniqueIdentifier()

        val project = projectJpaRepository.save(
            ProjectEntity(
                identifier = identifier,
                name = request.name.trim(),
                createdByUserId = authenticatedUserId,
                status = ProjectStatus.ACTIVE,
                createdAt = LocalDateTime.now(),
                updatedAt = LocalDateTime.now()
            )
        )

        return findById(project.id!!)
    }

    @Transactional
    fun updateName(id: UUID, request: UpdateProjectRequest): ProjectResponse {
        val project = projectJpaRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
            }

        if (project.status == ProjectStatus.ARCHIVED) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Archived projects cannot be edited"
            )
        }

        project.name = request.name.trim()
        project.updatedAt = LocalDateTime.now()

        projectJpaRepository.save(project)

        return findById(id)
    }

    @Transactional
    fun archive(id: UUID): ProjectResponse {
        val project = projectJpaRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
            }

        if (project.status == ProjectStatus.ARCHIVED) {
            return findById(id)
        }

        project.status = ProjectStatus.ARCHIVED
        project.archivedAt = LocalDateTime.now()
        project.updatedAt = LocalDateTime.now()

        projectJpaRepository.save(project)

        return findById(id)
    }

    private fun generateUniqueIdentifier(): String {
        repeat(5) {
            val identifier = identifierGenerator.generate()

            if (!projectJpaRepository.existsByIdentifier(identifier)) {
                return identifier
            }
        }

        throw ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Failed to generate unique project identifier"
        )
    }
}
```

---

# 11. Controller

```kotlin
package dawn.awesomity.uk.backend.projects

import dawn.awesomity.uk.backend.projects.dto.CreateProjectRequest
import dawn.awesomity.uk.backend.projects.dto.ProjectResponse
import dawn.awesomity.uk.backend.projects.dto.UpdateProjectRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/projects")
class ProjectController(
    private val projectService: ProjectService
) {

    @GetMapping
    fun findAll(): List<ProjectResponse> {
        return projectService.findAll()
    }

    @GetMapping("/{id}")
    fun findById(@PathVariable id: UUID): ProjectResponse {
        return projectService.findById(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @Valid @RequestBody request: CreateProjectRequest,
        authentication: Authentication
    ): ProjectResponse {
        val userId = UUID.fromString(authentication.name)
        return projectService.create(request, userId)
    }

    @PatchMapping("/{id}")
    fun updateName(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateProjectRequest
    ): ProjectResponse {
        return projectService.updateName(id, request)
    }

    @PatchMapping("/{id}/archive")
    fun archive(@PathVariable id: UUID): ProjectResponse {
        return projectService.archive(id)
    }
}
```

Because your global API prefix is already `/api/v1`, controller path should be only:

```text
/projects
```

---

# 12. Security

Ensure your security config protects `/projects`.

```kotlin
.authorizeHttpRequests {
    it.requestMatchers("/auth/microsoft").permitAll()
    it.requestMatchers("/actuator/health").permitAll()
    it.anyRequest().authenticated()
}
```

Since `/projects` is not public, authenticated users can access it.

---

# 13. Rules to Enforce in Backend

```text
Do not accept identifier from frontend.
Do not accept createdByUserId from frontend.
Do not accept createdAt from frontend.
Do not allow delete.
Do not allow editing archived projects.
Only authenticated users can create projects.
Use authentication.name as createdByUserId.
Trim project name before saving.
Validate project name length: 2–150.
```

---

# 14. jOOQ Generation

After adding migration, run your jOOQ generation task:

```bash
./gradlew generateJooqClasses
```

Then update imports in `ProjectReadRepository` to use your generated classes.

Example generated tables may be:

```kotlin
import dawn.awesomity.uk.backend.jooq.tables.references.PROJECTS
import dawn.awesomity.uk.backend.jooq.tables.references.USERS
```

Adjust according to your actual generated package.

---

# 15. Testing Checklist

Test manually or with integration tests:

```text
1. GET /projects without token → 401
2. POST /projects without token → 401
3. POST /projects with valid token → 201
4. Created project has system-generated identifier
5. Created project has authenticated user as createdByUserId
6. Created project has createdAt timestamp
7. GET /projects returns created projects
8. GET /projects/{id} returns one project
9. PATCH /projects/{id} updates only name
10. PATCH /projects/{id}/archive archives project
11. PATCH /projects/{id} after archive → 400
12. No DELETE endpoint exists
```

---

# 16. Codex Implementation Order

```text
1. Create migration file:
   db/migration/V20260505115010__create_projects_table.sql

2. Add ProjectStatus enum

3. Add ProjectEntity

4. Add ProjectJpaRepository

5. Add DTOs

6. Add ProjectIdentifierGenerator

7. Run jOOQ generation

8. Add ProjectReadRepository using generated jOOQ tables

9. Add ProjectService

10. Add ProjectController

11. Ensure /projects is protected by existing security config

12. Run tests / start app

13. Test endpoints from frontend
```

```
```
