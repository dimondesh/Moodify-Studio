// frontend/src/FriendsActivity/FriendsActivity.tsx

import { HeadphonesIcon, Music, Users } from "lucide-react";
import { useChatStore } from "../stores/useChatStore";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useAuthStore } from "../stores/useAuthStore"; // Импортируем useAuthStore

const FriendsActivity = () => {
  const { users, fetchUsers, onlineUsers, userActivities } = useChatStore();
  const { user: authUser, isLoading: loadingAuthUser } = useAuthStore(); // Используем user из useAuthStore
  // const [firebaseUser, loadingFirebaseUser, authError] = useAuthState(auth); // Это больше не нужно напрямую здесь

  useEffect(() => {
    // 💡 ИСПРАВЛЕНО: Теперь используем аутентифицированного пользователя из useAuthStore
    // Это гарантирует, что у нас есть MongoDB ID, прежде чем запрашивать список пользователей.
    if (authUser && authUser.id && !loadingAuthUser) {
      fetchUsers();
    }
  }, [fetchUsers, authUser, loadingAuthUser]); // Зависимости обновлены

  // Пока Firebase user загружается (хотя теперь это в AuthProvider), или пока authUser не загружен
  if (loadingAuthUser) {
    return (
      <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <HeadphonesIcon className="size-8 animate-pulse text-zinc-500" />
        </div>
      </div>
    );
  }

  // Если пользователя нет после загрузки
  if (!authUser) {
    return (
      <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
        <LoginPrompt />
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
      <div className="p-4 flex justify-between items-center border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="size-5 shrink-0" />
          <h2 className="font-semibold">What they're listening to</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {users.length === 0 && !loadingAuthUser ? (
            <p className="text-zinc-400 text-center p-4">No users found.</p>
          ) : (
            users.map((userObj) => {
              // 💡 ИСПРАВЛЕНО: Используем userObj._id (MongoDB ID) для проверки онлайн-статуса
              const isOnline = onlineUsers.has(userObj._id);
              const activity = userActivities.get(userObj._id); // 💡 ИСПРАВЛЕНО: Получаем активность по MongoDB ID
              const isPlaying = activity && activity !== "Idle";

              return (
                <div
                  key={userObj._id}
                  className="cursor-pointer hover:bg-zinc-800/50 p-3 rounded-md transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="size-10 border border-zinc-800">
                        <AvatarImage
                          src={userObj.imageUrl}
                          alt={userObj.fullName}
                        />
                        <AvatarFallback>{userObj.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                          isOnline ? "bg-green-500" : "bg-zinc-500"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">
                          {userObj.fullName}
                        </span>
                        {isPlaying && (
                          <Music className="size-3.5 text-violet-400 shrink-0" />
                        )}
                      </div>
                      {isPlaying ? (
                        <div className="">
                          <div className=" text-sm text-white font-medium truncate">
                            {activity.split("   ")[0]}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {activity.split("   ")[1]}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-zinc-400">Idle</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FriendsActivity;

const LoginPrompt = () => (
  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
    <div className="relative">
      <div
        className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full blur-lg
       opacity-75 animate-pulse"
        aria-hidden="true"
      />
      <div className="relative bg-zinc-900 rounded-full p-4">
        <HeadphonesIcon className="size-8 text-emerald-400" />
      </div>
    </div>

    <div className="space-y-2 max-w-[250px]">
      <h3 className="text-lg font-semibold text-white">
        See What Friends Are Playing
      </h3>
      <p className="text-sm text-zinc-400">
        Login to discover what music your friends are enjoying right now
      </p>
    </div>
  </div>
);
