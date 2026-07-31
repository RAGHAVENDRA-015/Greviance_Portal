/** Open-redirect protection for post-login redirects */
export function isAuthPathSafe(path: string) {
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('://')) return false
  const blocked = ['/login', '/register', '/forgot-password']
  return !blocked.some((p) => path === p || path.startsWith(`${p}/`))
}
