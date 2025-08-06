import { useState, useEffect } from 'react';

const KeyEntry = ({
  perplexityApiKey,
  setPerplexityApiKey,
  geminiApiKey,
  setGeminiApiKey,
  openaiApiKey,
  setOpenaiApiKey,
  useOwnKeys,
  setUseOwnKeys,
  usePerplexity,
  setUsePerplexity,
  useGemini,
  setUseGemini,
  useOpenAI,
  setUseOpenAI
}) => {
  const [showKeys, setShowKeys] = useState(false);

  const handleKeyModeChange = (mode) => {
    setUseOwnKeys(mode === 'own');
    
    // If switching to platform keys, clear user keys and enable all providers
    if (mode === 'platform') {
      setPerplexityApiKey('');
      setGeminiApiKey('');
      setOpenaiApiKey('');
      setUsePerplexity(true);
      setUseGemini(true);
      setUseOpenAI(true);
    }
  };

  const validateApiKey = (key, provider) => {
    if (!key) return false;
    
    switch (provider) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'perplexity':
        return key.startsWith('pplx-') && key.length > 20;
      case 'gemini':
        return key.length > 20; // Gemini keys don't have a specific prefix
      default:
        return false;
    }
  };

  const getKeyStatus = (key, provider) => {
    if (!key) return 'empty';
    return validateApiKey(key, provider) ? 'valid' : 'invalid';
  };

  return (
    <div className="key-entry-section">
      <div className="section-header">
        <h3>🔑 API Key Configuration</h3>
        <button 
          className="toggle-keys-btn"
          onClick={() => setShowKeys(!showKeys)}
        >
          {showKeys ? 'Hide' : 'Show'} Keys
        </button>
      </div>

      {/* Key Mode Selection */}
      <div className="key-mode-selection">
        <h4>Choose Your API Key Mode:</h4>
        <div className="mode-options">
          <label className={`mode-option ${!useOwnKeys ? 'selected' : ''}`}>
            <input
              type="radio"
              name="keyMode"
              checked={!useOwnKeys}
              onChange={() => handleKeyModeChange('platform')}
            />
            <div className="mode-card">
              <div className="mode-title">🚀 Use Platform Keys</div>
              <div className="mode-description">
                Easy setup - use our AI provider keys with usage-based pricing
              </div>
              <div className="mode-benefits">
                <div className="benefit">✅ No API key setup required</div>
                <div className="benefit">✅ All AI providers included</div>
                <div className="benefit">✅ Pay per use</div>
              </div>
            </div>
          </label>

          <label className={`mode-option ${useOwnKeys ? 'selected' : ''}`}>
            <input
              type="radio"
              name="keyMode"
              checked={useOwnKeys}
              onChange={() => handleKeyModeChange('own')}
            />
            <div className="mode-card">
              <div className="mode-title">🔧 Use Your Own Keys</div>
              <div className="mode-description">
                Bring your own API keys for maximum control and cost savings
              </div>
              <div className="mode-benefits">
                <div className="benefit">✅ Direct billing from providers</div>
                <div className="benefit">✅ Full API access</div>
                <div className="benefit">✅ No platform markup</div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Own Keys Configuration */}
      {useOwnKeys && (
        <div className="own-keys-config">
          <h4>Configure Your AI Provider Keys:</h4>
          <p className="config-note">
            Enable the providers you have API keys for. At least one provider must be enabled.
          </p>

          {/* OpenAI Configuration */}
          <div className="provider-config">
            <div className="provider-header">
              <label className="provider-toggle">
                <input
                  type="checkbox"
                  checked={useOpenAI}
                  onChange={(e) => setUseOpenAI(e.target.checked)}
                />
                <div className="provider-info">
                  <span className="provider-name">🤖 OpenAI (GPT-4)</span>
                  <span className="provider-note">Best for creative and conversational content</span>
                </div>
              </label>
              <span className={`key-status ${getKeyStatus(openaiApiKey, 'openai')}`}>
                {getKeyStatus(openaiApiKey, 'openai') === 'valid' ? '✅ Valid' : 
                 getKeyStatus(openaiApiKey, 'openai') === 'invalid' ? '❌ Invalid' : '⚪ Not Set'}
              </span>
            </div>
            {useOpenAI && showKeys && (
              <div className="key-input-container">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="api-key-input"
                />
                <small>Get your key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Dashboard</a></small>
              </div>
            )}
          </div>

          {/* Perplexity Configuration */}
          <div className="provider-config">
            <div className="provider-header">
              <label className="provider-toggle">
                <input
                  type="checkbox"
                  checked={usePerplexity}
                  onChange={(e) => setUsePerplexity(e.target.checked)}
                />
                <div className="provider-info">
                  <span className="provider-name">🔍 Perplexity AI</span>
                  <span className="provider-note">Excellent for research-based and factual content</span>
                </div>
              </label>
              <span className={`key-status ${getKeyStatus(perplexityApiKey, 'perplexity')}`}>
                {getKeyStatus(perplexityApiKey, 'perplexity') === 'valid' ? '✅ Valid' : 
                 getKeyStatus(perplexityApiKey, 'perplexity') === 'invalid' ? '❌ Invalid' : '⚪ Not Set'}
              </span>
            </div>
            {usePerplexity && showKeys && (
              <div className="key-input-container">
                <input
                  type="password"
                  placeholder="pplx-..."
                  value={perplexityApiKey}
                  onChange={(e) => setPerplexityApiKey(e.target.value)}
                  className="api-key-input"
                />
                <small>Get your key from <a href="https://www.perplexity.ai/settings/api" target="_blank">Perplexity Settings</a></small>
              </div>
            )}
          </div>

          {/* Gemini Configuration */}
          <div className="provider-config">
            <div className="provider-header">
              <label className="provider-toggle">
                <input
                  type="checkbox"
                  checked={useGemini}
                  onChange={(e) => setUseGemini(e.target.checked)}
                />
                <div className="provider-info">
                  <span className="provider-name">💎 Google Gemini</span>
                  <span className="provider-note">Great for analytical and structured content</span>
                </div>
              </label>
              <span className={`key-status ${getKeyStatus(geminiApiKey, 'gemini')}`}>
                {getKeyStatus(geminiApiKey, 'gemini') === 'valid' ? '✅ Valid' : 
                 getKeyStatus(geminiApiKey, 'gemini') === 'invalid' ? '❌ Invalid' : '⚪ Not Set'}
              </span>
            </div>
            {useGemini && showKeys && (
              <div className="key-input-container">
                <input
                  type="password"
                  placeholder="AI..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="api-key-input"
                />
                <small>Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></small>
              </div>
            )}
          </div>

          {/* Validation Warning */}
          {useOwnKeys && !(useOpenAI || usePerplexity || useGemini) && (
            <div className="validation-warning">
              ⚠️ Please enable at least one AI provider to generate content.
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .key-entry-section {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .toggle-keys-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .toggle-keys-btn:hover {
          background: #0056b3;
        }

        .key-mode-selection {
          margin-bottom: 20px;
        }

        .key-mode-selection h4 {
          margin-bottom: 15px;
          color: #2c3e50;
        }

        .mode-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .mode-option {
          cursor: pointer;
        }

        .mode-option input[type="radio"] {
          display: none;
        }

        .mode-card {
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .mode-option.selected .mode-card {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .mode-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 8px;
          color: #2c3e50;
        }

        .mode-description {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 12px;
        }

        .benefit {
          font-size: 13px;
          color: #28a745;
          margin: 4px 0;
        }

        .own-keys-config h4 {
          margin-bottom: 10px;
          color: #2c3e50;
        }

        .config-note {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 20px;
        }

        .provider-config {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .provider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .provider-toggle {
          display: flex;
          align-items: center;
          cursor: pointer;
          flex: 1;
        }

        .provider-toggle input[type="checkbox"] {
          margin-right: 12px;
        }

        .provider-info {
          display: flex;
          flex-direction: column;
        }

        .provider-name {
          font-weight: bold;
          color: #2c3e50;
        }

        .provider-note {
          font-size: 12px;
          color: #6c757d;
        }

        .key-status {
          font-size: 12px;
          font-weight: bold;
        }

        .key-status.valid { color: #28a745; }
        .key-status.invalid { color: #dc3545; }
        .key-status.empty { color: #6c757d; }

        .key-input-container {
          margin-top: 10px;
        }

        .api-key-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-family: monospace;
          font-size: 14px;
        }

        .api-key-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,.25);
        }

        .key-input-container small {
          display: block;
          margin-top: 5px;
          color: #6c757d;
        }

        .key-input-container a {
          color: #007bff;
          text-decoration: none;
        }

        .key-input-container a:hover {
          text-decoration: underline;
        }

        .validation-warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 12px;
          color: #856404;
          margin-top: 15px;
        }

        @media (max-width: 768px) {
          .mode-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default KeyEntry;