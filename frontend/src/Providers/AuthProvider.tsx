// frontend/src/Providers/AuthProvider.tsx

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../stores/useAuthStore"; // Импортируем useAuthStore
import { useChatStore } from "../stores/useChatStore"; // Импортируем useChatStore
import { Loader } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth"; // Переименовываем User Firebase в FirebaseUser

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  // 💡 ИСПРАВЛЕНО: Вместо setUser и syncUser, будем использовать fetchUser и logout
  const {
    user: mongoUser,
    fetchUser,
    logout,
    checkAdminStatus,
  } = useAuthStore();
  const {
    initSocket,
    disconnectSocket,
    isConnected: isSocketConnected,
  } = useChatStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            console.log("Firebase user detected:", firebaseUser.uid);
            // 💡 ИСПРАВЛЕНО: Вызываем fetchUser для получения полного AuthUser из MongoDB
            // fetchUser сам вызывает syncUser внутри и обновляет store.user
            await fetchUser(firebaseUser.uid);

            // 💡 ИСПРАВЛЕНО: checkAdminStatus теперь должен вызываться после того,
            // как mongoUser будет доступен в сторе (после fetchUser).
            // Поскольку fetchUser обновляет стор, checkAdminStatus может использовать его.
            await checkAdminStatus();

            // 💡 ИСПРАВЛЕНО: Socket.IO инициализируется в App.tsx
            // Если вы все еще хотите инициализировать его здесь, используйте mongoUser?.id
            // Однако, лучше централизовать это в App.tsx, как мы обсуждали.
            // if (mongoUser?.id && !isSocketConnected) { // mongoUser здесь может быть null на первом рендере
            //   initSocket(mongoUser.id);
            // }
          } else {
            console.log("No Firebase user detected.");
            // 💡 ИСПРАВЛЕНО: Используем logout из useAuthStore для очистки состояния
            logout();
            // 💡 ИСПРАВЛЕНО: Отключаем сокет при выходе пользователя
            disconnectSocket();
          }
        } catch (error) {
          console.error(
            "Auth Provider Error during Firebase Auth State Change:",
            error
          );
          // 💡 ИСПРАВЛЕНО: При ошибке, также вызываем logout для полной очистки
          logout();
          disconnectSocket(); // Убеждаемся, что сокет отключен
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [fetchUser, logout, checkAdminStatus, initSocket, disconnectSocket]); // Убедитесь, что все зависимости указаны

  // 💡 ВАЖНО: Socket.IO инициализация должна быть в App.tsx
  // Если вы оставили код инициализации сокета в App.tsx, то этот блок здесь не нужен.
  // Я его закомментировал, предполагая, что вы следуете предыдущей рекомендации.
  // useEffect(() => {
  //   if (mongoUser?.id && !isSocketConnected) {
  //     console.log("AuthProvider: Initializing Socket.IO with MongoDB User ID:", mongoUser.id);
  //     initSocket(mongoUser.id);
  //   }
  //   return () => {
  //     if (isSocketConnected) {
  //       console.log("AuthProvider: Cleaning up Socket.IO connection.");
  //       disconnectSocket();
  //     }
  //   };
  // }, [mongoUser?.id, initSocket, disconnectSocket, isSocketConnected]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
