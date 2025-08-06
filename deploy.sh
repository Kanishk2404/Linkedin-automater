#!/bin/bash

# LinkedIn Automation Platform - Production Deployment Script

echo "🚀 Starting production deployment..."

# Check if required files exist
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "💡 Please copy .env.example to .env and configure your environment variables"
    exit 1
fi

# Check if required environment variables are set
source .env
required_vars=("JWT_SECRET" "DATABASE_URL" "LINKEDIN_CLIENT_ID" "LINKEDIN_CLIENT_SECRET")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --only=production
cd ..

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies and building..."
cd frontend
npm ci
npm run build
cd ..

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/logs

# Set proper permissions
echo "🔒 Setting permissions..."
chmod 755 backend/uploads
chmod 755 backend/logs

# Migrate database
echo "🗄️ Running database migrations..."
cd backend
npm run migrate
cd ..

echo "✅ Production deployment completed successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Configure your reverse proxy (nginx/Apache)"
echo "2. Set up SSL certificates"
echo "3. Configure process manager (PM2/systemd)"
echo "4. Set up monitoring and logging"
echo ""
echo "💡 To start the application:"
echo "   Backend: cd backend && npm start"
echo "   Frontend is built and ready to serve from frontend/dist/"
