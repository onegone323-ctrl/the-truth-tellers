using Microsoft.Azure.Cosmos;
using AdpovCopilot.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdpovCopilot.Services;

/// <summary>
/// Interface for Cosmos DB operations
/// </summary>
public interface ICosmosDbService
{
    Task<Conversation> GetConversationAsync(string conversationId);
    Task<List<Conversation>> GetUserConversationsAsync(string userId);
    Task SaveConversationAsync(Conversation conversation);
    Task DeleteConversationAsync(string conversationId);
}

/// <summary>
/// Cosmos DB Service - manages chat history and persistence
/// </summary>
public class CosmosDbService : ICosmosDbService
{
    private readonly CosmosClient _cosmosClient;
    private readonly Container _container;
    private readonly ILogger<CosmosDbService> _logger;

    public CosmosDbService(
        IConfiguration configuration,
        ILogger<CosmosDbService> logger)
    {
        _logger = logger;

        var endpoint = configuration["CosmosDb:Endpoint"] 
            ?? Environment.GetEnvironmentVariable("COSMOS_DB_ENDPOINT")
            ?? throw new InvalidOperationException("Cosmos DB endpoint not configured");

        var key = configuration["CosmosDb:Key"] 
            ?? Environment.GetEnvironmentVariable("COSMOS_DB_KEY")
            ?? throw new InvalidOperationException("Cosmos DB key not configured");

        var database = configuration["CosmosDb:Database"] 
            ?? Environment.GetEnvironmentVariable("COSMOS_DB_DATABASE") 
            ?? "copilot_db";

        var container = configuration["CosmosDb:Container"] 
            ?? Environment.GetEnvironmentVariable("COSMOS_DB_CONTAINER") 
            ?? "conversations";

        _cosmosClient = new CosmosClient(endpoint, key);
        _container = _cosmosClient.GetContainer(database, container);
    }

    /// <summary>
    /// Get a specific conversation
    /// </summary>
    public async Task<Conversation> GetConversationAsync(string conversationId)
    {
        try
        {
            _logger.LogInformation("Retrieving conversation: {ConversationId}", conversationId);
            var response = await _container.ReadItemAsync<Conversation>(conversationId, new PartitionKey(conversationId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Conversation not found: {ConversationId}", conversationId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversation: {ConversationId}", conversationId);
            throw;
        }
    }

    /// <summary>
    /// Get all conversations for a user
    /// </summary>
    public async Task<List<Conversation>> GetUserConversationsAsync(string userId)
    {
        try
        {
            _logger.LogInformation("Retrieving conversations for user: {UserId}", userId);
            var query = _container.GetItemQueryIterator<Conversation>(
                new QueryDefinition("SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC")
                    .WithParameter("@userId", userId));

            var conversations = new List<Conversation>();
            while (query.HasMoreResults)
            {
                var response = await query.ReadNextAsync();
                conversations.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} conversations for user: {UserId}", conversations.Count, userId);
            return conversations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conversations for user: {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Save or update a conversation
    /// </summary>
    public async Task SaveConversationAsync(Conversation conversation)
    {
        try
        {
            conversation.UpdatedAt = DateTime.UtcNow;
            _logger.LogInformation("Saving conversation: {ConversationId}", conversation.Id);
            await _container.UpsertItemAsync(conversation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving conversation: {ConversationId}", conversation.Id);
            throw;
        }
    }

    /// <summary>
    /// Delete a conversation
    /// </summary>
    public async Task DeleteConversationAsync(string conversationId)
    {
        try
        {
            _logger.LogInformation("Deleting conversation: {ConversationId}", conversationId);
            await _container.DeleteItemAsync<Conversation>(conversationId, new PartitionKey(conversationId));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Conversation not found for deletion: {ConversationId}", conversationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting conversation: {ConversationId}", conversationId);
            throw;
        }
    }
}
