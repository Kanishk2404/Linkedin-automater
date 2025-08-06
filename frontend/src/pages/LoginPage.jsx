import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/AuthForm';
import LiquidChromeBackground from '../components/LiquidChromeBackground';

function LoginPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <LiquidChromeBackground>
        <div className="loading-state">
          <h1>LinkedInGenie</h1>
          <p>Loading...</p>
        </div>
      </LiquidChromeBackground>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <LiquidChromeBackground>
      <div className="liquid-chrome-auth-container">
        <div className="auth-header">
          <h1>LinkedInGenie</h1>
          <p>Automate your LinkedIn posts with AI</p>
        </div>
        <AuthForm />
      </div>
    </LiquidChromeBackground>
  );
}

export default LoginPage;
