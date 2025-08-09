// frontend/src/pages/ProfilePage/ProfilePage.tsx

import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import { useAuthStore } from "../../stores/useAuthStore";
import type { User, Playlist } from "../../types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "../../components/ui/scroll-area";
import { EditProfileDialog } from "./EditProfileDialog";
import ProfileSection from "./ProfileSection";
import { useDominantColor } from "../../hooks/useDominantColor";
import PlaylistRow from "./PlaylistRow";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

interface ListItem {
  _id: string;
  name: string;
  imageUrl: string;
  type: "user" | "artist" | "playlist";
}

const ProfilePage = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { extractColor } = useDominantColor();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [followers, setFollowers] = useState<ListItem[]>([]);
  const [following, setFollowing] = useState<ListItem[]>([]);

  // --- ИЗМЕНЕНИЕ 1: Локальное состояние для цвета и его загрузки ---
  const [pageBackgroundColor, setPageBackgroundColor] = useState("#18181b");
  const [isColorLoading, setIsColorLoading] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!userId) return;
    try {
      const [profileRes, followersRes, followingRes] = await Promise.all([
        axiosInstance.get(`/users/${userId}`),
        axiosInstance.get(`/users/${userId}/followers`),
        axiosInstance.get(`/users/${userId}/following`),
      ]);
      const profile = profileRes.data;
      setProfileData(profile);
      setFollowers(followersRes.data.items);
      setFollowing(followingRes.data.items);
      setIsFollowingUser(profile.followers.includes(currentUser?.id));
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    setIsLoading(true);
    fetchProfileData();
  }, [fetchProfileData]);

  // --- ИЗМЕНЕНИЕ 2: Отдельный useEffect для цвета ---
  useEffect(() => {
    if (profileData?.imageUrl) {
      setIsColorLoading(true);
      extractColor(profileData.imageUrl)
        .then((color) => setPageBackgroundColor(color || "#18181b"))
        .finally(() => setIsColorLoading(false));
    } else if (profileData) {
      setPageBackgroundColor("#18181b");
      setIsColorLoading(false);
    }
  }, [profileData, extractColor]);

  const handleFollow = async () => {
    if (!userId) return;
    try {
      await axiosInstance.post(`/users/${userId}/follow`);
      setIsFollowingUser(!isFollowingUser);
      setProfileData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followersCount: prev.followersCount! + (isFollowingUser ? -1 : 1),
        };
      });
    } catch (error) {
      console.error("Failed to follow/unfollow:", error);
    }
  };

  const handleShowAllPlaylists = () => {
    navigate("/list", {
      state: {
        title: t("pages.profile.playlistsSection"),
        apiEndpoint: `/users/${userId}/playlists`,
      },
    });
  };

  const { user: liveCurrentUser } = useAuthStore();
  const isMyProfile = liveCurrentUser?.id === userId;

  // --- ИЗМЕНЕНИЕ 3: Обновленное условие загрузки ---
  if (isLoading || isColorLoading) {
    return (
      <>
        <Helmet>
          <title>Loading Profile...</title>
        </Helmet>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="animate-spin text-violet-500 size-12" />
        </div>
      </>
    );
  }

  if (!profileData) {
    return (
      <>
        <Helmet>
          <title>User Not Found</title>
          <meta
            name="description"
            content="The user profile you are looking for does not exist on Moodify."
          />
        </Helmet>
        <div className="text-center p-10">{t("pages.profile.notFound")}</div>
      </>
    );
  }
  const metaDescription = `${profileData.fullName} on Moodify. Check out their public playlists, followers, and who they follow.`;

  return (
    <>
      <Helmet>
        <title>{`${profileData.fullName}'s Profile`}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>
      <ScrollArea className="h-full">
        <div className="relative min-h-screen pb-10">
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-1000 h-[40vh]"
            style={{
              background: `linear-gradient(to bottom, ${pageBackgroundColor}, transparent)`,
            }}
          />
          <div className="relative z-10 p-4 pt-8 sm:pt-16 sm:p-8">
            <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4">
              <Avatar className="w-24 h-24 sm:w-48 sm:h-48 shadow-2xl ring-4 ring-black/20 flex-shrink-0">
                <AvatarImage
                  src={profileData.imageUrl}
                  className="object-cover"
                />
                <AvatarFallback>{profileData.fullName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 text-center sm:text-left">
                <p className="hidden sm:block text-sm font-bold">
                  {t("pages.profile.type")}
                </p>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black break-words">
                  {profileData.fullName}
                </h1>
                <div className="flex flex-row gap-2 justify-center sm:justify-start items-center gap-y-1 sm:gap-x-4 text-sm mt-1 text-zinc-300">
                  <span className="hidden">
                    {profileData.publicPlaylistsCount ?? 0}{" "}
                    {t("pages.profile.playlists")}
                  </span>
                  <Link
                    to="/list"
                    state={{
                      title: t("pages.profile.playlistsSection"),
                      apiEndpoint: `/users/${userId}/playlists`,
                    }}
                    className="hidden sm:block hover:underline"
                  >
                    {profileData.publicPlaylistsCount ?? 0}{" "}
                    {t("pages.profile.playlists")}
                  </Link>
                  <Link
                    to="/list"
                    state={{
                      title: t("pages.profile.followersSection"),
                      apiEndpoint: `/users/${userId}/followers`,
                    }}
                    className="hover:underline"
                  >
                    <span>
                      {profileData.followersCount ?? 0}{" "}
                      {t("pages.profile.followers")}
                    </span>
                  </Link>
                  <Link
                    to="/list"
                    state={{
                      title: t("pages.profile.followingSection"),
                      apiEndpoint: `/users/${userId}/following`,
                    }}
                    className="hover:underline"
                  >
                    <span>
                      {(profileData.followingUsersCount ?? 0) +
                        (profileData.followingArtistsCount ?? 0)}{" "}
                      {t("pages.profile.following")}
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center sm:justify-start gap-4">
              {isMyProfile ? (
                <Button
                  onClick={() => setIsEditDialogOpen(true)}
                  variant="outline"
                  className="rounded-full px-5"
                >
                  {t("pages.profile.edit")}
                </Button>
              ) : (
                <Button
                  onClick={handleFollow}
                  variant="outline"
                  className="rounded-full px-5"
                >
                  {isFollowingUser
                    ? t("pages.profile.followingButton")
                    : t("pages.profile.followButton")}
                </Button>
              )}
            </div>

            <div className="mt-8 sm:hidden">
              <h2 className="text-xl font-bold mb-2">
                {t("pages.profile.playlists")}
              </h2>
              <div className="flex flex-col gap-2">
                {profileData.playlists
                  ?.slice(0, 5)
                  .map((playlist: Playlist) => (
                    <PlaylistRow key={playlist._id} playlist={playlist} />
                  ))}
              </div>
              {profileData.playlists && profileData.playlists.length > 5 && (
                <div className="text-center mt-4">
                  <Button
                    onClick={handleShowAllPlaylists}
                    variant="outline"
                    className="rounded-full"
                  >
                    {t("pages.profile.showAllPlaylists")}
                  </Button>
                </div>
              )}
            </div>

            <div className="hidden sm:block mt-12 space-y-12">
              <ProfileSection
                title={t("pages.profile.followersSection")}
                items={followers}
                apiEndpoint={`/users/${userId}/followers`}
              />
              <ProfileSection
                title={t("pages.profile.followingSection")}
                items={following}
                apiEndpoint={`/users/${userId}/following`}
              />
              <div className="mt-12">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {t("pages.profile.playlistsSection")}
                  </h2>
                  {profileData.playlists &&
                    profileData.playlists.length > 0 && (
                      <button
                        onClick={handleShowAllPlaylists}
                        className="text-sm font-bold text-zinc-400 hover:underline"
                      >
                        {t("pages.profile.showAll")}
                      </button>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {profileData.playlists?.map((playlist: Playlist) => (
                    <Link
                      to={`/playlists/${playlist._id}`}
                      key={playlist._id}
                      className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group"
                    >
                      <div className="aspect-square relative mb-2 overflow-hidden rounded-md">
                        <img
                          src={playlist.imageUrl || "/liked.png"}
                          alt={playlist.title}
                          className="w-full h-full object-cover rounded-md transition-all group-hover:scale-105"
                        />
                      </div>
                      <h3 className="font-semibold truncate">
                        {playlist.title}
                      </h3>
                      {playlist.owner && (
                        <p className="text-xs text-zinc-400 truncate">
                          {t("pages.profile.by")} {playlist.owner.fullName}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {profileData && isMyProfile && (
          <EditProfileDialog
            user={profileData}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={fetchProfileData}
          />
        )}
      </ScrollArea>
    </>
  );
};

export default ProfilePage;
