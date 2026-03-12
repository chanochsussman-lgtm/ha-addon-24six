/**
 * useLongPress — works on both touch (500ms hold) and desktop (right-click)
 */
import { useRef, useCallback } from 'react'

export function useLongPress(onTrigger, delay = 500) {
  const timer   = useRef(null)
  const moved   = useRef(false)
  const active  = useRef(false)

  const start = useCallback((e) => {
    if (e.button === 2) return  // right-click handled by onContextMenu
    moved.current  = false
    active.current = true
    timer.current  = setTimeout(() => {
      if (!moved.current && active.current) onTrigger(e)
    }, delay)
  }, [onTrigger, delay])

  const cancel = useCallback(() => {
    active.current = false
    clearTimeout(timer.current)
  }, [])

  const onContextMenu = useCallback((e) => {
    e.preventDefault()
    cancel()
    onTrigger(e)
  }, [onTrigger, cancel])

  return {
    onPointerDown:   start,
    onPointerUp:     cancel,
    onPointerCancel: cancel,
    onPointerMove:   () => { moved.current = true; cancel() },
    onContextMenu,
  }
}
