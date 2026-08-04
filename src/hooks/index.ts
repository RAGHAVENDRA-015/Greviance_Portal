import { useEffect, useState } from 'react'
import { useFilterStore } from '@/store'
import type { Complaint } from '@/types'

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useFilteredComplaints(complaints: Complaint[] | undefined) {
  const { search, status, category } = useFilterStore()
  const q = useDebouncedValue(search.toLowerCase().trim())

  if (!complaints) return []

  return complaints.filter((c) => {
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    const matchesStatus = status === 'all' || c.status === status
    const matchesCategory = category === 'all' || c.category === category
    return matchesSearch && matchesStatus && matchesCategory
  })
}

export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return { page: safePage, setPage, totalPages, items: slice }
}

export function useGeolocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const request = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setError(null)
        setLoading(false)
      },
      () => {
        setError('Unable to retrieve location')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return { coords, error, loading, request }
}
