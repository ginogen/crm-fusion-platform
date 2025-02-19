import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pencil, ClipboardList, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadEstado } from "@/lib/types";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addDays } from "date-fns";

interface LeadsTableProps {
  onEdit?: (lead: any) => void;
  onGestion?: (lead: any) => void;
  onHistorial?: (lead: any) => void;
  showCheckboxes?: boolean;
  selectedLeads?: number[];
  onSelectLead?: (leadId: number, selected: boolean) => void;
}

const LeadsTable = ({ 
  onEdit, 
  onGestion, 
  onHistorial,
  showCheckboxes = false,
  selectedLeads = [],
  onSelectLead
}: LeadsTableProps) => {
  const queryClient = useQueryClient();
  const [allSelected, setAllSelected] = useState(false);
  const [filters, setFilters] = useState({
    nombre: "",
    email: "",
    estado: "all",
    asignado: "all",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, nombre_completo");
      return data || [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["leads", filters, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select(`
          *,
          users (nombre_completo)
        `);

      // Aplicar filtros
      if (filters.nombre) {
        query = query.ilike('nombre_completo', `%${filters.nombre}%`);
      }
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters.estado !== "all") {
        query = query.eq('estado', filters.estado);
      }
      if (filters.asignado !== "all") {
        query = query.eq('user_id', filters.asignado);
      }
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data } = await query;
      return data;
    },
  });

  useEffect(() => {
    if (leads?.length && leads.length > 0) {
      const allLeadsSelected = leads.every(lead => selectedLeads.includes(lead.id));
      setAllSelected(allLeadsSelected);
    }
  }, [selectedLeads, leads]);

  const handleSelectAll = (checked: boolean) => {
    if (!leads) return;
    
    const leadIds = leads.map(lead => lead.id);
    if (checked) {
      // Seleccionar todos los leads que no estén ya seleccionados
      leadIds.forEach(id => {
        if (!selectedLeads.includes(id)) {
          onSelectLead?.(id, true);
        }
      });
    } else {
      // Deseleccionar todos los leads
      leadIds.forEach(id => {
        if (selectedLeads.includes(id)) {
          onSelectLead?.(id, false);
        }
      });
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="text-sm text-muted-foreground">Nombre</label>
          <Input
            placeholder="Buscar por nombre..."
            value={filters.nombre}
            onChange={(e) => setFilters(prev => ({ ...prev, nombre: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <Input
            placeholder="Buscar por email..."
            value={filters.email}
            onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Estado</label>
          <Select
            value={filters.estado}
            onValueChange={(value) => setFilters(prev => ({ ...prev, estado: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {LEAD_STATUSES.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {LEAD_STATUS_LABELS[estado]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Asignado a</label>
          <Select
            value={filters.asignado}
            onValueChange={(value) => setFilters(prev => ({ ...prev, asignado: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los usuarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nombre_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Fecha</label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
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
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="border-r p-2">
                  <div className="px-2 font-medium text-sm mb-2">Rangos rápidos</div>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        setDateRange(undefined);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
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
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        handlePresetChange(7);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Últimos 7 días
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        handlePresetChange(30);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Últimos 30 días
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.to) {
                        setIsCalendarOpen(false);
                      }
                    }}
                  />
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
              {showCheckboxes && (
                <TableHead className="w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
              )}
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
                {showCheckboxes && (
                  <TableCell>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => onSelectLead?.(lead.id, e.target.checked)}
                    />
                  </TableCell>
                )}
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
                      onClick={() => onEdit?.(lead)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onGestion?.(lead)}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onHistorial?.(lead)}
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
  );
};

export default LeadsTable;
