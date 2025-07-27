// frontend/src/pages/AdminPage/ArtistsTabContent.tsx

import { Users2 } from "lucide-react";
import AddArtistDialog from "./AddArtistDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import ArtistsTable from "./ArtistsTable";
import { useTranslation } from "react-i18next";

const ArtistsTabContent = () => {
  const { t } = useTranslation();
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-orange-500" />
              {t("admin.artists.title")}
            </CardTitle>
            <CardDescription>{t("admin.artists.description")}</CardDescription>
          </div>
          <AddArtistDialog />
        </div>
      </CardHeader>
      <CardContent>
        <ArtistsTable />
      </CardContent>
    </Card>
  );
};

export default ArtistsTabContent;
