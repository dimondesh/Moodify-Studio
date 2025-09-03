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
import AuthPage from "./pages/AuthPage/AuthPage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import { useEffect, useRef } from "react"; // <--- ИМПОРТ useRef
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
import GeneratedPlaylistPage from "./pages/GeneratedPlaylistPage/GeneratedPlaylistPage";

function App() {
  const { user } = useAuthStore();
  const isOffline = useOfflineStore((state) => state.isOffline);
  const location = useLocation();
  const navigate = useNavigate();

  // --- ИЗМЕНЕНИЕ НАЧАЛО: Используем useRef для хранения ID таймаута ---
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDataForUser = () => {
    const { fetchLibrary } = useLibraryStore.getState();
    const { fetchMyPlaylists } = usePlaylistStore.getState();
    const { fetchArtists } = useMusicStore.getState();
    const { syncLibrary } = useOfflineStore.getState().actions;

    console.log(
      "fetchDataForUser called. Fetching library, playlists, artists..."
    );
    fetchLibrary();
    fetchMyPlaylists();
    fetchArtists();
    if (!useOfflineStore.getState().isOffline) {
      console.log("User is online, syncing library.");
      syncLibrary();
    }
  };

  useEffect(() => {
    const { init: initOffline, checkOnlineStatus } =
      useOfflineStore.getState().actions;

    const handleNetworkChange = () => {
      const isNowOnline = navigator.onLine;
      checkOnlineStatus();

      // Очищаем предыдущий таймаут, если он был, на случай быстрых переключений
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (isNowOnline && useAuthStore.getState().user) {
        console.log("App is back online. Scheduling data sync in 3 seconds...");
        // Устанавливаем задержку перед выполнением запросов
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Executing delayed data sync after reconnecting.");
          fetchDataForUser();
        }, 3000); // 3-секундная задержка для стабилизации соединения
      }
    };

    initOffline();

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);

    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
      // Очищаем таймаут при размонтировании компонента
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      console.log("User detected in App.tsx, ensuring data is fetched.");
      fetchDataForUser();
    }
  }, [user]);
  // --- ИЗМЕНЕНИЕ КОНЕЦ ---

  useEffect(() => {
    const exactSafePaths = [
      "/library",
      "/settings",
      "/liked-songs",
      "/offline",
    ];
    const prefixSafePaths = [
      "/albums/",
      "/playlists/",
      "/mixes/",
      "/generated-playlists/",
    ];

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
        <Route path="login" element={<AuthPage />} />
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
          <Route
            path="/generated-playlists/:id"
            element={<GeneratedPlaylistPage />}
          />
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
