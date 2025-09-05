// frontend/src/App.tsx

import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { useOfflineStore } from "./stores/useOfflineStore";
import { Helmet } from "react-helmet-async";
import { useLibraryStore } from "./stores/useLibraryStore";
import { usePlaylistStore } from "./stores/usePlaylistStore";
import { useMusicStore } from "./stores/useMusicStore";
import MainLayout from "./layout/MainLayout";

const HomePage = lazy(() => import("./pages/HomePage/HomePage"));
const ChatPage = lazy(() => import("./pages/ChatPage/ChatPage"));
const AlbumPage = lazy(() => import("./pages/AlbumPage/AlbumPage"));
const AdminPage = lazy(() => import("./pages/AdminPage/AdminPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage/NotFoundPage"));
const SearchPage = lazy(() => import("./pages/SearchPage/SearchPage"));
const LikedSongs = lazy(() => import("./pages/LikedSongs/LikedSongs"));
const AuthPage = lazy(() => import("./pages/AuthPage/AuthPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage/LibraryPage"));
const AllSongsPage = lazy(() => import("./pages/AllSongs/AllSongsPage"));
const PlaylistDetailsPage = lazy(
  () => import("./pages/PlaylistPage/PlaylistDetailsPage")
);
const ArtistPage = lazy(() => import("./pages/ArtistPage/ArtistPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage/ProfilePage"));
const DisplayListPage = lazy(
  () => import("./pages/DisplayListPage/DisplayListPage")
);
const MixDetailsPage = lazy(
  () => import("./pages/MixDetailsPage/MixDetailsPage")
);
const AllMixesPage = lazy(() => import("./pages/AllMixesPage/AllMixesPage"));
const OfflinePage = lazy(() => import("./pages/OfflinePage/OfflinePage"));
const GeneratedPlaylistPage = lazy(
  () => import("./pages/GeneratedPlaylistPage/GeneratedPlaylistPage")
);

function App() {
  const { user } = useAuthStore();
  const isOffline = useOfflineStore((state) => state.isOffline);
  const location = useLocation();
  const navigate = useNavigate();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDataForUser = useCallback(() => {
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
  }, []);

  useEffect(() => {
    const { init: initOffline, checkOnlineStatus } =
      useOfflineStore.getState().actions;

    const handleNetworkChange = () => {
      const isNowOnline = navigator.onLine;
      checkOnlineStatus();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (isNowOnline && useAuthStore.getState().user) {
        console.log("App is back online. Scheduling data sync in 3 seconds...");
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Executing delayed data sync after reconnecting.");
          fetchDataForUser();
        }, 3000);
      }
    };

    initOffline();

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);

    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchDataForUser]);

  useEffect(() => {
    if (user) {
      console.log("User detected in App.tsx, ensuring data is fetched.");
      fetchDataForUser();
    }
  }, [user, fetchDataForUser]);

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
      <Suspense fallback={<div className="h-screen w-full bg-zinc-950" />}>
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
      </Suspense>
      <Toaster
        toastOptions={{
          iconTheme: {
            primary: "#805ad5",
            secondary: "black",
          },
          blank: {
            style: {
              background: "#27272a",
              borderRadius: "20px",
              color: "#BAC4C8",
            },
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
