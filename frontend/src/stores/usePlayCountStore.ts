// frontend/src/stores/usePlayCountStore.ts
import { create } from "zustand";
import { axiosInstance } from "../lib/axios"; // Убедитесь, что путь правильный
// import toast from 'react-hot-toast'; // Раскомментируйте, если хотите тосты здесь

interface PlayCountStore {
  incrementPlayCount: (songId: string) => Promise<void>;
}

export const usePlayCountStore = create<PlayCountStore>(() => ({
  incrementPlayCount: async (songId: string) => {
    try {
      await axiosInstance.post(`/songs/${songId}/play`);
      // toast.success(`Play count incremented for song ${songId}`); // Опционально
    } catch (error) {
      console.error("Failed to increment play count:", error);
      // toast.error('Failed to increment play count.'); // Опционально
    }
  },
}));
