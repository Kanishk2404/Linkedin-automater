import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ForgotPasswordForm from './ForgotPasswordForm';

const AuthForm = ({ onSuccess, isRegister = false }) => {
  const [isLogin, setIsLogin] = useState(!isRegister);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        if (!formData.username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        result = await signup(formData.username, formData.email, formData.password);
      }

      if (result.success) {
        onSuccess();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      username: '',
      email: '',
      password: ''
    });
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setError('');
  };

  const handleResetSuccess = () => {
    setShowForgotPassword(false);
    setError('');
    // Optionally show a success message
  };

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm 
        onBackToLogin={handleBackToLogin}
        onResetSuccess={handleResetSuccess}
      />
    );
  }

  return (
    <div className="auth-form">
      <div className="form-section">
        <h2>{isLogin ? 'Login to LinkedInGenie' : 'Create Account'}</h2>
        <p className="subtitle">
          {isLogin 
            ? 'Sign in to access your LinkedIn automation dashboard' 
            : 'Join LinkedInGenie to start automating your LinkedIn content'
          }
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required={!isLogin}
                placeholder="Enter your username"
              />
            </div>
          )}

          <div className="input-group">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email address"
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="6"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            {!isLogin && (
              <small className="info-text">
                Password must be at least 6 characters long
              </small>
            )}
            {isLogin && (
              <div className="forgot-password-container">
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="forgot-password-link"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="auth-link"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="auth-link"
              >
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
