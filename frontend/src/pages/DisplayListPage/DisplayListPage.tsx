// frontend/src/pages/DisplayListPage/DisplayListPage.tsx

import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { axiosInstance } from "@/lib/axios";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SectionGridSkeleton from "@/components/ui/skeletons/PlaylistSkeleton";
import { useTranslation } from "react-i18next";

interface ListItem {
  _id: string;
  name?: string;
  title?: string;
  imageUrl: string;
  type: "user" | "artist" | "playlist";
}

const DisplayListPage = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { title, apiEndpoint } = location.state || {
    title: t("pages.displayList.title"),
    apiEndpoint: null,
  };

  useEffect(() => {
    if (!apiEndpoint) {
      setIsLoading(false);
      return;
    }
    const fetchItems = async () => {
      try {
        const response = await axiosInstance.get(apiEndpoint);
        setItems(response.data.items);
      } catch (err) {
        console.error(`Failed to fetch ${title}:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [apiEndpoint, title]);

  const getLink = (item: ListItem) => {
    switch (item.type) {
      case "user":
        return `/users/${item._id}`;
      case "artist":
        return `/artists/${item._id}`;
      case "playlist":
        return `/playlists/${item._id}`;
      default:
        return "/";
    }
  };

  if (isLoading) return <SectionGridSkeleton />;

  return (
    <ScrollArea className="h-full w-full rounded-md pr-4">
      <div className="p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items?.map((item) => (
            <Link
              to={getLink(item)}
              key={item._id}
              className="p-4 rounded-md bg-zinc-800/40 hover:bg-zinc-700/40 transition-all group cursor-pointer"
            >
              <div className="relative mb-3 aspect-square object-cover shadow-lg">
                {item.type === "playlist" ? (
                  <img
                    src={item.imageUrl || "/liked.png"}
                    alt={item.title || "Playlist"}
                    className="w-auto h-auto object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <Avatar className="aspect-square w-auto h-auto object-cover">
                    <AvatarImage
                      src={item.imageUrl}
                      className="object-cover h-auto w-auto transition-transform duration-300 group-hover:scale-105"
                    />
                    <AvatarFallback>
                      {(item.name || item.title)?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <h3 className="font-semibold truncate">
                {item.name || item.title}
              </h3>
              <p className="text-sm text-zinc-400 capitalize">
                {t(`sidebar.subtitle.${item.type}`)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default DisplayListPage;
