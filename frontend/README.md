# Frontend - Base44 + GitHub Copilot

React application with Base44 backend and GitHub Copilot integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- GitHub Copilot API access
- Base44 CLI: `npm install -g base44@latest`

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

### Development

**Option 1: Full Stack (with Base44 backend)**
```bash
base44 dev
```

**Option 2: Frontend Only (against hosted backend)**
```bash
npm run dev
```

### Build & Deploy

```bash
npm run build       # Production build
npm run preview     # Preview build locally
npm run lint        # Run ESLint
npm run typecheck   # TypeScript type checking
```

## 📁 Project Structure

```
src/
├── api/
│   ├── base44Client.js       # Base44 SDK initialization
│   ├── copilotClient.js      # GitHub Copilot API client
│   └── index.js              # API exports
├── components/
│   ├── Chat/                 # Chat interface components
│   ├── Sidebar/              # Navigation sidebar
│   ├── Header/               # Top navigation
│   └── Layout/               # Page layout wrapper
├── pages/
│   ├── Home.jsx              # Main chat page
│   ├── Settings.jsx          # User settings
│   └── NotFound.jsx          # 404 page
├── lib/
│   ├── app-params.js         # App configuration
│   ├── hooks/                # Custom React hooks
│   └── utils.js              # Utility functions
├── App.jsx                   # Main app component
├── main.jsx                  # Entry point
└── styles/                   # Global styles
```

## 🔑 Environment Variables

### Required

```env
# Base44 Configuration
VITE_BASE44_APP_ID=your-base44-app-id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
VITE_BASE44_ACCESS_TOKEN=your-base44-access-token

# GitHub Copilot
VITE_GITHUB_COPILOT_API_KEY=your-copilot-api-key

# Backend API
VITE_API_BASE_URL=http://localhost:5000/api
```

### Optional

```env
# Development
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

## 💡 GitHub Copilot Integration

### Using Copilot Client

```javascript
import { copilotClient } from '@/api/copilotClient';

// Send message to Copilot
const response = await copilotClient.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
});

console.log(response.choices[0].message.content);
```

### Backend Integration

For complex operations, route through backend:

```javascript
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/copilot/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userInput,
    context: chatHistory
  })
});

const data = await response.json();
```

## 📦 Dependencies

### Core
- **React 18**: UI library
- **Vite 6**: Build tool
- **React Router**: Routing
- **Tailwind CSS**: Styling

### UI Components
- **Radix UI**: Accessible component library
- **Lucide React**: Icon library
- **Framer Motion**: Animations

### Data & State
- **TanStack Query**: Server state management
- **React Hook Form**: Form handling
- **Zod**: Schema validation

### Base44 & APIs
- **@base44/sdk**: Base44 client SDK
- **@base44/vite-plugin**: Vite integration

### AI/ML
- **GitHub Copilot API**: AI completions

## 🔗 API Routes

### GET `/api/copilot/chat-history`
Fetch user's chat history

### POST `/api/copilot/chat`
Send message and get response

```javascript
{
  message: string,
  context?: ChatMessage[],
  model?: string
}
```

### DELETE `/api/copilot/chat/:id`
Delete chat conversation

## 🧪 Testing

```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage
```

## 📚 Component Examples

### Chat Component

```jsx
import { ChatWindow } from '@/components/Chat/ChatWindow';

export function Home() {
  return (
    <ChatWindow 
      onMessage={handleMessage}
      isLoading={isLoading}
    />
  );
}
```

### Using Copilot Hook

```jsx
import { useCopilot } from '@/lib/hooks/useCopilot';

export function ChatInput() {
  const { sendMessage, isLoading } = useCopilot();
  
  const handleSend = async (text) => {
    const response = await sendMessage(text);
    console.log(response);
  };
  
  return (
    <input 
      onSubmit={handleSend}
      disabled={isLoading}
    />
  );
}
```

## 🐛 Troubleshooting

### API Connection Issues
- Verify `VITE_API_BASE_URL` in `.env.local`
- Ensure backend is running and accessible
- Check CORS configuration in backend
- Open browser DevTools → Network tab to debug requests

### GitHub Copilot Errors
- Verify API key is valid and active
- Check rate limits and quota usage
- Ensure model name matches deployment
- Review error response in console

### Base44 Backend Issues
- Confirm `VITE_BASE44_APP_ID` and token are correct
- Check Base44 dashboard for app status
- Review Base44 documentation: https://docs.base44.com

### Build Errors
- Clear `node_modules`: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`
- Check Node.js version: `node --version` (should be 18+)

## 📖 Documentation

- [Base44 Docs](https://docs.base44.com)
- [GitHub Copilot API](https://docs.github.com/en/copilot/copilot-api)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

## 🔒 Security

- Never commit `.env.local`
- Keep API keys secret
- Use HTTPS in production
- Validate all user inputs
- Follow Base44 security guidelines

## 💬 Support

- GitHub Issues: Report bugs
- Base44 Support: https://app.base44.com/support
- GitHub Copilot Support: https://support.github.com
