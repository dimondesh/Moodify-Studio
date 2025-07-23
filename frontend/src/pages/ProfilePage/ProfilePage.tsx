/* eslint-disable @typescript-eslint/no-explicit-any */
// Создайте новую папку и файл: frontend/src/pages/ProfilePage/ProfilePage.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import { useAuthStore } from "../../stores/useAuthStore";
import type { User } from "../../types";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";

const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuthStore();

  const [profileData, setProfileData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`/users/${userId}`);
        setProfileData(response.data);
        // Проверяем, подписан ли текущий пользователь на этого юзера
        setIsFollowing(response.data.followers.includes(currentUser?.id));
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser?.id]);

  const handleFollow = async () => {
    if (!userId) return;
    try {
      await axiosInstance.post(`/users/${userId}/follow`);
      // Оптимистичное обновление UI
      setProfileData((prev) => {
        if (!prev || !currentUser?.id) return prev;
        const amIFollowing = prev.followers.includes(currentUser.id);
        const newFollowersCount =
          prev.followersCount! + (amIFollowing ? -1 : 1);
        return { ...prev, followersCount: newFollowersCount };
      });
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Failed to follow/unfollow:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center p-10">User not found.</div>;
  }

  const isMyProfile = currentUser?.id === userId;

  return (
    <div className="p-8">
      <div className="flex items-center gap-8">
        <Avatar className="w-40 h-40">
          <AvatarImage src={profileData.imageUrl} />
          <AvatarFallback>{profileData.fullName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <p className="text-sm">Profile</p>
          <h1 className="text-6xl font-bold">{profileData.fullName}</h1>
          <div className="flex gap-4 text-sm mt-4">
            <span>{profileData.publicPlaylistsCount} Public Playlists</span>
            <span>{profileData.followersCount} Followers</span>
            <span>{profileData.followingUsersCount} Following</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {isMyProfile ? (
          <Button>Edit Profile</Button> // Здесь будет логика открытия диалога редактирования
        ) : (
          <Button onClick={handleFollow}>
            {isFollowing ? "Unfollow" : "Follow"}
          </Button>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold">Public Playlists</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
          {profileData.playlists?.map(
            (
              playlist: any // any временно, лучше создать тип
            ) => (
              <div key={playlist._id} className="bg-zinc-800 p-4 rounded-lg">
                <img
                  src={playlist.imageUrl || "/liked.png"}
                  alt={playlist.title}
                  className="w-full h-auto rounded-md mb-2"
                />
                <h3 className="font-semibold">{playlist.title}</h3>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
