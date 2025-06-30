import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarCheck2, Users, Calendar as CalendarIcon, GraduationCap, Eye, ClipboardList, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES, MANAGEMENT_TYPES, LEAD_STATUS_LABELS, REJECTION_REASONS, USER_ROLES, ROLE_HIERARCHY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIconLucide } from "lucide-react";
import ModifyLeadsDialog from "@/components/leads/ModifyLeadsDialog";
import { Topbar } from "@/components/layout/topbar";
import LeadsTable from "@/components/leads/LeadsTable";
import { LeadHistorialSheet } from "@/components/leads/LeadHistorialSheet";
import { es } from 'date-fns/locale';
import { TimePicker } from "@/components/ui/time-picker";
import { GestionTipo } from "@/lib/types";

const CALENDAR_VIEWS = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day"
} as const;

type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];
type LeadEstado = typeof LEAD_STATUSES[number];
type TipoGestion = typeof MANAGEMENT_TYPES[number];

const LeadEditModal = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const [formData, setFormData] = useState({
    nombre_completo: lead?.nombre_completo || "",
    email: lead?.email || "",
    telefono: lead?.telefono || "",
    origen: lead?.origen || "",
    pais: lead?.pais || "",
    filial: lead?.filial || "",
    observaciones: lead?.observaciones || ""
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lead) {
      setFormData({
        nombre_completo: lead.nombre_completo || "",
        email: lead.email || "",
        telefono: lead.telefono || "",
        origen: lead.origen || "",
        pais: lead.pais || "",
        filial: lead.filial || "",
        observaciones: lead.observaciones || ""
      });
    }
  }, [lead]);

  const updateLead = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("leads")
        .update(data)
        .eq("id", lead.id);

      if (error) throw error;

      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "ACTUALIZACIÓN",
        details: JSON.stringify({ 
          previous: lead,
          new: data,
          changes: Object.keys(data).filter(key => data[key] !== lead[key])
        })
      });
    },
    onSuccess: () => {
      toast.success("Lead actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      onClose();
    },
    onError: (error) => {
      toast.error("Error al actualizar el lead");
      console.error("Error updating lead:", error);
    }
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          updateLead.mutate(formData);
        }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre Completo</Label>
              <Input
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origen">Origen</Label>
              <Input
                id="origen"
                name="origen"
                value={formData.origen}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                name="pais"
                value={formData.pais}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filial">Filial</Label>
              <Input
                id="filial"
                name="filial"
                value={formData.filial}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Actualizar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const GestionModal = ({ lead, isOpen, onClose, initialData }: { lead: any, isOpen: boolean, onClose: () => void, initialData?: any }) => {
  const [tipo, setTipo] = useState<GestionTipo | "">(initialData?.tipo || "");
  const [fecha, setFecha] = useState<Date | undefined>(initialData?.fecha ? new Date(initialData.fecha) : undefined);
  const [observaciones, setObservaciones] = useState(initialData?.observaciones || "");
  const [razonRechazo, setRazonRechazo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData?.observaciones) {
      const parts = initialData.observaciones.split(" - ");
      if (parts.length > 1) {
        setRazonRechazo(parts[0]);
        setObservaciones(parts[1]);
      }
    }
  }, [initialData]);

  const { data: existingGestion } = useQuery({
    queryKey: ["lead-gestion", lead.id],
    queryFn: async () => {
      if (!initialData) {
        const { data } = await supabase
          .from("tareas")
          .select("*")
          .eq("lead_id", lead.id);
        return data?.[0];
      }
      return null;
    },
    enabled: !initialData && isOpen
  });

  const createGestion = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      if (!initialData && existingGestion) {
        throw new Error("Ya existe una gestión para este lead");
      }

      const gestionData = {
        lead_id: lead.id,
        tipo,
        fecha: fecha?.toISOString(),
        observaciones: razonRechazo ? `${razonRechazo} - ${observaciones}` : observaciones,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      if (initialData) {
        const { error: updateError } = await supabase
          .from("tareas")
          .update(gestionData)
          .eq("id", initialData.id);

        if (updateError) throw updateError;
      } else {
        // Validar que no exista una tarea para este lead
        const { data: existingTask, error: checkError } = await supabase
          .from("tareas")
          .select("*")
          .eq("lead_id", lead.id);
          
        if (checkError) throw checkError;
        
        if (existingTask && existingTask.length > 0) {
          throw new Error("Ya existe una gestión para este lead");
        }
        
        const { error: createError } = await supabase
          .from("tareas")
          .insert([gestionData]);

        if (createError) throw createError;
      }

      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: initialData ? "ACTUALIZACIÓN_GESTIÓN" : tipo,
        details: JSON.stringify({ 
          fecha, 
          observaciones: razonRechazo ? `${razonRechazo} - ${observaciones}` : observaciones,
          tipo_anterior: initialData?.tipo,
          tipo_nuevo: tipo
        })
      });

      if (tipo === "CITA") {
        await supabase
          .from("leads")
          .update({ estado: "CITA_PROGRAMADA" })
          .eq("id", lead.id);
      }
    },
    onSuccess: () => {
      toast.success(initialData ? "Gestión actualizada correctamente" : "Gestión registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (error: any) => {
      if (error.message === "Ya existe una gestión para este lead") {
        toast.error("Este lead ya tiene una gestión registrada");
      } else {
        toast.error("Error al registrar la gestión");
        console.error("Error creating gestion:", error);
      }
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleTipoChange = (value: GestionTipo) => {
    setTipo(value);
    setRazonRechazo("");
  };

  if (!initialData && existingGestion) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Gestión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-red-600">
              Este lead ya tiene una gestión registrada. No es posible crear múltiples gestiones para el mismo lead.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Modificar Gestión" : "Nueva Gestión"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modifica la gestión para" : "Registra una nueva gestión para"} {lead.nombre_completo}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo de Gestión</label>
            <Select value={tipo} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {MANAGEMENT_TYPES.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "NO_INTERESA" && (
            <div>
              <label className="text-sm font-medium">Razón</label>
              <Select value={razonRechazo} onValueChange={setRazonRechazo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar razón..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.NO_INTERESA.map((razon) => (
                    <SelectItem key={razon} value={razon}>
                      {razon.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "NO_CUMPLE_REQUISITO" && (
            <div>
              <label className="text-sm font-medium">Razón</label>
              <Select value={razonRechazo} onValueChange={setRazonRechazo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar razón..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.NO_CUMPLE_REQUISITO.map((razon) => (
                    <SelectItem key={razon} value={razon}>
                      {razon.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(tipo === "LLAMADA" || tipo === "CITA") && (
            <div>
              <label className="text-sm font-medium">Fecha y Hora</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fecha && "text-muted-foreground"
                    )}
                  >
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    {fecha ? format(fecha, "PPP HH:mm", {locale: es}) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(date) => date && setFecha(date)}
                    initialFocus
                  />
                  <div className="p-3 border-t border-border">
                    <TimePicker
                      setDate={(date) => setFecha(date)}
                      date={fecha}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ingresa tus observaciones..."
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createGestion.mutate()}
              disabled={
                loading ||
                !tipo || 
                ((tipo === "CITA" || tipo === "LLAMADA") && !fecha) || 
                !observaciones ||
                ((tipo === "NO_INTERESA" || tipo === "NO_CUMPLE_REQUISITO") && !razonRechazo)
              }
            >
              {loading ? "Guardando..." : initialData ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const formatHistoryDetails = (details: string) => {
  try {
    const data = JSON.parse(details);
    
    if (data.changes && Array.isArray(data.changes)) {
      const changedFields = data.changes.map((field: string) => {
        const previousValue = data.previous[field];
        const newValue = data.new[field];
        return `${field}: ${previousValue || 'No definido'} → ${newValue || 'No definido'}`;
      });
      return changedFields.join('\n');
    }
    
    // Si es una acción de creación o asignación
    if (data.previous && data.new) {
      const changes = [];
      for (const key in data.new) {
        if (data.previous[key] !== data.new[key]) {
          changes.push(`${key}: ${data.previous[key] || 'No definido'} → ${data.new[key] || 'No definido'}`);
        }
      }
      return changes.join('\n');
    }
    
    // Si es otro tipo de detalle, lo mostramos como texto
    return JSON.stringify(data, null, 2);
  } catch (e) {
    // Si no es JSON válido, devolvemos el texto original
    return details;
  }
};

const formatAction = (action: string) => {
  const actionMap: { [key: string]: string } = {
    'LEAD_CREATED': 'Lead Creado',
    'LEAD_UPDATED': 'Lead Actualizado',
    'LEAD_ASSIGNED': 'Lead Asignado',
    'STATUS_CHANGED': 'Estado Cambiado',
    'COMMENT_ADDED': 'Comentario Agregado',
    // Agrega más mappings según necesites
  };
  
  return actionMap[action] || action;
};

const TaskList = () => {
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [userFilter, setUserFilter] = useState<string>("my_tasks");

  const handlePresetChange = (days: number) => {
    const today = new Date();
    if (days === 0) {
      setDateRange({
        from: today,
        to: today
      });
    } else {
      setDateRange({
        from: today,
        to: addDays(today, days)
      });
    }
  };

  // Obtener el usuario actual
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data: userData } = await supabase
        .from("users")
        .select(`
          id,
          email,
          nombre_completo,
          user_position,
          estructuras (
            id,
            tipo,
            nombre,
            custom_name,
            parent_id
          )
        `)
        .eq("id", user.id)
        .single();
      
      return userData;
    },
  });

  // Obtener usuarios para el filtro
  const { data: users } = useQuery({
    queryKey: ["users-for-tasks"],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Si el usuario es CEO, Director Nacional o Internacional, puede ver todos los usuarios
      if (
        currentUser.user_position === USER_ROLES.CEO ||
        currentUser.user_position === USER_ROLES.DIRECTOR_NACIONAL ||
        currentUser.user_position === USER_ROLES.DIRECTOR_INTERNACIONAL
      ) {
        const { data } = await supabase
          .from("users")
          .select("id, nombre_completo")
          .order("nombre_completo");
        return data || [];
      }
      
      // Para otros roles, obtener subordinados
      const { data: subordinateUsers } = await supabase
        .from("users")
        .select("id, nombre_completo, user_position, estructuras!inner(id)")
        .in("user_position", ROLE_HIERARCHY[currentUser.user_position] || [])
        .eq("estructuras.id", currentUser.estructuras?.[0]?.id);
      
      // Incluir al usuario actual en la lista
      return [
        { id: currentUser.id, nombre_completo: currentUser.nombre_completo },
        ...(subordinateUsers || [])
      ];
    },
    enabled: !!currentUser
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", filterTipo, filterEstado, dateRange, userFilter, currentUser],
    queryFn: async () => {
      if (!currentUser) return [];

      let query = supabase
        .from("tareas")
        .select(`
          *,
          leads (nombre_completo, email, telefono),
          users (nombre_completo)
        `);

      // Aplicar filtros de permisos según el rol
      if (userFilter === "my_tasks") {
        // Si se selecciona "Mis Tareas", mostrar solo las tareas del usuario actual
        query = query.eq('user_id', currentUser.id);
      } else if (userFilter !== "all") {
        // Si hay un filtro de usuario específico, lo aplicamos directamente
        query = query.eq('user_id', userFilter);
      } else if (
        currentUser.user_position !== USER_ROLES.CEO && 
        currentUser.user_position !== USER_ROLES.DIRECTOR_NACIONAL && 
        currentUser.user_position !== USER_ROLES.DIRECTOR_INTERNACIONAL
      ) {
        // Para otros roles, necesitamos obtener los usuarios subordinados
        if (currentUser.user_position === USER_ROLES.ASESOR_TRAINING) {
          // Asesor Training solo ve sus propias tareas
          query = query.eq('user_id', currentUser.id);
        } else {
          // Para otros roles, necesitamos obtener los usuarios subordinados
          const { data: subordinateUsers } = await supabase
            .from("users")
            .select("id, user_position, estructuras!inner(id)")
            .in("user_position", ROLE_HIERARCHY[currentUser.user_position] || [])
            .eq("estructuras.id", currentUser.estructuras?.[0]?.id);

          const subordinateIds = subordinateUsers?.map(u => u.id) || [];
          if (subordinateIds.length > 0) {
            query = query.in('user_id', [currentUser.id, ...subordinateIds]);
          } else {
            query = query.eq('user_id', currentUser.id);
          }
        }
      }

      // Aplicar filtros de búsqueda
      if (filterTipo !== "all") {
        query = query.eq('tipo', filterTipo);
      }
      if (filterEstado !== "all") {
        query = query.eq('estado', filterEstado);
      }
      if (dateRange?.from) {
        query = query.gte('fecha', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('fecha', dateRange.to.toISOString());
      }

      const { data, error } = await query.order('fecha', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser
  });

  // Verificar si el usuario puede ver o editar una tarea específica
  const canManageTask = (taskUserId: string) => {
    if (!currentUser) return false;
    
    // Roles superiores pueden gestionar todas las tareas
    if (
      currentUser.user_position === USER_ROLES.CEO ||
      currentUser.user_position === USER_ROLES.DIRECTOR_NACIONAL ||
      currentUser.user_position === USER_ROLES.DIRECTOR_INTERNACIONAL
    ) {
      return true;
    }
    
    // Los usuarios pueden gestionar sus propias tareas
    if (taskUserId === currentUser.id) {
      return true;
    }
    
    // Para otros roles, verificar jerarquía
    if (currentUser.user_position === USER_ROLES.ASESOR_TRAINING) {
      return false; // Asesores training solo pueden ver sus propias tareas
    }
    
    // Verificar subordinación para otros roles
    return ROLE_HIERARCHY[currentUser.user_position]?.length > 0;
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Listado de Tareas y Gestiones</h2>
        <div className="flex gap-2">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my_tasks">Mis Tareas</SelectItem>
              {(currentUser?.user_position === USER_ROLES.CEO || 
                currentUser?.user_position === USER_ROLES.DIRECTOR_NACIONAL || 
                currentUser?.user_position === USER_ROLES.DIRECTOR_INTERNACIONAL) && (
                <SelectItem value="all">Todas las Tareas</SelectItem>
              )}
              {users?.map((user) => (
                user.id !== currentUser?.id && (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nombre_completo}
                  </SelectItem>
                )
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de tarea" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {MANAGEMENT_TYPES.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIconLucide className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                <div className="border-r pr-2 py-3">
                  <div className="px-2 font-medium text-sm mb-2">Rangos rápidos</div>
                  <div className="w-[140px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-normal hover:bg-primary/5"
                      onClick={() => {
                        handlePresetChange(0);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Hoy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-normal hover:bg-primary/5"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setDateRange({
                          from: yesterday,
                          to: yesterday
                        });
                        setIsCalendarOpen(false);
                      }}
                    >
                      Ayer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-normal hover:bg-primary/5"
                      onClick={() => {
                        handlePresetChange(7);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Próximos 7 días
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-normal hover:bg-primary/5"
                      onClick={() => {
                        handlePresetChange(30);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Próximos 30 días
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-normal hover:bg-primary/5"
                      onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        setDateRange({
                          from: firstDay,
                          to: lastDay
                        });
                        setIsCalendarOpen(false);
                      }}
                    >
                      Este mes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-normal hover:bg-primary/5"
                      onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                        setDateRange({
                          from: firstDay,
                          to: lastDay
                        });
                        setIsCalendarOpen(false);
                      }}
                    >
                      Mes anterior
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    showOutsideDays={false}
                    className="rdp-custom [&_.rdp-day]:h-8 [&_.rdp-day]:w-8 [&_.rdp-day]:text-sm [&_.rdp-head_th]:text-xs [&_.rdp-head_th]:font-normal [&_.rdp-caption]:text-sm [&_.rdp-table]:border-separate [&_.rdp-table]:border-spacing-1 [&_.rdp-cell]:border-0 [&_.rdp-cell]:p-0 [&_.rdp-button]:w-8 [&_.rdp-button]:h-8 [&_.rdp-button]:p-0"
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDateRange(undefined);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsCalendarOpen(false);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{task.leads?.nombre_completo}</p>
                    <p className="text-sm text-muted-foreground">{task.leads?.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    task.tipo === "LLAMADA" && "bg-blue-100 text-blue-800",
                    task.tipo === "CITA" && "bg-yellow-100 text-yellow-800",
                    task.tipo === "EMAIL" && "bg-yellow-100 text-yellow-800",
                    task.tipo === "RECHAZO" && "bg-red-100 text-red-800"
                  )}>
                    {task.tipo}
                  </div>
                </TableCell>
                <TableCell>{task.users?.nombre_completo}</TableCell>
                <TableCell>{task.fecha ? format(new Date(task.fecha), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
                <TableCell>
                  <p className="max-w-[300px] truncate" title={task.observaciones}>
                    {task.observaciones || "-"}
                  </p>
                </TableCell>
                <TableCell>
                  {canManageTask(task.user_id) ? (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowGestionModal(true);
                        }}
                      >
                        Gestión
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowGestionModal(true);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowGestionModal(true);
                      }}
                      disabled={!canManageTask(task.user_id)}
                    >
                      Ver
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedTask && (
        <GestionModal
          lead={selectedTask.leads}
          isOpen={showGestionModal}
          onClose={() => {
            setShowGestionModal(false);
            setSelectedTask(null);
          }}
          initialData={selectedTask}
        />
      )}
    </Card>
  );
};

const Dashboard = () => {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const queryClient = useQueryClient();

  // Obtener el usuario actual
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data: userData } = await supabase
        .from("users")
        .select(`
          id,
          email,
          nombre_completo,
          user_position,
          estructuras (
            id,
            tipo,
            nombre,
            custom_name,
            parent_id
          )
        `)
        .eq("id", user.id)
        .single();
      
      return userData;
    },
  });

  // Función para obtener los IDs de usuarios que el usuario actual puede ver
  const getUserIdsForQueries = async () => {
    if (!currentUser) return [];

    // CAMBIO: Para las métricas del dashboard, siempre retornamos solo el ID del usuario actual
    return [currentUser.id];
  };

  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics", currentUser],
    queryFn: async () => {
      if (!currentUser) return [];

      const userIds = await getUserIdsForQueries();

      // Función helper para aplicar filtros de usuario a las consultas
      const applyUserFilter = (query: any) => {
        if (userIds === null) {
          // No aplicar filtro (ver todos)
          return query;
        } else if (userIds.length === 1) {
          // Un solo usuario
          return query.eq('asignado_a', userIds[0]);
        } else {
          // Múltiples usuarios
          return query.in('asignado_a', userIds);
        }
      };

      // Leads Asignados
      let assignedQuery = supabase
        .from("leads")
        .select("*", { count: "exact" });
      assignedQuery = applyUserFilter(assignedQuery);
      const { data: assigned } = await assignedQuery;

      // Por Evacuar (SIN_LLAMAR)
      let pendingQuery = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "SIN_LLAMAR");
      pendingQuery = applyUserFilter(pendingQuery);
      const { data: pending } = await pendingQuery;

      // Citas Programadas
      let scheduledQuery = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "CITA_PROGRAMADA");
      scheduledQuery = applyUserFilter(scheduledQuery);
      const { data: scheduled } = await scheduledQuery;

      // Matrículas
      let enrolledQuery = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "MATRICULA");
      enrolledQuery = applyUserFilter(enrolledQuery);
      const { data: enrolled } = await enrolledQuery;

      return [
        {
          title: "Leads Asignados",
          value: assigned?.length || 0,
          icon: Users,
        },
        {
          title: "Por Evacuar",
          value: pending?.length || 0,
          icon: CalendarCheck2,
        },
        {
          title: "Citas Programadas",
          value: scheduled?.length || 0,
          icon: CalendarIcon,
        },
        {
          title: "Matrículas",
          value: enrolled?.length || 0,
          icon: GraduationCap,
        },
      ];
    },
    enabled: !!currentUser
  });

  const { data: leads } = useQuery({
    queryKey: ["leads", currentUser],
    queryFn: async () => {
      if (!currentUser) return [];

      const userIds = await getUserIdsForQueries();

      let query = supabase
        .from("leads")
        .select(`
          *,
          users (nombre_completo)
        `);

      // Aplicar filtros de usuario
      if (userIds === null) {
        // No aplicar filtro (ver todos)
      } else if (userIds.length === 1) {
        // Un solo usuario
        query = query.eq('asignado_a', userIds[0]);
      } else {
        // Múltiples usuarios
        query = query.in('asignado_a', userIds);
      }

      const { data } = await query.order('created_at', { ascending: false });
      return data;
    },
    enabled: !!currentUser
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: number, newStatus: LeadEstado }) => {
      const { data: lead } = await supabase
        .from("leads")
        .select()
        .eq("id", leadId)
        .single();

      const { error } = await supabase
        .from("leads")
        .update({ estado: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      await supabase.from("lead_history").insert({
        lead_id: leadId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "CAMBIO_ESTADO",
        details: JSON.stringify({
          estado_anterior: lead.estado,
          nuevo_estado: newStatus
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Estado actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el estado");
      console.error("Error updating lead status:", error);
    }
  });

  const handleSelectLead = (leadId: number, selected: boolean) => {
    if (selected) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!leads) return;
    
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <Topbar 
        onEditLead={(lead) => {
          setSelectedLead(lead);
          setShowEditModal(true);
        }}
        onGestionLead={(lead) => {
          setSelectedLead(lead);
          setShowGestionModal(true);
        }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics?.map((metric) => (
          <Card key={metric.title} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{metric.value}</h3>
              </div>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      {/* Mensaje informativo sobre el botón ESTOY EN CITA */}
      <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50">
        <div className="flex items-start gap-3">
          <CalendarIconLucide className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-800">Recordatorio importante</h3>
            <p className="text-sm text-blue-700 mt-1">
              Cuando ingreses en Cita o Llamada, por favor activar el botón <span className="font-bold">ESTOY EN CITA</span> en la barra lateral, al finalizar, recordar desactivarlo.
            </p>
          </div>
        </div>
      </Card>

      <TaskList />

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Leads Recientes</h2>
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedLeads.length} leads seleccionados
              </span>
              <Button 
                variant="default"
                onClick={() => setShowModifyDialog(true)}
              >
                Modificar Leads
              </Button>
            </div>
          )}
        </div>

        <LeadsTable 
          showCheckboxes={true}
          selectedLeads={selectedLeads}
          onSelectLead={handleSelectLead}
          onEdit={(lead) => {
            setSelectedLead(lead);
            setShowEditModal(true);
          }}
          onGestion={(lead) => {
            setSelectedLead(lead);
            setShowGestionModal(true);
          }}
          onHistorial={(lead) => {
            setSelectedLead(lead);
            setShowHistorialSheet(true);
          }}
        />
      </Card>

      {selectedLead && (
        <>
          <LeadEditModal
            lead={selectedLead}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedLead(null);
            }}
          />
          <GestionModal
            lead={selectedLead}
            isOpen={showGestionModal}
            onClose={() => {
              setShowGestionModal(false);
              setSelectedLead(null);
            }}
            initialData={selectedLead}
          />
          <LeadHistorialSheet
            lead={selectedLead}
            isOpen={showHistorialSheet}
            onClose={() => {
              setShowHistorialSheet(false);
              setSelectedLead(null);
            }}
          />
        </>
      )}

      <ModifyLeadsDialog
        isOpen={showModifyDialog}
        onClose={() => setShowModifyDialog(false)}
        selectedLeads={selectedLeads}
      />
    </div>
  );
};

export default Dashboard;
