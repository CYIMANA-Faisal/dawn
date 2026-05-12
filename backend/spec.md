# Shareholder Endpoints API Specification

This document details the REST API endpoints available for managing Shareholders within a Project. All endpoints assume standard authentication headers (e.g., `Authorization: Bearer <token>`) are provided if required by the application security configuration.

## Base URL Path
All endpoints below are prefixed with:
`/api/v1/projects/{projectId}/shareholders`

---

## 1. Upload Shareholders (Excel)

Uploads an Excel (`.xlsx` or `.xls`) file to bulk create shareholders for a given project.

> [!IMPORTANT]
> The first row (index 0) of the Excel file is treated as a header row and will be skipped. Data parsing begins from the second row.

- **URL:** `/api/v1/projects/{projectId}/shareholders/upload`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`

### Request Parameters

| Type | Name | Description |
| :--- | :--- | :--- |
| Path | `projectId` | The UUID of the project. |
| Form Data | `file` | The Excel file to be uploaded. |

#### Expected Excel Columns (in order):
1. **Name** (Text): Required. The full name of the shareholder.
2. **Email** (Text): Optional. The email address of the shareholder.
3. **Number of Shares** (Numeric): Required. The total number of shares allocated. Must be greater than 0.

### Responses

- **`201 Created`**: The file was successfully processed, and valid shareholders were inserted. (No response body).
- **`400 Bad Request`**: The uploaded file is missing or invalid.
- **`404 Not Found`**: The specified `projectId` does not exist.

---

## 2. Create Single Shareholder

Creates a single shareholder for a specific project.

- **URL:** `/api/v1/projects/{projectId}/shareholders`
- **Method:** `POST`
- **Content-Type:** `application/json`

### Request Parameters

| Type | Name | Description |
| :--- | :--- | :--- |
| Path | `projectId` | The UUID of the project. |

### Request Body

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "numberOfShares": 500
}
```
*Note: `name` and `numberOfShares` are required. `numberOfShares` must be >= 1.*

### Response (`201 Created`)

Returns the newly created shareholder record.

```json
{
  "id": "987fcdeb-51a2-43d7-9012-345678901234",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "numberOfShares": 500,
  "createdAt": "2026-05-08T11:35:00.000Z"
}
```

---

## 3. Get Paginated Shareholders List

Retrieves a paginated list of all shareholders belonging to a specific project, ordered by creation date descending.

- **URL:** `/api/v1/projects/{projectId}/shareholders`
- **Method:** `GET`

### Request Parameters

| Type | Name | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| Path | `projectId` | UUID | (Required) | The UUID of the project. |
| Query | `page` | Integer | `0` | The zero-based page index to retrieve. |
| Query | `size` | Integer | `20` | The number of records per page. |

### Response (`200 OK`)

Returns a standard Spring `Page` object containing an array of `content`.

```json
{
  "content": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "numberOfShares": 1500,
      "createdAt": "2026-05-08T11:35:00.000Z"
    },
    {
      "id": "987fcdeb-51a2-43d7-9012-345678901234",
      "name": "Jane Smith",
      "email": null,
      "numberOfShares": 500,
      "createdAt": "2026-05-08T11:35:00.000Z"
    }
  ],
  "pageable": {
    "sort": {
      "empty": true,
      "sorted": false,
      "unsorted": true
    },
    "offset": 0,
    "pageNumber": 0,
    "pageSize": 20,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalPages": 1,
  "totalElements": 2,
  "size": 20,
  "number": 0,
  "sort": {
    "empty": true,
    "sorted": false,
    "unsorted": true
  },
  "first": true,
  "numberOfElements": 2,
  "empty": false
}
```

---

## 4. Get Shareholders Dropdown List

Retrieves a lightweight, unpaginated list of shareholders for a specific project. This is optimized for populating dropdown menus (select boxes) in the UI, returning only the minimum necessary fields (`id` and `name`), ordered alphabetically by name.

