import { Component } from 'react';

/**
 * Keeps a crash inside one part of the screen from blanking the rest of the app.
 * - `fallback(error, reset)` renders what to show instead (default: a small message with "Try again").
 * - `resetKey`: when it changes (for example the page path) the boundary tries to render its children again.
 * - `onError(error, info)`: optional hook, for logging.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = () => this.setState({ error: null });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div className="panel error-card" role="alert">
        <h3>{this.props.title || 'Something went wrong here'}</h3>
        <p className="muted">The rest of the app is still working.</p>
        <button type="button" className="btn primary" onClick={this.reset}>Try again</button>
      </div>
    );
  }
}
