import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { ScrollArea } from "../../components/ui/scroll-area";
import UsersListSkeleton from "../../components/ui/skeletons/UsersListSkeleton";
import { useChatStore } from "../../stores/useChatStore";

const UsersList = () => {
  const { users, selectedUser, isLoading, setSelectedUser, onlineUsers } =
    useChatStore();

  return (
    <div className="border-r border-zinc-800">
      <div className="flex flex-col h-full">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2 p-4">
            {isLoading ? (
              <UsersListSkeleton />
            ) : (
              users.map((user) => (
                <div
                  key={user._id} // Используем MongoDB _id как ключ
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center justify-center lg:justify-start gap-3 p-3
                                        rounded-lg cursor-pointer transition-colors
                    ${
                      // 💡 ИСПРАВЛЕНО: Сравниваем по MongoDB _id
                      selectedUser?._id === user._id
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-800/50"
                    }`}
                >
                  <div className="relative">
                    <Avatar className="size-8 md:size-12">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-zinc-900
                        ${
                          // 💡 ИСПРАВЛЕНО: Проверяем по MongoDB _id
                          onlineUsers.has(user._id)
                            ? "bg-green-500"
                            : "bg-zinc-500"
                        }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 lg:block hidden">
                    <span className="font-medium truncate">
                      {user.fullName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default UsersList;
