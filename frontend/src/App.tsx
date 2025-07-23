import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import MainLayout from "./layout/MainLayout";
import ChatPage from "./pages/ChatPage/ChatPage";
import AlbumPage from "./pages/AlbumPage/AlbumPage";
import AdminPage from "./pages/AdminPage/AdminPage";
import { Toaster } from "react-hot-toast";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import LikedSongs from "./pages/LikedSongs/LikedSongs";
import LoginPage from "./pages/LoginPage/LoginPage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuthStore } from "./stores/useAuthStore";
import AllSongsPage from "./pages/AllSongs/AllSongsPage";
import PlaylistDetailsPage from "./pages/PlaylistPage/PlaylistDetailsPage";
import ArtistPage from "./pages/ArtistPage/ArtistPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

function App() {
  const { fetchUser, logout, user } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!user || user.firebaseUid !== firebaseUser.uid) {
          console.log(
            "Firebase user detected, fetching user data and admin status..."
          );
          await fetchUser(firebaseUser.uid);
        }
      } else {
        if (user) {
          console.log("No Firebase user detected, logging out from store...");
          logout();
        }
      }
    });

    return () => unsubscribe();
  }, [fetchUser, logout, user]);
  return (
    <>
      <Routes>
        <Route path="admin" element={<AdminPage />} />
        <Route path="login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/all-songs/:category?" element={<AllSongsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/albums/:albumId" element={<AlbumPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/liked-songs" element={<LikedSongs />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route
            path="/playlists/:playlistId"
            element={<PlaylistDetailsPage />}
          />
          <Route path="/settings" element={<SettingsPage />} />{" "}
          {/* Новый маршрут */}
          <Route path="/artists/:id" element={<ArtistPage />} />
          <Route path="/users/:userId" element={<ProfilePage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
