/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import { auth, signOut as firebaseSignOut } from "../lib/firebase";

interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  fullName: string;
  imageUrl?: string | null;
  isAdmin?: boolean;
  language?: string;
}

interface UpdateProfileData {
  fullName?: string;
  imageUrl?: File | null;
}

interface FirebaseUserDataForSync {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  checkAdminStatus: () => Promise<void>;
  syncUser: (userData: FirebaseUserDataForSync) => Promise<void>;
  fetchUser: (firebaseUid: string) => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
  updateUserProfile: (data: UpdateProfileData) => Promise<void>;
  updateUserLanguage: (language: string) => Promise<void>;
}

const getAuthHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return {};
  const token = await currentUser.getIdToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAdmin: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),

      updateUserLanguage: async (language: string) => {
        set({ isLoading: true, error: null });
        try {
          const authHeaders = await getAuthHeaders();
          await axiosInstance.put("/users/language", { language }, authHeaders);

          set((state) => ({
            user: state.user ? { ...state.user, language } : state.user,
            isLoading: false,
          }));
          console.log("AuthStore: User language updated.");
        } catch (error: any) {
          console.error("AuthStore: Update language error:", error);
          set({
            error: error.response?.data?.message || "Failed to update language",
            isLoading: false,
          });
          throw error;
        }
      },
      updateUserProfile: async (data: UpdateProfileData) => {
        set({ isLoading: true, error: null });
        try {
          const formData = new FormData();
          if (data.fullName) {
            formData.append("fullName", data.fullName);
          }
          if (data.imageUrl) {
            formData.append("imageUrl", data.imageUrl);
          }

          const authHeaders = await getAuthHeaders();

          const config = {
            headers: {
              ...authHeaders.headers,
              "Content-Type": "multipart/form-data",
            },
          };

          const response = await axiosInstance.put(
            "/users/me",
            formData,
            config
          );

          const updatedUser = response.data.user;

          set((state) => ({
            user: state.user ? { ...state.user, ...updatedUser } : updatedUser,
            isLoading: false,
          }));

          console.log("AuthStore: User profile updated.");
        } catch (error: any) {
          console.error("AuthStore: Update profile error:", error);
          set({
            error: error.response?.data?.message || "Failed to update profile",
            isLoading: false,
          });
          throw error;
        }
      },

      syncUser: async (userData: FirebaseUserDataForSync) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            firebaseUid: userData.uid,
            email: userData.email,
            fullName: userData.displayName,
            imageUrl: userData.photoURL,
          };

          const headers = await getAuthHeaders();
          const response = await axiosInstance.post(
            "/auth/sync",
            payload,
            headers
          );

          const syncedUserFromBackend = response.data.user;

          if (
            !syncedUserFromBackend ||
            !syncedUserFromBackend._id ||
            !syncedUserFromBackend.firebaseUid
          ) {
            throw new Error(
              "Backend did not return a valid user with MongoDB ID or Firebase UID."
            );
          }

          await get().checkAdminStatus();
          set({
            user: {
              id: syncedUserFromBackend._id,
              firebaseUid: syncedUserFromBackend.firebaseUid,
              email: syncedUserFromBackend.email,
              fullName:
                syncedUserFromBackend.fullName || syncedUserFromBackend.email,
              imageUrl: syncedUserFromBackend.imageUrl || null,
              language: syncedUserFromBackend.language,
            },
            isLoading: false,
            error: null,
          });
          console.log(
            "AuthStore: User synced with backend. MongoDB ID:",
            syncedUserFromBackend._id,
            "AuthStore: User synced with backend. Language:",
            syncedUserFromBackend.language
          );
        } catch (error: any) {
          console.error("AuthStore: Sync error:", error);
          set({
            error: error.response?.data?.message || "Failed to sync user",
            isLoading: false,
            user: null,
            isAdmin: false,
          });
        }
      },

      fetchUser: async (firebaseUid: string) => {
        set({ isLoading: true, error: null });
        try {
          const currentUser = auth.currentUser;
          if (!currentUser || currentUser.uid !== firebaseUid) {
            throw new Error(
              "No active Firebase user or UID mismatch for fetchUser."
            );
          }

          await get().syncUser({
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });

          set({ isLoading: false, error: null });
          console.log("AuthStore: User fetched via fetchUser.");
        } catch (error: any) {
          console.error(
            "AuthStore: Error fetching user data in fetchUser:",
            error
          );
          set({
            isLoading: false,
            user: null,
            error: error.message || "Failed to fetch user data.",
            isAdmin: false,
          });
        }
      },

      checkAdminStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const headers = await getAuthHeaders();
          const response = await axiosInstance.get("/users/me", headers);
          const currentUserData = response.data;

          set((state) => ({
            user: {
              ...state.user,
              ...currentUserData,
            },
            isAdmin: currentUserData.isAdmin || false,
            isLoading: false,
            error: null,
          }));
          console.log(
            "Admin status checked. Is Admin:",
            currentUserData.isAdmin
          );
        } catch (error: any) {
          console.error("Admin check error:", error);
          set({
            isAdmin: false,
            error: error.response?.data?.message || "Admin check failed",
            isLoading: false,
          });
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await firebaseSignOut(auth);
          console.log("Firebase user signed out.");
          set({ user: null, isAdmin: false, isLoading: false, error: null });
        } catch (error: any) {
          console.error("Logout error:", error);
          set({
            isLoading: false,
            error: error.message || "Logout failed",
          });
        }
      },

      reset: () => {
        set({ user: null, isAdmin: false, isLoading: false, error: null });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);
