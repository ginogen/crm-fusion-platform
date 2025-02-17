
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CalendarCheck2,
  Users,
  Calendar as CalendarIcon,
  GraduationCap,
  Eye,
  ClipboardList,
  History,
  Pencil,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, startOfWeek } from "date-fns";

const CALENDAR_VIEWS = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day",
} as const;

type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>(CALENDAR_VIEWS.MONTH);

  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const { data: assigned } = await supabase
        .from("leads")
        .select("*", { count: "exact" });

      const { data: pending } = await supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "SIN LLAMAR");

      const { data: scheduled } = await supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("estado", "CITA PROGRAMADA");

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metrics */}
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

      {/* Calendar */}
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

      {/* Leads Table */}
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
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${lead.estado === 'LLAMAR_DESPUES' ? 'bg-blue-100 text-blue-800' :
                          lead.estado === 'CITA_PROGRAMADA' ? 'bg-yellow-100 text-yellow-800' :
                          lead.estado === 'MATRICULA' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {lead.estado}
                      </div>
                    </TableCell>
                    <TableCell>{lead.users?.nombre_completo}</TableCell>
                    <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button className="text-gray-600 hover:text-gray-900">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <ClipboardList className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Lead Details Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detalles del Lead</SheetTitle>
            <SheetDescription>
              Información completa y acciones disponibles
            </SheetDescription>
          </SheetHeader>
          {selectedLead && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nombre Completo</label>
                  <Input
                    value={selectedLead.nombre_completo}
                    readOnly
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={selectedLead.email} readOnly className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input value={selectedLead.telefono} readOnly className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Origen</label>
                  <Input value={selectedLead.origen} readOnly className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">País</label>
                  <Input value={selectedLead.pais} readOnly className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Filial</label>
                  <Input value={selectedLead.filial} readOnly className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Observaciones</label>
                  <Textarea
                    value={selectedLead.observaciones}
                    readOnly
                    className="mt-1"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Acciones</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline">
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Gestión
                  </Button>
                  <Button variant="outline">
                    <History className="h-4 w-4 mr-1" />
                    Historial
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Dashboard;
