import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface LikeState {
  // Use a record for O(1) membership and compact persistence
  likedPostIds: Record<string, true>
  isLiked: (postId: string) => boolean
  setLiked: (postId: string, liked: boolean) => void
  setMany: (postIds: string[], liked: boolean) => void
  clear: () => void
}

export const useLikeStore = create<LikeState>()(
  persist(
    (set, get) => ({
      likedPostIds: {},
      isLiked: (postId: string) => !!get().likedPostIds[postId],
      setLiked: (postId: string, liked: boolean) =>
        set(state => {
          const next = { ...state.likedPostIds }
          if (liked) next[postId] = true
          else delete next[postId]
          return { likedPostIds: next }
        }),
      setMany: (postIds: string[], liked: boolean) =>
        set(state => {
          const next = { ...state.likedPostIds }
          for (const id of postIds) {
            if (!id) continue
            if (liked) next[id] = true
            else delete next[id]
          }
          return { likedPostIds: next }
        }),
      clear: () => set({ likedPostIds: {} })
    }),
    {
      name: 'like-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1
    }
  )
)

