import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="bg-white border border-red-100 rounded-xl p-10 max-w-md w-full text-center shadow-sm">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-50 px-3 py-2 rounded border text-left break-all">
              {this.state.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
