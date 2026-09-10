/**
 * GitHub Copilot API Client
 * Handles all AI/Copilot requests
 */

const API_KEY = import.meta.env.VITE_GITHUB_COPILOT_API_KEY;
const API_BASE_URL = 'https://api.github.com/copilot';

if (!API_KEY) {
  console.warn('GitHub Copilot API key not configured. Set VITE_GITHUB_COPILOT_API_KEY in .env.local');
}

class CopilotClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Copilot API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send a chat message and get a completion
   */
  async createCompletion(messages, options = {}) {
    try {
      const response = await this.request('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: options.model || 'gpt-4-turbo',
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0,
          ...options
        })
      });

      return response;
    } catch (error) {
      console.error('Copilot completion error:', error);
      throw error;
    }
  }

  /**
   * Stream a chat completion (real-time responses)
   */
  async streamCompletion(messages, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4-turbo',
          messages,
          stream: true,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Copilot stream error: ${response.statusText}`);
      }

      return response.body.getReader();
    } catch (error) {
      console.error('Copilot stream error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async createEmbeddings(texts, options = {}) {
    try {
      const response = await this.request('/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          model: options.model || 'text-embedding-3-large',
          input: texts,
          ...options
        })
      });

      return response;
    } catch (error) {
      console.error('Embedding error:', error);
      throw error;
    }
  }

  /**
   * Get models available to the user
   */
  async listModels() {
    try {
      return await this.request('/models');
    } catch (error) {
      console.error('List models error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const copilotClient = new CopilotClient(API_KEY);

// Export class for testing or custom instances
export { CopilotClient };
