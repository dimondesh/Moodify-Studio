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
import { useEffect } from "react";
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
  const { user } = useAuthStore();
  const isOffline = useOfflineStore((state) => state.isOffline);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { init: initOffline, checkOnlineStatus } =
      useOfflineStore.getState().actions;
    const { fetchLibrary } = useLibraryStore.getState();
    const { fetchMyPlaylists } = usePlaylistStore.getState();
    const { fetchArtists } = useMusicStore.getState();

    const handleNetworkChange = () => {
      const isNowOffline = !navigator.onLine;
      checkOnlineStatus();
      if (!isNowOffline && useAuthStore.getState().user) {
        console.log("App is back online. Refetching data...");
        fetchLibrary();
        fetchMyPlaylists();
        fetchArtists();
      }
    };

    initOffline();

    if (user) {
      console.log("User detected in App.tsx, ensuring data is fetched.");
      fetchLibrary();
      fetchMyPlaylists();
      fetchArtists();
    }

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);

    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, [user]);

  useEffect(() => {
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
  }, [isOffline, location.pathname, navigate]);

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
