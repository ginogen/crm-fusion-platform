
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Users, CalendarCheck2, Calendar as CalendarIcon, GraduationCap, ClipboardList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MANAGEMENT_TYPES } from "@/lib/constants";

interface Task {
  id: number;
  tipo: string;
  fecha: string;
  observaciones: string;
  leads: {
    nombre_completo: string;
  };
}

const EditTaskDialog = ({ task, isOpen, onClose }: { task: Task | null; isOpen: boolean; onClose: () => void }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(task?.fecha ? new Date(task.fecha) : undefined);
  const queryClient = useQueryClient();

  const updateTask = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !task) return;

      const { error } = await supabase
        .from("tareas")
        .update({ fecha: selectedDate.toISOString() })
        .eq("id", task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarea actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (error) => {
      toast.error("Error al actualizar la tarea");
      console.error("Error updating task:", error);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nueva Fecha</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border mt-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => updateTask.mutate()} disabled={!selectedDate}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Dashboard = () => {
  const [selectedTaskType, setSelectedTaskType] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const { data: tasks } = useQuery({
    queryKey: ["tasks", selectedTaskType],
    queryFn: async () => {
      let query = supabase
        .from("tareas")
        .select(`
          *,
          leads (
            nombre_completo
          )
        `)
        .order('fecha', { ascending: true });

      if (selectedTaskType) {
        query = query.eq('tipo', selectedTaskType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Task[];
    },
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Listado de Tareas</h2>
          <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {MANAGEMENT_TYPES.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.leads?.nombre_completo}</TableCell>
                  <TableCell>{task.tipo}</TableCell>
                  <TableCell>{format(new Date(task.fecha), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{task.observaciones}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowEditDialog(true);
                      }}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <EditTaskDialog
        task={selectedTask}
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};

export default Dashboard;
