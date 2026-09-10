# Backend - Azure .NET + GitHub Copilot

ASP.NET Core 8 application with Azure OpenAI, Cosmos DB, and GitHub Copilot integration.

## 🚀 Quick Start

### Prerequisites
- .NET 8 SDK or later
- Azure subscription
- Azure Developer CLI (azd)
- Visual Studio Code or Visual Studio
- GitHub Copilot API access

### Setup

```bash
# Restore dependencies
dotnet restore

# Copy environment template
cp .env.example .env

# Edit .env with your Azure credentials
nano .env
```

### Development

```bash
# Run with hot reload
dotnet watch run

# Or standard run
dotnet run

# Run tests
dotnet test

# Build for deployment
dotnet build -c Release
```

### Deploy to Azure

```bash
cd ../infra
azd auth login
azd up
```

## 📁 Project Structure

```
src/
├── Controllers/
│   ├── CopilotController.cs      # Copilot endpoints
│   ├── ChatController.cs          # Chat history endpoints
│   └── HealthController.cs        # Health check endpoint
├── Services/
│   ├── CopilotService.cs          # Main AI service (Copilot/Azure OpenAI)
│   ├── AzureOpenAIService.cs      # Azure OpenAI API wrapper
│   ├── CosmosDbService.cs         # Cosmos DB operations
│   └── ValidationService.cs       # Input validation & sanitization
├── Models/
│   ├── ChatMessage.cs             # Chat message model
│   ├── ChatCompletionRequest.cs   # API request models
│   ├── ChatCompletionResponse.cs  # API response models
│   └── ErrorResponse.cs           # Error response model
├── Middleware/
│   ├── ExceptionHandlingMiddleware.cs  # Global error handling
│   └── LoggingMiddleware.cs       # Request/response logging
├── Program.cs                     # ASP.NET Core configuration
├── appsettings.json               # App configuration
└── appsettings.Development.json   # Development settings

Tests/
└── CopilotService.Tests.cs        # Unit tests
```

## 🔧 Environment Variables

### Required

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4-turbo

# Cosmos DB
COSMOS_DB_ENDPOINT=https://your-cosmosdb.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=copilot_db
COSMOS_DB_CONTAINER=conversations

# GitHub Copilot (optional, for direct client calls)
GITHUB_COPILOT_API_KEY=your-github-copilot-api-key
```

### Optional

```env
# Logging
LOG_LEVEL=Information

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MINUTES=1

# API Version
API_VERSION=v1
```

## 🤖 GitHub Copilot Integration

### Copilot Service

The `CopilotService.cs` handles all AI requests:

```csharp
public interface ICopilotService
{
    Task<ChatCompletionResponse> GetChatCompletionAsync(
        ChatCompletionRequest request);
    
    Task<EmbeddingResponse> GetEmbeddingsAsync(
        string text);
    
    Task<bool> ValidateInputAsync(
        string input);
}
```

### Usage Example

```csharp
[ApiController]
[Route("api/[controller]")]
public class CopilotController : ControllerBase
{
    private readonly ICopilotService _copilotService;
    private readonly ICosmosDbService _cosmosDbService;

    public CopilotController(
        ICopilotService copilotService,
        ICosmosDbService cosmosDbService)
    {
        _copilotService = copilotService;
        _cosmosDbService = cosmosDbService;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> PostChatMessage(
        [FromBody] ChatCompletionRequest request)
    {
        // Validate input
        if (!await _copilotService.ValidateInputAsync(request.Message))
            return BadRequest("Invalid input");

        // Get AI response
        var response = await _copilotService.GetChatCompletionAsync(request);

        // Store in Cosmos DB
        await _cosmosDbService.SaveConversationAsync(
            userId: request.UserId,
            message: request.Message,
            response: response);

        return Ok(response);
    }
}
```

## 📚 API Endpoints

### POST `/api/copilot/chat`
Send a message and get AI response

**Request:**
```json
{
  "userId": "user-123",
  "message": "Hello, how are you?",
  "model": "gpt-4-turbo",
  "context": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
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
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 12,
    "total_tokens": 22
  }
}
```

### GET `/api/copilot/chat-history/{userId}`
Retrieve user's chat history

### POST `/api/copilot/embeddings`
Generate embeddings for semantic search

### DELETE `/api/copilot/chat/{conversationId}`
Delete a conversation

### GET `/health`
Health check endpoint

## 🗄️ Database Schema

### Conversations Collection
```json
{
  "id": "conv-123",
  "userId": "user-123",
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "embeddings": [],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## 🧪 Testing

```bash
# Run all tests
dotnet test

# Run specific test class
dotnet test --filter "ClassName=CopilotServiceTests"

# Run with verbose output
dotnet test --verbosity detailed
```

## 📊 Logging

Logging is configured in `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  }
}
```

Access logs:
- Console output during development
- Application Insights in production (configured via Bicep)

## 🔐 Security

- API keys stored in environment variables
- Input validation and sanitization in `ValidationService.cs`
- CORS configured for frontend origin only
- Rate limiting on API endpoints
- Managed identities for Azure services
- HTTPS enforced in production

## 🚀 Performance

- Connection pooling for Cosmos DB
- Response caching where appropriate
- Async/await for non-blocking I/O
- Request/response compression
- Rate limiting to prevent abuse

## 🐛 Troubleshooting

### Azure OpenAI Connection
- Verify endpoint and API key are correct
- Ensure model deployment exists in Azure
- Check quota limits in Azure portal
- Review error logs in Application Insights

### Cosmos DB Issues
- Verify connection string is correct
- Ensure database and container exist
- Check firewall rules allow your IP
- Verify managed identity has correct RBAC roles

### API Errors
- Check request body format
- Verify authentication headers
- Review error response message
- Check backend logs

## 📖 Documentation

- [.NET 8 Documentation](https://learn.microsoft.com/dotnet/)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/cognitive-services/openai/)
- [Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/)
- [ASP.NET Core](https://learn.microsoft.com/aspnet/core/)

## 💬 Support

- GitHub Issues: Report bugs
- Azure Support: https://azure.microsoft.com/support/
- Stack Overflow: Tag with `azure-openai` and `cosmosdb`
