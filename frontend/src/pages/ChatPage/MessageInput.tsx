// frontend/src/pages/ChatPage/MessageInput.tsx

import React from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Send } from "lucide-react";
import type { User } from "../../types"; // Импортируем тип User

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: (e: React.FormEvent) => void;
  selectedUser: User | null;
  currentUserId: string;
}

const MessageInput = ({
  value,
  onChange,
  onSend,
  selectedUser,
  currentUserId,
}: MessageInputProps) => {
  const isSendDisabled = !value.trim() || !selectedUser || !currentUserId;

  return (
    <div className="p-4 mt-auto border-t border-zinc-800">
      <div className="flex gap-2">
        <Input
          placeholder="Type a message"
          value={value}
          onChange={onChange}
          className="bg-zinc-800 border-none"
          onKeyDown={(e) => e.key === "Enter" && onSend(e)}
        />
        <Button size="icon" onClick={onSend} disabled={isSendDisabled}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
