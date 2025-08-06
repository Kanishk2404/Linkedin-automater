import { useState } from 'react';
import { apiFetch } from '../utils/api';
import './ForgotPasswordForm.css';

const ForgotPasswordForm = ({ onBackToLogin, onResetSuccess }) => {
  const [step, setStep] = useState(1); // 1: email, 2: code + new password
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.message || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!resetCode.trim()) {
      setError('Reset code is required');
      return;
    }
    
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ 
          email: email.trim(),
          resetCode: resetCode.trim(), 
          newPassword 
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password reset successful! You can now log in with your new password.');
        setTimeout(() => {
          onResetSuccess();
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('');
  };

  return (
    <div className="forgot-password-form">
      <div className="form-header">
        <h2>Reset Password</h2>
        <p className="form-subtitle">
          {step === 1 
            ? "Enter your email address and we'll send you a reset code" 
            : "Enter the reset code and your new password"
          }
        </p>
      </div>

      <div className="step-indicator">
        <div className={`step ${step === 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <span>Email</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <span>Reset</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {step === 1 ? (
        <form onSubmit={handleRequestReset}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              autoComplete="email"
            />
            <div className="help-text">
              We'll send a 6-digit reset code to this email address
            </div>
          </div>

          <div className="button-group">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onBackToLogin}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="reset-code">Reset Code</label>
            <input
              type="text"
              id="reset-code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="code-input"
              required
              autoComplete="one-time-code"
            />
            <div className="help-text">
              Check your email for the 6-digit reset code
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={6}
              required
              autoComplete="new-password"
            />
            <div className="help-text">
              Password must be at least 6 characters long
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="button-group">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleBackToStep1}
              disabled={loading}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button 
              type="button"
              className="link-btn"
              onClick={onBackToLogin}
            >
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordForm;
