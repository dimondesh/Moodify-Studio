// frontend/src/pages/AdminPage/SongsTabContent.tsx

import { Music } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import SongsTable from "./SongsTable";
import AddSongDialog from "./AddSongDialog";
import { useTranslation } from "react-i18next";

const SongsTabContent = () => {
  const { t } = useTranslation();
  return (
    <Card className="border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="size-5 text-emerald-500" />
              {t("admin.songs.title")}
            </CardTitle>
            <CardDescription>{t("admin.songs.description")}</CardDescription>
          </div>
          <AddSongDialog />
        </div>
      </CardHeader>
      <CardContent>
        <SongsTable />
      </CardContent>
    </Card>
  );
};

export default SongsTabContent;
