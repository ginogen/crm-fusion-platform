
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

interface DateRange {
  from: Date;
  to: Date;
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

  const handleGenerateReport = (reportId: string) => {
    console.log("Generando informe:", reportId, date);
    // Aquí se implementará la lógica para generar cada tipo de informe
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Informes</h1>
        <div className="flex gap-4">
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
  );
};

export default Informes;
