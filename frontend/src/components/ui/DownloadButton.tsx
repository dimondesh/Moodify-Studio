// frontend/src/components/ui/DownloadButton.tsx

import { Download, Check, Loader2 } from "lucide-react";
import { useOfflineStore } from "@/stores/useOfflineStore";
import { Button } from "./button";
import toast from "react-hot-toast";

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
  const { isDownloaded, isDownloading, downloadItem, deleteItem } =
    useOfflineStore((s) => s.actions);

  const status = isDownloaded(itemId)
    ? "downloaded"
    : isDownloading(itemId)
    ? "downloading"
    : "idle";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (status === "idle") {
      toast.promise(downloadItem(itemId, itemType), {
        loading: `Downloading "${itemTitle}"...`,
        success: `"${itemTitle}" is now available offline.`,
        error: (err) => `Failed to download: ${err.toString()}`,
      });
    } else if (status === "downloaded") {
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
      className="w-9 h-9 sm:w-10 sm:h-10  rounded-md flex-shrink-0"
      disabled={status === "downloading"}
      title={getTooltipText()}
    >
      {status === "downloading" && (
        <Loader2 className="animate-spin text-zinc-400 size-6" />
      )}
      {status === "downloaded" && (
        <Check className="text-violet-500 w-9 h-9 sm:w-10 sm:h-10 " />
      )}
      {status === "idle" && (
        <Download className="text-zinc-400 w-9 h-9 sm:w-10 sm:h-10 " />
      )}
    </Button>
  );
};
