import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { useChatStore } from "../../stores/useChatStore";
import { Button } from "../../components/ui/button";
import { ArrowLeft } from "lucide-react";
interface ChatHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

const ChatHeader = ({ showBackButton = false, onBack }: ChatHeaderProps) => {
  const { selectedUser, onlineUsers } = useChatStore();

  if (!selectedUser) return null;
  return (
    <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
      {/* Кнопка "Назад" только на мобильных, если пропс showBackButton === true */}
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
        <AvatarImage src={selectedUser.imageUrl || "/default-avatar.png"} />{" "}
        {/* Добавляем fallback */}
        <AvatarFallback>
          {selectedUser.fullName?.[0] || "U"}
        </AvatarFallback>{" "}
        {/* Добавляем fallback */}
      </Avatar>
      <div>
        <h2 className="font-medium text-white text-base truncate">
          {selectedUser.fullName}
        </h2>
        <p className="text-sm text-zinc-400">
          {onlineUsers.has(selectedUser._id) ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
};

export default ChatHeader;
