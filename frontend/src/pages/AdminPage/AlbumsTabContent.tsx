// frontend/src/pages/AdminPage/AlbumsTabContent.tsx

import { Library } from "lucide-react";

import AddAlbumDialog from "./AddAlbumDialog";
import AddAlbumFromSpotifyDialog from "./AddAlbumFromSpotifyDialog"; // <-- НОВЫЙ ИМПОРТ
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import AlbumsTable from "./AlbumsTable";

const AlbumsTabContent = () => {
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5 text-violet-500" />
              Albums Library
            </CardTitle>
            <CardDescription>Manage your album collection</CardDescription>
          </div>
          <div className="flex gap-2">
            {" "}
            {/* Добавляем flex-контейнер для кнопок */}
            <AddAlbumDialog />
            <AddAlbumFromSpotifyDialog /> {/* <-- НОВАЯ КНОПКА И ДИАЛОГ */}
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
