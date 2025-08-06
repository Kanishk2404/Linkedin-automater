import { useState } from 'react';
import { authenticatedFetch, handleApiResponse } from '../utils/api';

const BulkPostManager = ({
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
  onBulkComplete,
  incrementApiCallCount,
  checkApiCallLimit,
  getRemainingCalls
}) => {
  const [bulkPrompts, setBulkPrompts] = useState(['']);
  const [generatedPosts, setGeneratedPosts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [selectedCompanyPage, setSelectedCompanyPage] = useState('');

  const addPrompt = () => {
    setBulkPrompts([...bulkPrompts, '']);
  };

  const removePrompt = (index) => {
    const newPrompts = bulkPrompts.filter((_, i) => i !== index);
    setBulkPrompts(newPrompts);
  };

  const updatePrompt = (index, value) => {
    const newPrompts = [...bulkPrompts];
    newPrompts[index] = value;
    setBulkPrompts(newPrompts);
  };

  const handleGenerateBulkPosts = async () => {
    if (!bulkPrompts.some(prompt => prompt.trim())) {
      alert('Please enter at least one prompt.');
      return;
    }

    if (!checkApiCallLimit()) {
      alert(`API call limit reached. You have ${getRemainingCalls()} calls remaining this month.`);
      return;
    }

    setIsGenerating(true);
    const posts = [];

    try {
      for (let i = 0; i < bulkPrompts.length; i++) {
        const prompt = bulkPrompts[i];
        if (!prompt.trim()) continue;

        const response = await authenticatedFetch('/api/posts/generate', {
          method: 'POST',
          body: JSON.stringify({
            prompt: prompt,
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
          posts.push({
            id: i,
            prompt: prompt,
            content: data.content,
            isEditing: false
          });
          incrementApiCallCount();
        }
      }

      setGeneratedPosts(posts);
    } catch (error) {
      console.error('Bulk generation error:', error);
      alert('Failed to generate bulk posts. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditPost = (index) => {
    const newPosts = [...generatedPosts];
    newPosts[index].isEditing = !newPosts[index].isEditing;
    setGeneratedPosts(newPosts);
  };

  const updatePostContent = (index, content) => {
    const newPosts = [...generatedPosts];
    newPosts[index].content = content;
    setGeneratedPosts(newPosts);
  };

  const handleScheduleBulkPosts = async () => {
    if (generatedPosts.length === 0) {
      alert('Please generate posts first.');
      return;
    }

    if (!scheduleDate) {
      alert('Please select a start date.');
      return;
    }

    if (!linkedinAccessToken) {
      alert('LinkedIn account not connected.');
      return;
    }

    setIsScheduling(true);
    try {
      const response = await authenticatedFetch('/api/schedule/bulk', {
        method: 'POST',
        body: JSON.stringify({
          posts: generatedPosts.map(post => ({
            content: post.content,
            imageUrls: [],
            articleUrl: '',
            companyPageId: selectedCompanyPage
          })),
          startDate: scheduleDate,
          scheduleTime,
          postsPerDay,
          linkedinAccessToken
        }),
      });

      const data = await handleApiResponse(response);
      if (data.success) {
        alert(`Bulk posts scheduled successfully! ${generatedPosts.length} posts will be posted starting from ${scheduleDate}.`);
        setGeneratedPosts([]);
        setBulkPrompts(['']);
        setScheduleDate('');
        onBulkComplete();
      } else {
        alert(data.message || 'Failed to schedule bulk posts');
      }
    } catch (error) {
      console.error('Bulk scheduling error:', error);
      alert('Failed to schedule bulk posts. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="bulk-post-manager">
      <h3>Bulk Post Generator</h3>
      
      {/* Prompts Input */}
      <div className="input-group">
        <label>Enter multiple prompts for bulk generation</label>
        {bulkPrompts.map((prompt, index) => (
          <div key={index} className="prompt-row">
            <textarea
              value={prompt}
              onChange={(e) => updatePrompt(index, e.target.value)}
              placeholder={`Prompt ${index + 1} - Describe what you want to post about...`}
              rows={3}
              className="prompt-input"
            />
            {bulkPrompts.length > 1 && (
              <button
                type="button"
                onClick={() => removePrompt(index)}
                className="remove-btn"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addPrompt}
          className="add-btn"
        >
          Add Another Prompt
        </button>
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
          📝 LinkedIn Formatting Tips for Your Posts
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
          💡 Generated posts will include these formats and show exactly how they'll appear on LinkedIn
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateBulkPosts}
        disabled={isGenerating || !bulkPrompts.some(p => p.trim())}
        className="generate-btn"
      >
        {isGenerating ? 'Generating Posts...' : 'Generate Bulk Posts'}
      </button>

      {/* Generated Posts */}
      {generatedPosts.length > 0 && (
        <div className="generated-posts" style={{ marginTop: '20px' }}>
          <h4 style={{ 
            color: '#0077B5', 
            marginBottom: '16px',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            📝 Generated Posts ({generatedPosts.length})
          </h4>
          
          {generatedPosts.map((post, index) => (
            <div key={post.id} className="generated-post" style={{
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div className="post-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h5 style={{
                  margin: 0,
                  color: '#333333',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  📄 Post {index + 1}
                </h5>
                <button
                  type="button"
                  onClick={() => handleEditPost(index)}
                  className="edit-btn"
                  style={{
                    backgroundColor: post.isEditing ? '#28a745' : '#0077B5',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {post.isEditing ? '💾 Save' : '✏️ Edit'}
                </button>
              </div>
              
              {post.isEditing ? (
                <textarea
                  value={post.content}
                  onChange={(e) => updatePostContent(index, e.target.value)}
                  rows={6}
                  className="content-textarea"
                />
              ) : (
                <div>
                  {/* LinkedIn-style Preview */}
                  <div className="linkedin-preview" style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    marginBottom: '12px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}>
                    {/* Profile Header */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      {linkedinProfile?.profilePicture && (
                        <img 
                          src={linkedinProfile.profilePicture} 
                          alt="Profile" 
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            marginRight: '12px'
                          }}
                        />
                      )}
                      <div>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '14px', 
                          lineHeight: '1.2',
                          color: '#000000'
                        }}>
                          {linkedinProfile?.firstName} {linkedinProfile?.lastName}
                          {selectedCompanyPage && companyPages.find(p => p.id === selectedCompanyPage) && (
                            <span style={{ color: '#666666', fontWeight: '400' }}>
                              {' '}• {companyPages.find(p => p.id === selectedCompanyPage).name}
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666666',
                          lineHeight: '1.2'
                        }}>
                          {linkedinProfile?.headline}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666666',
                          lineHeight: '1.2'
                        }}>
                          Now • 🌍
                        </div>
                      </div>
                    </div>
                    
                    {/* Post Content */}
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.4',
                      color: '#000000',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '12px'
                    }}>
                      {post.content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|#\w+)/g).map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          // Bold text
                          return <strong key={i}>{part.slice(2, -2)}</strong>;
                        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                          // Italic text (single asterisks, not double)
                          return <em key={i}>{part.slice(1, -1)}</em>;
                        } else if (part.startsWith('#')) {
                          // Hashtags
                          return <span key={i} style={{ color: '#0077B5', fontWeight: '600' }}>{part}</span>;
                        }
                        return part;
                      })}
                    </div>
                    
                    {/* LinkedIn Actions Bar */}
                    <div style={{
                      borderTop: '1px solid #e0e0e0',
                      paddingTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-around',
                      fontSize: '12px',
                      color: '#666666'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>👍</span> Like
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>💬</span> Comment
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🔄</span> Repost
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📤</span> Send
                      </div>
                    </div>
                  </div>

                  {/* Original Content (for editing reference) */}
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ 
                      fontSize: '12px', 
                      color: '#666666', 
                      cursor: 'pointer',
                      padding: '4px 0'
                    }}>
                      Show raw content
                    </summary>
                    <div className="post-content" style={{
                      backgroundColor: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      marginTop: '4px'
                    }}>
                      {post.content}
                    </div>
                  </details>
                </div>
              )}
              
              <div className="character-count" style={{
                fontSize: '12px',
                color: '#666666',
                textAlign: 'right',
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                📊 {post.content.length}/3000 characters
              </div>
            </div>
          ))}

          {/* Scheduling Options */}
          <div className="scheduling-options" style={{
            marginTop: '24px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{
              color: '#0077B5',
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              📅 Schedule Posts
            </h4>
            
            <div className="schedule-inputs">
              <div className="input-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="date-input"
                />
              </div>
              
              <div className="input-group">
                <label>Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="time-input"
                />
              </div>
              
              <div className="input-group">
                <label>Posts per Day</label>
                <select
                  value={postsPerDay}
                  onChange={(e) => setPostsPerDay(parseInt(e.target.value))}
                  className="select-input"
                >
                  <option value={1}>1 post per day</option>
                  <option value={2}>2 posts per day</option>
                  <option value={3}>3 posts per day</option>
                  <option value={4}>4 posts per day</option>
                </select>
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

            <button
              onClick={handleScheduleBulkPosts}
              disabled={isScheduling || !scheduleDate}
              className="schedule-btn"
            >
              {isScheduling ? 'Scheduling...' : 'Schedule Bulk Posts'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkPostManager; 