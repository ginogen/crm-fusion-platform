
import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Topbar = () => {
  return (
    <div className="h-16 border-b flex items-center justify-between px-6 bg-white fixed top-0 right-0 left-0 z-50">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar leads por nombre o email..."
            className="pl-10 w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </Button>
        <Button variant="ghost" size="icon">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
