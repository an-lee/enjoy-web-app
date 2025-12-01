import { useQuery } from '@tanstack/react-query'
import { db, type Audio } from '@/db'

const MAX_ITEMS = 50

export const audioKeys = {
  all: ['audios'] as const,
  history: (searchQuery?: string) =>
    [...audioKeys.all, 'history', searchQuery || ''] as const,
}

async function fetchAudioHistory(
  searchQuery?: string
): Promise<Audio[]> {
  let query = db.audios.orderBy('createdAt').reverse()
  const allAudios = await query.toArray()

  const ttsAudios = allAudios.filter((audio) => audio.sourceText)

  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.toLowerCase().trim()
    const filtered = ttsAudios.filter((item) =>
      (item.sourceText || '').toLowerCase().includes(searchTerm)
    )
    return filtered.slice(0, MAX_ITEMS)
  }

  return ttsAudios.slice(0, MAX_ITEMS)
}

export function useAudioHistory(
  enabled: boolean = true,
  searchQuery?: string
) {
  return useQuery({
    queryKey: audioKeys.history(searchQuery),
    queryFn: () => fetchAudioHistory(searchQuery),
    enabled,
    staleTime: 1000 * 30,
  })
}


