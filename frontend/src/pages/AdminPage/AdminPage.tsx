// frontend/src/pages/AdminPage/AdminPage.tsx

import { Album, Home, Music, Users2 } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useAuthStore } from "../../stores/useAuthStore";
import DashboardStats from "./DashboardStats";
import Header from "./Header";
import SongsTabContent from "./SongsTabContent";
import AlbumsTabContent from "./AlbumsTabContent";
import ArtistsTabContent from "./ArtistsTabContent";
import { useEffect } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ

const AdminPage = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const { isAdmin, isLoading } = useAuthStore();
  const { fetchAlbums, fetchSongs, fetchStats, fetchArtists } = useMusicStore();

  useEffect(() => {
    fetchAlbums();
    fetchSongs();
    fetchStats();
    fetchArtists();
  }, [fetchAlbums, fetchSongs, fetchStats, fetchArtists]);

  const navigate = useNavigate();
  if (!isAdmin && !isLoading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-zinc-800 to-zinc-900 text-6xl text-zinc-200">
        {t("admin.unauthorized")}
        <Button
          onClick={() => navigate("/")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto mt-4"
        >
          <Home className="mr-2 h-4 w-4" />
          {t("admin.backToHome")}
        </Button>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900
   to-black text-zinc-100 p-8"
    >
      <Header />
      <DashboardStats />
      <Tabs defaultValue="songs" className="space-y-6">
        <TabsList className="p-1 bg-zinc-800/50">
          <TabsTrigger
            value="songs"
            className="data-[state=active]:bg-zinc-700"
          >
            <Music className="mr-2 size-4" />
            {t("admin.tabs.songs")}
          </TabsTrigger>
          <TabsTrigger
            value="albums"
            className="data-[state=active]:bg-zinc-700"
          >
            <Album className="mr-2 size-4" />
            {t("admin.tabs.albums")}
          </TabsTrigger>
          <TabsTrigger
            value="artists"
            className="data-[state=active]:bg-zinc-700"
          >
            <Users2 className="mr-2 size-4" />
            {t("admin.tabs.artists")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="songs">
          <SongsTabContent />
        </TabsContent>
        <TabsContent value="albums">
          <AlbumsTabContent />
        </TabsContent>
        <TabsContent value="artists">
          <ArtistsTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
