
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LucideIcon, User } from "lucide-react";
import * as Icons from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AppSidebar = () => {
  const location = useLocation();

  // Obtener la sesión del usuario
  const { data: userData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Obtener el rol del usuario
      const { data: userProfile } = await supabase
        .from("users")
        .select("email, nombre_completo, role")
        .eq("id", user.id)
        .single();

      return {
        email: user.email,
        nombre_completo: userProfile?.nombre_completo || "Usuario",
        role: userProfile?.role || "Usuario",
      };
    },
  });

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-between px-4 border-b border-sidebar-muted/20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-semibold">CF</span>
          </div>
          <span className="font-semibold text-sidebar-foreground">CRM Fusion</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <div className="px-4 py-4 border-b border-sidebar-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sidebar-muted flex items-center justify-center shadow-inner">
              <User className="h-6 w-6 text-sidebar-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userData?.nombre_completo}
              </p>
              <p className="text-xs text-sidebar-muted-foreground truncate">
                {userData?.email}
              </p>
              <p className="text-xs text-primary font-medium">{userData?.role}</p>
            </div>
          </div>
        </div>
        <div className="px-2 space-y-1 mt-4">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = Icons[item.icon as keyof typeof Icons] as LucideIcon;
            const isActive = location.pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-sidebar-muted text-sidebar-foreground shadow-md"
                )}
                asChild
              >
                <Link to={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
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
