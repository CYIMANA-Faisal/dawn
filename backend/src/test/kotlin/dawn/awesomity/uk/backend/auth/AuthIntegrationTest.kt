package dawn.awesomity.uk.backend.auth

import dawn.awesomity.uk.backend.TestcontainersConfiguration
import dawn.awesomity.uk.backend.common.exception.UnauthorizedException
import dawn.awesomity.uk.backend.users.UserEntity
import dawn.awesomity.uk.backend.users.UserJpaRepository
import dawn.awesomity.uk.backend.users.UserRole
import dawn.awesomity.uk.backend.users.UserService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.UUID

@Import(TestcontainersConfiguration::class)
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = [
        "app.microsoft.client-id=test-client-id",
        "app.jwt.secret=dGVzdC1qd3Qtc2VjcmV0LWtleS1mb3ItdW5pdC10ZXN0aW5nLW9ubHkh",
        "app.jwt.issuer=test-issuer",
        "app.jwt.access-token-expiration-minutes=30"
    ]
)
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var jwtService: JwtService
    @Autowired lateinit var userService: UserService
    @Autowired lateinit var userJpaRepository: UserJpaRepository

    @MockitoBean
    lateinit var microsoftTokenValidator: MicrosoftTokenValidator

    @BeforeEach
    fun cleanup() {
        userJpaRepository.deleteAll()
    }

    @Test
    fun `POST microsoft login with valid token creates user and returns 200`() {
        val claims: Map<String, Any> = mapOf(
            "tid" to "tenant-abc",
            "oid" to "oid-new-user",
            "email" to "newuser@example.com",
            "name" to "New User"
        )
        whenever(microsoftTokenValidator.validate(any())).thenReturn(claims)

        mockMvc.perform(
            post("/api/v1/auth/microsoft")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"token": "fake-ms-token"}""")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.appAccessToken").isNotEmpty)
            .andExpect(jsonPath("$.user.email").value("newuser@example.com"))
            .andExpect(jsonPath("$.user.fullName").value("New User"))
            .andExpect(jsonPath("$.user.roles[0]").value("STANDARD"))
    }

    @Test
    fun `POST microsoft login with invalid token returns 401`() {
        whenever(microsoftTokenValidator.validate(any()))
            .thenThrow(UnauthorizedException("Invalid Microsoft token"))

        mockMvc.perform(
            post("/api/v1/auth/microsoft")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"token": "bad-token"}""")
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `GET me without JWT returns 401`() {
        mockMvc.perform(get("/api/me"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `GET me with valid JWT returns user`() {
        val user = createUser(
            subject = "oid-me-test",
            email = "me@example.com",
            fullName = "Me User",
            roles = mutableSetOf(UserRole.STANDARD.name)
        )
        val token = generateTokenFor(user.id!!)

        mockMvc.perform(
            get("/api/me").header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value("me@example.com"))
            .andExpect(jsonPath("$.fullName").value("Me User"))
    }

    @Test
    fun `GET admin endpoint with STANDARD role returns 403`() {
        val user = createUser(
            subject = "oid-standard",
            email = "standard@example.com",
            roles = mutableSetOf(UserRole.STANDARD.name)
        )
        val token = generateTokenFor(user.id!!)

        mockMvc.perform(
            get("/admin/users").header("Authorization", "Bearer $token")
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `GET admin endpoint with ADMIN role returns 200`() {
        val user = createUser(
            subject = "oid-admin",
            email = "admin@example.com",
            roles = mutableSetOf(UserRole.ADMIN.name)
        )
        val token = generateTokenFor(user.id!!)

        mockMvc.perform(
            get("/admin/users").header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
    }

    // --- helpers ---

    private fun createUser(
        subject: String,
        email: String,
        fullName: String? = null,
        roles: MutableSet<String> = mutableSetOf(UserRole.STANDARD.name)
    ): UserEntity = userJpaRepository.save(
        UserEntity(
            provider = "MICROSOFT",
            providerSubject = subject,
            providerTenantId = "tenant-test",
            email = email,
            fullName = fullName,
            enabled = true,
            roles = roles
        )
    )

    private fun generateTokenFor(userId: UUID): String {
        val user = userService.findById(userId)
            ?: error("User $userId not found in DB")
        return jwtService.generateAccessToken(user)
    }
}
