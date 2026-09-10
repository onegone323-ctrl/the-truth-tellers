using Microsoft.Azure.Cosmos;
using AdpovCopilot.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdpovCopilot.Services;

/// <summary>
/// Interface for Copilot/Azure OpenAI operations
/// </summary>
public interface ICopilotService
{
    Task<ChatCompletionResponse> GetChatCompletionAsync(ChatCompletionRequest request);
    Task<EmbeddingResponse> GetEmbeddingsAsync(string text);
    Task<bool> ValidateInputAsync(string input);
}

/// <summary>
/// Copilot Service - handles all AI requests via Azure OpenAI
/// </summary>
public class CopilotService : ICopilotService
{
    private readonly IAzureOpenAIService _azureOpenAIService;
    private readonly ILogger<CopilotService> _logger;
    private readonly IValidationService _validationService;

    public CopilotService(
        IAzureOpenAIService azureOpenAIService,
        IValidationService validationService,
        ILogger<CopilotService> logger)
    {
        _azureOpenAIService = azureOpenAIService;
        _validationService = validationService;
        _logger = logger;
    }

    /// <summary>
    /// Get chat completion from Azure OpenAI (Copilot)
    /// </summary>
    public async Task<ChatCompletionResponse> GetChatCompletionAsync(ChatCompletionRequest request)
    {
        try
        {
            _logger.LogInformation("Processing chat completion for user: {UserId}", request.UserId);

            // Validate input
            if (!await _validationService.ValidateInputAsync(request.Message))
            {
                throw new ArgumentException("Invalid input message");
            }

            // Prepare messages for API
            var messages = new List<Dictionary<string, string>>
            {
                new() { { "role", "user" }, { "content", request.Message } }
            };

            // Add context if provided
            if (request.Context?.Count > 0)
            {
                // Insert context messages before the current message
                messages.InsertRange(0, request.Context.Select(m => 
                    new Dictionary<string, string>
                    {
                        { "role", m.Role },
                        { "content", m.Content }
                    }).ToList());
            }

            // Call Azure OpenAI
            var response = await _azureOpenAIService.CreateChatCompletionAsync(
                messages: messages,
                model: request.Model,
                temperature: request.Temperature,
                maxTokens: request.MaxTokens,
                topP: request.TopP);

            _logger.LogInformation("Chat completion successful. Tokens used: {TotalTokens}", 
                response.Usage.TotalTokens);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting chat completion for user: {UserId}", request.UserId);
            throw;
        }
    }

    /// <summary>
    /// Generate embeddings for semantic search
    /// </summary>
    public async Task<EmbeddingResponse> GetEmbeddingsAsync(string text)
    {
        try
        {
            _logger.LogInformation("Generating embeddings for text length: {Length}", text.Length);

            // Validate input
            if (!await _validationService.ValidateInputAsync(text))
            {
                throw new ArgumentException("Invalid input text");
            }

            // Get embeddings from Azure OpenAI
            var response = await _azureOpenAIService.CreateEmbeddingsAsync(text);

            _logger.LogInformation("Embeddings generated successfully");
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embeddings");
            throw;
        }
    }

    /// <summary>
    /// Validate user input
    /// </summary>
    public async Task<bool> ValidateInputAsync(string input)
    {
        return await _validationService.ValidateInputAsync(input);
    }
}
