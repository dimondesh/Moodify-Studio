// frontend/src/pages/ChatPage/ChatHeader.tsx

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { useChatStore } from "../../stores/useChatStore";
import { Button } from "../../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next"; 

interface ChatHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

const ChatHeader = ({ showBackButton = false, onBack }: ChatHeaderProps) => {
  const { t } = useTranslation(); 
  const { selectedUser, onlineUsers } = useChatStore();

  if (!selectedUser) return null;

  return (
    <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="lg:hidden text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}
      <Avatar>
        <AvatarImage src={selectedUser.imageUrl || "/default-avatar.png"} />
        <AvatarFallback>{selectedUser.fullName?.[0] || "U"}</AvatarFallback>
      </Avatar>
      <div>
        <h2 className="font-medium text-white text-base truncate">
          {selectedUser.fullName}
        </h2>
        <p className="text-sm text-zinc-400">
          {onlineUsers.has(selectedUser._id)
            ? t("pages.chat.online")
            : t("pages.chat.offline")}
        </p>
      </div>
    </div>
  );
};

export default ChatHeader;
