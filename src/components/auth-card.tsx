'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { fetchJson } from '@/lib/utils'

export type AuthUser = { id: string; email: string; role: 'operator' | 'user' }

/**
 * Sign-in / sign-up card shown when a logged-out visitor opens the app.
 * No email verification — this is a lightweight micro-tool account.
 */
export function AuthCard({
  onAuthed,
  brandName,
  brandLogo,
}: {
  onAuthed: (user: AuthUser) => void
  /** White-label instance branding (falls back to the built-in mark) */
  brandName?: string
  brandLogo?: string | null
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (mode: 'login' | 'register') => {
    setBusy(true)
    setError('')
    try {
      const json = await fetchJson<{ user?: AuthUser }>(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!json.user) throw new Error('Something went wrong')
      onAuthed(json.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <BrandMark
            name={brandName?.trim() || 'SatInvoice'}
            logo={brandLogo ?? null}
            size="lg"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your invoices — or create a free account. 3 invoices free, no card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Create account</TabsTrigger>
              </TabsList>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete={busy ? 'current-password' : 'new-password'}
                    placeholder={busy ? '••••••••' : 'at least 8 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email && password) {
                        const active =
                          (document.querySelector('[role=tab][data-state=active]') as HTMLElement | null)
                            ?.textContent ?? 'Sign in'
                        void submit(active.toLowerCase().includes('create') ? 'register' : 'login')
                      }
                    }}
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <TabsContent value="login" className="mt-0">
                  <Button
                    className="w-full"
                    disabled={busy || !email || !password}
                    onClick={() => submit('login')}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Sign in
                  </Button>
                </TabsContent>
                <TabsContent value="register" className="mt-0">
                  <Button
                    className="w-full"
                    disabled={busy || !email || !password}
                    onClick={() => submit('register')}
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Create free account
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your invoices are private to your account. Clients only see the share link you send them.
        </p>
      </motion.div>
    </div>
  )
}
