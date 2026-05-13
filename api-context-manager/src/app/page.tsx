'use client';
import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar';
import { MainWorkspace } from '@/components/MainWorkspace';
import { RightPanel } from '@/components/RightPanel';
import { BottomPanel } from '@/components/BottomPanel';
import { GlobalSearch } from '@/components/GlobalSearch';
import { CreateAppModal, CreateGroupModal, CreateEndpointModal } from '@/components/Modals';
import { useUIStore } from '@/store/uiStore';

export default function Home() {
  const { rightPanelOpen } = useUIStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Global overlays */}
      <GlobalSearch />
      <CreateAppModal />
      <CreateGroupModal />
      <CreateEndpointModal />

      {/* Title bar */}
      <TitleBar />

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-64 shrink-0 flex flex-col min-h-0">
          <Sidebar />
        </div>

        {/* Center + right — full height */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Top: workspace + right panel */}
          <div className="flex flex-1 min-h-0">
            <MainWorkspace />
            {rightPanelOpen && <RightPanel />}
          </div>

          {/* Bottom panel */}
          <BottomPanel />
        </div>
      </div>
    </div>
  );
}
