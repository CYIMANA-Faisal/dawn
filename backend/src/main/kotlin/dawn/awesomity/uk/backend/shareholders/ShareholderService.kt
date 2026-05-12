package dawn.awesomity.uk.backend.shareholders

import dawn.awesomity.uk.backend.shareholders.dto.CreateShareholderRequest
import dawn.awesomity.uk.backend.shareholders.dto.ShareholderDropdownResponse
import dawn.awesomity.uk.backend.shareholders.dto.ShareholderResponse
import dawn.awesomity.uk.backend.shareholders.dto.FormSentStatusResponse
import dawn.awesomity.uk.backend.shareholders.dto.PublicShareholderResponse
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@Service
class ShareholderService(
    private val shareholderRepository: ShareholderRepository,
    private val shareholderReadRepository: ShareholderReadRepository,
    private val objectMapper: ObjectMapper
) {

    @Transactional
    fun uploadShareholders(projectId: UUID, file: MultipartFile) {
        val shareholdersToSave = mutableListOf<ShareholderEntity>()

        file.inputStream.use { inputStream ->
            val workbook = WorkbookFactory.create(inputStream)
            val sheet = workbook.getSheetAt(0) // Assume data is in the first sheet

            // Iterate through rows, skipping the header row (index 0)
            for (i in 1..sheet.lastRowNum) {
                val row = sheet.getRow(i) ?: continue

                val nameCell = row.getCell(0)
                val emailCell = row.getCell(1)
                val sharesCell = row.getCell(2)

                val name = nameCell?.stringCellValue?.trim()
                if (name.isNullOrBlank()) continue // Skip if name is missing

                val email = emailCell?.stringCellValue?.trim()?.takeIf { it.isNotBlank() }
                
                val numberOfShares = try {
                    sharesCell?.numericCellValue?.toLong() ?: 0L
                } catch (e: Exception) {
                    try {
                        sharesCell?.stringCellValue?.toLong() ?: 0L
                    } catch (e: Exception) {
                        0L
                    }
                }

                if (numberOfShares <= 0) continue // Skip if invalid shares

                val entity = ShareholderEntity(
                    projectId = projectId,
                    name = name,
                    email = email,
                    numberOfShares = numberOfShares
                )
                shareholdersToSave.add(entity)
            }
        }

        if (shareholdersToSave.isNotEmpty()) {
            shareholderRepository.saveAll(shareholdersToSave)
        }
    }

    @Transactional(readOnly = true)
    fun getShareholders(projectId: UUID, page: Int, size: Int): Page<ShareholderResponse> {
        val offset = page * size
        val content = shareholderReadRepository.findAllByProjectId(projectId, size, offset)
        val total = shareholderReadRepository.countByProjectId(projectId)
        
        return PageImpl(content, PageRequest.of(page, size), total)
    }

    @Transactional(readOnly = true)
    fun getShareholdersForDropdown(projectId: UUID): List<ShareholderDropdownResponse> {
        return shareholderReadRepository.findDropdownByProjectId(projectId)
    }

    @Transactional
    fun createShareholder(projectId: UUID, request: CreateShareholderRequest): ShareholderResponse {
        val entity = ShareholderEntity(
            projectId = projectId,
            name = request.name,
            email = request.email,
            numberOfShares = request.numberOfShares
        )
        val savedEntity = shareholderRepository.save(entity)
        
        return ShareholderResponse(
            id = savedEntity.id!!,
            name = savedEntity.name,
            email = savedEntity.email,
            numberOfShares = savedEntity.numberOfShares,
            formsSent = emptyList()
        )
    }

    @Transactional(readOnly = true)
    fun getPublicShareholderInfo(shareholderId: UUID): PublicShareholderResponse {
        val entity = shareholderRepository.findById(shareholderId).orElseThrow {
            IllegalArgumentException("Shareholder not found")
        }
        
        val formsSent = try {
            val list = objectMapper.readValue(entity.formsSent, List::class.java) as List<Map<String, Any>>
            list.map {
                FormSentStatusResponse(
                    formId = UUID.fromString(it["formId"] as String),
                    status = it["status"] as String
                )
            }
        } catch (e: Exception) {
            emptyList<FormSentStatusResponse>()
        }

        return PublicShareholderResponse(
            name = entity.name,
            email = entity.email,
            formsSent = formsSent
        )
    }
}
