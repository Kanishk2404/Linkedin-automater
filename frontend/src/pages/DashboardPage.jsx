import { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LinkedInSetupForm from '../components/LinkedInSetupForm';
import PostGenerator from '../components/PostGenerator';
import BulkPostManager from '../components/BulkPostManager';
import PostHistory from '../components/PostHistory';

function DashboardPage() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  // Built-in keys from Vite environment variables
  const DEFAULT_PERPLEXITY_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || '';
  const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  const DEFAULT_OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

  // Ref for PostHistory
  const postHistoryRef = useRef(null);

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(() => {
    return localStorage.getItem('setupComplete') === 'true';
  });

  // User credentials
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [perplexityApiKey, setPerplexityApiKey] = useState(() => localStorage.getItem('perplexityApiKey') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openaiApiKey') || '');
  const [usePerplexity, setUsePerplexity] = useState(() => localStorage.getItem('usePerplexity') === 'true');
  const [useGemini, setUseGemini] = useState(() => localStorage.getItem('useGemini') === 'true');
  const [useOpenAI, setUseOpenAI] = useState(() => localStorage.getItem('useOpenAI') === 'true');
  const [useOwnKeys, setUseOwnKeys] = useState(false);

  // LinkedIn OAuth state
  const [linkedinAccessToken, setLinkedinAccessToken] = useState(() => localStorage.getItem('linkedinAccessToken') || '');
  const [linkedinRefreshToken, setLinkedinRefreshToken] = useState(() => localStorage.getItem('linkedinRefreshToken') || '');
  const [linkedinProfile, setLinkedinProfile] = useState(() => {
    const stored = localStorage.getItem('linkedinProfile');
    return stored ? JSON.parse(stored) : null;
  });
  const [companyPages, setCompanyPages] = useState(() => {
    const stored = localStorage.getItem('companyPages');
    return stored ? JSON.parse(stored) : [];
  });

  // API call tracking
  const [apiCallCount, setApiCallCount] = useState(() => {
    const stored = localStorage.getItem('apiCallCount');
    return stored ? parseInt(stored) : 0;
  });
  const [lastResetDate, setLastResetDate] = useState(() => {
    const stored = localStorage.getItem('lastResetDate');
    return stored || new Date().toISOString().split('T')[0];
  });

  // Image state
  const [selectedImage, setSelectedImage] = useState(null);
  const [aiImageUrl, setAiImageUrl] = useState('');

  // Platform fee structure
  const [platformFees] = useState({
    builtInKeys: {
      freeCalls: 25,
      paidCalls: 100,
      pricePerCall: 0.01
    },
    ownKeys: {
      freeCalls: 1000,
      paidCalls: Infinity,
      pricePerCall: 0
    }
  });

  // Sync state changes to localStorage
  useEffect(() => { localStorage.setItem('userName', userName); }, [userName]);
  useEffect(() => { localStorage.setItem('perplexityApiKey', perplexityApiKey); }, [perplexityApiKey]);
  useEffect(() => { localStorage.setItem('geminiApiKey', geminiApiKey); }, [geminiApiKey]);
  useEffect(() => { localStorage.setItem('openaiApiKey', openaiApiKey); }, [openaiApiKey]);
  useEffect(() => { localStorage.setItem('usePerplexity', usePerplexity.toString()); }, [usePerplexity]);
  useEffect(() => { localStorage.setItem('useGemini', useGemini.toString()); }, [useGemini]);
  useEffect(() => { localStorage.setItem('useOpenAI', useOpenAI.toString()); }, [useOpenAI]);
  useEffect(() => { localStorage.setItem('linkedinAccessToken', linkedinAccessToken); }, [linkedinAccessToken]);
  useEffect(() => { localStorage.setItem('linkedinRefreshToken', linkedinRefreshToken); }, [linkedinRefreshToken]);
  useEffect(() => { 
    if (linkedinProfile) localStorage.setItem('linkedinProfile', JSON.stringify(linkedinProfile)); 
  }, [linkedinProfile]);
  useEffect(() => { localStorage.setItem('companyPages', JSON.stringify(companyPages)); }, [companyPages]);
  useEffect(() => { localStorage.setItem('apiCallCount', apiCallCount.toString()); }, [apiCallCount]);
  useEffect(() => { localStorage.setItem('lastResetDate', lastResetDate); }, [lastResetDate]);

  if (loading) {
    return (
      <div className="loading-state">
        <h1>LinkedInGenie</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper functions
  const getRemainingCalls = () => {
    const limits = useOwnKeys ? platformFees.ownKeys : platformFees.builtInKeys;
    return Math.max(0, limits.freeCalls - apiCallCount);
  };

  const checkApiCallLimit = () => {
    const limits = useOwnKeys ? platformFees.ownKeys : platformFees.builtInKeys;
    return apiCallCount < limits.freeCalls;
  };

  const resetApiCount = () => {
    const today = new Date().toISOString().split('T')[0];
    if (lastResetDate !== today) {
      setApiCallCount(0);
      setLastResetDate(today);
    }
  };

  const incrementApiCount = () => {
    resetApiCount();
    setApiCallCount(prev => prev + 1);
  };

  const handleImageUpload = (file) => {
    setSelectedImage(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
  };

  const setAiImage = (url) => {
    setAiImageUrl(url);
  };

  const clearAiImage = () => {
    setAiImageUrl('');
  };

  const handleSetupComplete = (data) => {
    // Update all the state with new data
    setUserName(data.userName);
    setPerplexityApiKey(data.perplexityApiKey);
    setGeminiApiKey(data.geminiApiKey);
    setOpenaiApiKey(data.openaiApiKey);
    setUsePerplexity(data.usePerplexity);
    setUseGemini(data.useGemini);
    setUseOpenAI(data.useOpenAI);
    setUseOwnKeys(data.useOwnKeys);
    setLinkedinAccessToken(data.linkedinAccessToken);
    setLinkedinRefreshToken(data.linkedinRefreshToken);
    setLinkedinProfile(data.linkedinProfile);
    setCompanyPages(data.companyPages);
    setApiCallCount(data.apiCallCount);
    
    // Mark setup as complete
    setIsSetupComplete(true);
    localStorage.setItem('setupComplete', 'true');
    
    if (showSettings) {
      setShowSettings(false);
      alert('✅ Settings updated successfully!');
    }
  };

  // Show setup screen if not completed setup
  if (!isSetupComplete) {
    return (
      <div className="app setup-screen">
        <div className="setup-header">
          <h1>Welcome to LinkedInGenie!</h1>
          <div className="user-info">
            <span>👋 Hello, {user?.username || 'User'}!</span>
          </div>
          <div className="setup-subtitle">
            <p>Complete your LinkedIn setup to start automating your posts</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
        <LinkedInSetupForm 
          existingData={{
            userName,
            perplexityApiKey,
            geminiApiKey,
            openaiApiKey,
            usePerplexity,
            useGemini,
            useOpenAI,
            useOwnKeys,
            linkedinAccessToken,
            linkedinRefreshToken,
            linkedinProfile,
            companyPages,
            apiCallCount,
            lastResetDate
          }}
          onSetupComplete={handleSetupComplete}
        />
      </div>
    );
  }

  // Main dashboard interface
  return (
    <div className="app">
      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSettings(false);
          }
        }}>
          <div className="modal-content">
            <button
              onClick={() => setShowSettings(false)}
              className="btn btn-secondary btn-sm"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                width: '40px',
                height: '40px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                borderRadius: '50%',
                zIndex: 1001
              }}
              title="Close Settings"
            >
              ×
            </button>
            <LinkedInSetupForm 
              existingData={{
                userName,
                perplexityApiKey,
                geminiApiKey,
                openaiApiKey,
                usePerplexity,
                useGemini,
                useOpenAI,
                useOwnKeys,
                linkedinAccessToken,
                linkedinRefreshToken,
                linkedinProfile,
                companyPages,
                apiCallCount,
                lastResetDate
              }}
              onSetupComplete={handleSetupComplete}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>LinkedInGenie</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span>👋 {userName || user?.username || 'User'}</span>
            </div>
            <button 
              onClick={() => setShowSettings(true)} 
              className="btn btn-secondary btn-sm"
            >
              ⚙️ Settings
            </button>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {/* Welcome Message */}
        <div className="welcome-message">
          <h2>Welcome back, {userName || user?.username || 'User'}! 👋</h2>
          <p>Ready to create engaging LinkedIn content with AI-powered automation</p>
        </div>

        <div className="dashboard-container">
          <div className="dashboard-main">
            <PostGenerator
              userName={userName}
              perplexityApiKey={perplexityApiKey}
              geminiApiKey={geminiApiKey}
              openaiApiKey={openaiApiKey}
              usePerplexity={usePerplexity}
              useGemini={useGemini}
              useOpenAI={useOpenAI}
              useOwnKeys={useOwnKeys}
              linkedinAccessToken={linkedinAccessToken}
              linkedinProfile={linkedinProfile}
              companyPages={companyPages}
              DEFAULT_PERPLEXITY_KEY={DEFAULT_PERPLEXITY_KEY}
              DEFAULT_GEMINI_KEY={DEFAULT_GEMINI_KEY}
              postHistoryRef={postHistoryRef}
              onPostCreated={() => {
                if (postHistoryRef.current) {
                  postHistoryRef.current.refreshHistory();
                }
              }}
              incrementApiCallCount={incrementApiCount}
              checkApiCallLimit={checkApiCallLimit}
              getRemainingCalls={getRemainingCalls}
              selectedImage={selectedImage}
              aiImageUrl={aiImageUrl}
              onImageClear={clearImage}
              onAiImageSet={setAiImage}
              onAiImageClear={clearAiImage}
              onApiCall={incrementApiCount}
              onPostSuccess={() => {
                if (postHistoryRef.current) {
                  postHistoryRef.current.refreshHistory();
                }
              }}
              platformFees={platformFees}
            />

            <BulkPostManager
              userName={userName}
              perplexityApiKey={perplexityApiKey}
              geminiApiKey={geminiApiKey}
              openaiApiKey={openaiApiKey}
              usePerplexity={usePerplexity}
              useGemini={useGemini}
              useOpenAI={useOpenAI}
              useOwnKeys={useOwnKeys}
              linkedinAccessToken={linkedinAccessToken}
              linkedinProfile={linkedinProfile}
              companyPages={companyPages}
              DEFAULT_PERPLEXITY_KEY={DEFAULT_PERPLEXITY_KEY}
              DEFAULT_GEMINI_KEY={DEFAULT_GEMINI_KEY}
              onBulkComplete={() => {
                console.log('Bulk generation completed');
              }}
              incrementApiCallCount={incrementApiCount}
              checkApiCallLimit={checkApiCallLimit}
              getRemainingCalls={getRemainingCalls}
            />
          </div>

          <div className="dashboard-sidebar">
            <PostHistory
              ref={postHistoryRef}
              linkedinAccessToken={linkedinAccessToken}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
