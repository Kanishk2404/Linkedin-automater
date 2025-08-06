import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';

const LoginForm = ({
  userName,
  setUserName,
  perplexityApiKey,
  setPerplexityApiKey,
  geminiApiKey,
  setGeminiApiKey,
  openaiApiKey,
  setOpenaiApiKey,
  usePerplexity,
  setUsePerplexity,
  useGemini,
  setUseGemini,
  useOpenAI,
  setUseOpenAI,
  useOwnKeys,
  setUseOwnKeys,
  linkedinProfile,
  companyPages,
  onLinkedInConnect,
  onLogin,
  apiCallCount,
  getRemainingCalls,
  checkApiCallLimit,
  platformFees
}) => {
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleLinkedInConnect = async () => {
    setIsConnectingLinkedIn(true);
    try {
      // Get OAuth URL from backend
      const response = await authenticatedFetch('/api/posts/oauth/url');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.oauthUrl) {
          // Open LinkedIn OAuth in popup window
          const authWindow = window.open(data.oauthUrl, 'linkedin-oauth', 'width=600,height=600,scrollbars=yes,resizable=yes');
          
          // Listen for OAuth callback message
          const messageHandler = (event) => {
            if (event.data && event.data.type === 'LINKEDIN_OAUTH_SUCCESS') {
              const { profile, companyPages, accessToken, refreshToken } = event.data;
              onLinkedInConnect(profile, companyPages, accessToken, refreshToken);
              setIsConnectingLinkedIn(false);
              authWindow.close();
              window.removeEventListener('message', messageHandler);
            }
          };
          
          window.addEventListener('message', messageHandler);
          
          // Fallback: check if popup was closed
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', messageHandler);
              setIsConnectingLinkedIn(false);
            }
          }, 1000);
        } else {
          alert('Failed to get LinkedIn OAuth URL');
          setIsConnectingLinkedIn(false);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to get LinkedIn OAuth URL: ${errorData.message || 'Unknown error'}`);
        setIsConnectingLinkedIn(false);
      }
    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      alert('Failed to connect LinkedIn account');
      setIsConnectingLinkedIn(false);
    }
  };

  const getApiCallStatus = () => {
    const remaining = getRemainingCalls();
    const limits = useOwnKeys ? platformFees.ownKeys : platformFees.builtInKeys;
    const percentage = ((apiCallCount / limits.freeCalls) * 100).toFixed(1);
    
    return {
      remaining,
      percentage,
      isLimitReached: apiCallCount >= limits.freeCalls
    };
  };

  const apiCallStatus = getApiCallStatus();

  const whiteTextStyle = { color: '#fff' };

  return (
    <div className="login-form">
      <div className="form-section">
        <h2 style={whiteTextStyle}>Welcome to LinkedInGenie</h2>
        <p className="subtitle" style={whiteTextStyle}>AI-powered LinkedIn content automation</p>
        
        {/* Name Input */}
        <div className="input-group">
          <label htmlFor="userName" style={whiteTextStyle}>Your Name</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        {/* LinkedIn Connection */}
        <div className="input-group">
          <label style={whiteTextStyle}>LinkedIn Account</label>
          {linkedinProfile ? (
            <div className="linkedin-connected" style={whiteTextStyle}>
              <div className="profile-info">
                <img 
                  src={linkedinProfile.profilePicture || '/default-avatar.png'} 
                  alt="Profile" 
                  className="profile-pic"
                />
                <div>
                  <strong style={whiteTextStyle}>{linkedinProfile.firstName} {linkedinProfile.lastName}</strong>
                  <p style={whiteTextStyle}>{linkedinProfile.headline || 'LinkedIn Member'}</p>
                </div>
              </div>
              {companyPages.length > 0 && (
                <div className="company-pages">
                  <p><strong>Company Pages:</strong></p>
                  <ul>
                    {companyPages.map((page, index) => (
                      <li key={index}>{page.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => onLinkedInConnect(null, [], '', '')}
                className="disconnect-btn"
              >
                Disconnect LinkedIn
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLinkedInConnect}
              disabled={isConnectingLinkedIn}
              className="linkedin-connect-btn"
            >
              {isConnectingLinkedIn ? 'Connecting...' : 'Connect with LinkedIn'}
            </button>
          )}
        </div>

        {/* AI Provider Selection */}
        <div className="input-group">
          <label style={whiteTextStyle}>AI Provider</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                checked={!useOwnKeys}
                onChange={() => setUseOwnKeys(false)}
              />
              <span style={whiteTextStyle}>Use Built-in Keys (25 free calls/month)</span>
            </label>
            <label>
              <input
                type="radio"
                checked={useOwnKeys}
                onChange={() => setUseOwnKeys(true)}
              />
              <span style={whiteTextStyle}>Use Your Own Keys (100 free calls/month)</span>
            </label>
          </div>
        </div>

        {/* API Call Status */}
        <div className="api-status">
          <div className="status-bar">
            <div 
              className="status-fill" 
              style={{ 
                width: `${apiCallStatus.percentage}%`,
                backgroundColor: apiCallStatus.isLimitReached ? '#ff4444' : '#4CAF50'
              }}
            ></div>
          </div>
          <p className="status-text">
            {apiCallStatus.remaining} free calls remaining this month
            {apiCallStatus.isLimitReached && (
              <span className="limit-warning"> - Limit reached!</span>
            )}
          </p>
        </div>

        {/* Advanced Options */}
        <div className="advanced-toggle">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="toggle-btn"
          >
            {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>

        {showAdvancedOptions && (
          <div className="advanced-options">
            <h3 style={whiteTextStyle}>AI Provider Settings</h3>
            
            <div className="provider-group">
              <label>
                <input
                  type="checkbox"
                  checked={usePerplexity}
                  onChange={(e) => setUsePerplexity(e.target.checked)}
                />
                <span style={whiteTextStyle}>Perplexity AI</span>
              </label>
              {usePerplexity && (
                <input
                  type="password"
                  value={perplexityApiKey}
                  onChange={(e) => setPerplexityApiKey(e.target.value)}
                  placeholder="Perplexity API Key (pplx-...)"
                  className="api-key-input"
                />
              )}
            </div>

            <div className="provider-group">
              <label>
                <input
                  type="checkbox"
                  checked={useGemini}
                  onChange={(e) => setUseGemini(e.target.checked)}
                />
                <span style={whiteTextStyle}>Google Gemini</span>
              </label>
              {useGemini && (
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Gemini API Key (AIza...)"
                  className="api-key-input"
                />
              )}
            </div>

            <div className="provider-group">
              <label>
                <input
                  type="checkbox"
                  checked={useOpenAI}
                  onChange={(e) => setUseOpenAI(e.target.checked)}
                />
                <span style={whiteTextStyle}>OpenAI (GPT)</span>
              </label>
              {useOpenAI && (
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="OpenAI API Key (sk-...)"
                  className="api-key-input"
                />
              )}
            </div>
          </div>
        )}

        {/* Login Button */}
        <button
          type="button"
          onClick={onLogin}
          className="login-btn"
          disabled={!userName.trim() || !linkedinProfile}
        >
          Start Creating LinkedIn Content
        </button>

        {/* Platform Info */}
        <div className="platform-info">
          <h3>Platform Features</h3>
          <ul>
            <li>✅ AI-powered LinkedIn post generation</li>
            <li>✅ Professional business content</li>
            <li>✅ Image generation with DALL-E</li>
            <li>✅ Bulk post scheduling</li>
            <li>✅ Company page support</li>
            <li>✅ Analytics and engagement tracking</li>
          </ul>
          
          <div className="pricing-info">
            <h4>Pricing Structure (Coming Soon)</h4>
            <div className="pricing-tiers">
              <div className="tier">
                <h5>Built-in Keys</h5>
                <p>25 free calls/month</p>
                <p>$0.01 per additional call</p>
              </div>
              <div className="tier">
                <h5>Your Own Keys</h5>
                <p>100 free calls/month</p>
                <p>$0.005 per additional call</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;