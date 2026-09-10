# AGENTS.md

## Project Context

This is a unified full-stack copilot application combining Base44 frontend with Azure backend. This is user-owned application code; keep changes focused on the user's request and preserve existing project conventions.

## Key Files & Structure

### Frontend
- `frontend/README.md`: Local setup, environment variables, Base44 workflow
- `frontend/src/api/copilotClient.js`: GitHub Copilot SDK client (primary AI client)
- `frontend/src/api/base44Client.js`: Base44 SDK client
- `frontend/vite.config.js`: Vite config and Base44 Vite plugin setup
- `frontend/.env.local`: Local-only environment values; never commit secrets

### Backend
- `backend/README.md`: .NET setup, Azure deployment, API documentation
- `backend/src/Services/CopilotService.cs`: Main Copilot/Azure OpenAI integration
- `backend/src/Services/AzureOpenAIService.cs`: Azure OpenAI API wrapper
- `backend/src/Services/CosmosDbService.cs`: Cosmos DB chat history persistence
- `backend/Program.cs`: ASP.NET Core configuration

### Infrastructure
- `infra/main.bicep`: Main infrastructure deployment
- `infra/modules/`: Individual Azure resource templates

### Documentation
- `docs/COPILOT_SETUP.md`: GitHub Copilot integration guide
- `docs/MIGRATION_GUIDE.md`: Migrating from Claude API
- `docs/ARCHITECTURE.md`: System architecture
- `docs/API_REFERENCE.md`: Backend API endpoints

## Working with Copilot

### Frontend Development

1. **Setup Base44 backend** (recommended for full-stack dev):
   ```bash
   cd frontend
   npm install -g base44@latest
   base44 dev
   ```

2. **Frontend-only development** (against hosted backend):
   ```bash
   npm run dev
   ```

3. **Run checks before committing**:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

### Backend Development

1. **Local development**:
   ```bash
   cd backend
   dotnet watch run
   ```

2. **Run tests**:
   ```bash
   dotnet test
   ```

3. **Deploy to Azure**:
   ```bash
   cd infra
   azd up
   ```

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md
- GitHub integration: https://docs.base44.com/Integrations/Using-GitHub

To install/update Base44 skills:
```bash
cd frontend
npx skills add base44/skills
```

## GitHub Copilot References

- GitHub Copilot API: https://docs.github.com/en/copilot/copilot-api
- Copilot Chat API: https://docs.github.com/en/copilot/copilot-chat/copilot-chat-overview
- Azure OpenAI Service: https://learn.microsoft.com/azure/cognitive-services/openai/

## Working Notes

### Frontend
- Use `base44 dev` as default for local development with Base44 backend
- Use `npm run dev` only for frontend-only work against hosted backend
- Prefer existing Base44 CLI workflow over adding new npm scripts
- Reuse existing SDK client and Vite plugin patterns
- GitHub Copilot client (`copilotClient.js`) is the primary AI integration

### Backend
- Use `dotnet watch run` for active development
- `CopilotService.cs` handles all AI-related requests
- `CosmosDbService.cs` manages chat history and vector search
- Update `appsettings.json` for environment-specific configuration
- Always use dependency injection for service initialization

### Infrastructure
- All Azure resources defined in Bicep
- Use `azd up` for full deployment
- Use `azd down --force --purge` to cleanup
- Bicep templates are parameterized for flexibility

### Shared
- All secrets in `.env` and `.env.local`, never committed
- Environment variables prefixed: `VITE_` (frontend), none (backend)
- API communication uses `/api/` routes
- Both frontend and backend use GitHub Copilot as primary AI provider

## Common Tasks

### Adding a new Copilot feature
1. Create endpoint in `backend/src/Controllers/CopilotController.cs`
2. Add service method in `backend/src/Services/CopilotService.cs`
3. Add UI component in `frontend/src/components/`
4. Call via `copilotClient` from `frontend/src/api/copilotClient.js`
5. Test locally with `base44 dev` (frontend) and `dotnet watch run` (backend)

### Updating Azure OpenAI model
1. Update `AZURE_OPENAI_DEPLOYMENT` in `.env`
2. Update model version in `CopilotService.cs`
3. Test with `dotnet watch run`
4. Deploy with `azd up`

### Migrating from Claude API
See `docs/MIGRATION_GUIDE.md` for step-by-step instructions.

## Troubleshooting

### Frontend won't connect to backend
- Check `VITE_API_BASE_URL` in `.env.local`
- Ensure backend is running and CORS is configured
- Check browser console for network errors

### Copilot API errors
- Verify `GITHUB_COPILOT_API_KEY` is set correctly
- Check GitHub Copilot billing and rate limits
- See `docs/COPILOT_SETUP.md` for detailed troubleshooting

### Azure OpenAI errors
- Verify `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` are correct
- Ensure model deployment name exists in Azure portal
- Check Azure quota limits for the model
- See Azure OpenAI documentation

### Cosmos DB connection issues
- Verify `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` are correct
- Ensure database and container exist
- Check firewall rules in Azure portal
- Review connection string format
