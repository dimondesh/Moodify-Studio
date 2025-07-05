// frontend/src/App.tsx
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import AuthCallbackPage from "./pages/AuthCallback/AuthCallbackPage";
import MainLayout from "./layout/MainLayout";
import ChatPage from "./pages/ChatPage/ChatPage";
import AlbumPage from "./pages/AlbumPage/AlbumPage";
import AdminPage from "./pages/AdminPage/AdminPage";
import { Toaster } from "react-hot-toast";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import LikedSongs from "./pages/LikedSongs/LikedSongs";
import LoginPage from "./pages/LoginPage/LoginPage";

import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import { useAuthStore } from "./stores/useAuthStore"; // Импорт useAuthStore
import { useChatStore } from "./stores/useChatStore"; // Импорт useChatStore для сокетов

function App() {
  const [firebaseUser, loadingFirebaseUser] = useAuthState(auth);
  // Используем user и fetchUser из useAuthStore
  const { user: mongoUser, fetchUser, logout } = useAuthStore();
  const {
    initSocket,
    disconnectSocket,
    isConnected,
    error: socketError,
  } = useChatStore();

  // Эффект для синхронизации Firebase пользователя с MongoDB пользователем
  useEffect(() => {
    // Если Firebase пользователь есть и данные MongoDB пользователя еще не загружены/синхронизированы
    if (firebaseUser && !loadingFirebaseUser && !mongoUser) {
      console.log("Firebase user detected, fetching/syncing MongoDB user...");
      fetchUser(firebaseUser.uid);
    } else if (!firebaseUser && !loadingFirebaseUser && mongoUser) {
      // Если Firebase пользователь вышел, очищаем состояние
      console.log(
        "Firebase user logged out, clearing MongoDB user from store."
      );
      logout(); // Вызываем вашу новую функцию logout
    }
  }, [firebaseUser, loadingFirebaseUser, mongoUser, fetchUser, logout]);

  // Эффект для инициализации и отключения Socket.IO соединения
  useEffect(() => {
    // Подключаем сокет, если mongoUser.id доступен и сокет еще не подключен
    if (mongoUser?.id && !isConnected) {
      console.log("Initializing Socket.IO with MongoDB User ID:", mongoUser.id);
      initSocket(mongoUser.id);
    }

    // Функция очистки: отключаем сокет при размонтировании компонента
    // или когда mongoUser.id становится недоступным (например, при выходе)
    return () => {
      if (isConnected) {
        console.log("Cleaning up Socket.IO connection.");
        disconnectSocket();
      }
    };
  }, [mongoUser?.id, initSocket, disconnectSocket, isConnected]); // Зависимости для этого эффекта

  // Optional: Display Socket.IO connection errors
  if (socketError) {
    // toast.error(`Socket Error: ${socketError}`);
    console.error(`Socket Error: ${socketError}`);
  }

  return (
    <>
      <Routes>
        <Route path="auth-callback" element={<AuthCallbackPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/albums/:albumId" element={<AlbumPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/liked-songs" element={<LikedSongs />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
