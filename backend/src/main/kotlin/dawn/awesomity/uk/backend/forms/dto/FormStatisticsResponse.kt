package dawn.awesomity.uk.backend.forms.dto

import java.time.LocalDateTime
import java.util.UUID

data class FormStatisticsResponse(
    val projectId: UUID,
    val formId: UUID,
    val generatedAt: LocalDateTime,
    val basis: String,
    val population: PopulationStats,
    val blocks: List<StatBlock>
)

data class PopulationStats(
    val eligibleShareholders: Int,
    val eligibleShares: Long,
    val sentShareholders: Int,
    val completedShareholders: Int
)

data class StatBlock(
    val key: String,
    val title: String,
    val segments: List<StatSegment>
)

data class StatSegment(
    val key: String,
    val label: String,
    val tone: String,
    val count: Int,
    val shares: Long,
    val percentage: Double
)
