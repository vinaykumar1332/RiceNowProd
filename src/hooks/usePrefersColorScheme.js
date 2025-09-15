import { useEffect, useState } from 'react'

export default function usePrefersColorScheme() {
  const [prefersDark, setPrefersDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setPrefersDark(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  return prefersDark
}
