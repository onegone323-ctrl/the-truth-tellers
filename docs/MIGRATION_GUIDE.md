# Migration Guide: Claude API → GitHub Copilot

Step-by-step guide to migrate from Claude API to GitHub Copilot/Azure OpenAI.

## 📊 Comparison

| Feature | Claude | GitHub Copilot |
|---------|--------|------------------|
| **API Type** | REST | REST |
| **Models** | Claude 2/3 | GPT-4 Turbo |
| **Cost** | $0.003-$0.024/1K tokens | $0.01-$0.03/1K tokens |
| **Speed** | Moderate | Fast |
| **Context Window** | 100K tokens | 128K tokens |
| **Strengths** | Long context, reasoning | Performance, integration |

## 🔄 Migration Steps

### Phase 1: Setup (Week 1)

#### Step 1.1: Get GitHub Copilot API Access

```bash
# 1. Go to https://github.com/settings/copilot
# 2. Enable Copilot API access
# 3. Generate API key
# 4. Add to .env files
```

#### Step 1.2: Setup Azure OpenAI (Optional but Recommended)

```bash
# 1. Log in to Azure Portal
# 2. Create Azure OpenAI resource
# 3. Deploy GPT-4 model
# 4. Get endpoint and key
# 5. Add to .env
```

#### Step 1.3: Create Feature Branch

```bash
git checkout -b migration/claude-to-copilot
```

### Phase 2: Frontend Migration (Week 1-2)

#### Step 2.1: Uninstall Claude SDK

```bash
cd frontend
npm uninstall @anthropic-sdk/sdk
```

#### Step 2.2: Create Copilot Client

Replace your Claude client with the new Copilot client:

```javascript
// OLD: frontend/src/api/claudeClient.js (DELETE THIS)
import Anthropic from '@anthropic-sdk/sdk';
const client = new Anthropic();
const response = await client.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }]
});
```

```javascript
// NEW: frontend/src/api/copilotClient.js (COPY FROM REPO)
import { copilotClient } from '@/api/copilotClient';
const response = await copilotClient.createCompletion([
  { role: 'user', content: 'Hello' }
]);
```

#### Step 2.3: Update Message Format

```javascript
// OLD Claude format
const response = await client.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  system: 'You are helpful',
  messages: [
    { role: 'user', content: 'Hello' }
  ]
});
const text = response.content[0].text;

// NEW Copilot format
const response = await copilotClient.createCompletion([
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hello' }
],  {
  model: 'gpt-4-turbo',
  maxTokens: 1024
});
const text = response.choices[0].text;
```

#### Step 2.4: Update Response Handling

```javascript
// OLD Claude response
if (response.stop_reason === 'end_turn') {
  console.log('Done');
}
const text = response.content[0].text;

// NEW Copilot response
if (response.choices[0].finish_reason === 'stop') {
  console.log('Done');
}
const text = response.choices[0].text;
```

#### Step 2.5: Update Error Handling

```javascript
// OLD Claude errors
try {
  const response = await client.messages.create(...);
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    console.error(error.message);
  }
}

// NEW Copilot errors
try {
  const response = await copilotClient.createCompletion(...);
} catch (error) {
  console.error('Copilot API Error:', error.message);
}
```

### Phase 3: Backend Migration (Week 2-3)

#### Step 3.1: Remove Claude SDK

```bash
cd backend
rm -rf Anthropic.SDK.* packages
```

#### Step 3.2: Update Dependencies

```xml
<!-- OLD: backend/backend.csproj -->
<PackageReference Include="Anthropic.SDK" Version="5.0.0" />

<!-- NEW: Remove Claude, Azure OpenAI is already there -->
<!-- Azure.AI.OpenAI is already included -->
```

#### Step 3.3: Create Copilot Service

```csharp
// OLD: Claude Service
public class ClaudeService
{
    public async Task<string> GetResponseAsync(string prompt)
    {
        var response = await _client.Messages.CreateAsync(
            model: "claude-3-sonnet-20240229",
            maxTokens: 1024,
            messages: new[] { new MessageParam { Role = "user", Content = prompt } }
        );
        return response.Content[0].Text;
    }
}

// NEW: Copilot Service
public class CopilotService : ICopilotService
{
    public async Task<ChatCompletionResponse> GetChatCompletionAsync(
        ChatCompletionRequest request)
    {
        var messages = new List<Dictionary<string, string>>
        {
            new() { { "role", "user" }, { "content", request.Message } }
        };
        return await _azureOpenAIService.CreateChatCompletionAsync(
            messages, request.Model, request.Temperature, request.MaxTokens);
    }
}
```

#### Step 3.4: Update Controllers

```csharp
// OLD
[HttpPost("claude/chat")]
public async Task<IActionResult> PostClaudeMessage(
    [FromBody] ClaudeRequest request)
{
    var response = await _claudeService.GetResponseAsync(request.Message);
    return Ok(new { response });
}

// NEW
[HttpPost("copilot/chat")]
public async Task<IActionResult> PostCopilotMessage(
    [FromBody] ChatCompletionRequest request)
{
    var response = await _copilotService.GetChatCompletionAsync(request);
    return Ok(response);
}
```

