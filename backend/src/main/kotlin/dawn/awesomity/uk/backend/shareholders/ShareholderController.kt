package dawn.awesomity.uk.backend.shareholders

import dawn.awesomity.uk.backend.shareholders.dto.CreateShareholderRequest
import dawn.awesomity.uk.backend.shareholders.dto.PublicShareholderResponse
import dawn.awesomity.uk.backend.shareholders.dto.ShareholderDropdownResponse
import dawn.awesomity.uk.backend.shareholders.dto.ShareholderResponse
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
@RequestMapping("/api/v1/projects/{projectId}/shareholders")
class ShareholderController(
    private val shareholderService: ShareholderService
) {

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    fun uploadShareholders(
        @PathVariable projectId: UUID,
        @RequestParam("file") file: MultipartFile
    ) {
        shareholderService.uploadShareholders(projectId, file)
    }

    @GetMapping
    fun getShareholders(
        @PathVariable projectId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): Page<ShareholderResponse> {
        return shareholderService.getShareholders(projectId, page, size)
    }

    @GetMapping("/dropdown")
    fun getShareholdersForDropdown(
        @PathVariable projectId: UUID
    ): List<ShareholderDropdownResponse> {
        return shareholderService.getShareholdersForDropdown(projectId)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createShareholder(
        @PathVariable projectId: UUID,
        @Valid @RequestBody request: CreateShareholderRequest
    ): ShareholderResponse {
        return shareholderService.createShareholder(projectId, request)
    }

    @GetMapping("/{shareholderId}/public")
    fun getPublicShareholderInfo(
        @PathVariable shareholderId: UUID
    ): PublicShareholderResponse {
        return shareholderService.getPublicShareholderInfo(shareholderId)
    }
}
