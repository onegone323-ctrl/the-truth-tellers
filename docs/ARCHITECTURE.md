# Architecture Overview

Complete system architecture and design patterns.

## System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                      User Browser                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         React Frontend (Base44)                             │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Chat Components                                    │   │   │
│  │  │  - ChatWindow, MessageInput, ConversationList       │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                           ↓                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  API Clients                                         │   │   │
│  │  │  - copilotClient.js (GitHub Copilot)                │   │   │
│  │  │  - base44Client.js (Base44 backend)                 │   │   │
│  │  │  - apiCall() helper                                 │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ASP.NET Core Backend (Port 5000)                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Controllers                                                │   │
│  │  - CopilotController (handles AI requests)                 │   │
│  │  - ChatController (manages conversations)                  │   │
│  │  - HealthController (status checks)                        │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
│                         │                                          │
│  ┌──────────────────────↓──────────────────────────────────────┐   │
│  │  Services Layer                                             │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐    │   │
│  │  │ CopilotService       │  │ AzureOpenAIService       │    │   │
│  │  │ - Request routing    │  │ - Chat completions       │    │   │
│  │  │ - Response transform │  │ - Embeddings generation  │    │   │
│  │  │ - Context management │  │ - Token counting         │    │   │
│  │  └──────────────────────┘  └──────────────────────────┘    │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐    │   │
│  │  │ CosmosDbService      │  │ ValidationService        │    │   │
│  │  │ - Chat history       │  │ - Input sanitization     │    │   │
│  │  │ - Vector search      │  │ - Security checks        │    │   │
│  │  │ - Persistence        │  │ - Length validation      │    │   │
│  │  └──────────────────────┘  └──────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                         │                 │                        │
│  ┌──────────────────────↓─────────────────↓─────────────────┐   │
│  │  Middleware                                              │   │
│  │  - Exception Handling                                   │   │
│  │  - Request Logging                                      │   │
│  │  - CORS Configuration                                   │   │
│  │  - Rate Limiting                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   ┌─────────┐      ┌────────────┐  ┌──────────────┐
   │ Cosmos  │      │  Azure     │  │  Application │
   │   DB    │      │  OpenAI    │  │  Insights    │
   │ (NoSQL) │      │ (GPT-4)    │  │  (Logging)   │
   └─────────┘      └────────────┘  └──────────────┘
```

## Request Flow

### Typical Chat Request

```
1. User types message in React UI
   ↓
2. ChatInput component calls copilotClient.createCompletion()
   ↓
3. Request sent to backend: POST /api/copilot/chat
   ↓
4. CopilotController receives request
   ↓
5. ValidationService validates input
   ↓
6. CopilotService calls AzureOpenAIService
   ↓
7. Azure OpenAI API returns completion
   ↓
8. CosmosDbService stores message + response
   ↓
9. Response sent back to frontend
   ↓
10. UI updates with AI response
```

## Component Details

### Frontend (React)

**Technology Stack:**
- React 18 - UI framework
- Vite 6 - Build tool
- Base44 SDK - Backend integration
- Tailwind CSS - Styling
- Radix UI - Components

**Key Components:**
- `ChatWindow` - Main chat interface
- `MessageInput` - User input field
- `ConversationList` - Sidebar with conversations
- `CopilotClient` - AI API integration

### Backend (.NET)

**Technology Stack:**
- .NET 8 - Framework
- ASP.NET Core - Web framework
- Azure SDK - Cloud integration
- Cosmos DB SDK - Database

**Key Services:**
- `CopilotService` - Request orchestration
- `AzureOpenAIService` - AI API wrapper
- `CosmosDbService` - Data persistence
- `ValidationService` - Input validation

### Database (Cosmos DB)

**Collections:**

```json
// Conversations Collection
{
  "id": "conv-123",
  "userId": "user-123",
  "title": "General Discussion",
  "messages": [...],
  "embeddings": [...],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "_partitionKey": "user-123"
}
```

**Indexes:**
- Composite index on `userId` + `updatedAt` for quick lookups
- Vector index on `embeddings` for semantic search

## Data Flow

### Message Processing

```
User Message
    ↓
Frontend Validation
    ↓
Copilot Client (GitHub Copilot API or Backend)
    ↓
[If Backend Route]
    ├─ Input Validation
    ├─ Context Retrieval (from Cosmos DB)
    ├─ Request to Azure OpenAI
    ├─ Response Processing
    ├─ Embedding Generation
    ├─ Store in Cosmos DB
    └─ Return to Frontend
    ↓
UI Update
```

## Error Handling

### Global Exception Handler

```
Exception Thrown
    ↓
ExceptionHandlingMiddleware
    ↓
Log to Application Insights
    ↓
Transform to ErrorResponse
    ↓
Return HTTP Error Code
```

### Error Types

| Error | Cause | Resolution |
|-------|-------|------------|
| Input Validation | Invalid message format | Validate on client |
| Rate Limit | Too many requests | Implement backoff |
| Azure OpenAI | API unavailable | Retry with exponential backoff |
| Cosmos DB | Network error | Reconnect automatically |
| Authentication | Invalid credentials | Check .env variables |

## Security Architecture

### Authentication Flow

```
Client Request
    ↓
CORS Check
    ↓
API Key Validation (if enabled)
    ↓
Request Processing
    ↓
Response
```

### Data Protection

- **In Transit**: HTTPS/TLS encryption
- **At Rest**: Cosmos DB encryption
- **API Keys**: Environment variables, never in code
- **Input**: Sanitized by ValidationService
- **Logs**: PII filtered in Application Insights

## Scalability Considerations

### Frontend
- Static site hosting (Base44/Vercel)
- CDN for assets
- Client-side caching with React Query

### Backend
- Horizontal scaling with App Service
- Connection pooling for Cosmos DB
- Response caching for embeddings
- Async/await for concurrency

### Database
- Cosmos DB serverless for auto-scaling
- Partition by userId for even distribution
- Vector index for O(log n) search

## Performance Optimization

### Frontend
- Code splitting
- Lazy loading
- Memoization
- Request debouncing

### Backend
- Async I/O
- Connection pooling
- Caching layer
- Compression

## Monitoring & Observability

### Metrics

```
Application Insights
    ├─ Request count
    ├─ Response time
    ├─ Error rate
    ├─ Token usage
    └─ API latency
```

### Logging

```
Structured Logging
    ├─ Request/Response logging
    ├─ Service calls
    ├─ Database operations
    ├─ Error stack traces
    └─ Performance metrics
```

### Alerts

- High error rate (>5%)
- Slow responses (>5s)
- Rate limit exceeded
- Service unavailable

## Deployment Architecture

```
GitHub Repository
    ↓
GitHub Actions CI/CD
    ├─ Lint & Build
    ├─ Run Tests
    └─ Deploy
        ├─ Frontend → Static hosting
        └─ Backend → App Service
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
  Cosmos DB    Azure OpenAI  App Insights
```

## Integration Points

### External APIs

1. **Azure OpenAI**
   - GPT-4 Turbo completions
   - Text embeddings
   - Usage tracking

2. **GitHub Copilot API** (optional)
   - Direct API calls from frontend
   - Request routing through backend

3. **Cosmos DB**
   - Chat history
   - Vector similarity search
   - User data

## Future Enhancements

- [ ] WebSocket support for real-time chat
- [ ] Function calling for tool integration
- [ ] Vision capabilities (image understanding)
- [ ] Multi-modal input (text + image)
- [ ] Conversation analytics & insights
- [ ] Custom model fine-tuning
- [ ] Rate limiting per user/tier
