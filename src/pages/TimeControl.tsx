import { useState, useEffect } from "react";
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
import { History, Search, ChevronDown, ChevronRight, Clock, Users, Calendar, CalendarIcon, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MULTI_ESTRUCTURA_POSITIONS } from "@/lib/constants";

interface UserTimeRecord {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  created_at: string;
  is_active?: boolean; // Indica si el registro está activo (usuario en cita)
}

// Interfaz para representar los registros agrupados por día
interface DayGroupedRecords {
  date: string; // Fecha formateada (DD/MM/YYYY)
  records: UserTimeRecord[];
  count: number; // Cantidad de registros en ese día
}

// Interfaz para los registros de cierre de sesión (user_activity)
interface UserActivity {
  id: string;
  user_id: string;
  last_active: string;
  session_start: string;
  is_online: boolean;
  created_at: string;
}

// Interfaz para los registros de cierre de sesión agrupados por día
interface DayGroupedSessionLogs {
  date: string; // Fecha formateada (DD/MM/YYYY)
  logs: UserActivity[];
  count: number; // Cantidad de registros en ese día
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
  estructura?: {
    id: number;
    nombre: string;
    custom_name?: string;
  };
  in_appointment?: boolean;
  current_appointment?: UserTimeRecord | null;
}

const TimeControl = () => {
  const [emailFilter, setEmailFilter] = useState("");
  const [nombreFilter, setNombreFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [usersInAppointment, setUsersInAppointment] = useState<number>(0);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedSessionDays, setExpandedSessionDays] = useState<Record<string, boolean>>({});

  // Obtener registros de tiempo para todos los usuarios
  const { data: timeRecords, isLoading: isLoadingTimeRecords } = useQuery({
    queryKey: ["time-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_time_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserTimeRecord[];
    },
    refetchInterval: 10000, // Actualizar cada 10 segundos para ver cambios en tiempo real
  });

  // Obtener usuarios y estado de citas en tiempo real
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-time", timeRecords],
    queryFn: async () => {
      // Obtener todos los usuarios
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          *,
          estructura:estructuras(*)
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Obtener el mapa de usuarios en cita
      const appointmentMap = getUsersInAppointment();

      // Procesar los datos
      const processedUsers = usersData.map(user => {
        // Obtener si el usuario está en cita desde el mapa de citas
        const appointmentInfo = appointmentMap.get(user.id) || { isInAppointment: false, appointmentRecord: null };

        return {
          ...user,
          in_appointment: appointmentInfo.isInAppointment,
          current_appointment: appointmentInfo.appointmentRecord
        };
      });

      return processedUsers as UserData[];
    },
    refetchInterval: 10000, // Actualizar cada 10 segundos para ver cambios en tiempo real
  });

  // Obtener registros de actividad y cierre de sesión
  const { data: userActivities, isLoading: isLoadingUserActivities } = useQuery({
    queryKey: ["user-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activity")
        .select("*")
        .eq("is_online", false) // Filtrar por registros donde is_online es false (sesión cerrada)
        .order("last_active", { ascending: false });

      if (error) throw error;
      return data as UserActivity[];
    },
    refetchInterval: 10000, // Actualizar cada 10 segundos para ver cambios en tiempo real
  });

  // Determinar qué usuarios están actualmente en cita
  // Un usuario está en cita si tiene un registro de tiempo sin end_time o donde end_time es null
  const getUsersInAppointment = () => {
    if (!timeRecords) return new Map();
    
    const appointmentMap = new Map();
    const now = new Date().getTime();
    
    timeRecords.forEach(record => {
      const startTime = new Date(record.start_time).getTime();
      const endTime = record.end_time ? new Date(record.end_time).getTime() : null;
      
      // El usuario está en una cita si:
      // 1. La cita tiene hora de inicio
      // 2. No tiene hora de finalización O la hora de finalización es futura
      const isActive = startTime && (!endTime || endTime > now);
      
      if (isActive) {
        appointmentMap.set(record.user_id, {
          isInAppointment: true,
          appointmentRecord: record
        });
      } else if (!appointmentMap.has(record.user_id)) {
        appointmentMap.set(record.user_id, {
          isInAppointment: false,
          appointmentRecord: null
        });
      }
    });
    
    return appointmentMap;
  };

  // Actualizar contador de usuarios en cita
  useEffect(() => {
    if (!timeRecords) return;
    
    const appointmentMap = getUsersInAppointment();
    let count = 0;
    
    appointmentMap.forEach(value => {
      if (value.isInAppointment) count++;
    });
    
    setUsersInAppointment(count);
  }, [timeRecords]);

  // Configurar suscripción a cambios en registros de tiempo y actividad en tiempo real
  useEffect(() => {
    const timeRecordsChannel = supabase
      .channel('time-records-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_time_records'
      }, (payload) => {
        // Recargar datos cuando haya cambios en la tabla de registros de tiempo
        setTimeout(() => {
          const queryClient = require('@tanstack/react-query').queryClient;
          queryClient.invalidateQueries({ queryKey: ["time-records"] });
        }, 500);
      })
      .subscribe();

    const userActivityChannel = supabase
      .channel('user-activity-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_activity'
      }, (payload) => {
        // Recargar datos cuando haya cambios en la tabla de actividad de usuario
        setTimeout(() => {
          const queryClient = require('@tanstack/react-query').queryClient;
          queryClient.invalidateQueries({ queryKey: ["user-activities"] });
        }, 500);
      })
      .subscribe();

    // Limpiar suscripción al desmontar
    return () => {
      supabase.removeChannel(timeRecordsChannel);
      supabase.removeChannel(userActivityChannel);
    };
  }, []);

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

  // Formatear fecha como solo día
  const formatDateAsDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Formatear duración
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calcular duración de sesión en formato legible
  const calculateSessionDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    
    if (durationMs < 0) return "N/A";
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  };

  // Obtener registros de tiempo de un usuario específico agrupados por día
  const getUserTimeRecords = (userId: string): DayGroupedRecords[] => {
    const records = timeRecords?.filter(record => record.user_id === userId) || [];
    
    // Si no hay registros, retornar un array vacío
    if (records.length === 0) return [];
    
    // Agrupar los registros por día
    const recordsByDay: Record<string, UserTimeRecord[]> = {};
    
    records.forEach(record => {
      const day = formatDateAsDay(record.start_time);
      if (!recordsByDay[day]) {
        recordsByDay[day] = [];
      }
      recordsByDay[day].push(record);
    });
    
    // Convertir el objeto a un array de días agrupados y ordenarlos por fecha (más reciente primero)
    return Object.entries(recordsByDay)
      .map(([date, dayRecords]) => ({
        date,
        records: dayRecords,
        count: dayRecords.length
      }))
      .sort((a, b) => {
        // Ordenar por fecha, más reciente primero
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
  };

  // Obtener registros de cierre de sesión de un usuario específico agrupados por día
  const getUserSessionLogs = (userId: string): DayGroupedSessionLogs[] => {
    const logs = userActivities?.filter(activity => activity.user_id === userId) || [];
    
    // Si no hay registros, retornar un array vacío
    if (logs.length === 0) return [];
    
    // Agrupar los registros por día
    const logsByDay: Record<string, UserActivity[]> = {};
    
    logs.forEach(log => {
      const day = formatDateAsDay(log.last_active);
      if (!logsByDay[day]) {
        logsByDay[day] = [];
      }
      logsByDay[day].push(log);
    });
    
    // Convertir el objeto a un array de días agrupados y ordenarlos por fecha (más reciente primero)
    return Object.entries(logsByDay)
      .map(([date, dayLogs]) => ({
        date,
        logs: dayLogs,
        count: dayLogs.length
      }))
      .sort((a, b) => {
        // Ordenar por fecha, más reciente primero
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
  };

  // Alternar la expansión de un usuario
  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Alternar la expansión de un día
  const toggleDayExpansion = (userId: string, date: string) => {
    const key = `${userId}-${date}`;
    setExpandedDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Alternar la expansión de un día para registros de sesión
  const toggleSessionDayExpansion = (userId: string, date: string) => {
    const key = `${userId}-${date}`;
    setExpandedSessionDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Verificar si un día está expandido
  const isDayExpanded = (userId: string, date: string) => {
    const key = `${userId}-${date}`;
    return !!expandedDays[key];
  };

  // Verificar si un día de sesión está expandido
  const isSessionDayExpanded = (userId: string, date: string) => {
    const key = `${userId}-${date}`;
    return !!expandedSessionDays[key];
  };

  if (isLoadingUsers || isLoadingTimeRecords || isLoadingUserActivities) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Control de Tiempo</h1>
      </div>

      {/* Card de usuarios en cita */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Usuarios en Cita
            </CardTitle>
            <CardDescription>
              Usuarios actualmente en cita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-700">{usersInAppointment}</span>
              <span className="text-sm text-blue-600">Total de {users?.length || 0} usuarios</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registros-tiempo">
        <TabsList className="w-full">
          <TabsTrigger value="registros-tiempo" className="flex-1">Registros de Tiempo</TabsTrigger>
          <TabsTrigger value="registros-sesion" className="flex-1">Cierres de Sesión</TabsTrigger>
        </TabsList>

        <TabsContent value="registros-tiempo" className="space-y-6">
          {/* Filtros para la tabla */}
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

          {/* Tabla acordeón de usuarios y sus registros de tiempo */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nombre de Usuario</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estructura del Usuario</TableHead>
                  <TableHead>En Cita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <>
                    <TableRow key={user.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleUserExpansion(user.id)}>
                      <TableCell>
                        {expandedUsers[user.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>{user.nombre_completo}</TableCell>
                      <TableCell>{user.user_position}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.estructura?.custom_name || user.estructura?.nombre || 'Sin estructura'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.in_appointment
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {user.in_appointment ? "Sí" : "No"}
                        </span>
                      </TableCell>
                    </TableRow>
                    {expandedUsers[user.id] && (
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              Registros de Tiempo
                            </h4>
                            <div className="space-y-3">
                              {getUserTimeRecords(user.id).length > 0 ? (
                                getUserTimeRecords(user.id).map((dayGroup) => (
                                  <div key={dayGroup.date} className="border rounded-md">
                                    <div 
                                      className="flex items-center justify-between p-3 bg-slate-100 cursor-pointer"
                                      onClick={() => toggleDayExpansion(user.id, dayGroup.date)}
                                    >
                                      <div className="flex items-center">
                                        {isDayExpanded(user.id, dayGroup.date) ? (
                                          <ChevronDown className="h-4 w-4 mr-2" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 mr-2" />
                                        )}
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        <span className="font-medium">{dayGroup.date}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                          {dayGroup.count} {dayGroup.count === 1 ? "registro" : "registros"}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {isDayExpanded(user.id, dayGroup.date) && (
                                      <div className="p-3">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Inicio</TableHead>
                                              <TableHead>Fin</TableHead>
                                              <TableHead>Duración</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {dayGroup.records.map((record) => (
                                              <TableRow key={record.id}>
                                                <TableCell>{formatDate(record.start_time)}</TableCell>
                                                <TableCell>{record.end_time ? formatDate(record.end_time) : "En curso"}</TableCell>
                                                <TableCell>
                                                  {record.end_time 
                                                    ? formatDuration(record.duration_seconds) 
                                                    : "En curso"}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  No hay registros de tiempo para este usuario
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="registros-sesion" className="space-y-6">
          {/* Filtros para la tabla de cierre de sesión */}
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

          {/* Tabla acordeón de usuarios y sus registros de cierre de sesión */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nombre de Usuario</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estructura del Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <>
                    <TableRow key={user.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleUserExpansion(user.id)}>
                      <TableCell>
                        {expandedUsers[user.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>{user.nombre_completo}</TableCell>
                      <TableCell>{user.user_position}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.estructura?.custom_name || user.estructura?.nombre || 'Sin estructura'}
                      </TableCell>
                    </TableRow>
                    {expandedUsers[user.id] && (
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={5} className="p-0">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center">
                              <LogOut className="h-4 w-4 mr-2" />
                              Registros de Cierre de Sesión
                            </h4>
                            <div className="space-y-3">
                              {getUserSessionLogs(user.id).length > 0 ? (
                                getUserSessionLogs(user.id).map((dayGroup) => (
                                  <div key={dayGroup.date} className="border rounded-md">
                                    <div 
                                      className="flex items-center justify-between p-3 bg-slate-100 cursor-pointer"
                                      onClick={() => toggleSessionDayExpansion(user.id, dayGroup.date)}
                                    >
                                      <div className="flex items-center">
                                        {isSessionDayExpanded(user.id, dayGroup.date) ? (
                                          <ChevronDown className="h-4 w-4 mr-2" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 mr-2" />
                                        )}
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        <span className="font-medium">{dayGroup.date}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                          {dayGroup.count} {dayGroup.count === 1 ? "cierre" : "cierres"} de sesión
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {isSessionDayExpanded(user.id, dayGroup.date) && (
                                      <div className="p-3">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Inicio de Sesión</TableHead>
                                              <TableHead>Cierre de Sesión</TableHead>
                                              <TableHead>Duración</TableHead>
                                              <TableHead>Estado</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {dayGroup.logs.map((log) => (
                                              <TableRow key={log.id}>
                                                <TableCell>{formatDate(log.session_start)}</TableCell>
                                                <TableCell>{formatDate(log.last_active)}</TableCell>
                                                <TableCell>
                                                  {calculateSessionDuration(log.session_start, log.last_active)}
                                                </TableCell>
                                                <TableCell>
                                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                                    Cerrada
                                                  </span>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  No hay registros de cierre de sesión para este usuario
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimeControl; 