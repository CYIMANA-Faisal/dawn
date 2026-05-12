package dawn.awesomity.uk.backend.auth

import dawn.awesomity.uk.backend.config.AppProperties
import dawn.awesomity.uk.backend.users.dto.UserAuthReadModel
import io.jsonwebtoken.Claims
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.io.Decoders
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService(private val appProperties: AppProperties) {

    private val secretKey: SecretKey by lazy {
        Keys.hmacShaKeyFor(Decoders.BASE64.decode(appProperties.jwt.secret))
    }

    fun generateAccessToken(user: UserAuthReadModel): String {
        val expirationMs = appProperties.jwt.accessTokenExpirationMinutes * 60 * 1000
        return Jwts.builder()
            .issuer(appProperties.jwt.issuer)
            .subject(user.id.toString())
            .claim("email", user.email)
            .claim("roles", user.roles)
            .claim("provider", "MICROSOFT")
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + expirationMs))
            .signWith(secretKey)
            .compact()
    }

    fun validateAndExtractClaims(token: String): Claims {
        return try {
            Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .payload
        } catch (e: JwtException) {
            throw IllegalArgumentException("Invalid app token: ${e.message}", e)
        }
    }
}
