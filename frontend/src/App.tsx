// frontend/src/App.tsx

import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useAuthStore } from "./stores/useAuthStore";
import { useOfflineStore } from "./stores/useOfflineStore";
import AllSongsPage from "./pages/AllSongs/AllSongsPage";
import PlaylistDetailsPage from "./pages/PlaylistPage/PlaylistDetailsPage";
import ArtistPage from "./pages/ArtistPage/ArtistPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import DisplayListPage from "./pages/DisplayListPage/DisplayListPage";
import MixDetailsPage from "./pages/MixDetailsPage/MixDetailsPage";
import AllMixesPage from "./pages/AllMixesPage/AllMixesPage";
import OfflinePage from "./pages/OfflinePage/OfflinePage";
import { Helmet } from "react-helmet-async";
import { useLibraryStore } from "./stores/useLibraryStore";
import { usePlaylistStore } from "./stores/usePlaylistStore";
import { useMusicStore } from "./stores/useMusicStore";

function App() {
  const { fetchUser, logout, user, setAuthReady } = useAuthStore();
  const { isOffline } = useOfflineStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!user || user.firebaseUid !== firebaseUser.uid) {
          await fetchUser(firebaseUser.uid);
        }
      } else {
        if (user) {
          logout();
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [fetchUser, logout, setAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !hasHydrated) {
      return;
    }

    const { init: initOffline, checkOnlineStatus } =
      useOfflineStore.getState().actions;
    const { fetchLibrary, fetchLikedSongs } = useLibraryStore.getState();
    const { fetchMyPlaylists } = usePlaylistStore.getState();
    const { fetchArtists } = useMusicStore.getState();

    const handleOnline = () => {
      checkOnlineStatus();
      console.log("App is back online. Refetching library data...");
      if (useAuthStore.getState().user) {
        fetchLibrary();
        fetchLikedSongs();
        fetchMyPlaylists();
        fetchArtists();
      }
    };
    const handleOffline = () => checkOnlineStatus();

    initOffline();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsInitialized(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isAuthReady, hasHydrated]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const exactSafePaths = [
      "/library",
      "/settings",
      "/liked-songs",
      "/offline",
    ];
    const prefixSafePaths = ["/albums/", "/playlists/", "/mixes/"];

    const isExactSafe = exactSafePaths.includes(location.pathname);
    const isPrefixSafe = prefixSafePaths.some((path) =>
      location.pathname.startsWith(path)
    );
    const isSafe = isExactSafe || isPrefixSafe;

    if (isOffline && !isSafe) {
      navigate("/offline", { replace: true });
    }
  }, [isOffline, location.pathname, navigate, isInitialized]);

  return (
    <>
      <Helmet
        defaultTitle="Moodify - Discover Your Music"
        titleTemplate="%s | Moodify"
      >
        <meta
          name="description"
          content="Moodify is a music streaming service where you can find new artists, create playlists, and enjoy music tailored to your mood."
        />
      </Helmet>
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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/artists/:id" element={<ArtistPage />} />
          <Route path="/users/:userId" element={<ProfilePage />} />
          <Route path="/list" element={<DisplayListPage />} />
          <Route path="/mixes/:mixId" element={<MixDetailsPage />} />
          <Route path="/all-mixes/:category" element={<AllMixesPage />} />
          <Route path="/offline" element={<OfflinePage />} />
        </Route>
      </Routes>
      <Toaster
        toastOptions={{
          iconTheme: {
            primary: "#805ad5",
            secondary: "black",
          },
          success: {
            style: {
              background: "#27272a",
              borderRadius: "20px",
              color: "#BAC4C8",
            },
          },
          error: {
            style: {
              background: "#27272a",
              borderRadius: "20px",
              color: "#BAC4C8",
            },
          },
          loading: {
            style: {
              background: "#27272a",
              borderRadius: "20px",
              color: "#BAC4C8",
            },
          },
        }}
      />
    </>
  );
}

export default App;
