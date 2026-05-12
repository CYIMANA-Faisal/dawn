package dawn.awesomity.uk.backend.auth

import dawn.awesomity.uk.backend.auth.dto.AuthResponse
import dawn.awesomity.uk.backend.auth.dto.MicrosoftLoginRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val microsoftAuthService: MicrosoftAuthService
) {

    @PostMapping("/microsoft")
    fun loginWithMicrosoft(
        @RequestBody request: MicrosoftLoginRequest
    ): ResponseEntity<AuthResponse> {
        return ResponseEntity.ok(microsoftAuthService.login(request))
    }
}
