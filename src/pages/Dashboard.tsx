import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarCheck2, Users, Calendar as CalendarIcon, GraduationCap, Eye, ClipboardList, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { LEAD_STATUSES, MANAGEMENT_TYPES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  CalendarIcon as CalendarIconLucide,
  Filter
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

const CALENDAR_VIEWS = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day"
} as const;

type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];
type LeadEstado = typeof LEAD_STATUSES[number];
type TipoGestion = typeof MANAGEMENT_TYPES[number];

const LeadEditModal = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const [formData, setFormData] = useState(lead);
  const queryClient = useQueryClient();

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogDescription>
            Modifica la información del lead
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre Completo</label>
            <Input
              value={formData.nombre_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre_completo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Teléfono</label>
            <Input
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <Textarea
              value={formData.observaciones || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => updateLead.mutate(formData)}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GestionModal = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const [tipo, setTipo] = useState<TipoGestion | "">("");
  const [fecha, setFecha] = useState<Date>();
  const [observaciones, setObservaciones] = useState("");
  const queryClient = useQueryClient();

  const createGestion = useMutation({
    mutationFn: async () => {
      const { error: taskError } = await supabase
        .from("tareas")
        .insert({
          lead_id: lead.id,
          tipo,
          fecha: fecha?.toISOString(),
          observaciones,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (taskError) throw taskError;

      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: tipo,
        details: JSON.stringify({ fecha, observaciones })
      });

      if (tipo === "CITA") {
        await supabase
          .from("leads")
          .update({ estado: "CITA_PROGRAMADA" })
          .eq("id", lead.id);
      }
    },
    onSuccess: () => {
      toast.success("Gestión registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (error) => {
      toast.error("Error al registrar la gestión");
      console.error("Error creating gestion:", error);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Gestión</DialogTitle>
          <DialogDescription>
            Registra una nueva gestión para {lead.nombre_completo}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo de Gestión</label>
            <Select value={tipo} onValueChange={(value: TipoGestion) => setTipo(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MANAGEMENT_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(tipo === "CITA" || tipo === "LLAMADA") && (
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <div className="mt-1">
                <Calendar
                  mode="single"
                  selected={fecha}
                  onSelect={setFecha}
                  className="rounded-md border"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ingrese las observaciones..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createGestion.mutate()}
              disabled={!tipo || ((tipo === "CITA" || tipo === "LLAMADA") && !fecha) || !observaciones}
            >
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LeadHistorialSheet = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const { data: historial } = useQuery({
    queryKey: ["lead-history", lead?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_history")
        .select(`
          *,
          users (nombre_completo)
        `)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!lead?.id
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Historial del Lead</SheetTitle>
          <SheetDescription>
            Información completa y acciones realizadas
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Información del Lead</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Nombre:</span> {lead?.nombre_completo}</p>
              <p><span className="font-medium">Email:</span> {lead?.email}</p>
              <p><span className="font-medium">Teléfono:</span> {lead?.telefono}</p>
              <p><span className="font-medium">Estado:</span> {lead?.estado}</p>
              <p><span className="font-medium">Asignado a:</span> {lead?.users?.nombre_completo}</p>
              <p><span className="font-medium">Fecha de creación:</span> {format(new Date(lead?.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Historial de Acciones</h3>
            <div className="space-y-4">
              {historial?.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.action}</p>
                      <p className="text-sm text-muted-foreground">
                        Por: {item.users?.nombre_completo}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  {item.details && (
                    <p className="text-sm whitespace-pre-wrap">
                      {typeof item.details === 'string' ? item.details : JSON.stringify(item.details, null, 2)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const TaskList = () => {
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

  const { data: tasks } = useQuery({
    queryKey: ["tasks", filterTipo, filterEstado, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("tareas")
        .select(`
          *,
          leads (nombre_completo, email, telefono),
          users (nombre_completo)
        `);

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

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Listado de Tareas</h2>
        <div className="flex gap-2">
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

          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="COMPLETADA">Completada</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
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
              <TableHead>Estado</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Observaciones</TableHead>
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
                    task.tipo === "CITA" && "bg-purple-100 text-purple-800",
                    task.tipo === "EMAIL" && "bg-yellow-100 text-yellow-800"
                  )}>
                    {task.tipo}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    task.estado === "PENDIENTE" && "bg-yellow-100 text-yellow-800",
                    task.estado === "COMPLETADA" && "bg-green-100 text-green-800",
                    task.estado === "CANCELADA" && "bg-red-100 text-red-800"
                  )}>
                    {task.estado}
                  </div>
                </TableCell>
                <TableCell>{task.users?.nombre_completo}</TableCell>
                <TableCell>{task.fecha ? format(new Date(task.fecha), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
                <TableCell>
                  <p className="max-w-[300px] truncate" title={task.observaciones}>
                    {task.observaciones || "-"}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>(CALENDAR_VIEWS.MONTH);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const { data: assigned } = await supabase
        .from("leads")
        .select("*", { count: "exact" });

      const { data: pending } = await supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "SIN_LLAMAR");

      const { data: scheduled } = await supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "CITA_PROGRAMADA");

      const { data: enrolled } = await supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "MATRICULA");

      return [
        {
          title: "Leads Asignados",
          value: assigned?.length || 0,
          icon: Users,
          trend: "+12%",
        },
        {
          title: "Por Evacuar",
          value: pending?.length || 0,
          icon: CalendarCheck2,
          trend: "-5%",
        },
        {
          title: "Citas Programadas",
          value: scheduled?.length || 0,
          icon: CalendarIcon,
          trend: "+8%",
        },
        {
          title: "Matrículas",
          value: enrolled?.length || 0,
          icon: GraduationCap,
          trend: "+15%",
        },
      ];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select(`
          *,
          users (nombre_completo)
        `);
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("tareas")
        .select(`
          *,
          leads (nombre_completo, email, telefono),
          users (nombre_completo)
        `)
        .gte("fecha", selectedDate?.toISOString() || "")
        .lte("fecha", selectedDate?.toISOString() || "");

      return data;
    },
  });

  const getFilteredTasks = () => {
    if (!tasks) return [];
    
    const today = new Date(selectedDate || new Date());
    
    switch (calendarView) {
      case CALENDAR_VIEWS.DAY:
        return tasks.filter(task => {
          const taskDate = new Date(task.fecha);
          return taskDate.toDateString() === today.toDateString();
        });
      
      case CALENDAR_VIEWS.WEEK:
        const weekStart = startOfWeek(today);
        const weekEnd = addDays(weekStart, 7);
        return tasks.filter(task => {
          const taskDate = new Date(task.fecha);
          return taskDate >= weekStart && taskDate < weekEnd;
        });
      
      default:
        return tasks;
    }
  };

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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics?.map((metric) => (
          <Card key={metric.title} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{metric.value}</h3>
                <p
                  className={`text-sm mt-1 ${
                    metric.trend.startsWith("+")
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {metric.trend} vs prev. month
                </p>
              </div>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Calendario de Tareas</h2>
          <div className="flex gap-2">
            <Button 
              variant={calendarView === CALENDAR_VIEWS.MONTH ? "default" : "outline"} 
              size="sm"
              onClick={() => setCalendarView(CALENDAR_VIEWS.MONTH)}
            >
              Mes
            </Button>
            <Button 
              variant={calendarView === CALENDAR_VIEWS.WEEK ? "default" : "outline"} 
              size="sm"
              onClick={() => setCalendarView(CALENDAR_VIEWS.WEEK)}
            >
              Semana
            </Button>
            <Button 
              variant={calendarView === CALENDAR_VIEWS.DAY ? "default" : "outline"} 
              size="sm"
              onClick={() => setCalendarView(CALENDAR_VIEWS.DAY)}
            >
              Día
            </Button>
          </div>
        </div>
        <div className="relative">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            view={calendarView}
            tasks={getFilteredTasks()}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-6">Leads Recientes</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Estado</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIN_LLAMAR">Sin Llamar</SelectItem>
                  <SelectItem value="LLAMAR_DESPUES">Llamar Después</SelectItem>
                  <SelectItem value="CITA_PROGRAMADA">Cita Programada</SelectItem>
                  <SelectItem value="MATRICULA">Matrícula</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Asignado A</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Buscar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user1">Usuario 1</SelectItem>
                  <SelectItem value="user2">Usuario 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignado A</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell>{lead.nombre_completo}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.telefono}</TableCell>
                    <TableCell>
                      <Select
                        value={lead.estado}
                        onValueChange={(value: LeadEstado) => {
                          updateLeadStatus.mutate({ leadId: lead.id, newStatus: value });
                        }}
                      >
                        <SelectTrigger 
                          className={cn(
                            "w-[180px]",
                            lead.estado === "SIN_LLAMAR" && "bg-white",
                            lead.estado === "LLAMAR_DESPUES" && "bg-blue-100",
                            lead.estado === "CITA_PROGRAMADA" && "bg-yellow-100",
                            lead.estado === "MATRICULA" && "bg-green-100",
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((estado) => (
                            <SelectItem 
                              key={estado} 
                              value={estado}
                              className={cn(
                                estado === "SIN_LLAMAR" && "bg-white",
                                estado === "LLAMAR_DESPUES" && "bg-blue-100",
                                estado === "CITA_PROGRAMADA" && "bg-yellow-100",
                                estado === "MATRICULA" && "bg-green-100",
                              )}
                            >
                              {LEAD_STATUS_LABELS[estado]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{lead.users?.nombre_completo}</TableCell>
                    <TableCell>{format(new Date(lead.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowEditModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowGestionModal(true);
                          }}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowHistorialSheet(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <TaskList />

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
    </div>
  );
};

export default Dashboard;
