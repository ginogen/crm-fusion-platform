
import { AppSidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export const MainLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50/80 backdrop-blur-sm">
        <AppSidebar />
        <div className="flex-1">
          <Topbar />
          <main className="pt-16 min-h-screen">
            <div className="p-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
