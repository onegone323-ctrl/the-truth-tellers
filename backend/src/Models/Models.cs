using Microsoft.Azure.Cosmos;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdpovCopilot.Models;

/// <summary>
/// Represents a chat message in a conversation
/// </summary>
public class ChatMessage
{
    public string Role { get; set; } // "user", "assistant", "system"
    public string Content { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Represents a conversation stored in Cosmos DB
/// </summary>
public class Conversation
{
    [JsonProperty("id")]
    public string Id { get; set; }
    
    public string UserId { get; set; }
    public string Title { get; set; }
    public List<ChatMessage> Messages { get; set; } = new();
    public List<double[]> Embeddings { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Request model for chat completion
/// </summary>
public class ChatCompletionRequest
{
    public string UserId { get; set; }
    public string Message { get; set; }
    public string Model { get; set; } = "gpt-4-turbo";
    public List<ChatMessage> Context { get; set; } = new();
    public float Temperature { get; set; } = 0.7f;
    public int MaxTokens { get; set; } = 2000;
    public float TopP { get; set; } = 1f;
}

/// <summary>
/// Response model for chat completion
/// </summary>
public class ChatCompletionResponse
{
    public string Id { get; set; }
    public string Object { get; set; } = "text_completion";
    public long Created { get; set; }
    public string Model { get; set; }
    public List<Choice> Choices { get; set; } = new();
    public Usage Usage { get; set; }
}

/// <summary>
/// Choice in completion response
/// </summary>
public class Choice
{
    public string Text { get; set; }
    public int Index { get; set; }
    public string FinishReason { get; set; }
}

/// <summary>
/// Token usage statistics
/// </summary>
public class Usage
{
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens { get; set; }
}

/// <summary>
/// Embedding response
/// </summary>
public class EmbeddingResponse
{
    public List<Embedding> Data { get; set; } = new();
    public string Model { get; set; }
    public Usage Usage { get; set; }
}

/// <summary>
/// Single embedding vector
/// </summary>
public class Embedding
{
    public int Index { get; set; }
    public List<double> Vector { get; set; }
    public string Object { get; set; } = "embedding";
}

/// <summary>
/// Error response
/// </summary>
public class ErrorResponse
{
    public string Message { get; set; }
    public string ErrorCode { get; set; }
    public int StatusCode { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