#### Step 3.5: Update Configuration

```csharp
// OLD: appsettings.json
{
  "Claude": {
    "ApiKey": "sk-ant-..."
  }
}

// NEW: appsettings.json
{
  "AzureOpenAI": {
    "Endpoint": "https://xxx.openai.azure.com/",
    "ApiKey": "...",
    "Deployment": "gpt-4-turbo"
  }
}
```

### Phase 4: Testing (Week 3-4)

#### Step 4.1: Unit Tests

```csharp
[Test]
public async Task GetChatCompletion_ReturnsValidResponse()
{
    var request = new ChatCompletionRequest
    {
        Message = "Hello",
        Model = "gpt-4-turbo"
    };

    var response = await _copilotService.GetChatCompletionAsync(request);

    Assert.NotNull(response);
    Assert.NotEmpty(response.Choices);
}
```

#### Step 4.2: Integration Tests

```bash
# Test frontend
cd frontend
npm run test

# Test backend
cd ../backend
dotnet test
```

#### Step 4.3: Manual Testing

```bash
# Start frontend
cd frontend
base44 dev

# In another terminal, start backend
cd backend
dotnet watch run

# Test in browser at http://localhost:3000
```

### Phase 5: Deployment (Week 4)

#### Step 5.1: Update Environment Variables

```bash
# Azure Portal → App Service → Configuration
# Add:
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com/
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_DEPLOYMENT=gpt-4-turbo

# GitHub settings
VITE_GITHUB_COPILOT_API_KEY=ghp_xxx
```

#### Step 5.2: Deploy Backend

```bash
cd backend
dotnet publish -c Release
az webapp deployment source config-zip --resource-group myRg --name myApp --src dist.zip
```

#### Step 5.3: Deploy Frontend

```bash
cd frontend
npm run build
base44 publish  # If using Base44
```

#### Step 5.4: Monitor & Verify

```bash
# Check logs
az webapp log tail --resource-group myRg --name myApp

# Test production
curl https://myapp.com/api/copilot/chat -X POST -d '{"message":"test"}'
```

### Phase 6: Cleanup (Week 4)

#### Step 6.1: Remove Claude References

```bash
# Search for any remaining Claude references
grep -r "claude" . --include="*.js" --include="*.cs"
grep -r "Anthropic" . --include="*.cs"
```

#### Step 6.2: Delete Claude Files

```bash
rm -f frontend/src/api/claudeClient.js
rm -f backend/src/Services/ClaudeService.cs
```

#### Step 6.3: Update Documentation

- [ ] Update README
- [ ] Update API docs
- [ ] Update environment variable docs
- [ ] Archive old Claude documentation

#### Step 6.4: Merge PR

```bash
git add .
git commit -m "Migration: Replace Claude API with GitHub Copilot"
git push origin migration/claude-to-copilot
# Create PR and merge after review
```

## 📋 Migration Checklist

### Frontend
- [ ] Remove `@anthropic-sdk/sdk` dependency
- [ ] Create/copy `copilotClient.js`
- [ ] Update all Claude API calls
- [ ] Update message format to OpenAI format
- [ ] Update response parsing
- [ ] Update error handling
- [ ] Test locally with `npm run dev`
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm run test`

### Backend
- [ ] Remove Claude NuGet package
- [ ] Create `CopilotService.cs`
- [ ] Create `AzureOpenAIService.cs`
- [ ] Update controllers
- [ ] Update configuration
- [ ] Add Azure OpenAI settings to appsettings.json
- [ ] Unit tests pass: `dotnet test`
- [ ] Integration tests pass
- [ ] Code review completed

### Infrastructure
- [ ] Update Azure resources (if using Azure OpenAI)
- [ ] Configure environment variables
- [ ] Update deployment scripts
- [ ] Test deployment pipeline

### Documentation
- [ ] Update README
- [ ] Update setup guide
- [ ] Update API documentation
- [ ] Update troubleshooting guide
- [ ] Archive old Claude docs

## 🚨 Rollback Plan

If issues occur:

```bash
# Revert to previous commit
git revert <commit-hash>

# Or restore from backup branch
git checkout main
git reset --hard origin/main
```

## 💡 Key Differences

### Response Format

**Claude:**
```json
{
  "id": "msg_xxx",
  "content": [{ "type": "text", "text": "Hello" }],
  "stop_reason": "end_turn"
}
```

**Copilot/OpenAI:**
```json
{
  "id": "chatcmpl-xxx",
  "choices": [{ "text": "Hello", "finish_reason": "stop" }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 5 }
}
```

### Pricing Comparison

**Claude 3 Sonnet:**
- Input: $0.003/1K tokens
- Output: $0.015/1K tokens

**GPT-4 Turbo:**
- Input: $0.01/1K tokens
- Output: $0.03/1K tokens

GPT-4 Turbo is ~3x more expensive but significantly faster.

## 📞 Support

- Migration issues: Create GitHub issue
- API issues: Check GitHub Copilot docs
- Azure issues: Azure Support portal

