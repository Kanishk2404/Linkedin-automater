import { useState, useEffect, useCallback } from 'react';
// Helper style for white text
const whiteTextStyleBold = { color: '#fff', fontWeight: 'bold' };
const whiteTextStyle = { color: '#fff' };
const whiteTextStyleSection = { color: '#fff', fontWeight: 'bold', fontSize: '20px' };
const forceWhiteAll = { color: '#fff', fontWeight: 'bold', background: 'none', borderColor: '#fff' };
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/api';

const LinkedInSetupForm = ({ onSetupComplete, existingData = null }) => {
  const { user } = useAuth();
  
  // Built-in keys from Vite environment variables
  const DEFAULT_PERPLEXITY_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || '';
  const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  const DEFAULT_OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

  // Determine if this is settings mode (editing existing config)
  const isSettingsMode = existingData !== null;

  // Setup flow state - start at linkedin step in settings mode so users can access reconnect
  const [setupStep, setSetupStep] = useState(() => {
    if (isSettingsMode) {
      return 'linkedin'; // Always start with LinkedIn in settings mode
    }
    return 'linkedin';
  });
  
  const [userName, setUserName] = useState(() => 
    existingData?.userName || localStorage.getItem('userName') || user?.username || ''
  );
  
  // LinkedIn OAuth state - use existing data if available
  const [linkedinAccessToken, setLinkedinAccessToken] = useState(() => 
    existingData?.linkedinAccessToken || localStorage.getItem('linkedinAccessToken') || ''
  );
  const [linkedinRefreshToken, setLinkedinRefreshToken] = useState(() => 
    existingData?.linkedinRefreshToken || localStorage.getItem('linkedinRefreshToken') || ''
  );
  const [linkedinProfile, setLinkedinProfile] = useState(() => {
    if (existingData?.linkedinProfile) return existingData.linkedinProfile;
    const stored = localStorage.getItem('linkedinProfile');
    return stored ? JSON.parse(stored) : null;
  });
  const [companyPages, setCompanyPages] = useState(() => {
    if (existingData?.companyPages) return existingData.companyPages;
    const stored = localStorage.getItem('companyPages');
    return stored ? JSON.parse(stored) : [];
  });

  // API choice state - use existing data if available
  const [useOwnKeys, setUseOwnKeys] = useState(existingData?.useOwnKeys || false);
  
  // User's own API keys (initialize with existing data)
  const [perplexityApiKey, setPerplexityApiKey] = useState(existingData?.perplexityApiKey || '');
  const [geminiApiKey, setGeminiApiKey] = useState(existingData?.geminiApiKey || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(existingData?.openaiApiKey || '');
  const [usePerplexity, setUsePerplexity] = useState(existingData?.usePerplexity || false);
  const [useGemini, setUseGemini] = useState(existingData?.useGemini || false);
  const [useOpenAI, setUseOpenAI] = useState(existingData?.useOpenAI || false);

  // Platform fee structure
  const [platformFees] = useState({
    builtInKeys: {
      freeCalls: 25,
      paidCalls: 100,
      pricePerCall: 0.01
    },
    ownKeys: {
      freeCalls: 200,
      paidCalls: Infinity,
      pricePerCall: 0
    }
  });

  // API call tracking - use existing data if available
  const [apiCallCount, setApiCallCount] = useState(() => {
    if (existingData?.apiCallCount !== undefined) return existingData.apiCallCount;
    const stored = localStorage.getItem('apiCallCount');
    return stored ? parseInt(stored) : 0;
  });
  const [lastResetDate, setLastResetDate] = useState(() => {
    if (existingData?.lastResetDate) return existingData.lastResetDate;
    const stored = localStorage.getItem('lastResetDate');
    return stored || new Date().toISOString().split('T')[0];
  });

  // Move to next step when LinkedIn is connected (only in setup mode)
  useEffect(() => {
    if (linkedinProfile && setupStep === 'linkedin' && !isSettingsMode) {
      setSetupStep('api-choice');
    }
  }, [linkedinProfile, setupStep, isSettingsMode]);

  // Simple localStorage sync for essential data
  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  // State to prevent multiple concurrent LinkedIn status checks
  const [isCheckingLinkedIn, setIsCheckingLinkedIn] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState(() => {
    return localStorage.getItem('lastLinkedInStatusCheck') || '0';
  });
  const [rateLimitErrors, setRateLimitErrors] = useState(() => {
    return parseInt(localStorage.getItem('linkedInRateLimitErrors') || '0');
  });
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(() => {
    const lastError = localStorage.getItem('lastLinkedInRateLimit');
    if (!lastError) return false;
    
    const timeSinceLastError = Date.now() - parseInt(lastError);
    return timeSinceLastError < 300000; // 5 minute cooldown
  });

  // Helper functions
  const checkApiCallLimit = () => {
    const limits = useOwnKeys ? platformFees.ownKeys : platformFees.builtInKeys;
    return apiCallCount < limits.freeCalls;
  };

  const getRemainingCalls = () => {
    const limits = useOwnKeys ? platformFees.ownKeys : platformFees.builtInKeys;
    return Math.max(0, limits.freeCalls - apiCallCount);
  };

  const handleLinkedInConnect = (profile, pages, accessToken, refreshToken) => {
    console.log('🔗 handleLinkedInConnect called with:', {
      hasProfile: !!profile,
      profileName: profile?.name || profile?.firstName + ' ' + profile?.lastName,
      hasPages: !!pages,
      pagesCount: pages?.length || 0,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken ? accessToken.length : 0,
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken ? refreshToken.length : 0
    });
    
    // Validate required data
    if (!profile) {
      console.error('❌ Profile data is missing');
      alert('Error: Profile data is missing. Please try connecting again.');
      return;
    }
    
    if (!accessToken) {
      console.error('❌ Access token is missing');
      alert('Error: Access token is missing. Please try connecting again.');
      return;
    }
    
    // Update React state
    setLinkedinProfile(profile);
    setCompanyPages(pages || []);
    setLinkedinAccessToken(accessToken);
    setLinkedinRefreshToken(refreshToken || '');
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('linkedinProfile', JSON.stringify(profile));
      localStorage.setItem('companyPages', JSON.stringify(pages || []));
      localStorage.setItem('linkedinAccessToken', accessToken);
      localStorage.setItem('linkedinRefreshToken', refreshToken || '');
      
      console.log('✅ LinkedIn connection saved successfully to localStorage');
      
      // Verify save was successful
      const savedToken = localStorage.getItem('linkedinAccessToken');
      const savedProfile = localStorage.getItem('linkedinProfile');
      
      console.log('🔍 Verification after save:', {
        tokenSaved: !!savedToken,
        tokenLength: savedToken ? savedToken.length : 0,
        profileSaved: !!savedProfile,
        tokensMatch: savedToken === accessToken
      });
      
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
      alert('Error saving LinkedIn connection. Please try again.');
    }
  };

  const handleApiChoice = (useOwn) => {
    setUseOwnKeys(useOwn);
    if (isSettingsMode) {
      // In settings mode, just update the choice without changing steps
      return;
    }
    if (useOwn) {
      setSetupStep('own-keys');
    } else {
      // Use system keys - complete setup immediately
      completeSetup();
    }
  };

  const completeSetup = () => {
    console.log('🔍 Setup completion validation...');
    
    // Validate required fields
    if (!userName.trim()) {
      alert('Please enter your name.');
      return;
    }

    if (!linkedinAccessToken && !linkedinProfile) {
      alert('Please connect your LinkedIn account first.');
      return;
    }

    // Validate AI provider keys if using own keys
    if (useOwnKeys) {
      const hasValidKey = (usePerplexity && perplexityApiKey.trim()) ||
                         (useGemini && geminiApiKey.trim()) ||
                         (useOpenAI && openaiApiKey.trim());
      if (!hasValidKey) {
        alert('Please select at least one AI provider and enter its API key.');
        return;
      }
    }

    console.log('✅ All validations passed, proceeding with setup...');

    onSetupComplete({
      userName,
      perplexityApiKey: useOwnKeys ? perplexityApiKey : '',
      geminiApiKey: useOwnKeys ? geminiApiKey : '',
      openaiApiKey: useOwnKeys ? openaiApiKey : '',
      usePerplexity: useOwnKeys ? usePerplexity : true, // Default to true for system keys
      useGemini: useOwnKeys ? useGemini : true,
      useOpenAI: useOwnKeys ? useOpenAI : true,
      useOwnKeys,
      linkedinAccessToken,
      linkedinRefreshToken,
      linkedinProfile,
      companyPages,
      apiCallCount,
      platformFees,
      checkApiCallLimit,
      getRemainingCalls
    });
  };
  // Check LinkedIn connection status from backend with aggressive rate limiting
  const checkLinkedInStatus = useCallback(async () => {
    // Circuit breaker: If too many rate limit errors, disable for 5 minutes
    if (circuitBreakerOpen) {
      console.log('🚫 Circuit breaker open - LinkedIn status checks disabled due to rate limiting');
      return;
    }

    // Prevent multiple concurrent calls
    if (isCheckingLinkedIn) {
      console.log('⏳ LinkedIn status check already in progress, skipping...');
      return;
    }

    // Rate limiting: Only allow one check per 30 seconds
    const now = Date.now();
    const timeSinceLastCheck = now - parseInt(lastStatusCheck);
    const MIN_CHECK_INTERVAL = 30000; // 30 seconds

    if (timeSinceLastCheck < MIN_CHECK_INTERVAL) {
      console.log(`⏳ Rate limiting: Last check was ${Math.round(timeSinceLastCheck/1000)}s ago, waiting ${Math.round((MIN_CHECK_INTERVAL - timeSinceLastCheck)/1000)}s more...`);
      return;
    }

    setIsCheckingLinkedIn(true);
    setLastStatusCheck(now.toString());
    localStorage.setItem('lastLinkedInStatusCheck', now.toString());

    try {
      console.log('🔍 Checking LinkedIn connection status...');
      const response = await authenticatedFetch('/api/posts/linkedin/status');
      console.log('LinkedIn status response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('LinkedIn status data:', data);
        
        // Reset rate limit counter on successful request
        if (rateLimitErrors > 0) {
          setRateLimitErrors(0);
          localStorage.removeItem('linkedInRateLimitErrors');
        }
        
        if (data.success && data.connected && data.profile) {
          // Update state with backend data
          setLinkedinProfile(data.profile);
          // Also update localStorage to keep frontend in sync
          localStorage.setItem('linkedinProfile', JSON.stringify(data.profile));
          
          // If we have an access token from the backend, store it
          if (data.accessToken) {
            setLinkedinAccessToken(data.accessToken);
            localStorage.setItem('linkedinAccessToken', data.accessToken);
            console.log('✅ Access token retrieved from backend and stored');
          } else {
            console.log('⚠️ No access token provided by backend - token stored securely on server');
          }
          
          console.log('✅ LinkedIn connection confirmed from backend:', data);
        } else {
          console.log('❌ LinkedIn not connected according to backend:', data);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ LinkedIn status check failed:', errorData);
        
        // If we get a 429, implement circuit breaker
        if (response.status === 429) {
          const newErrorCount = rateLimitErrors + 1;
          setRateLimitErrors(newErrorCount);
          localStorage.setItem('linkedInRateLimitErrors', newErrorCount.toString());
          localStorage.setItem('lastLinkedInRateLimit', now.toString());
          
          // Open circuit breaker after 3 rate limit errors
          if (newErrorCount >= 3) {
            setCircuitBreakerOpen(true);
            console.log('🚫 Circuit breaker opened - too many rate limit errors. Cooling down for 5 minutes...');
            
            // Auto-close circuit breaker after 5 minutes
            setTimeout(() => {
              setCircuitBreakerOpen(false);
              setRateLimitErrors(0);
              localStorage.removeItem('linkedInRateLimitErrors');
              localStorage.removeItem('lastLinkedInRateLimit');
              console.log('✅ Circuit breaker closed - ready to retry LinkedIn status checks');
            }, 300000); // 5 minutes
          }
          
          const backoffTime = now + 60000; // Wait 1 minute
          setLastStatusCheck(backoffTime.toString());
          localStorage.setItem('lastLinkedInStatusCheck', backoffTime.toString());
          console.log('🚫 Rate limited! Backing off for 1 minute...');
        }
      }
    } catch (error) {
      console.error('❌ Error checking LinkedIn status:', error);
    } finally {
      setIsCheckingLinkedIn(false);
    }
  }, [isCheckingLinkedIn, lastStatusCheck, circuitBreakerOpen, rateLimitErrors]);

  // Check LinkedIn status on component mount - only once when user is available and no profile exists
  // With aggressive rate limiting to prevent 429 errors
  useEffect(() => {
    // Only check if:
    // 1. User exists
    // 2. No LinkedIn profile is cached
    // 3. No check is currently in progress
    // 4. Enough time has passed since last check
    // 5. Circuit breaker is not open
    if (user && !linkedinProfile && !isCheckingLinkedIn && !circuitBreakerOpen) {
      const now = Date.now();
      const timeSinceLastCheck = now - parseInt(lastStatusCheck);
      const MIN_CHECK_INTERVAL = 30000; // 30 seconds
      
      if (timeSinceLastCheck >= MIN_CHECK_INTERVAL) {
        console.log('🚀 Initial LinkedIn status check triggered');
        checkLinkedInStatus();
      } else {
        console.log(`⏳ Skipping initial check - too soon (${Math.round(timeSinceLastCheck/1000)}s ago)`);
      }
    } else if (circuitBreakerOpen) {
      console.log('🚫 Skipping initial check - circuit breaker is open');
    }
  }, [user, linkedinProfile, isCheckingLinkedIn, lastStatusCheck, circuitBreakerOpen]); // Removed checkLinkedInStatus from dependencies to prevent loops

  // Render different steps
  const renderLinkedInStep = () => (
    <div className="form-section" style={{ backgroundColor: '#fff' }}>
      <h2 style={{ color: '#fff', fontWeight: 'bold', fontSize: '20px', background: 'none' }}>⚙️ Settings & Preferences</h2>
      <h2 style={{ color: '#fff', fontWeight: 'bold', background: 'none' }}>🔗 LinkedIn Connection</h2>
      <h3 style={{ color: '#fff', fontWeight: 'bold', background: 'none' }}>🔗 Connect LinkedIn</h3>
      <p className="subtitle" style={{ color: '#fff', fontWeight: 'bold', background: 'none' }}>First, connect your LinkedIn account to start automating</p>
      <div className="input-group">
        <label htmlFor="userName" style={{ color: '#fff', fontWeight: 'bold', background: 'none' }}>Your Name</label>
        <input
          type="text"
          id="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your display name"
        />
      </div>

      {!linkedinProfile ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button 
            className="linkedin-connect-btn"
            style={{
              backgroundColor: '#0077B5',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
            onClick={async () => {
              // Check if user is authenticated
              if (!user) {
                alert('Please make sure you are logged in');
                return;
              }

              try {
                console.log('Making OAuth URL request...');
                const response = await authenticatedFetch('/api/posts/oauth/url');
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  console.error('OAuth URL error:', errorData);
                  alert(`Failed to get LinkedIn OAuth URL: ${errorData.message || 'Unknown error'}`);
                  return;
                }
                
                const data = await response.json();
                console.log('OAuth URL data:', data);
                
                if (data.success) {
                  console.log('Opening LinkedIn OAuth popup...');
                  const authWindow = window.open(data.oauthUrl, 'linkedin-oauth', 'width=600,height=600,scrollbars=yes,resizable=yes');
                  
                  if (!authWindow) {
                    alert('Popup was blocked! Please allow popups for this site and try again.');
                    return;
                  }
                  
                  // Enhanced message handler with better error handling
                  const messageHandler = (event) => {
                    console.log('📨 Received message from popup:', {
                      origin: event.origin,
                      dataType: event.data?.type,
                      hasData: !!event.data
                    });
                    
                    // Verify origin for security
                    const expectedOrigin = window.location.origin;
                    if (event.origin !== expectedOrigin && !event.origin.includes('localhost')) {
                      console.log('🚫 Ignoring message from unexpected origin:', event.origin);
                      return;
                    }
                    
                    if (event.data && event.data.type === 'LINKEDIN_OAUTH_SUCCESS') {
                      console.log('✅ LinkedIn OAuth success message received');
                      console.log('📊 Message data details:', {
                        hasProfile: !!event.data.profile,
                        hasAccessToken: !!event.data.accessToken,
                        accessTokenLength: event.data.accessToken ? event.data.accessToken.length : 0,
                        hasRefreshToken: !!event.data.refreshToken,
                        refreshTokenLength: event.data.refreshToken ? event.data.refreshToken.length : 0,
                        hasCompanyPages: !!event.data.companyPages,
                        companyPagesCount: event.data.companyPages ? event.data.companyPages.length : 0
                      });
                      
                      try {
                        // Validate critical data before processing
                        if (!event.data.profile) {
                          throw new Error('Profile data is missing from OAuth response');
                        }
                        
                        if (!event.data.accessToken) {
                          throw new Error('Access token is missing from OAuth response');
                        }
                        
                        handleLinkedInConnect(
                          event.data.profile,
                          event.data.companyPages || [],
                          event.data.accessToken,
                          event.data.refreshToken || ''
                        );
                        
                        console.log('✅ LinkedIn connection handled successfully');
                        
                        // Close the popup if it's still open
                        if (authWindow && !authWindow.closed) {
                          authWindow.close();
                        }
                        
                      } catch (error) {
                        console.error('❌ Error handling LinkedIn connection:', error);
                        alert(`Error processing LinkedIn connection: ${error.message}. Please try again.`);
                      }
                      
                      // Clean up event listener
                      window.removeEventListener('message', messageHandler);
                    } else {
                      console.log('📭 Received non-LinkedIn message:', event.data);
                    }
                  };
                  
                  // Add message listener
                  window.addEventListener('message', messageHandler);
                  
                  // Cleanup and timeout handling
                  const checkPopupClosed = setInterval(() => {
                    if (authWindow.closed) {
                      clearInterval(checkPopupClosed);
                      window.removeEventListener('message', messageHandler);
                      console.log('OAuth popup was closed');
                    }
                  }, 1000);
                  
                  // Timeout after 5 minutes
                  setTimeout(() => {
                    if (!authWindow.closed) {
                      authWindow.close();
                    }
                    clearInterval(checkPopupClosed);
                    window.removeEventListener('message', messageHandler);
                    console.log('OAuth popup timeout reached');
                  }, 300000); // 5 minutes
                }
              } catch (error) {
                console.error('LinkedIn connection error:', error);
                alert('Failed to connect to LinkedIn. Please try again.');
              }
            }}
          >
            <span>🔗</span>
            Connect LinkedIn Account
          </button>
          
          <button 
            className="refresh-btn"
            onClick={() => checkLinkedInStatus()}
            disabled={isCheckingLinkedIn || circuitBreakerOpen}
            style={{ 
              marginTop: '10px', 
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: (isCheckingLinkedIn || circuitBreakerOpen) ? 0.6 : 1 
            }}
          >
            {circuitBreakerOpen ? 'Rate Limited (Cooling Down)' : 
             isCheckingLinkedIn ? 'Checking...' : 'Check Connection Status'}
          </button>
        </div>
      ) : (
        <div className="linkedin-connected" style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px solid #28a745' }}>
          <div style={{ marginBottom: '10px', color: '#28a745', fontSize: '18px' }}>
            ✅ LinkedIn Connected!
          </div>
          <div className="profile-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            {linkedinProfile.profilePicture && (
              <img 
                src={linkedinProfile.profilePicture} 
                alt="Profile" 
                style={{ width: '50px', height: '50px', borderRadius: '50%' }}
              />
            )}
            <div>
              <h4 style={{ margin: '0 0 5px 0' }}>{linkedinProfile.firstName} {linkedinProfile.lastName}</h4>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{linkedinProfile.headline}</p>
            </div>
          </div>
          {companyPages.length > 0 && (
            <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
              📄 {companyPages.length} Company Page{companyPages.length > 1 ? 's' : ''} Available
            </div>
          )}
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                // Clear LinkedIn data and reset connection
                setLinkedinProfile(null);
                setLinkedinAccessToken('');
                setLinkedinRefreshToken('');
                setCompanyPages([]);
                localStorage.removeItem('linkedinProfile');
                localStorage.removeItem('linkedinAccessToken');   
                localStorage.removeItem('linkedinRefreshToken');
                localStorage.removeItem('companyPages');
                
                // If in settings mode, go back to linkedin step
                if (isSettingsMode) {
                  setSetupStep('linkedin');
                }
              }}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔗 Reconnect LinkedIn
            </button>
            
            <button 
              onClick={() => checkLinkedInStatus()}
              disabled={isCheckingLinkedIn}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: isCheckingLinkedIn ? 0.6 : 1
              }}
            >
              {isCheckingLinkedIn ? 'Checking...' : '🔄 Test Connection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderApiChoiceStep = () => (
    <div className="form-section">
      <h2 style={{ color: '#fff', fontWeight: 'bold', background: 'none' }}>🤖 Choose Your AI Setup</h2>
      <p className="subtitle" style={{ color: '#fff', fontWeight: 'bold', background: 'none' }}>How would you like to generate content?</p>
      
      {isSettingsMode && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontWeight: 'bold', background: 'none' }}>Current Configuration:</h4>
          <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', background: 'none' }}>
            <div>📊 <strong>API Usage:</strong> {useOwnKeys ? 'Your Own Keys' : 'LinkedIn Genie\'s AI'}</div>
            <div>📈 <strong>Calls Used:</strong> {apiCallCount} / {useOwnKeys ? platformFees.ownKeys.freeCalls : platformFees.builtInKeys.freeCalls}</div>
            {useOwnKeys && (
              <div>🔑 <strong>Active Providers:</strong> {[
                useOpenAI && 'OpenAI',
                useGemini && 'Gemini', 
                usePerplexity && 'Perplexity'
              ].filter(Boolean).join(', ') || 'None'}</div>
            )}
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '30px 0' }}>
        <div 
          className="api-choice-card"
          style={{
            padding: '20px',
            border: `2px solid ${!useOwnKeys && isSettingsMode ? '#0077B5' : '#e0e0e0'}`,
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#fff'
          }}
          onClick={() => handleApiChoice(false)}
        >
          <div style={{ fontSize: '24px', marginBottom: '10px', color: '#fff', fontWeight: 'bold', background: 'none' }}>
            {!useOwnKeys && isSettingsMode ? '✅' : '🚀'}
          </div>
          <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontWeight: 'bold', background: 'none' }}>LinkedIn Genie's AI</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#fff', fontWeight: 'bold', background: 'none' }}>Use our built-in AI services</p>
          <ul style={{ textAlign: 'left', fontSize: '12px', color: '#fff', fontWeight: 'bold', background: 'none', paddingLeft: '20px' }}>
            <li>25 free posts per month</li>
            <li>Multiple AI providers</li>
            <li>No setup required</li>
            <li>Ready to use instantly</li>
          </ul>
        </div>

        <div 
          className="api-choice-card"
          style={{
            padding: '20px',
            border: `2px solid ${useOwnKeys && isSettingsMode ? '#28a745' : '#e0e0e0'}`,
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#fff'
          }}
          onClick={() => handleApiChoice(true)}
        >
          <div style={{ fontSize: '24px', marginBottom: '10px', color: '#fff', fontWeight: 'bold', background: 'none' }}>
            {useOwnKeys && isSettingsMode ? '✅' : '🔑'}
          </div>
          <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontWeight: 'bold', background: 'none' }}>Your Own API Keys</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#fff', fontWeight: 'bold', background: 'none' }}>Use your own AI API keys</p>
          <ul style={{ textAlign: 'left', fontSize: '12px', color: '#fff', fontWeight: 'bold', background: 'none', paddingLeft: '20px' }}>
            <li>200+ posts per month</li>
            <li>Your own AI accounts</li>
            <li>Full control over usage</li>
            <li>Requires API key setup</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderOwnKeysStep = () => (
    <div className="form-section">
      <h2>🔑 Enter Your API Keys</h2>
      <p className="subtitle">Add your AI provider API keys (choose at least one)</p>
      
      <div style={{ margin: '20px 0' }}>
        <div className="provider-group" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={useOpenAI}
              onChange={(e) => setUseOpenAI(e.target.checked)}
            />
            <span style={{ fontWeight: 'bold' }}>OpenAI (GPT) 🧠</span>
          </label>
          {useOpenAI && (
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key (sk-...)"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          )}
        </div>

        <div className="provider-group" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={useGemini}
              onChange={(e) => setUseGemini(e.target.checked)}
            />
            <span style={{ fontWeight: 'bold' }}>Google Gemini ✨</span>
          </label>
          {useGemini && (
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          )}
        </div>

        <div className="provider-group" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={usePerplexity}
              onChange={(e) => setUsePerplexity(e.target.checked)}
            />
            <span style={{ fontWeight: 'bold' }}>Perplexity AI 🔍</span>
          </label>
          {usePerplexity && (
            <input
              type="password"
              value={perplexityApiKey}
              onChange={(e) => setPerplexityApiKey(e.target.value)}
              placeholder="Enter your Perplexity API key (pplx-...)"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={() => setSetupStep('api-choice')} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        <button 
          onClick={completeSetup}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Complete Setup ✅
        </button>
      </div>
    </div>
  );

  return (
    <div className="login-form">
      <div className="form-section">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#0077B5', marginBottom: '10px' }}>
            {isSettingsMode ? '⚙️ Settings & Preferences' : 'LinkedIn Genie Setup'}
          </h1>
          
          {/* Settings mode: Show all sections */}
          {isSettingsMode ? (
            <div style={{ textAlign: 'left' }}>
              {/* LinkedIn Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ color: '#0077B5', borderBottom: '2px solid #0077B5', paddingBottom: '10px', marginBottom: '20px' }}>
                  🔗 LinkedIn Connection
                </h2>
                {renderLinkedInStep()}
              </div>
              
              {/* AI Setup Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ color: '#0077B5', borderBottom: '2px solid #0077B5', paddingBottom: '10px', marginBottom: '20px' }}>
                  🤖 AI Configuration
                </h2>
                {renderApiChoiceStep()}
                {useOwnKeys && (
                  <div style={{ marginTop: '20px' }}>
                    {renderOwnKeysStep()}
                  </div>
                )}
              </div>
              
              {/* Save Settings Button */}
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button 
                  onClick={completeSetup}
                  style={{
                    backgroundColor: '#0077B5',
                    color: 'white',
                    border: 'none',
                    padding: '12px 30px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  💾 Save Settings
                </button>
              </div>
            </div>
          ) : (
            /* Setup mode: Show step-based flow */
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '20px 0' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  color: setupStep === 'linkedin' ? '#0077B5' : (linkedinProfile ? '#28a745' : '#ccc')
                }}>
                  <span>{linkedinProfile ? '✅' : '1'}</span>
                  <span>LinkedIn</span>
                </div>
                <div style={{ width: '30px', height: '2px', backgroundColor: setupStep !== 'linkedin' ? '#0077B5' : '#ccc' }}></div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  color: setupStep === 'api-choice' ? '#0077B5' : (setupStep === 'own-keys' || (setupStep !== 'linkedin' && setupStep !== 'api-choice') ? '#28a745' : '#ccc')
                }}>
                  <span>2</span>
                  <span>AI Setup</span>
                </div>
              </div>
              
              {/* Render current step */}
              {setupStep === 'linkedin' && renderLinkedInStep()}
              {setupStep === 'api-choice' && renderApiChoiceStep()}
              {setupStep === 'own-keys' && renderOwnKeysStep()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedInSetupForm;
