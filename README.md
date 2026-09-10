# THE TRUTH TELLER

A unified full-stack copilot application combining a Base44 React frontend with an Azure Cosmos DB + .NET backend, powered by GitHub Copilot and Azure OpenAI.

## 🎯 Overview

This project replaces Claude API dependency with GitHub Copilot and Azure OpenAI integration across both frontend and backend, providing:

- **Frontend**: Base44 React application with GitHub Copilot integration
- **Backend**: Azure Cosmos DB + .NET 8 with Azure OpenAI Service
- **Infrastructure**: Azure Bicep templates for IaC deployment
- **Authentication**: GitHub Copilot API + Azure OpenAI API keys

## 📁 Project Structure

```
adpov-copilot-unified/
├── frontend/                    # Base44 React application
│   ├── src/
│   │   ├── api/
│   │   │   ├── base44Client.js
│   │   │   ├── copilotClient.js
│   │   │   └── index.js
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.local.example
│   └── README.md
├── backend/                     # Azure .NET application
│   ├── src/
│   │   ├── Services/
│   │   │   ├── CopilotService.cs
│   │   │   ├── AzureOpenAIService.cs
│   │   │   └── CosmosDbService.cs
│   │   ├── Models/
│   │   ├── Controllers/
│   │   ├── Program.cs
│   │   └── appsettings.json
│   ├── *.csproj
│   ├── .env.example
│   └── README.md
├── infra/                       # Azure Infrastructure as Code
│   ├── main.bicep
│   ├── modules/
│   │   ├── cosmos.bicep
│   │   ├── openai.bicep
│   │   └── appservice.bicep
│   └── README.md
├── docs/                        # Documentation
│   ├── COPILOT_SETUP.md
│   ├── MIGRATION_GUIDE.md
│   ├── API_REFERENCE.md
│   └── ARCHITECTURE.md
└── .github/
    └── workflows/
        ├── ci-frontend.yml
        ├── ci-backend.yml
        └── deploy.yml
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- .NET 8 SDK
- Azure CLI & Azure Developer CLI (azd)
- Git
- GitHub Copilot API access
- Azure subscription with OpenAI service access

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

### Backend Setup

```bash
cd backend
dotnet restore
cp .env.example .env
# Edit .env with your credentials
dotnet run
```

### Full Stack with Azure

```bash
cd infra
azd auth login
azd up
```

## 🔐 Environment Variables

### Frontend (.env.local)

```env
VITE_BASE44_APP_ID=your-base44-app-id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
VITE_BASE44_ACCESS_TOKEN=your-base44-token
VITE_GITHUB_COPILOT_API_KEY=your-github-copilot-api-key
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (.env)

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4-turbo
COSMOS_DB_ENDPOINT=https://your-cosmosdb.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=your-database-name
```

## 🔄 Migration from Claude API

See [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for detailed steps to migrate from Claude API to GitHub Copilot.

**Key Changes:**
- Replace `@anthropic-sdk` with GitHub Copilot API
- Update API endpoints and authentication
- Adjust response parsing for new API format
- Update error handling

## 📚 Documentation

- [COPILOT_SETUP.md](docs/COPILOT_SETUP.md) - GitHub Copilot integration guide
- [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) - Migrating from Claude API
- [API_REFERENCE.md](docs/API_REFERENCE.md) - API endpoints documentation
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture overview

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│         React Frontend (Base44)         │
│  ┌────────────────────────────────────┐   │
│  │  GitHub Copilot Client           │   │
│  │  - Chat completions              │   │
│  │  - Context management            │   │
│  └────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                   │ HTTPS API
┌──────────────────────────────┬──────────────────────────────┐
│      .NET 8 Backend (ASP.NET Core)      │
│  ┌────────────────────────────────────┐   │
│  │  Copilot Service                 │   │
│  │  - Request routing               │   │
│  │  - Response transformation       │   │
│  ├────────────────────────────────────┤   │
│  │  Azure OpenAI Service            │   │
│  │  - GPT-4 Turbo completions       │   │
│  │  - Embeddings & vector search    │   │
│  ├────────────────────────────────────┤   │
│  │  Cosmos DB Service               │   │
│  │  - Chat history storage          │   │
│  │  - Vector similarity search      │   │
│  └────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    ┌────┴──────┐      ┌──────┴──────┐
    │ Cosmos DB │      │ Azure       │
    │ NoSQL     │      │ OpenAI      │
    └───────────┘      └─────────────┘
```

## 🔒 Security

- **API Keys**: Managed via environment variables, never committed
- **Authentication**: GitHub Copilot API + Azure service principals
- **Database**: Cosmos DB RBAC with managed identities
- **HTTPS**: All API communication encrypted
- **CORS**: Configured for frontend origin only

## 📝 Available Scripts

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run preview      # Preview production build
```

### Backend

```bash
dotnet run           # Run development server
dotnet build         # Build solution
dotnet test          # Run tests
dotnet publish       # Publish for deployment
```

## 🚢 Deployment

### Azure Deployment

```bash
cd infra
azd up
```

This deploys:
- Azure App Service (Backend)
- Azure Cosmos DB
- Azure OpenAI Service
- Application Insights
- Storage account for logs

### GitHub Actions CI/CD

Automated workflows for:
- Frontend: Lint, type-check, build, deploy
- Backend: Build, test, publish, deploy
- Infrastructure: Validate, deploy

See `.github/workflows/` for details.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## 📄 License

See LICENSE file for details.

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/ADPOV-MEDIA-ENT/adpov-copilot-unified/issues)
- Documentation: [docs/](docs/)
- Base44 Support: https://app.base44.com/support
- Azure Support: https://azure.microsoft.com/support/

## 📖 Learn More

- [Base44 Documentation](https://docs.base44.com)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/cognitive-services/openai/)
- [Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/)
- [GitHub Copilot API](https://docs.github.com/en/copilot/copilot-api)
