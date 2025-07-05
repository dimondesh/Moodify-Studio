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
import { useEffect, useState } from "react";

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <AudioPlayer />

      {/* Topbar на всю ширину, всегда сверху */}
      <Topbar />

      {/* Основной layout */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 flex overflow-hidden p-2"
      >
        {/* Левая панель */}
        <ResizablePanel
          defaultSize={20}
          minSize={isMobile ? 0 : 10}
          maxSize={30}
        >
          <LeftSidebar />
        </ResizablePanel>

        <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />

        {/* Центральная панель с контентом */}
        <ResizablePanel className="overflow-y-auto">
          <Outlet />
        </ResizablePanel>

        {/* Правая панель — активность друзей */}
        {!isMobile && (
          <>
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
            <ResizablePanel
              defaultSize={20}
              minSize={0}
              maxSize={25}
              collapsedSize={0}
            >
              <FriendsActivity />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <PlaybackControls />
    </div>
  );
};

export default MainLayout;