- **URL:** `/api/v1/projects/{projectId}/shareholders/dropdown`
- **Method:** `GET`

### Request Parameters

| Type | Name | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| Path | `projectId` | UUID | (Required) | The UUID of the project. |

### Response (`200 OK`)

Returns a JSON array of objects.

```json
[
  {
    "id": "987fcdeb-51a2-43d7-9012-345678901234",
    "name": "Jane Smith"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe"
  }
]
```

---

# Form Endpoints API Specification

This section details the REST API endpoints available for fetching dynamic forms and distributing them to shareholders.

## Base URL Path
All endpoints below are prefixed with:
`/api/v1`

---

## 5. Get Form for Rendering

Retrieves the complete, hierarchical JSON structure of a specific form. This endpoint is designed to provide the exact nested JSON tree required by the frontend form rendering engine.

- **URL:** `/api/v1/forms/{id}`
- **Method:** `GET`

### Request Parameters

| Type | Name | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| Path | `id` | UUID | (Required) | The UUID of the form to retrieve. |

### Response (`200 OK`)

Returns the nested form schema as defined in the system.

```json
{
  "formId": "507f1f77-bcf8-65ed-a169-2a105c000000",
  "title": "Proxy (Creditors’ Voluntary Winding Up)",
  "subtitle": "Company Name (“the Company”)",
  "fields": [
    {
      "id": "q1_capacity",
      "type": "radio",
      "label": "Are you signing this form as the named member, or on behalf of someone else?",
      "options": [
        { "value": "own_behalf", "label": "On my own behalf" },
        { "value": "someone_else", "label": "On behalf of someone else" }
      ],
      "required": true
    },
    {
      "id": "q4_proxy_holder",
      "type": "group",
      "label": "Name of proxy holder",
      "fields": [
        {
          "id": "proxy_primary_type",
          "type": "radio",
          "options": [
            { "value": "chair", "label": "Chair of the meeting" }
          ],
          "required": true
        }
      ]
    }
  ]
}
```

---

## 6. Get Forms Dropdown List

Retrieves a lightweight, unpaginated list of all available forms. This is optimized for populating dropdown menus (select boxes) in the UI, returning only the minimum necessary fields (`id` and `title`).

- **URL:** `/api/v1/forms/dropdown`
- **Method:** `GET`

### Response (`200 OK`)

Returns a JSON array of objects.

```json
[
  {
    "id": "507f1f77-bcf8-65ed-a169-2a105c000000",
    "title": "Proxy (Creditors’ Voluntary Winding Up)"
  },
  {
    "id": "8f8b89e3-8d69-4258-8684-2a6237190000",
    "title": "Shareholder Registration Form"
  }
]
```

---

## 7. Distribute Form via Email

Distributes a specific form to all shareholders within a project via a customized email invitation. This process runs asynchronously in the background. Shareholders without registered email addresses are automatically skipped.

- **URL:** `/api/v1/forms/projects/{projectId}/forms/{formId}/distribute`
- **Method:** `POST`
- **Content-Type:** `application/json`

### Request Parameters

| Type | Name | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| Path | `projectId` | UUID | (Required) | The UUID of the project. |
| Path | `formId` | UUID | (Required) | The UUID of the form to send. |

### Request Body

```json
{
  "frontendUrlTemplate": "https://app.yourdomain.com/projects/{projectId}/forms/{formId}?shareholderId={shareholderId}"
}
```

**Description:**
- `frontendUrlTemplate`: A string representing the base URL the shareholder should click in the email to access the form. The backend will automatically replace the literal string tokens `{projectId}`, `{formId}`, and `{shareholderId}` with their actual corresponding UUIDs for each individual shareholder before sending the email.

### Responses

- **`202 Accepted`**: The request was accepted, and the asynchronous email distribution process has started in the background.

```json
{
  "message": "Form distribution started successfully."
}
```

- **`400 Bad Request`**: The `frontendUrlTemplate` is missing or blank.
- **`404 Not Found`**: The specified `projectId` or `formId` does not exist.
