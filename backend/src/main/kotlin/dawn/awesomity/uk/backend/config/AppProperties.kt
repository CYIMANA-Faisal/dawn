package dawn.awesomity.uk.backend.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "app")
class AppProperties {
    var microsoft: MicrosoftProperties = MicrosoftProperties()
    var jwt: JwtProperties = JwtProperties()

    class MicrosoftProperties {
        var clientId: String = ""
        var issuerBaseUrl: String = "https://login.microsoftonline.com"
    }

    class JwtProperties {
        var secret: String = ""
        var issuer: String = "dawn-backend"
        var accessTokenExpirationMinutes: Long = 30
    }
}
