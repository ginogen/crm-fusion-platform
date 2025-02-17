
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
  CalendarCheck2,
  Users,
  Calendar as CalendarIcon,
  GraduationCap,
  Eye,
  ClipboardList,
  History,
} from "lucide-react";
import { LEAD_STATUSES, MANAGEMENT_TYPES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Fetch metrics
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

  // Fetch leads by status
  const { data: leadsByStatus } = useQuery({
    queryKey: ["leads-by-status"],
    queryFn: async () => {
      const { data: leads } = await supabase
        .from("leads")
        .select(`
          *,
          users (nombre_completo)
        `);

      return LEAD_STATUSES.map((status) => ({
        status,
        leads: leads?.filter((lead) => lead.estado === status) || [],
      }));
    },
  });

  // Fetch tasks for calendar
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
        <h2 className="text-lg font-semibold mb-4">Calendario de Tareas</h2>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
        {tasks && tasks.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-medium">Tareas para {selectedDate?.toLocaleDateString()}</h3>
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{task.leads.nombre_completo}</p>
                      <p className="text-sm text-muted-foreground">{task.tipo}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.fecha).toLocaleTimeString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Leads by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {leadsByStatus?.map(({ status, leads }) => (
          <Card key={status} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{status}</h3>
              <span className="text-sm text-muted-foreground">
                {leads.length} leads
              </span>
            </div>
            <div className="space-y-2">
              {leads.map((lead) => (
                <Card key={lead.id} className="p-3">
                  <p className="font-medium">{lead.nombre_completo}</p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>

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
