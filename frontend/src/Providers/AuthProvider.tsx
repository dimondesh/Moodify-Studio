import React, { useEffect, useState, useRef } from "react"; // Импортируем useRef
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";
import { Card, CardContent } from "../components/ui/card";
import { Loader } from "lucide-react";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseChecked, setFirebaseChecked] = useState(false);

  const { user, setUser, fetchUser, logout } = useAuthStore();
  const { initSocket, disconnectSocket, isConnected } = useChatStore();

  // Добавляем useRef для отслеживания, был ли Socket.IO уже инициализирован
  const socketInitializedRef = useRef(false);

  // Эффект для обработки изменений состояния Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log(
          "AuthProvider: Firebase user detected:",
          firebaseUser.uid,
          firebaseUser.email
        );
        try {
          // fetchUser синхронизирует пользователя и внутри него вызовет checkAdminStatus
          await fetchUser(firebaseUser.uid);
          console.log("AuthProvider: MongoDB user synced.");
        } catch (error) {
          console.error(
            "AuthProvider: Error syncing Firebase user with MongoDB:",
            error
          );
          logout(); // Если синхронизация не удалась, выходим
        }
      } else {
        console.log("AuthProvider: No Firebase user is signed in.");
        setUser(null);
        // Если пользователь вышел, сбрасываем флаг инициализации сокета
        socketInitializedRef.current = false;
        disconnectSocket(); // Отключаем Socket.IO при выходе
      }
      setFirebaseChecked(true);
    });

    return () => unsubscribe();
  }, [setUser, fetchUser, logout, disconnectSocket]);

  // Эффект для инициализации Socket.IO и проверки статуса админа
  useEffect(() => {
    // Условие для инициализации:
    // 1. Firebase уже проверил состояние.
    // 2. Есть пользователь в Zustand с MongoDB ID.
    // 3. Socket.IO еще не был инициализирован (важно!).
    // 4. Socket.IO еще не подключен (для предотвращения двойного подключения, хотя initSocket тоже проверяет).
    if (
      firebaseChecked &&
      user &&
      user.id &&
      !socketInitializedRef.current &&
      !isConnected
    ) {
      console.log(
        "AuthProvider: Initializing Socket.IO with MongoDB User ID:",
        user.id
      );
      initSocket(user.id);
      socketInitializedRef.current = true; // Устанавливаем флаг, что сокет инициализирован
      // checkAdminStatus уже вызывается внутри fetchUser, поэтому здесь его дублировать не нужно.
    } else if (firebaseChecked && !user && isConnected) {
      // Если Firebase проверен, пользователя нет (он вышел), но сокет все еще подключен,
      // это может быть остаточным состоянием - явно отключаем сокет.
      console.log(
        "AuthProvider: User logged out after Firebase check, disconnecting socket."
      );
      disconnectSocket();
      socketInitializedRef.current = false; // Сбрасываем флаг при отключении
    }
    // Зависимости: user (для user.id), initSocket, disconnectSocket, isConnected, firebaseChecked
    // socketInitializedRef не добавляем, т.к. это ref.
  }, [user, initSocket, disconnectSocket, isConnected, firebaseChecked]);

  // Эффект для обработки сообщений Socket.IO из useChatStore.
  const { error: chatError } = useChatStore();
  useEffect(() => {
    if (chatError) {
      if (
        chatError.includes("io client disconnect") ||
        chatError.includes("transport close")
      ) {
        console.info(
          "AuthProvider Chat Socket Info: Socket intentionally disconnected or closed."
        );
      } else {
        console.error("AuthProvider Chat Socket Error:", chatError);
      }
    }
  }, [chatError]);

  if (!firebaseChecked) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Card className="w-[90%] max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Loader className="size-6 text-violet-500 animate-spin" />
            <h3 className="text-zinc-400 text-xl font-bold">Logging you in</h3>
            <p className="text-zinc-400 text-sm">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
