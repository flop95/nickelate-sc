import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--d-contradict)',
          background: 'var(--color-failure-bg)',
          border: '1px solid var(--color-failure-border)',
          margin: 16,
          maxWidth: 280,
        }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Inspector error</div>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', opacity: 0.85 }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 10,
              background: 'transparent',
              border: '1px solid var(--color-failure-border)',
              color: 'var(--d-contradict)',
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 10,
            }}
          >
            reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
