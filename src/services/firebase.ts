import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  type User as FirebaseUser,
  type AuthError,
} from 'firebase/auth'

function readFirebaseConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured. Missing env vars: ${missing.join(', ')}. Check frontend/.env`,
    )
  }

  return config
}

const firebaseConfig = readFirebaseConfig()

/** Singleton Firebase app — never initialize twice. */
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)

/** Ensure auth survives browser refresh (local persistence). */
const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {
  // Persistence failures are non-fatal; auth still works for the session.
})

export async function registerWithEmail(email: string, password: string, displayName: string) {
  await persistenceReady
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await updateProfile(credential.user, { displayName: displayName.trim() })
  // Force token refresh so backend receives the updated `name` claim.
  await credential.user.getIdToken(true)
  return credential.user
}

export async function loginWithEmail(email: string, password: string) {
  await persistenceReady
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
  await credential.user.getIdToken(true)
  return credential.user
}

export async function logout() {
  await signOut(auth)
}

export async function resetPassword(email: string) {
  await persistenceReady
  await sendPasswordResetEmail(auth, email.trim())
}

export async function getIdToken(forceRefresh = false) {
  await persistenceReady
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  // This also fires after Firebase refreshes an ID token in a long-lived tab.
  return onIdTokenChanged(auth, callback)
}

export function isFirebaseAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('auth/')
  )
}

export type { FirebaseUser, AuthError }
