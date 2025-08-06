# LinkedIn Automation Platform 🚀

A comprehensive LinkedIn automation platform built with modern web technologies, featuring AI-powered content generation, scheduled posting, and enterprise-grade security features.

## ✨ Features

### 🤖 AI-Powered Content Generation
- **Multi-Provider Support**: OpenAI GPT-4, Google Gemini, and Perplexity AI
- **Intelligent Fallback**: Automatic provider switching if one fails
- **Customizable Prompts**: Tone, length, hashtags, and emoji preferences
- **Image Generation**: AI-powered image creation for posts

### 📅 Advanced Scheduling
- **Flexible Scheduling**: Schedule posts for optimal engagement times
- **Bulk Operations**: Schedule multiple posts with CSV import
- **Time Zone Support**: Automatic timezone handling
- **Queue Management**: View, edit, and cancel scheduled posts

### 🔐 Enterprise Security
- **JWT Authentication**: Secure user session management
- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Sanitization**: XSS and injection attack prevention
- **Security Headers**: Helmet.js for comprehensive security
- **Encrypted Storage**: Sensitive data encryption at rest

### 🔄 LinkedIn Integration
- **OAuth 2.0**: Secure LinkedIn account connection
- **Media Support**: Text posts with images (up to 9 per post)
- **Real-time Posting**: Instant publishing to LinkedIn
- **Post History**: Track all published content

### 📊 Monitoring & Logging
- **Comprehensive Logging**: Request, error, and API interaction logs
- **Health Monitoring**: System health checks and metrics
- **Performance Tracking**: Request timing and rate limit monitoring

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database (Railway deployment ready)
- **JWT** for authentication
- **Multer** for file uploads
- **Helmet** for security headers
- **Express Rate Limit** for API protection

### Frontend
- **React 19** with modern hooks
- **Vite** for fast development and building
- **Context API** for state management
- **Custom CSS** with LinkedIn-inspired design
- **Error Boundaries** for graceful error handling

### Security & Performance
- **Input sanitization** with DOMPurify and validator
- **Rate limiting** with configurable thresholds
- **CORS protection** with environment-based origins
- **Comprehensive logging** system
- **Error handling** middleware

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Railway account)
- LinkedIn Developer App credentials

### 1. Clone and Setup
```bash
git clone <repository-url>
cd linkedin-automation-platform

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file with your credentials:
```env
# Required
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
DATABASE_URL=postgresql://username:password@host:port/database

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-app-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-app-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:5000/api/posts/oauth/callback

# Optional AI Keys (users can provide their own)
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=pplx-your-perplexity-api-key
```

### 3. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Start Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access the application.

## 🔧 Configuration

### Rate Limiting
Customize rate limits in `.env`:
```env
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # General API limit
AUTH_RATE_LIMIT_MAX=10             # Auth endpoints
AI_RATE_LIMIT_MAX=20               # AI generation
POST_RATE_LIMIT_MAX=50             # Post creation
```

### Logging
Configure logging behavior:
```env
LOG_LEVEL=info                     # info, debug, warn, error
LOG_FILE_MAX_SIZE=10485760         # 10MB per log file
LOG_MAX_FILES=5                    # Number of log files to keep
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

### Content Generation
- `POST /api/posts/generate` - Generate AI content
- `POST /api/ai/generate-image` - Generate AI images

### LinkedIn Integration  
- `GET /api/posts/oauth/url` - Get LinkedIn OAuth URL
- `GET /api/posts/oauth/callback` - OAuth callback handler
- `POST /api/posts/post` - Publish post to LinkedIn

### Scheduling
- `POST /api/schedule/post` - Schedule a post
- `GET /api/schedule/posts` - Get scheduled posts
- `DELETE /api/schedule/posts/:id` - Cancel scheduled post

### System
- `GET /api/system/health` - System health check
- `GET /api/system/system` - Detailed system information

## 🧪 Testing & Validation

Run the comprehensive system validation:
```bash
# Start the backend server first
cd backend && npm start

# In another terminal, run validation
node validate-system.js
```

This will test:
- ✅ File structure integrity
- ✅ Environment variable configuration
- ✅ Database connectivity
- ✅ API endpoint functionality
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Security headers
- ✅ Logging system

## 🚀 Production Deployment

### Using the Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment Steps

1. **Environment Setup**
   ```bash
   export NODE_ENV=production
   export FRONTEND_URL=https://your-domain.com
   export LINKEDIN_REDIRECT_URI=https://your-domain.com/api/posts/oauth/callback
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

3. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

4. **Serve Frontend**
   Serve `frontend/dist/` using nginx, Apache, or your preferred web server.

### Railway Deployment
This project is optimized for Railway deployment:

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically with git push

## 📁 Project Structure

```
linkedin-automation-platform/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation, logging
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper functions
│   ├── server.js           # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Frontend utilities
│   ├── App.jsx            # Main React component
│   └── package.json
├── .env.example           # Environment template
├── deploy.sh             # Production deployment script
├── validate-system.js    # System validation script
└── README.md
```

## 🛡️ Security Features

- **Authentication**: JWT-based with secure token management
- **Rate Limiting**: Configurable limits per endpoint type
- **Input Sanitization**: XSS and injection prevention
- **CORS Protection**: Environment-based origin validation
- **Security Headers**: Comprehensive HTTP security headers
- **Data Encryption**: Sensitive information encrypted at rest
- **Error Handling**: Secure error responses without data leakage

## 🔍 Monitoring & Observability

### Logging
- **Request Logs**: All API requests with timing
- **Error Logs**: Detailed error tracking
- **Auth Logs**: Authentication events
- **LinkedIn API Logs**: Third-party API interactions

### Health Checks
- System health endpoint at `/api/system/health`
- Database connectivity monitoring
- Memory usage tracking
- Environment validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run validation tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the validation script output for common issues
- Review the comprehensive logging in `backend/logs/`
- Ensure all environment variables are properly configured
- Verify LinkedIn OAuth app settings match your configuration

---

**Built with ❤️ for the LinkedIn automation community**
