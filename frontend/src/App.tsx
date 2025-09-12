// frontend/src/App.tsx

import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { useOfflineStore } from "./stores/useOfflineStore";
import { Helmet } from "react-helmet-async";
import { useUIStore } from "./stores/useUIStore";

import MainLayout from "./layout/MainLayout";
import OfflinePage from "./pages/OfflinePage/OfflinePage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import LikedSongs from "./pages/LikedSongs/LikedSongs";
import ChatPage from "./pages/ChatPage/ChatPage";

const HomePage = lazy(() => import("./pages/HomePage/HomePage"));
const AlbumPage = lazy(() => import("./pages/AlbumPage/AlbumPage"));
const AdminPage = lazy(() => import("./pages/AdminPage/AdminPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage/NotFoundPage"));
const AuthPage = lazy(() => import("./pages/AuthPage/AuthPage"));
const AllSongsPage = lazy(() => import("./pages/AllSongs/AllSongsPage"));
const PlaylistDetailsPage = lazy(
  () => import("./pages/PlaylistPage/PlaylistDetailsPage")
);
const ArtistPage = lazy(() => import("./pages/ArtistPage/ArtistPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage/ProfilePage"));
const DisplayListPage = lazy(
  () => import("./pages/DisplayListPage/DisplayListPage")
);
const MixDetailsPage = lazy(
  () => import("./pages/MixDetailsPage/MixDetailsPage")
);
const AllMixesPage = lazy(() => import("./pages/AllMixesPage/AllMixesPage"));
const GeneratedPlaylistPage = lazy(
  () => import("./pages/GeneratedPlaylistPage/GeneratedPlaylistPage")
);

function App() {
  const user = useAuthStore((state) => state.user);
  const isOffline = useOfflineStore((state) => state.isOffline);
  const location = useLocation();
  const navigate = useNavigate();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { fetchInitialData } = useUIStore();

  const fetchDataForUser = useCallback(() => {
    if (navigator.onLine) {
      console.log("fetchDataForUser called. Fetching all initial data...");
      fetchInitialData();

      const { syncLibrary } = useOfflineStore.getState().actions;
      console.log("User is online, syncing library.");
      syncLibrary();
    } else {
      console.log(
        "fetchDataForUser called, but user is offline. Skipping network requests."
      );
    }
  }, [fetchInitialData]);

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
    if (user && navigator.onLine) {
      console.log(
        "User detected in App.tsx while online, ensuring data is fetched."
      );
      fetchDataForUser();
    } else if (user && !navigator.onLine) {
      console.log(
        "User detected in App.tsx while offline. Data should be loaded from DB."
      );
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
