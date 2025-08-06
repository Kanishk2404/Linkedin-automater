import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="error-boundary">
          <div className="form-section" style={{ textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
              We're sorry, but something unexpected happened. Please refresh the page and try again.
            </p>
            
            <div style={{ marginBottom: '2rem' }}>
              <button 
                onClick={() => window.location.reload()} 
                className="login-btn"
                style={{ marginRight: '1rem' }}
              >
                Refresh Page
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
                className="toggle-btn"
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ textAlign: 'left', marginTop: '2rem' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                  Error Details (Development Mode)
                </summary>
                <pre style={{ 
                  background: '#f8f8f8', 
                  padding: '1rem', 
                  borderRadius: '4px', 
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  border: '1px solid #ddd'
                }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
