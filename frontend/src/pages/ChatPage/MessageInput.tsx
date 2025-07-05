import { useState } from "react";
import { useChatStore } from "../../stores/useChatStore";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Send } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";

const MessageInput = () => {
  const [newMessage, setNewMessage] = useState("");
  const { selectedUser, sendMessage } = useChatStore();
  const { user: mongoUser } = useAuthStore();

  const handleSend = () => {
    // 💡 ИСПРАВЛЕНО: Проверяем наличие mongoUser.id перед использованием
    if (!selectedUser || !mongoUser?.id || !newMessage.trim()) {
      console.warn(
        "Cannot send message: Missing selected user, current user ID, or message content."
      );
      return;
    }

    // Теперь mongoUser.id гарантированно string
    sendMessage(selectedUser._id, mongoUser.id, newMessage.trim());
    setNewMessage("");
  };

  return (
    <div className="p-4 mt-auto border-t border-zinc-800">
      <div className="flex gap-2">
        <Input
          placeholder="Type a message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="bg-zinc-800 border-none"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
