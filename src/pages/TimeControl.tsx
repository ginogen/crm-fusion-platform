import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserActivity {
  id: string;
  user_id: string;
  last_active: string;
  session_start: string;
  is_online: boolean;
  created_at: string;
}

interface UserData {
  id: string;
  email: string;
  nombre_completo: string;
  user_position: string;
  role: string;
  created_at: string;
  estructura_id: number;
  supervisor_id: string | null;
  is_active: boolean;
  is_online: boolean;
  last_active?: string;
  estructura?: {
    id: number;
    nombre: string;
    custom_name?: string;
  };
  user_activity?: {
    is_online: boolean;
    last_active: string;
  }[];
}

const MULTI_ESTRUCTURA_POSITIONS = ['Director de Zona', 'Director Internacional', 'CEO'];

const TimeControl = () => {
  const [emailFilter, setEmailFilter] = useState("");
  const [nombreFilter, setNombreFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Obtener usuarios
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-time"],
    queryFn: async () => {
      const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos
      
      // Obtener todos los usuarios con sus estados de conexión
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          *,
          estructura:estructuras(*),
          user_activity(
            is_online,
            last_active
          )
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Procesar los datos para obtener el último estado de actividad
      const processedUsers = usersData.map(user => {
        const lastActive = user.user_activity?.[0]?.last_active;
        const isWithinTimeout = lastActive ? 
          (Date.now() - new Date(lastActive).getTime()) < INACTIVITY_TIMEOUT : 
          false;

        return {
          ...user,
          is_online: user.user_activity?.[0]?.is_online && isWithinTimeout,
          last_active: lastActive || null
        };
      });

      return processedUsers as UserData[];
    },
    refetchInterval: 60000, // Actualizar cada minuto
  });

  // Obtener registros de actividad para un usuario específico
  const { data: activityRecords } = useQuery({
    queryKey: ["activity-records", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];

      const { data, error } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("session_start", { ascending: false });

      if (error) throw error;
      return data as UserActivity[];
    },
    enabled: !!selectedUserId,
  });

  // Filtrar usuarios
  const filteredUsers = users?.filter((user) => {
    const matchesEmail = user.email.toLowerCase().includes(emailFilter.toLowerCase());
    const matchesNombre = user.nombre_completo.toLowerCase().includes(nombreFilter.toLowerCase());
    return matchesEmail && matchesNombre;
  });

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('Usuarios cargados:', users); // Para debug

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Control de Tiempo</h1>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por email"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nombre"
              value={nombreFilter}
              onChange={(e) => setNombreFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estructura</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.nombre_completo}</TableCell>
                <TableCell>{user.user_position}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span>
                    {user.estructura?.custom_name || 
                     user.estructura?.nombre || 
                     'Sin estructura'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.is_online
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {user.is_online ? "En línea" : "Desconectado"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Historial */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Historial de Conexiones - {users?.find(u => u.id === selectedUserId)?.nombre_completo}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio de Sesión</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.session_start)}</TableCell>
                    <TableCell>{formatDate(record.last_active)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.is_online
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {record.is_online ? "En línea" : "Desconectado"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeControl; 