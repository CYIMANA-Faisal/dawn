package dawn.awesomity.uk.backend.health

import dawn.awesomity.uk.backend.common.response.GenericApiResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/health")
class HealthController {

    @GetMapping
    fun health(): GenericApiResponse<Map<String, String>> {
        return GenericApiResponse.success(
            message = "Application is running",
            data = mapOf("status" to "UP")
        )
    }
}
