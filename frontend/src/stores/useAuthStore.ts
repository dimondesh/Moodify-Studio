/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // Импортируем persist и createJSONStorage
import { axiosInstance } from "../lib/axios";
import { auth, signOut as firebaseSignOut } from "../lib/firebase"; // Импортируем auth и signOut из firebase

// 💡 ИСПРАВЛЕНО: Интерфейс AuthUser теперь представляет пользователя после синхронизации с MongoDB.
// Он включает MongoDB _id (как 'id') и Firebase UID (как 'firebaseUid').
interface AuthUser {
  id: string; // MongoDB _id пользователя (обязательно после синхронизации)
  firebaseUid: string; // Firebase UID пользователя (обязательно после синхронизации)
  email: string; // Email пользователя (обязательно)
  fullName: string; // Полное имя пользователя из MongoDB (часто соответствует displayName Firebase)
  imageUrl?: string | null; // URL изображения профиля из MongoDB (часто соответствует photoURL Firebase)
}

// 💡 НОВЫЙ ИНТЕРФЕЙС: Тип данных, которые приходят от Firebase и передаются в syncUser/fetchUser
// Это то, что вы получаете от Firebase Auth (e.g., auth.currentUser)
interface FirebaseUserDataForSync {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthStore {
  user: AuthUser | null; // Информация о текущем залогиненном пользователе
  isAdmin: boolean; // Статус админа
  isLoading: boolean; // Состояние загрузки
  error: string | null; // Состояние ошибки
  // token: string | null; // Если вы используете JWT токен, его можно хранить здесь

  // 💡 СОХРАНЕНО: setUser
  setUser: (user: AuthUser | null) => void;

  // 💡 СОХРАНЕНО: checkAdminStatus
  checkAdminStatus: () => Promise<void>;

  // 💡 СОХРАНЕНО/ИЗМЕНЕНО: syncUser (ваша существующая функция)
  // Теперь она явно принимает FirebaseUserDataForSync и правильно обновляет AuthUser
  syncUser: (userData: FirebaseUserDataForSync) => Promise<void>;

  // 💡 НОВАЯ ФУНКЦИЯ: fetchUser
  // Эта функция будет использоваться для получения данных пользователя по его Firebase UID
  // и создания или обновления записи в вашей MongoDB.
  // Ее можно вызывать, например, в AuthProvider после успешной аутентификации Firebase.
  fetchUser: (firebaseUid: string) => Promise<void>;

  // 💡 НОВАЯ ФУНКЦИЯ: logout
  logout: () => Promise<void>;

  // 💡 СОХРАНЕНО: reset
  reset: () => void;
}

// Помощник для добавления токена авторизации в заголовки
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
  // 💡 ДОБАВЛЕНО: persist middleware для сохранения состояния в localStorage
  persist(
    (set, get) => ({
      user: null,
      isAdmin: false,
      isLoading: false,
      error: null,
      // token: null, // Инициализация токена, если он используется

      // 💡 СОХРАНЕНО: setUser (ваша оригинальная функция)
      // Теперь `user` должен соответствовать новому интерфейсу `AuthUser`
      setUser: (user) => set({ user }),

      // 💡 СОХРАНЕНО/ИЗМЕНЕНО: syncUser (ваша оригинальная функция, адаптированная)
      // Эта функция синхронизирует данные пользователя Firebase с вашим бэкендом (MongoDB)
      // и получает полный объект пользователя с MongoDB _id.
      syncUser: async (userData: FirebaseUserDataForSync) => {
        set({ isLoading: true, error: null }); // Сбрасываем ошибку перед новой попыткой
        try {
          // Создаем тело запроса, которое соответствует бэкенду
          const payload = {
            firebaseUid: userData.uid, // Отправляем Firebase UID
            email: userData.email,
            fullName: userData.displayName, // displayName из Firebase -> fullName в MongoDB
            imageUrl: userData.photoURL, // photoURL из Firebase -> imageUrl в MongoDB
          };

          const headers = await getAuthHeaders();
          const response = await axiosInstance.post(
            "/auth/sync",
            payload,
            headers
          );

          // Предполагаем, что бэкенд возвращает объект пользователя в response.data.user
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

          // 💡 ИСПРАВЛЕНО: Создаем полный объект AuthUser из ответа бэкенда
          // и устанавливаем его в состояние стора
          set({
            user: {
              id: syncedUserFromBackend._id, // MongoDB _id
              firebaseUid: syncedUserFromBackend.firebaseUid, // Firebase UID
              email: syncedUserFromBackend.email,
              fullName:
                syncedUserFromBackend.fullName || syncedUserFromBackend.email, // Fallback
              imageUrl: syncedUserFromBackend.imageUrl || null, // Fallback
            },
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error("Sync error:", error);
          set({
            error: error.response?.data?.message || "Failed to sync user",
            isLoading: false,
            user: null, // Очищаем пользователя при ошибке синхронизации
          });
        }
      },

      // 💡 НОВАЯ ФУНКЦИЯ: fetchUser (использует syncUser)
      // Эта функция может быть более высокоуровневой для использования в App.tsx или AuthProvider
      fetchUser: async (firebaseUid: string) => {
        set({ isLoading: true, error: null });
        try {
          const currentUser = auth.currentUser;
          if (!currentUser || currentUser.uid !== firebaseUid) {
            throw new Error(
              "No active Firebase user or UID mismatch for fetchUser."
            );
          }

          // Используем syncUser для получения данных, так как он делает запрос на бэкенд
          await get().syncUser({
            uid: currentUser.uid,
            email: currentUser.email || "", // Email может быть null, но для payload лучше иметь строку
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });

          set({ isLoading: false, error: null });
        } catch (error: any) {
          console.error("Error fetching user data in fetchUser:", error);
          set({
            isLoading: false,
            user: null,
            error: error.message || "Failed to fetch user data.",
          });
        }
      },

      // 💡 СОХРАНЕНО: checkAdminStatus (ваша оригинальная функция)
      checkAdminStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const headers = await getAuthHeaders();
          const response = await axiosInstance.get("/admin/check", headers);
          set({
            isAdmin: response.data.isAdmin,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error("Admin check error:", error);
          set({
            isAdmin: false,
            error: error.response?.data?.message || "Admin check failed",
            isLoading: false,
          });
        }
      },

      // 💡 НОВАЯ ФУНКЦИЯ: logout
      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          // Опционально: вызов эндпоинта бэкенда для очистки сессии, если есть
          // await axiosInstance.post("/auth/logout");

          // Выход из Firebase Authentication
          await firebaseSignOut(auth);
          console.log("Firebase user signed out.");

          // Сброс состояния стора
          set({ user: null, isAdmin: false, isLoading: false, error: null });
          // Если вы храните токен, его тоже нужно сбросить:
          // set({ user: null, isAdmin: false, isLoading: false, error: null, token: null });
        } catch (error: any) {
          console.error("Logout error:", error);
          set({
            isLoading: false,
            error: error.message || "Logout failed", // Используем error.message для ошибок Firebase
          });
        }
      },

      // 💡 СОХРАНЕНО: reset (ваша оригинальная функция)
      reset: () => {
        set({ user: null, isAdmin: false, isLoading: false, error: null });
      },
    }),
    {
      name: "auth-storage", // Имя для хранения в localStorage
      storage: createJSONStorage(() => localStorage), // Использование localStorage
      // 💡 partialize: Убедитесь, что user может быть сериализован в JSON
      partialize: (state) => ({
        user: state.user,
        // token: state.token, // Если вы используете токен и хотите его сохранять
      }),
    }
  )
);
