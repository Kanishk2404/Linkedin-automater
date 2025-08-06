// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Utility function to make authenticated API requests
export const authenticatedFetch = (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  // console.log('authenticatedFetch - Token exists:', !!token);
  // console.log('authenticatedFetch - Token preview:', token ? token.substring(0, 20) + '...' : 'null');
  
  // Ensure URL is absolute by adding base URL if it's relative
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const defaultHeaders = {};

  // Only set Content-Type to application/json if not explicitly provided and body is not FormData
  // This allows FormData requests to have the browser set the correct Content-Type
  if (options.headers && options.headers.hasOwnProperty('Content-Type')) {
    // Use the explicitly provided Content-Type (could be undefined for FormData)
    if (options.headers['Content-Type'] !== undefined) {
      defaultHeaders['Content-Type'] = options.headers['Content-Type'];
    }
    // If Content-Type is explicitly undefined, don't set it at all
  } else if (!options.body || !(options.body instanceof FormData)) {
    // Default to JSON only for non-FormData requests
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // console.log('authenticatedFetch - Headers:', defaultHeaders);

  return fetch(fullUrl, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// Regular fetch with base URL for non-authenticated requests
export const apiFetch = (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  return fetch(fullUrl, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// Helper to handle API responses with error handling
export const handleApiResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.reload(); // Force re-authentication
      throw new Error('Authentication expired. Please log in again.');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
