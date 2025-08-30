// frontend/src/layout/MainLayout.tsx

import { Outlet } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../components/ui/resizable";
import LeftSidebar from "./LeftSidebar";
import FriendsActivity from "./FriendsActivity";
import AudioPlayer from "./AudioPlayer";
import PlaybackControls from "./PlaybackControls";
import Topbar from "../components/ui/Topbar";
import BottomNavigationBar from "./BottomNavigationBar";
import { useEffect, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import LyricsPage from "@/pages/LyricsPage/LyricsPage";
import DynamicTitleUpdater from "@/components/DynamicTitleUpdater";
import { useUIStore } from "../stores/useUIStore";
import { useMusicStore } from "../stores/useMusicStore";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { cn } from "../lib/utils";

const MainLayout = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [isCompactView, setIsCompactView] = useState(false);
  const {
    currentSong,
    isFullScreenPlayerOpen,
    isDesktopLyricsOpen,
    isMobileLyricsFullScreen,
  } = usePlayerStore();
  const { fetchAlbums } = useMusicStore();

  const {
    isCreatePlaylistDialogOpen,
    editingPlaylist,
    isSearchAndAddDialogOpen,
    shareEntity,
    isEditProfileDialogOpen,
    playlistToDelete,
    songToRemoveFromPlaylist,
    isUserSheetOpen,
  } = useUIStore();

  const isAnyDialogOpen =
    isCreatePlaylistDialogOpen ||
    !!editingPlaylist ||
    isSearchAndAddDialogOpen ||
    !!shareEntity ||
    isEditProfileDialogOpen ||
    !!playlistToDelete ||
    !!songToRemoveFromPlaylist;
  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);
  useEffect(() => {
    const rootElement = document.getElementById("root");
    if (rootElement) {
      if (isAnyDialogOpen && !isFullScreenPlayerOpen && !isUserSheetOpen) {
        rootElement.classList.add("dialog-open-blur");
      } else {
        rootElement.classList.remove("dialog-open-blur");
      }
    }
    return () => {
      if (rootElement) {
        rootElement.classList.remove("dialog-open-blur");
      }
    };
  }, [isAnyDialogOpen, isFullScreenPlayerOpen, isUserSheetOpen]);

  useEffect(() => {
    const checkScreenSize = () => {
      const isCompact = window.innerWidth < 1024;
      setIsCompactView(isCompact);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  let contentPaddingBottom = "pb-0";
  if (isMobile) {
    if (isFullScreenPlayerOpen || isMobileLyricsFullScreen) {
      contentPaddingBottom = "pb-0";
    } else if (currentSong) {
      contentPaddingBottom = "pb-[calc(4rem+4rem)] sm:pb-[calc(5rem+4rem)]";
    } else {
      contentPaddingBottom = "pb-16";
    }
  } else {
    if (currentSong) {
      contentPaddingBottom = "";
    } else {
      contentPaddingBottom = "pb-0";
    }
  }
  useEffect(() => {
    if (isUserSheetOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isUserSheetOpen, isMobile]);

  return (
    <div
      className={cn(
        "h-screen bg-zinc-950 text-white flex flex-col transition-transform ease-in-out",
        isUserSheetOpen && isMobile
          ? "duration-300 -translate-x-[290px] rounded-none overflow-hidden"
          : "duration-300 translate-x-0 rounded-none"
      )}
    >
      {" "}
      <DynamicTitleUpdater />
      <AudioPlayer />
      <Topbar />
      <ResizablePanelGroup
        direction="horizontal"
        className={`flex-1 flex overflow-hidden p-2 ${contentPaddingBottom}`}
      >
        {!isMobile && (
          <>
            <ResizablePanel
              defaultSize={20}
              minSize={10}
              maxSize={30}
              className="hidden lg:block"
            >
              <LeftSidebar />
            </ResizablePanel>
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors hidden lg:block" />
          </>
        )}

        <ResizablePanel className="overflow-y-auto flex-1">
          {isMobileLyricsFullScreen ? (
            <div className="fixed inset-0 z-[80] bg-zinc-950">
              <LyricsPage isMobileFullScreen={true} />
            </div>
          ) : !isCompactView && isDesktopLyricsOpen ? (
            <LyricsPage isMobileFullScreen={false} />
          ) : (
            <Outlet />
          )}
        </ResizablePanel>

        {!isMobile && (
          <>
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
            <ResizablePanel
              defaultSize={20}
              minSize={0}
              maxSize={25}
              collapsedSize={0}
              className="hidden lg:block"
            >
              <FriendsActivity />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      <PlaybackControls />
      {isCompactView &&
        !isFullScreenPlayerOpen &&
        !isMobileLyricsFullScreen && <BottomNavigationBar />}
    </div>
  );
};

export default MainLayout;
