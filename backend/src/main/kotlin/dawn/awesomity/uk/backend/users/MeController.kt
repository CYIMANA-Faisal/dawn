package dawn.awesomity.uk.backend.users

import dawn.awesomity.uk.backend.users.dto.UserAuthReadModel
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/me")
class MeController(
    private val userService: UserService
) {

    @GetMapping
    fun me(authentication: Authentication): UserAuthReadModel {
        val userId = UUID.fromString(authentication.name)
        return userService.findById(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
    }
}
