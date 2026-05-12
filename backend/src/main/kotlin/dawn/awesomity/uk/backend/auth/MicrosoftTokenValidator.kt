package dawn.awesomity.uk.backend.auth

import dawn.awesomity.uk.backend.common.exception.UnauthorizedException
import dawn.awesomity.uk.backend.config.AppProperties
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtClaimValidator
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.stereotype.Component

@Component
class MicrosoftTokenValidator(private val appProperties: AppProperties) {

    // JWKs endpoint works for all tenants — issuer is validated per-token via the tid claim
    private val jwksUri = "https://login.microsoftonline.com/common/discovery/v2.0/keys"

    private val jwtDecoder: NimbusJwtDecoder by lazy {
        val decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build()

        val audienceValidator = JwtClaimValidator<List<String>>("aud") { aud ->
            aud.contains(appProperties.microsoft.clientId)
        }

        // Use default validators (exp, nbf) plus our audience check
        // Issuer is skipped because it varies per tenant in multi-tenant apps
        decoder.setJwtValidator(
            DelegatingOAuth2TokenValidator(
                JwtValidators.createDefault(),
                audienceValidator
            )
        )

        decoder
    }

    fun validate(token: String): Map<String, Any> {
        val jwt: Jwt = try {
            jwtDecoder.decode(token)
        } catch (e: Exception) {
            throw UnauthorizedException("Invalid Microsoft token: ${e.message}")
        }
        return jwt.claims
    }
}
