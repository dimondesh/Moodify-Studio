// frontend/src/components/ui/DownloadButton.tsx

import { Download, Check, Loader2 } from "lucide-react";
import { useOfflineStore } from "@/stores/useOfflineStore";
import { Button } from "./button";
import toast from "react-hot-toast";

// Определяем типы для четкости
type ItemType = "albums" | "playlists" | "mixes";

interface DownloadButtonProps {
  itemId: string;
  itemType: ItemType;
  itemTitle: string;
}

export const DownloadButton = ({
  itemId,
  itemType,
  itemTitle,
}: DownloadButtonProps) => {
  // Получаем нужные состояния и действия из нашего стора
  const { isDownloaded, isDownloading, downloadItem, deleteItem } =
    useOfflineStore((s) => s.actions);

  const status = isDownloaded(itemId)
    ? "downloaded"
    : isDownloading(itemId)
    ? "downloading"
    : "idle";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Важно, чтобы клик не "проваливался" на родительский элемент (например, на карточку песни)

    if (status === "idle") {
      toast.promise(downloadItem(itemId, itemType), {
        loading: `Downloading "${itemTitle}"...`,
        success: `"${itemTitle}" is now available offline.`,
        error: (err) => `Failed to download: ${err.toString()}`,
      });
    } else if (status === "downloaded") {
      // Пока просто показываем уведомление. Позже можно будет добавить удаление.
      deleteItem(itemId, itemType, itemTitle);
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case "downloaded":
        return `Remove "${itemTitle}" from downloads`;
      case "downloading":
        return `Downloading...`;
      case "idle":
      default:
        return `Download "${itemTitle}" for offline playback`;
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="icon"
      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex-shrink-0"
      disabled={status === "downloading"}
      title={getTooltipText()} // Добавляем title для подсказки при наведении
    >
      {status === "downloading" && (
        <Loader2 className="animate-spin text-zinc-400 size-6" />
      )}
      {status === "downloaded" && <Check className="text-violet-500 size-6" />}
      {status === "idle" && <Download className="text-zinc-400 size-6" />}
    </Button>
  );
};
