import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchResults } from "@/components/leads/SearchResults";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from '../../lib/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { GestionTipo } from "@/lib/types";
type Lead = {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  estado: string;
  origen: string;
}

type Notification = {
  id: string;
  type: 'task' | 'lead';
  title: string;
  description: string;
  read: boolean;
  date: string;
};

// Añadir tipo para Tarea
type Tarea = {
  id: string;
  lead_id: string;
  tipo: GestionTipo;
  fecha: string;
  observaciones: string;
  rechazo_reason?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface TopbarProps {
  onEditLead?: (lead: Lead) => void;
  onGestionLead?: (lead: Lead) => void;
}

export const Topbar = ({ onEditLead, onGestionLead }: TopbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Obtener tareas para hoy
        const today = new Date().toISOString().split('T')[0];
        const { data: tareas, error: tareasError } = await supabase
          .from('tareas')
          .select(`
            *,
            leads:lead_id (
              nombre_completo
            )
          `)
          .eq('fecha', today);

        // Obtener leads por evacuar (comentado ya que 'por_evacuar' no existe en el enum)
        // const { data: leads, error: leadsError } = await supabase
        //   .from('leads')
        //   .select('*')
        //   .eq('estado', 'por_evacuar');
        const leads = []; // Placeholder mientras se define el enum correcto
        const leadsError = null;

        if (tareasError || leadsError) throw tareasError || leadsError;

        const notificationsList: Notification[] = [
          ...(tareas?.map(tarea => ({
            id: `tarea-${tarea.id}`,
            type: 'task' as const,
            title: 'Tarea pendiente para hoy',
            description: tarea.observaciones || 'Sin observaciones',
            read: false,
            date: tarea.fecha
          })) || []),
          ...(leads?.map(lead => ({
            id: `lead-${lead.id}`,
            type: 'lead' as const,
            title: 'Lead por evacuar',
            description: `${lead.nombre_completo} está pendiente de evacuación`,
            read: false,
            date: today
          })) || [])
        ];

        setNotifications(notificationsList);
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      }
    };

    fetchNotifications();
    // Actualizar notificaciones cada 5 minutos
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  // Añadir manejador de clics fuera del menú de notificaciones
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select()
        .or(`nombre_completo.ilike.%${query}%,email.ilike.%${query}%`)
        .order('nombre_completo', { ascending: true });

      if (error) throw error;

      setResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error buscando leads:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="h-16 border-b flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm fixed top-0 right-0 left-0 z-50 shadow-sm">
      <div className="flex-shrink-0">
        <img 
          src="/Logo-LGS-transparente-1024x586.png" 
          alt="Logo LGS" 
          className="h-8 w-auto"
        />
      </div>
      <div className="flex items-center justify-center flex-1 max-w-xl mx-auto px-4">
        <div className="relative w-full" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar leads por nombre o email..."
            className="pl-10 w-full bg-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
          />
          <SearchResults 
            results={results}
            visible={showResults}
            onClose={() => setShowResults(false)}
            onEditLead={onEditLead}
            onGestionLead={onGestionLead}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative" ref={notificationsRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-gray-100"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">Notificaciones</h3>
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tienes notificaciones pendientes</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className="flex items-start justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-sm text-gray-600">{notification.description}</p>
                        </div>
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Marcar como leída
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};
