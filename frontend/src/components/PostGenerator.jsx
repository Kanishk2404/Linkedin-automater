import { useState, useRef } from 'react';
import { authenticatedFetch, handleApiResponse } from '../utils/api';
import ScheduleButton from './ScheduleButton';

const PostGenerator = ({
  userName,
  perplexityApiKey,
  geminiApiKey,
  openaiApiKey,
  usePerplexity,
  useGemini,
  useOpenAI,
  useOwnKeys,
  linkedinAccessToken,
  linkedinProfile,
  companyPages,
  DEFAULT_PERPLEXITY_KEY,
  DEFAULT_GEMINI_KEY,
  postHistoryRef,
  onPostCreated,
  incrementApiCallCount,
  checkApiCallLimit,
  getRemainingCalls
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedCompanyPage, setSelectedCompanyPage] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]); // For local file uploads
  const [generationMetadata, setGenerationMetadata] = useState(null);

  const textareaRef = useRef(null);

  const handleGeneratePost = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt for post generation.');
      return;
    }

    if (!checkApiCallLimit()) {
      alert(`API call limit reached. You have ${getRemainingCalls()} calls remaining this month.`);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await authenticatedFetch('/api/posts/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: aiPrompt,
          userName,
          useOwnKeys,
          perplexityApiKey: useOwnKeys ? perplexityApiKey : DEFAULT_PERPLEXITY_KEY,
          openaiApiKey: useOwnKeys ? openaiApiKey : '',
          geminiApiKey: useOwnKeys ? geminiApiKey : DEFAULT_GEMINI_KEY,
          aiProviders: [usePerplexity && 'perplexity', useOpenAI && 'openai', useGemini && 'gemini'].filter(Boolean)
        }),
      });

      const data = await handleApiResponse(response);
      if (data.success) {
        setGeneratedContent(data.content);
        setGenerationMetadata(data.metadata || null);
        incrementApiCallCount();
      } else {
        alert(data.message || 'Failed to generate post');
      }
    } catch (error) {
      console.error('Post generation error:', error);
      alert('Failed to generate post. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Sanitize content to remove unusual Unicode and HTML entities
  const sanitizeContent = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    return text
      // Convert mathematical bold Unicode characters to regular text
      .replace(/[\u1D400-\u1D7FF]/g, (match) => {
        const code = match.codePointAt(0);
        // Mathematical Bold Capital Letters (A-Z)
        if (code >= 0x1D400 && code <= 0x1D419) return String.fromCharCode(code - 0x1D400 + 65);
        // Mathematical Bold Small Letters (a-z) 
        if (code >= 0x1D41A && code <= 0x1D433) return String.fromCharCode(code - 0x1D41A + 97);
        // Mathematical Bold Capital Letters (continued range)
        if (code >= 0x1D434 && code <= 0x1D44D) return String.fromCharCode(code - 0x1D434 + 97);
        // Mathematical Italic, Script, etc. - convert to regular
        if (code >= 0x1D44E && code <= 0x1D7FF) {
          // Simplified conversion for other mathematical variants
          const baseOffset = (code - 0x1D44E) % 52;
          return baseOffset < 26 
            ? String.fromCharCode(65 + baseOffset) // A-Z
            : String.fromCharCode(97 + baseOffset - 26); // a-z
        }
        return match;
      })
      // Decode HTML entities
      .replace(/&#x([0-9A-F]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
      // Common HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper function to convert markdown formatting to LinkedIn formatting
  const formatContentForLinkedIn = (content) => {
    if (!content) return content;
    
    // Convert **bold** to LinkedIn bold formatting
    // LinkedIn supports Unicode bold characters for better visibility
    let formatted = content.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      // Convert regular text to bold Unicode characters
      return text.split('').map(char => {
        const boldMap = {
          'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
          'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
          'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
          'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
          'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
          'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
          '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
        };
        return boldMap[char] || char;
      }).join('');
    });
    
    // Convert *italic* to italic Unicode characters
    formatted = formatted.replace(/\*(.*?)\*/g, (match, text) => {
      const italicMap = {
        'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺', 'H': '𝐻', 'I': '𝐼', 'J': '𝐽',
        'K': '𝐾', 'L': '𝐿', 'M': '𝑀', 'N': '𝑁', 'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆', 'T': '𝑇',
        'U': '𝑈', 'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍',
        'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔', 'h': 'ℎ', 'i': '𝑖', 'j': '𝑗',
        'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛', 'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡',
        'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧'
      };
      return text.split('').map(char => italicMap[char] || char).join('');
    });
    
    return formatted;
  };

  const handlePostToLinkedIn = async () => {
    if (!generatedContent.trim()) {
      alert('Please generate content first.');
      return;
    }

    // Enhanced debugging for LinkedIn connection
    const localStorageToken = localStorage.getItem('linkedinAccessToken');
    const localStorageProfile = localStorage.getItem('linkedinProfile');
    
    console.log('🔍 Comprehensive LinkedIn connection validation:', {
      propsAccessToken: !!linkedinAccessToken,
      propsAccessTokenLength: linkedinAccessToken ? linkedinAccessToken.length : 0,
      localStorageToken: !!localStorageToken,
      localStorageTokenLength: localStorageToken ? localStorageToken.length : 0,
      tokensMatch: linkedinAccessToken === localStorageToken,
      hasProfile: !!linkedinProfile,
      hasLocalProfile: !!localStorageProfile,
      profileName: linkedinProfile ? `${linkedinProfile.firstName} ${linkedinProfile.lastName}` : 'None'
    });

    // Check both props and localStorage for token
    // Always use the latest token from localStorage
    const latestToken = localStorage.getItem('linkedinAccessToken');
    const effectiveToken = latestToken || linkedinAccessToken || localStorageToken;
    console.log('🔑 Posting with LinkedIn token:', effectiveToken);
    if (!effectiveToken) {
      console.log('❌ No LinkedIn access token found in props or localStorage');
      console.log('📋 localStorage debug:', {
        linkedinAccessToken: localStorage.getItem('linkedinAccessToken'),
        linkedinProfile: localStorage.getItem('linkedinProfile'),
        linkedinRefreshToken: localStorage.getItem('linkedinRefreshToken')
      });
      alert('LinkedIn account not connected. Please go to Settings to reconnect your LinkedIn account.');
      return;
    }

    // Validate token by checking with backend
    console.log('🔄 Validating LinkedIn token with backend...');
    try {
      const statusResponse = await authenticatedFetch('/api/posts/linkedin/status');
      if (!statusResponse.ok) {
        console.log('❌ LinkedIn status check failed:', statusResponse.status);
        alert('Failed to verify LinkedIn connection. Please reconnect your LinkedIn account in Settings.');
        return;
      }
      
      const statusData = await statusResponse.json();
      console.log('LinkedIn status from backend:', statusData);
      
      // If backend says not connected, but we have tokens locally, proceed with posting
      // The tokens in localStorage are more recent than database
      if (!statusData.connected && linkedinAccessToken) {
        console.log('⚠️ Backend shows disconnected but we have local tokens - proceeding with post');
      }
    } catch (error) {
      console.error('LinkedIn status check error:', error);
      // Don't block posting if status check fails - might be a temporary issue
      console.log('⚠️ Status check failed, but proceeding with posting attempt');
    }

    setIsPosting(true);
    try {
      console.log('📤 Attempting to post to LinkedIn...');
      
      // Sanitize the generated content
      const sanitizedContent = sanitizeContent(generatedContent);
      console.log('🧼 Content sanitized:', {
        original: generatedContent.substring(0, 100) + '...',
        sanitized: sanitizedContent.substring(0, 100) + '...',
        hasUnicodeIssues: generatedContent !== sanitizedContent
      });
      
      // Format content for LinkedIn (convert markdown to Unicode formatting)
      const formattedContent = formatContentForLinkedIn(sanitizedContent);
      console.log('🎨 Content formatted for LinkedIn:', {
        original: generatedContent.substring(0, 100) + '...',
        formatted: formattedContent.substring(0, 100) + '...'
      });
      
      // Determine post type and data format
      const hasImageUrls = imageUrls.filter(url => url.trim()).length > 0;
      const hasUploadedFiles = uploadedImages.length > 0;
      const hasImages = hasImageUrls || hasUploadedFiles;
      const postType = hasImages ? 'image' : (articleUrl.trim() ? 'article' : 'text');
      
      let requestBody;
      let requestHeaders = {
        'Cache-Control': 'no-cache', // Prevent caching issues
      };
      
      // Use FormData only if we have files to upload, otherwise use JSON
      if (hasUploadedFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        // Debug: Log what we're appending
        console.log('FormData Debug:', {
          formattedContent,
          contentLength: formattedContent?.length,
          hasContent: !!formattedContent,
          selectedCompanyPage,
          effectiveToken: !!effectiveToken,
          postType,
          uploadedImagesCount: uploadedImages.length
        });
        
        formData.append('content', formattedContent || '');
        formData.append('companyPageId', selectedCompanyPage || '');
        formData.append('articleUrl', articleUrl.trim() || '');
        formData.append('linkedinAccessToken', effectiveToken);
        formData.append('postType', postType);
        
        // Add image URLs
        imageUrls.filter(url => url.trim()).forEach((url, index) => {
          formData.append(`imageUrls[${index}]`, url);
        });
        
        // Add uploaded image files
        uploadedImages.forEach((image, index) => {
          formData.append(`images`, image.file);
        });
        
        // Debug: Log FormData entries
        console.log('FormData entries:', Array.from(formData.entries()));
        
        requestBody = formData;
        // Don't set Content-Type header - let authenticatedFetch detect FormData and browser set multipart/form-data
      } else {
        // Use JSON for text-only or URL-only posts
        requestBody = JSON.stringify({
          content: formattedContent,
          companyPageId: selectedCompanyPage || '',
          articleUrl: articleUrl.trim() || '',
          linkedinAccessToken: effectiveToken,
          postType: postType,
          imageUrls: imageUrls.filter(url => url.trim())
        });
        requestHeaders['Content-Type'] = 'application/json';
      }
      
      const response = await authenticatedFetch('/api/posts/post', {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
      });

      // Handle response with special logic for LinkedIn duplicate content
      let data;
      let isDuplicateContent = false;
      
      if (response.ok) {
        data = await response.json();
      } else {
        // Check if it's a duplicate content error (which means posting actually succeeded previously)
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || '';
        
        if (errorMessage.includes('duplicate') || errorMessage.includes('urn:li:share:')) {
          isDuplicateContent = true;
          console.log('🔄 LinkedIn detected duplicate content - this means the post was already successfully created');
          data = { 
            success: true, 
            message: 'Content already posted to LinkedIn',
            isDuplicate: true 
          };
        } else {
          // It's a real error, not a duplicate
          throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
        }
      }

      if (data.success) {
        if (isDuplicateContent) {
          alert('✅ Content already exists on LinkedIn! Your post was previously published successfully.');
        } else {
          alert('✅ Post published successfully on LinkedIn!');
        }
        
        clearContent();
        setSelectedCompanyPage('');
        if (onPostCreated) {
          onPostCreated();
        }
        if (postHistoryRef && postHistoryRef.current) {
          postHistoryRef.current.refreshHistory();
        }
      } else {
        console.error('❌ LinkedIn posting failed:', data);
        let errorMessage = data.message || 'Failed to post to LinkedIn';
        
        // Handle specific error cases
        if (errorMessage.includes('access token is invalid') || errorMessage.includes('401')) {
          errorMessage = 'LinkedIn access token has expired. Please reconnect your LinkedIn account in Settings.';
        } else if (errorMessage.includes('403') || errorMessage.includes('permissions')) {
          errorMessage = 'Insufficient LinkedIn permissions. Please reconnect your LinkedIn account with proper permissions.';
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('❌ Posting error:', error);
      alert('Failed to post to LinkedIn. Please check your connection and try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageUrlChange = (index, value) => {
    const newImageUrls = [...imageUrls];
    newImageUrls[index] = value;
    setImageUrls(newImageUrls);
  };

  const addImageUrl = () => {
    setImageUrls([...imageUrls, '']);
  };

  const removeImageUrl = (index) => {
    const newImageUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newImageUrls);
  };

  // Handle local image file uploads
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB.');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size
        };
        setUploadedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // Clear all images and content when generating new content
  const clearContent = () => {
    setGeneratedContent('');
    setGenerationMetadata(null);
    setImageUrls([]);
    setUploadedImages([]);
    setArticleUrl('');
  };

  const characterCount = generatedContent.length;
  const maxCharacters = 3000;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="post-generator">
      <h2>LinkedIn Post Generator</h2>
      
      {/* AI Prompt Input */}
      <div className="input-group">
        <label>Describe what you want to post about:</label>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g., Share insights about AI trends in 2024, or announce a new product launch..."
          rows={4}
          className="prompt-textarea"
        />
      </div>

      {/* LinkedIn Formatting Guide */}
      <div className="formatting-guide" style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '14px', 
          color: '#0077B5',
          fontWeight: '600'
        }}>
          📝 LinkedIn Formatting Tips
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              **text**
            </code>
            <span>→</span>
            <strong>Bold text</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              *text*
            </code>
            <span>→</span>
            <em>Italic text</em>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              #hashtag
            </code>
            <span>→</span>
            <span style={{ color: '#0077B5', fontWeight: '600' }}>#hashtag</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              • Bullet
            </code>
            <span>→</span>
            <span>• Bullet point</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              🔹 Icon
            </code>
            <span>→</span>
            <span>🔹 Visual separator</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ 
              backgroundColor: '#e9ecef', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              ---
            </code>
            <span>→</span>
            <span>Section divider</span>
          </div>
        </div>
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          💡 These formats will be automatically rendered in your LinkedIn preview below
        </div>
      </div>

      {/* Generate Button */}
      <div className="button-group">
        <button
          onClick={handleGeneratePost}
          disabled={isGenerating || !aiPrompt.trim()}
          className="generate-btn"
        >
          {isGenerating ? 'Generating...' : 'Generate Post'}
        </button>
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="generated-content">
          <h3>✨ Generated LinkedIn Post</h3>
          
          {/* AI Provider Information */}
          {generationMetadata && (
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '6px', 
              border: '1px solid #e1e5e9',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: '#0a66c2' }}>
                  🤖 Generated by: {generationMetadata.provider}
                </span>
                <span style={{ color: '#666' }}>
                  🔑 {generationMetadata.keyType}
                </span>
                <span style={{ color: '#666' }}>
                  ⚡ {generationMetadata.responseTime}ms
                </span>
                <span style={{ color: '#666', fontSize: '11px' }}>
                  📅 {new Date(generationMetadata.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {generationMetadata.attemptedProviders && generationMetadata.attemptedProviders.length > 1 && (
                <div style={{ marginTop: '5px', fontSize: '11px', color: '#666' }}>
                  Attempted: {generationMetadata.attemptedProviders.map(p => p.toUpperCase()).join(' → ')}
                </div>
              )}
            </div>
          )}
          
          <div className="content-preview">
            <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666', fontWeight: '500' }}>
              📝 Edit your post content below:
            </div>
            
            {/* Formatting Toolbar */}
            <div className="formatting-toolbar" style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => {
                  const textarea = textareaRef.current;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selectedText = generatedContent.substring(start, end);
                  const newText = generatedContent.substring(0, start) + 
                    `**${selectedText || 'bold text'}**` + 
                    generatedContent.substring(end);
                  setGeneratedContent(newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(
                      selectedText ? start + 2 : start + 2,
                      selectedText ? end + 2 : start + 11
                    );
                  }, 0);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                title="Make selected text bold"
              >
                **B**
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const textarea = textareaRef.current;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selectedText = generatedContent.substring(start, end);
                  const newText = generatedContent.substring(0, start) + 
                    `*${selectedText || 'italic text'}*` + 
                    generatedContent.substring(end);
                  setGeneratedContent(newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(
                      selectedText ? start + 1 : start + 1,
                      selectedText ? end + 1 : start + 12
                    );
                  }, 0);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontStyle: 'italic'
                }}
                title="Make selected text italic"
              >
                *I*
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const textarea = textareaRef.current;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selectedText = generatedContent.substring(start, end);
                  const newText = generatedContent.substring(0, start) + 
                    `#${selectedText || 'hashtag'}` + 
                    generatedContent.substring(end);
                  setGeneratedContent(newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(
                      selectedText ? start + 1 : start + 1,
                      selectedText ? end + 1 : start + 9
                    );
                  }, 0);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#0077B5',
                  fontWeight: '600'
                }}
                title="Add hashtag"
              >
                #Tag
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const textarea = textareaRef.current;
                  const start = textarea.selectionStart;
                  const newText = generatedContent.substring(0, start) + 
                    '\n\n---\n\n' + 
                    generatedContent.substring(start);
                  setGeneratedContent(newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 6, start + 6);
                  }, 0);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Add section divider"
              >
                --- Divider
              </button>

              <button
                type="button"
                onClick={() => {
                  const textarea = textareaRef.current;
                  const start = textarea.selectionStart;
                  const newText = generatedContent.substring(0, start) + 
                    '🔹 ' + 
                    generatedContent.substring(start);
                  setGeneratedContent(newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 3, start + 3);
                  }, 0);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Add visual separator"
              >
                🔹 Icon
              </button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={12}
              className="content-textarea"
              style={{ 
                borderColor: isOverLimit ? '#ff4444' : '#ddd',
                fontSize: '16px',
                lineHeight: '1.5',
                padding: '15px',
                minHeight: '200px',
                resize: 'vertical'
              }}
              placeholder="Your generated LinkedIn post will appear here..."
            />
            
            {/* LinkedIn Formatting Preview */}
            {generatedContent.includes('**') || generatedContent.includes('*') || sanitizeContent(generatedContent) !== generatedContent ? (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '14px' }}>
                <strong>📱 LinkedIn Preview:</strong>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e1e5e9' }}>
                  {formatContentForLinkedIn(sanitizeContent(generatedContent)).split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
                <small style={{ color: '#666', fontSize: '12px' }}>
                  ✨ **Bold** and *italic* formatting will be converted to Unicode characters. Special characters and HTML entities will be cleaned up.
                </small>
              </div>
            ) : null}
            
            <div className="character-count">
              <span style={{ color: isOverLimit ? '#ff4444' : '#666' }}>
                {characterCount}/{maxCharacters} characters
              </span>
              {isOverLimit && (
                <span className="limit-warning">
                  ⚠️ Exceeds LinkedIn limit
                </span>
              )}
            </div>
          </div>

          {/* Company Page Selection */}
          {companyPages.length > 0 && (
            <div className="input-group">
              <label>Post to Company Page (Optional)</label>
              <select
                value={selectedCompanyPage}
                onChange={(e) => setSelectedCompanyPage(e.target.value)}
                className="company-select"
              >
                <option value="">Post to Personal Profile</option>
                {companyPages.map((page, index) => (
                  <option key={index} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Article URL */}
          <div className="input-group">
            <label>Article URL (Optional)</label>
            <input
              type="url"
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="url-input"
            />
            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              📰 Add a link to create a rich preview card with title, description, and thumbnail on LinkedIn
            </small>
          </div>

          {/* Image Upload Section */}
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span>📸 Images (Optional)</span>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                Upload local files or add URLs
              </span>
            </label>
            
            {/* Local Image Upload */}
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              border: '2px dashed #e0e0e0', 
              borderRadius: '8px',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <label htmlFor="image-upload" style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#0077B5',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  📁 Upload Images
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                Supports JPG, PNG, GIF • Max 10MB per image • Multiple files allowed
              </div>
            </div>

            {/* Display Uploaded Images */}
            {uploadedImages.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                  📎 Uploaded Images ({uploadedImages.length})
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {uploadedImages.map((image) => (
                    <div key={image.id} style={{
                      position: 'relative',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: 'white'
                    }}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={{
                          width: '100%',
                          height: '80px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        padding: '4px 6px',
                        fontSize: '10px',
                        color: '#666',
                        backgroundColor: '#f8f9fa',
                        borderTop: '1px solid #e0e0e0'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                          {image.name.length > 15 ? image.name.substring(0, 15) + '...' : image.name}
                        </div>
                        <div>{(image.size / 1024 / 1024).toFixed(1)}MB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(image.id)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(255, 0, 0, 0.8)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image URLs Section */}
            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                🔗 Or Add Image URLs
              </h5>
            {imageUrls.map((url, index) => (
              <div key={index} className="image-url-row" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleImageUrlChange(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="url-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeImageUrl(index)}
                  className="remove-btn"
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addImageUrl}
              className="add-btn"
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              + Add Image URL
            </button>
            </div>
          </div>

          {/* Post Button and Schedule Button */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
            <button
              onClick={handlePostToLinkedIn}
              disabled={isPosting || isOverLimit}
              className="post-btn"
              style={{
                backgroundColor: '#0A66C2',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: isPosting || isOverLimit ? 'not-allowed' : 'pointer',
                opacity: isPosting || isOverLimit ? 0.6 : 1
              }}
            >
              {isPosting ? 'Posting...' : 'Post to LinkedIn'}
            </button>
            <ScheduleButton onSchedule={async (datetime) => {
            // Prepare post data
            const latestToken = localStorage.getItem('linkedinAccessToken');
            // Determine postType
            const hasImageUrls = imageUrls.filter(url => url.trim()).length > 0;
            const hasUploadedFiles = uploadedImages.length > 0;
            const hasImages = hasImageUrls || hasUploadedFiles;
            let postType = 'text';
            if (hasImages) postType = 'image';
            else if (articleUrl.trim()) postType = 'article';
            // Ensure only valid enum values
            const postData = {
              content: generatedContent,
              scheduledTime: datetime,
              linkedinAccessToken: latestToken,
              companyPageId: selectedCompanyPage || '',
              articleUrl: articleUrl.trim() || '',
              imageUrls: imageUrls.filter(url => url.trim()),
              postType
            };
            try {
              const response = await authenticatedFetch('/api/schedule/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
              });
              const data = await response.json();
              if (data.success) {
                alert('✅ Post scheduled successfully for ' + datetime);
                // Optionally clear form or refresh scheduled posts
              } else {
                alert('❌ Failed to schedule post: ' + (data.message || 'Unknown error'));
              }
            } catch (err) {
              alert('❌ Error scheduling post: ' + err.message);
            }
          }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostGenerator;