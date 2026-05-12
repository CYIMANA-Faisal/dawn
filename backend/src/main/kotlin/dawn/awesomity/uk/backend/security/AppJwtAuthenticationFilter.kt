package dawn.awesomity.uk.backend.security

import dawn.awesomity.uk.backend.auth.JwtService
import dawn.awesomity.uk.backend.users.UserService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID

@Component
class AppJwtAuthenticationFilter(
    private val jwtService: JwtService,
    private val userService: UserService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        try {
            val token = authHeader.removePrefix("Bearer ")
            val claims = jwtService.validateAndExtractClaims(token)
            val userId = UUID.fromString(claims.subject)

            val user = userService.findById(userId)

            if (user != null && user.enabled && SecurityContextHolder.getContext().authentication == null) {
                val authorities = user.roles.map { SimpleGrantedAuthority("ROLE_$it") }
                val authentication = UsernamePasswordAuthenticationToken(
                    userId.toString(),
                    null,
                    authorities
                )
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                SecurityContextHolder.getContext().authentication = authentication
            }
        } catch (e: Exception) {
            // Invalid or expired token — leave SecurityContext empty; Spring Security handles 401
        }

        filterChain.doFilter(request, response)
    }
}
