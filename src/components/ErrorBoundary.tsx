import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FirestoreErrorInfo } from '../firebase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  friendlyMessage: string;
  detailMessage: string | null;
}

function parseFriendlyError(error: Error): { friendlyMessage: string; detailMessage: string | null } {
  try {
    const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      const lower = parsed.error.toLowerCase();
      if (lower.includes('resource-exhausted') || lower.includes('quota')) {
        return {
          friendlyMessage:
            'Cloud storage quota was temporarily exceeded. Please wait a moment or continue in local mode.',
          detailMessage: parsed.error,
        };
      }
      if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
        return {
          friendlyMessage:
            'Access to cloud history was denied for this session. Please sign in again or continue locally.',
          detailMessage: parsed.error,
        };
      }
      return {
        friendlyMessage: 'A cloud sync error interrupted WorldLens. Your local data remains safe.',
        detailMessage: parsed.error,
      };
    }
  } catch {
    // Not a structured JSON Firestore error
  }
  return {
    friendlyMessage: 'WorldLens encountered an unexpected error. Please reload to recover.',
    detailMessage: error.message || null,
  };
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      friendlyMessage: '',
      detailMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const { friendlyMessage, detailMessage } = parseFriendlyError(error);
    return {
      hasError: true,
      friendlyMessage,
      detailMessage,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('WorldLens ErrorBoundary caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      friendlyMessage: '',
      detailMessage: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F6F8FC] text-[#071428] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#071428]">Something went wrong</h1>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {this.state.friendlyMessage}
              </p>
            </div>
          </div>

          {this.state.detailMessage && (
            <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500 break-words font-mono">
              {this.state.detailMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-[#071428] transition-colors"
            >
              Try to Continue
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-4 rounded-xl bg-[#1A6BFF] hover:bg-[#1558D6] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Reload WorldLens</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
