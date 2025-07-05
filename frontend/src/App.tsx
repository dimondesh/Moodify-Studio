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

// Удалены импорты useAuthState, auth из firebase, useAuthStore, useChatStore
// Вся эта логика теперь централизована в AuthProvider

function App() {
  // Логика аутентификации и инициализации сокета теперь находится в AuthProvider.
  // App.tsx больше не должен напрямую зависеть от firebaseUser или mongoUser для этих целей.

  // Если вам нужны данные пользователя в App.tsx или его дочерних компонентах,
  // используйте useAuthStore() для получения `user`.
  // Например: const { user } = useAuthStore();

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
