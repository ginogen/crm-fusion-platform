import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIconLucide } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MANAGEMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";

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

export default TaskList;
