package dawn.awesomity.uk.backend.admin

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin")
class AdminController {

    @GetMapping("/users")
    fun listUsers(): Map<String, String> = mapOf("status" to "admin only")
}
