package dawn.awesomity.uk.backend.forms

import dawn.awesomity.uk.backend.forms.dto.*
import dawn.awesomity.uk.backend.shareholders.ShareholderRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime
import java.util.UUID
import kotlin.math.round

@Service
class FormStatisticsService(
    private val shareholderRepository: ShareholderRepository,
    private val formSubmissionRepository: FormSubmissionRepository,
    private val objectMapper: ObjectMapper
) {

    @Transactional(readOnly = true)
    fun getStatistics(projectId: UUID, formId: UUID, basis: String): FormStatisticsResponse {
        val shareholders = shareholderRepository.findAllByProjectId(projectId)
        val submissions = formSubmissionRepository.findAllByFormId(formId)
        
        val completedShareholderIds = submissions.map { it.shareholderId }.toSet()
        val submissionsByShareholder = submissions.associateBy { it.shareholderId }

        // Population Stats
        val eligibleShareholders = shareholders.size
        val eligibleShares = shareholders.sumOf { it.numberOfShares }
        
        val sentShareholders = shareholders.count { s ->
            val formsSent = try {
                objectMapper.readValue(s.formsSent, List::class.java) as List<Map<String, Any>>
            } catch (e: Exception) {
                emptyList()
            }
            formsSent.any { it["formId"] == formId.toString() }
        }
        val completedShareholders = completedShareholderIds.size

        val population = PopulationStats(
            eligibleShareholders = eligibleShareholders,
            eligibleShares = eligibleShares,
            sentShareholders = sentShareholders,
            completedShareholders = completedShareholders
        )

        // Block calculations
        val blocks = listOf(
            calculateAppointmentBlock(shareholders, submissionsByShareholder, basis),
            calculateResolutionBlock(shareholders, submissionsByShareholder, basis, "resolution_1", "Resolution 1", "resolution_1_vote"),
            calculateResolution2Block(shareholders, submissionsByShareholder, basis),
            calculateResolutionBlock(shareholders, submissionsByShareholder, basis, "resolution_3", "Resolution 3", "resolution_3_vote"),
            calculateLiquidationCommitteeBlock(shareholders, submissionsByShareholder, basis)
        )

        return FormStatisticsResponse(
            projectId = projectId,
            formId = formId,
            generatedAt = LocalDateTime.now(),
            basis = basis,
            population = population,
            blocks = blocks
        )
    }

    private fun calculateAppointmentBlock(shareholders: List<dawn.awesomity.uk.backend.shareholders.ShareholderEntity>, submissions: Map<UUID, FormSubmissionEntity>, basis: String): StatBlock {
        val segments = mutableListOf<RawSegment>()
        
        shareholders.forEach { s ->
            val submission = submissions[s.id]
            if (submission != null) {
                val responses = parseResponses(submission.responses)
                val value = responses["primary_proxy_type"]
                when (value) {
                    "chair" -> segments.addOrUpdate("chair", "Chair", "green", s)
                    else -> segments.addOrUpdate("other", "Other", "amber", s)
                }
            } else {
                segments.addOrUpdate("not_responded", "Not responded", "grey", s)
            }
        }

        return finalizeBlock("appointment_first_preference_proxy", "Appointment of 1st preference proxy", segments, shareholders, basis)
    }

    private fun calculateResolutionBlock(shareholders: List<dawn.awesomity.uk.backend.shareholders.ShareholderEntity>, submissions: Map<UUID, FormSubmissionEntity>, basis: String, blockKey: String, blockTitle: String, questionKey: String): StatBlock {
        val segments = mutableListOf<RawSegment>()
        
        shareholders.forEach { s ->
            val submission = submissions[s.id]
            if (submission != null) {
                val responses = parseResponses(submission.responses)
                val value = responses[questionKey]
                when (value) {
                    "agree" -> segments.addOrUpdate("agree", "Agree", "green", s)
                    "disagree" -> segments.addOrUpdate("disagree", "Disagree", "red", s)
                    "discretion" -> segments.addOrUpdate("proxyholders_discretion", "Proxyholders discretion", "amber", s)
                    else -> segments.addOrUpdate("not_responded", "Not responded", "grey", s)
                }
            } else {
                segments.addOrUpdate("not_responded", "Not responded", "grey", s)
            }
        }

        return finalizeBlock(blockKey, blockTitle, segments, shareholders, basis)
    }

    private fun calculateResolution2Block(shareholders: List<dawn.awesomity.uk.backend.shareholders.ShareholderEntity>, submissions: Map<UUID, FormSubmissionEntity>, basis: String): StatBlock {
        val segments = mutableListOf<RawSegment>()
        
        shareholders.forEach { s ->
            val submission = submissions[s.id]
            if (submission != null) {
                val responses = parseResponses(submission.responses)
                val value = responses["resolution_2_liquidator_choice"]
                when (value) {
                    "admin_proposed_liquidator" -> segments.addOrUpdate("default_response", "Default response", "green", s)
                    "custom_liquidator" -> segments.addOrUpdate("other", "Other", "red", s)
                    else -> segments.addOrUpdate("not_responded", "Not responded", "grey", s)
                }
            } else {
                segments.addOrUpdate("not_responded", "Not responded", "grey", s)
            }
        }

        return finalizeBlock("resolution_2", "Resolution 2", segments, shareholders, basis)
    }

    private fun calculateLiquidationCommitteeBlock(shareholders: List<dawn.awesomity.uk.backend.shareholders.ShareholderEntity>, submissions: Map<UUID, FormSubmissionEntity>, basis: String): StatBlock {
        val segments = mutableListOf<RawSegment>()
        
        shareholders.forEach { s ->
            val submission = submissions[s.id]
            if (submission != null) {
                val responses = parseResponses(submission.responses)
                val hasInput = !responses["committee_member_name"].toString().isNullOrBlank() || 
                               !responses["committee_member_address"].toString().isNullOrBlank()
                if (hasInput) {
                    segments.addOrUpdate("input", "Input", "red", s)
                } else {
                    segments.addOrUpdate("no_input", "No input", "green", s)
                }
            } else {
                segments.addOrUpdate("not_responded", "Not responded", "grey", s)
            }
        }

        return finalizeBlock("liquidation_committee", "Liquidation committee", segments, shareholders, basis)
    }

    private fun finalizeBlock(blockKey: String, blockTitle: String, rawSegments: List<RawSegment>, shareholders: List<dawn.awesomity.uk.backend.shareholders.ShareholderEntity>, basis: String): StatBlock {
        val totalBasis = if (basis == "shares") shareholders.sumOf { it.numberOfShares }.toDouble() else shareholders.size.toDouble()
        
        // Ensure "not_responded" segment exists even if empty
        val finalRawSegments = if (rawSegments.none { it.key == "not_responded" }) {
            rawSegments + RawSegment("not_responded", "Not responded", "grey", 0, 0L)
        } else rawSegments

        val segments = finalRawSegments.map { rs ->
            val currentBasis = if (basis == "shares") rs.shares.toDouble() else rs.count.toDouble()
            val percentage = if (totalBasis > 0) (currentBasis / totalBasis) * 100.0 else 0.0
            StatSegment(
                key = rs.key,
                label = rs.label,
                tone = rs.tone,
                count = rs.count,
                shares = rs.shares,
                percentage = round(percentage * 100) / 100.0
            )
        }

        // Optional: Normalize percentages to 100.0 (skipped for simplicity here, but can be added)
        
        return StatBlock(key = blockKey, title = blockTitle, segments = segments)
    }

    private fun parseResponses(json: String): Map<String, Any> {
        return try {
            objectMapper.readValue(json, Map::class.java) as Map<String, Any>
        } catch (e: Exception) {
            emptyMap()
        }
    }

    private data class RawSegment(
        val key: String,
        val label: String,
        val tone: String,
        var count: Int,
        var shares: Long
    )

    private fun MutableList<RawSegment>.addOrUpdate(key: String, label: String, tone: String, shareholder: dawn.awesomity.uk.backend.shareholders.ShareholderEntity) {
        val existing = this.find { it.key == key }
        if (existing != null) {
            existing.count++
            existing.shares += shareholder.numberOfShares
        } else {
            this.add(RawSegment(key, label, tone, 1, shareholder.numberOfShares))
        }
    }
}
