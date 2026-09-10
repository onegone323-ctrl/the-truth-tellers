# API Reference

Complete documentation of all backend API endpoints.

## Base URL

```
http://localhost:5000/api
```

## Authentication

No authentication required for local development. In production, add bearer token validation.

## Endpoints

### 1. Chat Completion

**POST** `/copilot/chat`

Send a message and get AI response.

**Request:**
```json
{
  "userId": "user-123",
  "message": "Hello, how are you?",
  "model": "gpt-4-turbo",
  "temperature": 0.7,
  "maxTokens": 2000,
  "topP": 1,
  "context": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "id": "completion-123",
  "object": "text_completion",
  "created": 1694000000,
  "model": "gpt-4-turbo",
  "choices": [
    {
      "text": "I'm doing great, thank you for asking!",
      "index": 0,
      "finishReason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 10,
    "completionTokens": 12,
    "totalTokens": 22
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid input
```json
{
  "message": "Invalid input message",
  "errorCode": "INVALID_INPUT",
  "statusCode": 400
}
```

- `401 Unauthorized` - Missing/invalid API key
```json
{
  "message": "Unauthorized",
  "errorCode": "UNAUTHORIZED",
  "statusCode": 401
}
```

- `429 Too Many Requests` - Rate limit exceeded
```json
{
  "message": "Rate limit exceeded",
  "errorCode": "RATE_LIMIT",
  "statusCode": 429
}
```

- `500 Internal Server Error` - Server error
```json
{
  "message": "Internal server error",
  "errorCode": "INTERNAL_ERROR",
  "statusCode": 500
}
```

### 2. Get Chat History

**GET** `/copilot/chat-history/{userId}`

Retrieve all conversations for a user.

**Parameters:**
- `userId` (string, required) - User identifier

**Response:** `200 OK`
```json
[
  {
    "id": "conv-123",
    "userId": "user-123",
    "title": "General Discussion",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2024-01-01T00:00:00Z"
      },
      {
        "role": "assistant",
        "content": "Hi there!",
        "timestamp": "2024-01-01T00:00:01Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:01Z"
  }
]
```

### 3. Delete Conversation

**DELETE** `/copilot/chat/{conversationId}`

Delete a specific conversation.

**Parameters:**
- `conversationId` (string, required) - Conversation identifier

**Response:** `204 No Content`

**Error Response:** `404 Not Found`
```json
{
  "message": "Conversation not found",
  "errorCode": "NOT_FOUND",
  "statusCode": 404
}
```

### 4. Generate Embeddings

**POST** `/copilot/embeddings`

Generate embeddings for semantic search.

**Request:**
```json
{
  "text": "Hello world",
  "model": "text-embedding-3-large"
}
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "vector": [0.123, 0.456, ..., 0.789]
    }
  ],
  "model": "text-embedding-3-large",
  "usage": {
    "promptTokens": 5,
    "totalTokens": 5
  }
}
```

### 5. Health Check

**GET** `/health`

Check API health status.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

## Query Parameters

### Common Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | gpt-4-turbo | AI model to use |
| `temperature` | float | 0.7 | Randomness level (0-2) |
| `maxTokens` | int | 2000 | Maximum response length |
| `topP` | float | 1 | Nucleus sampling parameter |

## Rate Limiting

API is rate-limited to prevent abuse:

- **100 requests per minute** for standard users
- **500 requests per minute** for enterprise users

Rate limit info included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1694000060
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid credentials |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Examples

### JavaScript/Fetch

```javascript
const response = await fetch('/api/copilot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    message: 'Hello!',
    model: 'gpt-4-turbo'
  })
});

const data = await response.json();
console.log(data.choices[0].text);
```

### cURL

```bash
curl -X POST http://localhost:5000/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "message": "Hello!"
  }'
```

### C# HttpClient

```csharp
var client = new HttpClient();
var request = new ChatCompletionRequest
{
    UserId = "user-123",
    Message = "Hello!"
};

var json = JsonSerializer.Serialize(request);
var content = new StringContent(json, Encoding.UTF8, "application/json");
var response = await client.PostAsync(
    "http://localhost:5000/api/copilot/chat", 
    content);

var result = await response.Content.ReadAsAsync<ChatCompletionResponse>();
```

## Pagination

List endpoints support pagination:

```
GET /api/copilot/chat-history/{userId}?page=1&limit=10
```

**Response:**
```json
{
  "items": [...],
  "total": 50,
  "page": 1,
  "limit": 10,
  "pages": 5
}
```

## Versioning

Current API version: **v1**

Version can be specified in URL:
```
GET /api/v1/copilot/chat-history/{userId}
```

## Changelog

### v1.0.0 (Initial Release)
- Chat completion endpoint
- Chat history retrieval
- Embeddings generation
- Health check endpoint

