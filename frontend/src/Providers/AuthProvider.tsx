// frontend/src/Providers/AuthProvider.tsx

import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Состояние для отслеживания инициализации Firebase.
  // Это важно, чтобы не рендерить приложение, пока Firebase не определил статус пользователя.
  const [firebaseChecked, setFirebaseChecked] = useState(false);

  const { user, setUser, fetchUser, logout, checkAdminStatus } = useAuthStore();
  const { initSocket, disconnectSocket, isConnected } = useChatStore();

  useEffect(() => {
    // Подписываемся на изменения состояния аутентификации Firebase.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Пользователь Firebase вошел в систему или его сессия была восстановлена.
        console.log(
          "AuthProvider: Firebase user detected:",
          firebaseUser.uid,
          firebaseUser.email
        );
        try {
          // Запрашиваем/синхронизируем данные пользователя с MongoDB.
          // Эта функция обновит `useAuthStore().user` с MongoDB `_id`.
          await fetchUser(firebaseUser.uid);
          console.log("AuthProvider: MongoDB user synced.");
        } catch (error) {
          console.error(
            "AuthProvider: Error syncing Firebase user with MongoDB:",
            error
          );
          // Если синхронизация не удалась, лучше разлогинить пользователя.
          logout();
        }
      } else {
        // Пользователь Firebase не вошел в систему или вышел.
        console.log("AuthProvider: No Firebase user is signed in.");
        // Очищаем состояние пользователя в Zustand.
        setUser(null);
        // Отключаем Socket.IO, если он был подключен.
        disconnectSocket();
      }
      // Устанавливаем флаг, что Firebase завершил проверку состояния аутентификации.
      setFirebaseChecked(true);
    });

    // Функция очистки: отписываемся от слушателя при размонтировании компонента.
    return () => unsubscribe();
  }, [setUser, fetchUser, logout, disconnectSocket]); // Зависимости для useEffect

  useEffect(() => {
    // Инициализируем Socket.IO и проверяем статус администратора только тогда, когда:
    // 1. Firebase *уже* проверил состояние аутентификации (`firebaseChecked` true).
    // 2. В `useAuthStore` есть данные пользователя, включая его MongoDB ID (`user && user.id`).
    // 3. Socket.IO *еще не* подключен (`!isConnected`).
    if (firebaseChecked && user && user.id && !isConnected) {
      console.log(
        "AuthProvider: Initializing Socket.IO with MongoDB User ID:",
        user.id
      );
      initSocket(user.id);
      checkAdminStatus(); // Проверяем статус администратора после входа.
    } else if (firebaseChecked && !user && isConnected) {
      // Если Firebase проверен, пользователя нет (он вышел), но сокет все еще подключен,
      // это может быть остаточным состоянием - явно отключаем сокет.
      console.log(
        "AuthProvider: User logged out after Firebase check, disconnecting socket."
      );
      disconnectSocket();
    }
  }, [
    user,
    initSocket,
    disconnectSocket,
    checkAdminStatus,
    isConnected,
    firebaseChecked,
  ]);

  // Эффект для обработки ошибок Socket.IO из useChatStore.
  const { error: chatError } = useChatStore();
  useEffect(() => {
    if (chatError) {
      console.error("AuthProvider Chat Socket Error:", chatError);
      // Здесь можно добавить toast.error(chatError) или другую логику уведомлений.
    }
  }, [chatError]);

  // Пока Firebase не завершил проверку аутентификации, показываем заглушку.
  if (!firebaseChecked) {
    return <div>Загрузка аутентификации...</div>; // Можно заменить на красивый спиннер.
  }

  // Когда Firebase проверил состояние, рендерим дочерние компоненты.
  return <>{children}</>;
};

export default AuthProvider;
