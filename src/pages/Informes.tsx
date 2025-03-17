import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon, Users, FileText, Phone, Calendar as CalendarIcon2, LineChart, BarChart2, GraduationCap, ClipboardList, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { exportToExcel } from "@/lib/export";
import { ReportsService } from '@/services/reports';
import { useToast } from '@/components/ui/use-toast';

interface DateRange {
  from: Date;
  to: Date;
}

interface User {
  id: string;
  nombre_completo: string;
  email: string;
  role: string;
  estructura_id: string;
  is_active: boolean;
  user_position: string;
}

interface Estructura {
  id: string;
  nombre: string;
  tipo: string;
  custom_name: string;
  parent_id: string;
}

const reports = [
  {
    id: "dotacion",
    title: "Dotación de Personal",
    description: "Informe de colaboradores activos en tiempo real",
    icon: Users,
  },
  {
    id: "inactivos",
    title: "Colaboradores Inactivos",
    description: "Informe de colaboradores que han dejado la empresa",
    icon: FileText,
  },
  {
    id: "llamados",
    title: "Llamados Futuros",
    description: "Llamadas pendientes programadas",
    icon: Phone,
  },
  {
    id: "citas",
    title: "Citas",
    description: "Citas agendadas y resultados",
    icon: CalendarIcon2,
  },
  {
    id: "efectividad-citas",
    title: "Efectividad de Citas",
    description: "Relación entre citas programadas y efectivas",
    icon: LineChart,
  },
  {
    id: "gestion-datos",
    title: "Gestión de Datos",
    description: "Gestión efectiva de datos en CRM",
    icon: BarChart2,
  },
  {
    id: "matriculas",
    title: "Matrículas",
    description: "Efectividad en matrículas vs citas",
    icon: GraduationCap,
  },
  {
    id: "productividad",
    title: "Productividad",
    description: "Datos trabajados por colaborador",
    icon: ClipboardList,
  },
  {
    id: "tiempo-real",
    title: "Tiempo Real en CRM",
    description: "Actividad actual de colaboradores",
    icon: Clock,
  },
];

const Informes = () => {
  const [date, setDate] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [selectedStructure, setSelectedStructure] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportColumns, setReportColumns] = useState<any[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<string>("");
  const { toast } = useToast();

  // Consultas para obtener usuarios y estructuras
  const { data: estructuras } = useQuery<Estructura[]>({
    queryKey: ["estructuras"],
    queryFn: async () => {
      const response = await fetch("/api/estructuras");
      return response.json();
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      return response.json();
    },
  });

  const handleGenerateReport = async (reportId: string) => {
    try {
      let data;
      let columns;

      switch (reportId) {
        case "dotacion":
          data = await ReportsService.getDotacionPersonal({
            estructuraId: selectedStructure,
            userId: selectedUser
          });
          columns = [
            { key: "nombre_completo", label: "Nombre" },
            { key: "user_position", label: "Cargo" },
            { key: "estructura", label: "Estructura" },
            { key: "is_active", label: "Estado" },
          ];
          break;

        case "inactivos":
          data = await ReportsService.getInactivosReport({
            estructuraId: selectedStructure
          });
          columns = [
            { key: "nombre_completo", label: "Nombre" },
            { key: "email", label: "Email" },
            { key: "cargo", label: "Cargo" },
            { key: "estructura", label: "Estructura" }
          ];
          break;

        case "llamados":
          data = await ReportsService.getLlamadosFuturos({
            dateFrom: date.from.toISOString(),
            dateTo: date.to.toISOString(),
            estructuraId: selectedStructure,
            userId: selectedUser
          });
          columns = [
            { key: "fecha", label: "Fecha" },
            { key: "hora", label: "Hora" },
            { key: "ejecutivo", label: "Ejecutivo" },
            { key: "contacto", label: "Contacto" },
            { key: "telefono", label: "Teléfono" },
            { key: "estado", label: "Estado" }
          ];
          break;

        case "tiempo-real":
          data = await ReportsService.getTiempoReal();
          columns = [
            { key: "nombre_completo", label: "Nombre" },
            { key: "estructura", label: "Estructura" },
            { key: "estado", label: "Estado" },
            { key: "tiempo_activo", label: "Tiempo Activo" },
            { key: "ultima_actividad", label: "Última Actividad" }
          ];
          break;

        // ... implementar otros casos según sea necesario
      }

      if (data) {
        setReportData(data);
        setReportColumns(columns || []);
        setCurrentReport(reportId);
        setIsReportOpen(true);
      }
    } catch (error) {
      console.error("Error al generar el informe:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el informe. Por favor, intente nuevamente."
      });
    }
  };

  const handleExport = () => {
    const fileName = `informe_${currentReport}_${format(date.from, "dd-MM-yyyy")}`;
    exportToExcel(reportData, fileName);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Informes</h1>
          
          <div className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !date.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date.from ? (
                    format(date.from, "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span>Desde</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date.from}
                  onSelect={(newDate) =>
                    newDate && setDate((prev) => ({ ...prev, from: newDate }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !date.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date.to ? (
                    format(date.to, "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span>Hasta</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date.to}
                  onSelect={(newDate) =>
                    newDate && setDate((prev) => ({ ...prev, to: newDate }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedStructure} onValueChange={setSelectedStructure}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar estructura" />
              </SelectTrigger>
              <SelectContent>
                {estructuras?.map((estructura) => (
                  <SelectItem key={estructura.id} value={estructura.id}>
                    {estructura.custom_name || estructura.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users?.filter(user => user.is_active).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nombre_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card
                key={report.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleGenerateReport(report.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title={reports.find(r => r.id === currentReport)?.title || ""}
        data={reportData}
        columns={reportColumns}
        onExport={handleExport}
      />
    </>
  );
};

export default Informes;
