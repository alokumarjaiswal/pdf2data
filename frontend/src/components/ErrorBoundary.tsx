import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black text-grey-100 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl text-center">
            <div className="p-6 bg-grey-900 border border-grey-800">
              <h2 className="text-xl font-semibold text-grey-100 mb-4 shiny-text-strong">
                Something went wrong
              </h2>
              <p className="text-grey-400 font-mono shiny-text mb-4">
                An unexpected error occurred. Please refresh the page or try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="py-2 px-4 bg-grey-800 hover:bg-grey-700 text-grey-100 font-medium border border-grey-700 transition-all duration-200 shiny-text"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 