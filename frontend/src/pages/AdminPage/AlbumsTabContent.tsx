// frontend/src/pages/AdminPage/AlbumsTabContent.tsx

import { Library } from "lucide-react";
import AddAlbumDialog from "./AddAlbumDialog";
import AddAlbumFromSpotifyDialog from "./AddAlbumFromSpotifyDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import AlbumsTable from "./AlbumsTable";
import { useTranslation } from "react-i18next";

const AlbumsTabContent = () => {
  const { t } = useTranslation();
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5 text-violet-500" />
              {t("admin.albums.title")}
            </CardTitle>
            <CardDescription>{t("admin.albums.description")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <AddAlbumDialog />
            <AddAlbumFromSpotifyDialog />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AlbumsTable />
      </CardContent>
    </Card>
  );
};
export default AlbumsTabContent;
