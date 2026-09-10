# GitHub Copilot Setup Guide

Complete guide to integrating GitHub Copilot API with your application.

## 📋 Prerequisites

- GitHub account with Copilot subscription
- GitHub Copilot API access enabled
- API key generated from GitHub settings
- Appropriate billing configured

## 🔑 Getting Your API Key

### Step 1: GitHub Settings

1. Go to https://github.com/settings/copilot
2. Click on "Copilot" in the sidebar
3. Navigate to "API keys" section
4. Click "Create new key"
5. Name it (e.g., "adpov-copilot-app")
6. Copy the generated key immediately (you won't see it again)

### Step 2: Store API Key

**Frontend (.env.local):**
```env
VITE_GITHUB_COPILOT_API_KEY=ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Backend (.env):**
```env
GITHUB_COPILOT_API_KEY=ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## 🚀 Frontend Integration

### Using Copilot Client

```javascript
import { copilotClient } from '@/api/copilotClient';

// Simple message
const response = await copilotClient.createCompletion([
  { role: 'user', content: 'Hello!' }
]);

console.log(response.choices[0].text);
```

### With Custom Options

```javascript
const response = await copilotClient.createCompletion(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is JavaScript?' }
  ],
  {
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 500,
    topP: 1
  }
);
```

### Streaming Responses

```javascript
const reader = await copilotClient.streamCompletion([
  { role: 'user', content: 'Write a poem' }
]);

const decoder = new TextDecoder();
let result = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  result += chunk;
  console.log('Streaming:', chunk);
}
```

## 🔧 Backend Integration

### Using Copilot Service

```csharp
[ApiController]
[Route("api/copilot")]
public class CopilotController : ControllerBase
{
    private readonly ICopilotService _copilotService;

    public CopilotController(ICopilotService copilotService)
    {
        _copilotService = copilotService;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatCompletionRequest request)
    {
        var response = await _copilotService.GetChatCompletionAsync(request);
        return Ok(response);
    }
}
```

## 🔄 Request/Response Format

### Chat Completion Request

```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "model": "gpt-4-turbo",
  "temperature": 0.7,
  "max_tokens": 2000,
  "top_p": 1
}
```

### Chat Completion Response

```json
{
  "id": "chatcmpl-8qP9Z1mq3Z1mq3Z1mq3Z1mq3Z1",
  "object": "text_completion",
  "created": 1694000000,
  "model": "gpt-4-turbo",
  "choices": [
    {
      "text": "Hello! How can I help you?",
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

## 💰 Pricing & Rate Limits

### Rate Limits
- **Requests per minute**: 100 (Enterprise), 60 (Pro)
- **Tokens per minute**: 90,000 (Enterprise), 60,000 (Pro)
- **Concurrent requests**: 5

### Pricing
- **GPT-4 Turbo**: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- **GPT-3.5 Turbo**: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens
- **Text Embedding**: $0.02 per 1M tokens

## 🛡️ Security Best Practices

1. **Never commit API keys** - Use `.env` files
2. **Rotate keys regularly** - Do it monthly
3. **Use environment variables** - Keep keys server-side when possible
4. **Monitor usage** - Check GitHub billing dashboard
5. **Validate inputs** - Sanitize user messages before sending
6. **Rate limit** - Implement client-side rate limiting
7. **Log requests** - Track API usage for debugging

## 🚨 Error Handling

### Common Errors

```javascript
try {
  const response = await copilotClient.createCompletion(messages);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Invalid API key');
  } else if (error.message.includes('429')) {
    console.error('Rate limit exceeded');
  } else if (error.message.includes('500')) {
    console.error('Server error');
  }
}
```

### Retry Logic

```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

// Usage
const response = await retryRequest(() => 
  copilotClient.createCompletion(messages)
);
```

## 📊 Monitoring & Debugging

### Enable Debug Logging

**Frontend:**
```javascript
// In .env.local
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

**Backend:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "AdpovCopilot.Services": "Debug"
    }
  }
}
```

### View API Usage

1. Go to https://github.com/settings/billing/overview
2. Click "Copilot" section
3. Check current usage and billing

## 🔗 API Reference

### Models Available

- `gpt-4-turbo` - Most capable, recommended for complex tasks
- `gpt-4` - Slightly older GPT-4 variant
- `gpt-3.5-turbo` - Faster, cheaper alternative
- `text-embedding-3-large` - For embeddings

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | gpt-4-turbo | Model to use |
| `temperature` | float | 0.7 | Randomness (0-2) |
| `max_tokens` | int | 2000 | Max output length |
| `top_p` | float | 1 | Nucleus sampling |
| `frequency_penalty` | float | 0 | Reduce repetition |
| `presence_penalty` | float | 0 | Encourage new topics |

## 🐛 Troubleshooting

### Issue: "Invalid API Key"
- **Solution**: Verify key in GitHub settings, regenerate if needed

### Issue: "Rate limit exceeded"
- **Solution**: Implement exponential backoff retry logic

### Issue: "Connection timeout"
- **Solution**: Check network connectivity, increase timeout values

### Issue: "CORS error"
- **Solution**: Proxy requests through backend, configure CORS properly

## 📚 Additional Resources

- [GitHub Copilot API Docs](https://docs.github.com/en/copilot/copilot-api)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Token Counter Tool](https://platform.openai.com/tokenizer)
- [GitHub Copilot Pricing](https://github.com/features/copilot/pricing)

## 💬 Support

- GitHub Support: https://support.github.com
- API Status: https://status.github.com
- Community: https://github.community
