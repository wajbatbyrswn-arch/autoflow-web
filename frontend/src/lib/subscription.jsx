import { createContext, useContext, useMemo } from 'react'
import toast from 'react-hot-toast'

const Ctx = createContext({ profile: null, isActive: false, refresh: () => {} })

export function SubscriptionProvider({ profile, onChange, children }) {
  const value = useMemo(() => ({
    profile,
    isActive: profile?.subscription_status === 'active',
    refresh: onChange,
  }), [profile, onChange])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSubscription() { return useContext(Ctx) }

/**
 * Wraps an event handler so unsubscribed users get a toast instead of the action firing.
 * Use as: <button onClick={guard(doThing)}>
 */
export function useGuard() {
  const { isActive } = useSubscription()
  return (fn) => (e) => {
    if (!isActive) {
      e?.preventDefault?.()
      e?.stopPropagation?.()
      toast.error('اشتراكك غير مُفعّل — اضغط (اشترك) لتفعيل الحساب', { duration: 4000 })
      return
    }
    return fn?.(e)
  }
}
