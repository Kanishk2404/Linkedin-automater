import { useState, useRef, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import AuthForm from './components/AuthForm';
import LinkedInSetupForm from './components/LinkedInSetupForm';
import PostGenerator from './components/PostGenerator';
import ImageUpload from './components/ImageUpload';
import BulkPostManager from './components/BulkPostManager';
import PostHistory from './components/PostHistory';
import KeyEntry from './KeyEntry';

// Main App Content (wrapped inside AuthProvider)
function AppContent() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  
  // Built-in keys from Vite environment variables
  const DEFAULT_PERPLEXITY_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || '';
  const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  const DEFAULT_OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

  // Ref for PostHistory
  const postHistoryRef = useRef(null);

  // State management - ALL HOOKS DECLARED AT TOP LEVEL
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // User credentials
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [perplexityApiKey, setPerplexityApiKey] = useState(() => localStorage.getItem('perplexityApiKey') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openaiApiKey') || '');
  const [usePerplexity, setUsePerplexity] = useState(() => localStorage.getItem('usePerplexity') === 'true');
  const [useGemini, setUseGemini] = useState(() => localStorage.getItem('useGemini') === 'true');
  const [useOpenAI, setUseOpenAI] = useState(() => localStorage.getItem('useOpenAI') === 'true');
  const [useOwnKeys, setUseOwnKeys] = useState(true);

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

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="loading-state">
        <h1>LinkedInGenie</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        <AuthForm />
      </div>
    );
  }

  // Show setup screen if logged in but not completed setup
  if (!isLoggedIn && isAuthenticated) {
    return (
      <div className="app setup-screen">
        <div className="setup-header">
          <h1>Welcome to LinkedInGenie!</h1>
          <div className="user-info">
            <span>👋 Hello, {user?.username || 'User'}!</span>
          </div>
          <div className="setup-subtitle">
            <p>
              Complete your LinkedIn setup to start automating your posts
            </p>
          </div>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
        <LinkedInSetupForm onSetupComplete={(data) => {
          setIsLoggedIn(true);
        }} />
      </div>
    );
  }

  // Helper functions
  const getRemainingCalls = () => {
    const limits = useOwnKeys ? platformFees.ownKeys : platformFees.builtInKeys;
    return Math.max(0, limits.freeCalls - apiCallCount);
  };

  const handleLinkedInConnect = (profile, pages, accessToken, refreshToken) => {
    setLinkedinProfile(profile);
    setCompanyPages(pages);
    setLinkedinAccessToken(accessToken);
    setLinkedinRefreshToken(refreshToken);
  };

  const handleLinkedInDisconnect = () => {
    setLinkedinProfile(null);
    setCompanyPages([]);
    setLinkedinAccessToken('');
    setLinkedinRefreshToken('');
    localStorage.removeItem('linkedinProfile');
    localStorage.removeItem('companyPages');
    localStorage.removeItem('linkedinAccessToken');
    localStorage.removeItem('linkedinRefreshToken');
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

  // Main application interface
  return (
    <div className={`app ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="app-header">
        <div className="header-left">
          <button
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▶' : '◀'}
          </button>
          <h1>LinkedInGenie</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span>👋 {userName || user?.username || 'User'}</span>
          </div>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="app-content">
        {!isCollapsed && (
          <div className="left-panel">
            <KeyEntry
              perplexityApiKey={perplexityApiKey}
              setPerplexityApiKey={setPerplexityApiKey}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
              openaiApiKey={openaiApiKey}
              setOpenaiApiKey={setOpenaiApiKey}
              usePerplexity={usePerplexity}
              setUsePerplexity={setUsePerplexity}
              useGemini={useGemini}
              setUseGemini={setUseGemini}
              useOpenAI={useOpenAI}
              setUseOpenAI={setUseOpenAI}
              useOwnKeys={useOwnKeys}
              setUseOwnKeys={setUseOwnKeys}
              linkedinProfile={linkedinProfile}
              companyPages={companyPages}
              linkedinAccessToken={linkedinAccessToken}
              linkedinRefreshToken={linkedinRefreshToken}
              onLinkedInConnect={handleLinkedInConnect}
              onLinkedInDisconnect={handleLinkedInDisconnect}
              apiCallCount={apiCallCount}
              platformFees={platformFees}
              getRemainingCalls={getRemainingCalls}
            />
          </div>
        )}

        <div className="main-panel">
          <PostGenerator
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
            getRemainingCalls={getRemainingCalls}
            platformFees={platformFees}
          />

          <ImageUpload
            onImageUpload={handleImageUpload}
            selectedImage={selectedImage}
            onImageClear={clearImage}
            aiImageUrl={aiImageUrl}
            onAiImageClear={clearAiImage}
          />

          <BulkPostManager
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
            onApiCall={incrementApiCount}
            getRemainingCalls={getRemainingCalls}
            platformFees={platformFees}
          />

          <PostHistory
            ref={postHistoryRef}
            linkedinAccessToken={linkedinAccessToken}
          />
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
