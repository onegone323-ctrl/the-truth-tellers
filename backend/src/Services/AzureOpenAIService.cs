using AdpovCopilot.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdpovCopilot.Services;

/// <summary>
/// Interface for Azure OpenAI operations
/// </summary>
public interface IAzureOpenAIService
{
    Task<ChatCompletionResponse> CreateChatCompletionAsync(
        List<Dictionary<string, string>> messages,
        string model,
        float temperature,
        int maxTokens,
        float topP);

    Task<EmbeddingResponse> CreateEmbeddingsAsync(string text);
}

/// <summary>
/// Azure OpenAI Service - wrapper around Azure OpenAI API
/// </summary>
public class AzureOpenAIService : IAzureOpenAIService
{
    private readonly string _endpoint;
    private readonly string _apiKey;
    private readonly string _deployment;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AzureOpenAIService> _logger;

    public AzureOpenAIService(
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<AzureOpenAIService> logger)
    {
        _endpoint = configuration["AzureOpenAI:Endpoint"] 
            ?? Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")
            ?? throw new InvalidOperationException("Azure OpenAI endpoint not configured");

        _apiKey = configuration["AzureOpenAI:ApiKey"] 
            ?? Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY")
            ?? throw new InvalidOperationException("Azure OpenAI API key not configured");

        _deployment = configuration["AzureOpenAI:Deployment"] 
            ?? Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT") 
            ?? "gpt-4-turbo";

        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Create chat completion
    /// </summary>
    public async Task<ChatCompletionResponse> CreateChatCompletionAsync(
        List<Dictionary<string, string>> messages,
        string model,
        float temperature,
        int maxTokens,
        float topP)
    {
        try
        {
            var url = $"{_endpoint.TrimEnd('/')}/openai/deployments/{_deployment}/chat/completions?api-version=2024-02-01";

            var request = new
            {
                messages,
                model = model ?? _deployment,
                temperature,
                max_tokens = maxTokens,
                top_p = topP
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(request),
                System.Text.Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);

            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = System.Text.Json.JsonSerializer.Deserialize<ChatCompletionResponse>(responseContent, options);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating chat completion");
            throw;
        }
    }

    /// <summary>
    /// Create embeddings
    /// </summary>
    public async Task<EmbeddingResponse> CreateEmbeddingsAsync(string text)
    {
        try
        {
            var url = $"{_endpoint.TrimEnd('/')}/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-02-01";

            var request = new
            {
                input = text,
                model = "text-embedding-3-large"
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(request),
                System.Text.Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);

            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = System.Text.Json.JsonSerializer.Deserialize<EmbeddingResponse>(responseContent, options);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating embeddings");
            throw;
        }
    }
}
