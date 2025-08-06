# LinkedInGenie Setup Instructions

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string (Railway provides this)
   - `JWT_SECRET`: A secure random string (minimum 32 characters)
   - `ENCRYPTION_SECRET`: Exactly 64 hex characters for AES-256 encryption
   - `LINKEDIN_CLIENT_ID` & `LINKEDIN_CLIENT_SECRET`: From your LinkedIn App
   - Optional AI API keys (users can also provide these via UI)

## LinkedIn App Setup

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create a new app
3. Add these OAuth redirect URLs:
   - `http://localhost:5000/api/posts/oauth/callback` (development)
   - `https://your-domain.com/api/posts/oauth/callback` (production)
4. Request permissions: `r_liteprofile`, `r_emailaddress`, `w_member_social`, `w_organization_social`

## Running the Application

### Development Mode:
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Production Mode:
```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

## Recent Fixes Applied

✅ **Authentication Flow**: Added proper JWT token handling structure
✅ **State Persistence**: Fixed localStorage syncing for all user preferences  
✅ **CORS Security**: Configured proper origin restrictions for production
✅ **Error Handling**: Implemented consistent error handling across controllers
✅ **Environment Variables**: Documented all required environment variables
✅ **API Routes**: Organized legacy routes with proper redirects
✅ **OAuth Flow**: Enhanced LinkedIn OAuth callback with proper popup handling

## Database

The application is configured to work with:
- **PostgreSQL** (Production - Railway)
- **SQLite** (Local development fallback)

The database will auto-sync models on startup.
