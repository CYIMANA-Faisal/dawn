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
