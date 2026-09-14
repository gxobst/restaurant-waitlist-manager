import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary"
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-center"
        >
          <p className="text-sm font-medium text-red-800">Something went wrong</p>
          <p className="text-sm text-red-600 mt-1">Unable to load data. Please try again.</p>
          {this.props.onRetry && (
            <button
              type="button"
              onClick={this.retry}
              className="mt-3 px-4 py-2 text-sm font-medium min-h-12 text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

