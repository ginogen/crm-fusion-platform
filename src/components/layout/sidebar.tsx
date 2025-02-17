
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import * as Icons from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type IconName = keyof typeof Icons;

export const AppSidebar = () => {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold">CF</span>
          </div>
          <span className="font-semibold">CRM Fusion</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <div className="px-2 space-y-1">
          {NAVIGATION_ITEMS.map((item) => {
            const IconComponent = Icons[item.icon as IconName];
            const isActive = location.pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary/80"
                )}
                asChild
              >
                <Link to={item.href}>
                  <IconComponent className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
