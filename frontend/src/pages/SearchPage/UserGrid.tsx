// frontend/src/pages/SearchPage/UserGrid.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { User } from "../../types";
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type UserGridProps = {
  title: string;
  users: User[];
  isLoading: boolean;
};

const UserGrid: React.FC<UserGridProps> = ({ title, users, isLoading }) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <SectionGridSkeleton />;

  const usersToShow = showAll ? users : users.slice(0, 4);

  return (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {users.length > 4 && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : "Show all"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {usersToShow.map((user) => (
          <div
            key={user._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
            onClick={() => navigate(`/users/${user._id}`)} // Переход на страницу профиля пользователя
          >
            <div className="relative mb-4">
              <Avatar className="w-full h-auto aspect-square object-cover shadow-lg">
                <AvatarImage
                  src={user.imageUrl}
                  className="group-hover:scale-105 transition-all duration-300"
                />
                <AvatarFallback>{user.fullName?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            <h3 className="font-medium mb-1 truncate text-white text-center">
              {user.fullName}
            </h3>
            <p className="text-sm text-zinc-400 text-center">Profile</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserGrid;
