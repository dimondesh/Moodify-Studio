// src/pages/HomePage/FeaturedSection.tsx

import { useNavigate } from "react-router-dom";
import FeaturedGridSkeleton from "../../components/ui/skeletons/FeaturedGridSkeleton";
import { useMusicStore } from "../../stores/useMusicStore";
import PlayButton from "./PlayButton";
import { JSX, useEffect } from "react";
import React from "react";
import { Song } from "@/types";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePlayerStore } from "../../stores/usePlayerStore";

interface Artist {
  _id: string;
  name: string;
}

interface FeaturedSectionProps {
  onSongHover: (song: Song) => void;
  onSongLeave: () => void;
}

const FeaturedSection = ({
  onSongHover,
  onSongLeave,
}: FeaturedSectionProps) => {
  const { isLoading, featuredSongs, error, artists, fetchArtists } =
    useMusicStore();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { playAlbum, togglePlay, currentSong, isPlaying } = usePlayerStore();

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const getArtistNamesDisplay = (
    artistsInput: (string | Artist)[] | undefined,
    isMobileView: boolean
  ) => {
    if (!artistsInput || artistsInput.length === 0) {
      return <span>Неизвестный исполнитель</span>;
    }

    const artistElements: JSX.Element[] = [];
    artistsInput.forEach((artistOrId, index) => {
      let artistName: string | null = null;
      let artistId: string | null = null;

      if (typeof artistOrId === "string") {
        const foundArtist = artists.find((a: Artist) => a._id === artistOrId);
        if (foundArtist) {
          artistName = foundArtist.name;
          artistId = foundArtist._id;
        }
      } else {
        artistName = artistOrId.name;
        artistId = artistOrId._id;
      }

      if (artistName && artistId) {
        if (isMobileView) {
          artistElements.push(
            <span
              key={artistId}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToArtist(artistId);
              }}
              className="hover:underline focus:outline-none focus:underline"
            >
              {artistName}
            </span>
          );
        } else {
          artistElements.push(
            <button
              key={artistId}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToArtist(artistId);
              }}
              className="hover:underline focus:outline-none focus:underline"
            >
              {artistName}
            </button>
          );
        }
        if (index < artistsInput.length - 1) {
          artistElements.push(<span key={`sep-${artistId}`}>, </span>);
        }
      }
    });

    return <>{artistElements}</>;
  };

  if (isLoading) return <FeaturedGridSkeleton />;

  if (error) return <p className="text-red-500 mb-4 text-lg">{error}</p>;

  const songsArray = Array.isArray(featuredSongs) ? featuredSongs : [];
  const songsToShow = songsArray.slice(0, 6);

  const handleNavigateToAlbum = (albumId: string | null | undefined) => {
    if (albumId) {
      navigate(`/albums/${albumId}`);
    } else {
      console.warn("albumId отсутствует");
    }
  };

  const handleNavigateToArtist = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  if (songsArray.length === 0) {
    return <p className="text-zinc-400">No songs available</p>;
  }

  const handleItemClick = (song: Song, index: number) => {
    if (isMobile) {
      const isThisSongPlaying = isPlaying && currentSong?._id === song._id;
      if (isThisSongPlaying) {
        togglePlay();
      } else {
        playAlbum(songsArray, index);
      }
    } else {
      handleNavigateToAlbum(song.albumId);
    }
  };

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      onMouseLeave={onSongLeave}
    >
      {songsToShow.map((song, index) => {
        const Component = isMobile ? "button" : "div";

        return (
          <Component
            key={song._id}
            className="flex items-center bg-zinc-800/50 rounded-sm sm:rounded-md overflow-hidden hover:bg-zinc-700/50
               transition-colors group cursor-pointer relative text-left"
            onClick={() => handleItemClick(song, index)}
            onMouseEnter={() => !isMobile && onSongHover(song)}
          >
            <div className="flex-shrink-0">
              <img
                src={song.imageUrl || "/default-song-cover.png"}
                alt={song.title}
                className="w-10 sm:w-20 h-10 sm:h-20 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/default-song-cover.png";
                }}
              />
            </div>
            <div className="flex-1 p-2 sm:p-4 min-w-0">
              <p className="font-medium truncate text-white hover:underline">
                {song.title || "Без названия"}
              </p>
              <p className="hidden sm:inline text-sm text-zinc-400 truncate">
                {getArtistNamesDisplay(song.artist, isMobile)}
              </p>
            </div>
            {!isMobile && (
              <PlayButton song={song} songs={songsArray} songIndex={index} />
            )}
          </Component>
        );
      })}
    </div>
  );
};

export default FeaturedSection;
