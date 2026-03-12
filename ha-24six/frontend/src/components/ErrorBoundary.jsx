import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('[ErrorBoundary]', e, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:24, color:'#ff6b6b', fontFamily:'monospace', fontSize:12 }}>
          <div style={{ fontWeight:700, marginBottom:8, color:'var(--accent)' }}>⚠ Render Error</div>
          <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <div style={{ marginTop:12, opacity:0.6, fontSize:11 }}>
            {this.state.error?.stack?.split('\n').slice(0,5).join('\n')}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
