import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { authenticatedFetch, handleApiResponse } from '../utils/api';

const PostHistory = forwardRef(({
  userName,
  linkedinAccessToken,
  linkedinProfile
}, ref) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('posted'); // 'posted' or 'scheduled'

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchPosts();
    }
  }));

  const fetchPosts = async () => {
    if (!linkedinAccessToken) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/posts/history?linkedinAccessToken=${linkedinAccessToken}`);
      const data = await handleApiResponse(response);
      if (data.success) {
        setPosts(data.posts);
      } else {
        console.error('Failed to fetch posts:', data.message);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScheduledPosts = async () => {
    if (!linkedinAccessToken) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/schedule/posts');
      const data = await handleApiResponse(response);
      if (data.success) {
        setPosts(data.scheduledPosts);
      } else {
        console.error('Failed to fetch scheduled posts:', data.message);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('⚠️ Are you sure you want to delete this post?\n\nThis will:\n• Delete the post from LinkedIn\n• Remove it from your local history\n\nThis action cannot be undone.')) return;

    try {
      const response = await authenticatedFetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          linkedinAccessToken
        }),
      });

      const data = await handleApiResponse(response);
      if (data.success) {
        alert('✅ Post deleted successfully from LinkedIn and local history');
        fetchPosts();
      } else {
        alert('❌ ' + (data.message || 'Failed to delete post'));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleDeleteScheduledPost = async (postId) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;

    try {
      const response = await authenticatedFetch(`/api/schedule/posts/${postId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          linkedinAccessToken
        }),
      });

      const data = await handleApiResponse(response);
      if (data.success) {
        alert('Scheduled post deleted successfully');
        fetchScheduledPosts();
      } else {
        alert(data.message || 'Failed to delete scheduled post');
      }
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
      alert('Failed to delete scheduled post');
    }
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    if (tab === 'posted') {
      fetchPosts();
    } else {
      fetchScheduledPosts();
    }
  };

  useEffect(() => {
    if (linkedinAccessToken) {
      fetchPosts();
    }
  }, [linkedinAccessToken]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEngagementDisplay = (engagement) => {
    if (!engagement) return null;
    
    return (
      <div className="engagement-stats">
        <span className="engagement-item">
          👍 {engagement.likes || 0}
        </span>
        <span className="engagement-item">
          💬 {engagement.comments || 0}
        </span>
        <span className="engagement-item">
          🔄 {engagement.shares || 0}
        </span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: '#ff9800',
      posted: '#4CAF50',
      failed: '#f44336'
    };

    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: statusColors[status] || '#ccc' }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="post-history">
      <h3>Post History</h3>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${selectedTab === 'posted' ? 'active' : ''}`}
          onClick={() => handleTabChange('posted')}
        >
          Posted Posts
        </button>
        <button
          className={`tab-btn ${selectedTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => handleTabChange('scheduled')}
        >
          Scheduled Posts
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <p>Loading posts...</p>
        </div>
      )}

      {/* Posts List */}
      {!isLoading && posts.length === 0 && (
        <div className="empty-state">
          <p>No {selectedTab} posts found.</p>
        </div>
      )}

      {!isLoading && posts.length > 0 && (
        <div className="posts-list">
          {posts.map((post) => (
            <div key={post.id} className="post-item">
              <div className="post-header">
                <div className="post-meta">
                  <span className="post-date">
                    {formatDate(post.createdAt)}
                  </span>
                  {selectedTab === 'scheduled' && (
                    <span className="scheduled-time">
                      Scheduled for: {formatDate(post.scheduledTime)}
                    </span>
                  )}
                  {selectedTab === 'scheduled' && (
                    getStatusBadge(post.status)
                  )}
                </div>
                <button
                  onClick={() => selectedTab === 'posted' 
                    ? handleDeletePost(post.id) 
                    : handleDeleteScheduledPost(post.id)
                  }
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
              
              <div className="post-content">
                {post.content}
              </div>

              {/* Show error message for failed scheduled posts */}
              {selectedTab === 'scheduled' && post.status === 'failed' && post.errorMessage && (
                <div className="post-error-message" style={{ color: '#f44336', marginTop: '8px', fontWeight: 'bold' }}>
                  ❌ Error: {post.errorMessage}
                </div>
              )}
              
              {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="post-images">
                  {post.imageUrls.map((url, index) => (
                    <img 
                      key={index} 
                      src={url} 
                      alt={`Post image ${index + 1}`}
                      className="post-image"
                    />
                  ))}
                </div>
              )}
              
              {post.articleUrl && (
                <div className="post-article">
                  <a href={post.articleUrl} target="_blank" rel="noopener noreferrer">
                    📄 View Article
                  </a>
                </div>
              )}
              
              {selectedTab === 'posted' && post.engagement && (
                getEngagementDisplay(post.engagement)
              )}
              
              {post.companyPageId && (
                <div className="post-company">
                  <span className="company-badge">
                    🏢 Company Post
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PostHistory.displayName = 'PostHistory';

export default PostHistory; 