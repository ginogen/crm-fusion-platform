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
import { LEAD_STATUSES, LEAD_STATUS_LABELS, USER_ROLES, ROLE_HIERARCHY } from "@/lib/constants";
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
    telefono: "",
    origen: "all",
    estado: "all",
    asignado: "my_leads",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, nombre_completo");
      return data || [];
    },
  });

  const { data: origenes } = useQuery({
    queryKey: ["lead-origenes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("origen")
        .not("origen", "is", null)
        .order("origen");
      
      // Eliminar duplicados y valores nulos
      const uniqueOrigenes = [...new Set(data?.map(d => d.origen).filter(Boolean))];
      return uniqueOrigenes || [];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
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

  useEffect(() => {
    console.log('Current filters:', filters);
    console.log('Current user:', currentUser);
  }, [filters, currentUser]);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", filters, dateRange, currentPage, itemsPerPage, currentUser],
    queryFn: async () => {
      if (!currentUser) return { leads: [], totalCount: 0 };

      console.log('Building query with filters:', filters);
      console.log('Current page:', currentPage);
      console.log('Items per page:', itemsPerPage);

      let baseQuery = supabase
        .from("leads")
        .select(`
          *,
          users (
            id,
            nombre_completo,
            user_position,
            estructuras (
              id,
              tipo,
              nombre,
              custom_name,
              parent_id
            )
          )
        `, { count: 'exact' });

      console.log('Initial query built');

      // Aplicar filtros de permisos según el rol
      if (filters.asignado === "my_leads") {
        // Si se selecciona "Mis Leads", mostrar solo los leads asignados al usuario actual
        baseQuery = baseQuery.eq('asignado_a', currentUser.id);
      } else if (filters.asignado !== "all") {
        // Si hay un filtro de usuario específico, lo aplicamos directamente
        console.log('Applying specific user filter:', filters.asignado);
        baseQuery = baseQuery.eq('asignado_a', filters.asignado);
      } else if (currentUser.user_position !== USER_ROLES.CEO && 
          currentUser.user_position !== USER_ROLES.DIRECTOR_NACIONAL && 
          currentUser.user_position !== USER_ROLES.DIRECTOR_INTERNACIONAL) {
        
        console.log('Applying role-based filters for position:', currentUser.user_position);
        
        if (currentUser.user_position === USER_ROLES.ASESOR_TRAINING) {
          // Asesor Training solo ve sus propios leads
          baseQuery = baseQuery.eq('asignado_a', currentUser.id);
          console.log('Filtered for ASESOR_TRAINING with ID:', currentUser.id);
        } else {
          // Para otros roles, necesitamos obtener los usuarios subordinados
          const { data: subordinateUsers } = await supabase
            .from("users")
            .select("id, user_position, estructuras!inner(id)")
            .in("user_position", ROLE_HIERARCHY[currentUser.user_position] || [])
            .eq("estructuras.id", currentUser.estructuras?.[0]?.id);

          console.log('Found subordinate users:', subordinateUsers);

          const subordinateIds = subordinateUsers?.map(u => u.id) || [];
          if (subordinateIds.length > 0) {
            baseQuery = baseQuery.in('asignado_a', [currentUser.id, ...subordinateIds]);
          } else {
            baseQuery = baseQuery.eq('asignado_a', currentUser.id);
          }
          console.log('Filtered for user IDs:', [currentUser.id, ...subordinateIds]);
        }
      }

      // Aplicar filtros de búsqueda
      console.log('Applying search filters');

      if (filters.nombre) {
        baseQuery = baseQuery.ilike('nombre_completo', `%${filters.nombre}%`);
        console.log('Applied nombre filter:', filters.nombre);
      }
      if (filters.telefono) {
        baseQuery = baseQuery.ilike('telefono', `%${filters.telefono}%`);
        console.log('Applied telefono filter:', filters.telefono);
      }
      if (filters.origen !== "all") {
        baseQuery = baseQuery.eq('origen', filters.origen);
        console.log('Applied origen filter:', filters.origen);
      }
      if (filters.estado !== "all") {
        baseQuery = baseQuery.eq('estado', filters.estado);
        console.log('Applied estado filter:', filters.estado);
      }
      if (dateRange?.from) {
        baseQuery = baseQuery.gte('created_at', dateRange.from.toISOString());
        console.log('Applied date from filter:', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        baseQuery = baseQuery.lte('created_at', dateRange.to.toISOString());
        console.log('Applied date to filter:', dateRange.to.toISOString());
      }

      try {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        
        console.log('Executing query with range:', { from, to });
        
        const { data, count, error } = await baseQuery
          .range(from, to)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Query error:', error);
          throw error;
        }

        console.log('Query executed. Results:', { 
          dataLength: data?.length, 
          count, 
          itemsPerPage, 
          currentPage,
          expectedItems: itemsPerPage,
          range: { from, to }
        });

        // Reordenar los resultados en memoria para mantener la priorización deseada
        const sortedData = data?.sort((a, b) => {
          // Primero los asignados al usuario actual
          if (a.asignado_a === currentUser.id && b.asignado_a !== currentUser.id) return -1;
          if (a.asignado_a !== currentUser.id && b.asignado_a === currentUser.id) return 1;
          
          // Luego por estado SIN_LLAMAR
          if (a.estado === "SIN_LLAMAR" && b.estado !== "SIN_LLAMAR") return -1;
          if (a.estado !== "SIN_LLAMAR" && b.estado === "SIN_LLAMAR") return 1;
          
          return 0;
        });

        return { 
          leads: sortedData || [], 
          totalCount: count || 0 
        };
      } catch (error) {
        console.error('Error executing query:', error);
        throw error;
      }
    },
    enabled: !!currentUser,
  });

  // Calcular el número total de páginas
  const totalPages = leads?.totalCount ? Math.ceil(leads.totalCount / itemsPerPage) : 0;

  // Función para generar el rango de páginas a mostrar
  const getPageRange = () => {
    const range = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  useEffect(() => {
    if (leads?.leads.length && leads.leads.length > 0) {
      const allLeadsSelected = leads.leads.every(lead => selectedLeads.includes(lead.id));
      setAllSelected(allLeadsSelected);
    }
  }, [selectedLeads, leads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange, itemsPerPage]);

  const handleSelectAll = (checked: boolean) => {
    if (!leads) return;
    
    const leadIds = leads.leads.map(lead => lead.id);
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

  // Añadir query para obtener el resumen de leads
  const { data: leadsSummary } = useQuery({
    queryKey: ["leads-summary", filters, dateRange, currentUser],
    queryFn: async () => {
      if (!currentUser) return null;

      let baseQuery = supabase
        .from("leads")
        .select('estado', { count: 'exact' });

      // Aplicar los mismos filtros que la consulta principal, excepto el estado
      if (filters.asignado === "my_leads") {
        baseQuery = baseQuery.eq('asignado_a', currentUser.id);
      } else if (filters.asignado !== "all") {
        baseQuery = baseQuery.eq('asignado_a', filters.asignado);
      }

      if (filters.nombre) {
        baseQuery = baseQuery.ilike('nombre_completo', `%${filters.nombre}%`);
      }
      if (filters.telefono) {
        baseQuery = baseQuery.ilike('telefono', `%${filters.telefono}%`);
      }
      if (filters.origen !== "all") {
        baseQuery = baseQuery.eq('origen', filters.origen);
      }
      if (dateRange?.from) {
        baseQuery = baseQuery.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        baseQuery = baseQuery.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await baseQuery;
      
      if (error) throw error;

      // Contar leads por estado
      const summary = {
        total: data.length,
        SIN_LLAMAR: data.filter(l => l.estado === 'SIN_LLAMAR').length,
        CITA_PROGRAMADA: data.filter(l => l.estado === 'CITA_PROGRAMADA').length,
        LLAMAR_DESPUES: data.filter(l => l.estado === 'LLAMAR_DESPUES').length,
        MATRICULA: data.filter(l => l.estado === 'MATRICULA').length,
      };

      return summary;
    },
    enabled: !!currentUser,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="text-sm text-muted-foreground">Nombre</label>
          <Input
            placeholder="Buscar por nombre..."
            value={filters.nombre}
            onChange={(e) => setFilters(prev => ({ ...prev, nombre: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">Teléfono</label>
          <Input
            placeholder="Buscar por teléfono..."
            value={filters.telefono}
            onChange={(e) => setFilters(prev => ({ ...prev, telefono: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Origen</label>
          <Select
            value={filters.origen}
            onValueChange={(value) => setFilters(prev => ({ ...prev, origen: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los orígenes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              {origenes?.map((origen) => (
                <SelectItem key={origen} value={origen}>
                  {origen}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <SelectItem value="my_leads">Mis Leads</SelectItem>
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

      {/* Resumen de leads */}
      <div className="flex gap-4 text-sm">
        <div className="flex-1 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
          <span className="text-slate-500">Leads Totales:</span>{' '}
          <span className="font-semibold text-slate-900">{leadsSummary?.total || 0}</span>
        </div>
        <div className="flex-1 bg-white px-4 py-2 rounded-lg border border-slate-200">
          <span className="text-slate-500">Sin Llamar:</span>{' '}
          <span className="font-semibold text-slate-900">{leadsSummary?.SIN_LLAMAR || 0}</span>
        </div>
        <div className="flex-1 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
          <span className="text-yellow-600">Cita Programada:</span>{' '}
          <span className="font-semibold text-yellow-700">{leadsSummary?.CITA_PROGRAMADA || 0}</span>
        </div>
        <div className="flex-1 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
          <span className="text-blue-600">Llamar Después:</span>{' '}
          <span className="font-semibold text-blue-700">{leadsSummary?.LLAMAR_DESPUES || 0}</span>
        </div>
        <div className="flex-1 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
          <span className="text-green-600">Matrícula:</span>{' '}
          <span className="font-semibold text-green-700">{leadsSummary?.MATRICULA || 0}</span>
        </div>
      </div>

      {/* Sección de filtros activos */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-900">
          Estás viendo leads filtrados por:{' '}
          <span className="space-x-2">
            {filters.asignado === "my_leads" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Mis Leads
              </span>
            )}
            {filters.asignado !== "my_leads" && filters.asignado !== "all" && users?.find(u => u.id === filters.asignado) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Asignado a: {users.find(u => u.id === filters.asignado)?.nombre_completo}
              </span>
            )}
            {filters.estado !== "all" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Estado: {LEAD_STATUS_LABELS[filters.estado as LeadEstado]}
              </span>
            )}
            {filters.origen !== "all" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Origen: {filters.origen}
              </span>
            )}
            {filters.nombre && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Nombre: {filters.nombre}
              </span>
            )}
            {filters.telefono && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                Teléfono: {filters.telefono}
              </span>
            )}
            {dateRange?.from && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Fecha: {format(dateRange.from, "dd/MM/yyyy")}
                {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() && 
                  ` - ${format(dateRange.to, "dd/MM/yyyy")}`}
              </span>
            )}
            {!filters.nombre && 
             !filters.telefono && 
             filters.origen === "all" && 
             filters.estado === "all" && 
             filters.asignado === "my_leads" && 
             !dateRange?.from && (
              <span className="text-slate-500 text-xs">
                Solo se muestran tus leads asignados
              </span>
            )}
          </span>
        </p>
      </div>

      <div className="rounded-md border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="h-8">
              {showCheckboxes && (
                <TableHead className="w-12 py-1">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 h-3 w-3"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
              )}
              <TableHead className="py-1">Nombre</TableHead>
              <TableHead className="py-1">Origen</TableHead>
              <TableHead className="py-1">Teléfono</TableHead>
              <TableHead className="py-1">Estado</TableHead>
              <TableHead className="py-1">Asignado A</TableHead>
              <TableHead className="py-1">Fecha</TableHead>
              <TableHead className="py-1">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads?.leads.map((lead) => (
              <TableRow key={lead.id} className="h-8">
                {showCheckboxes && (
                  <TableCell className="py-1">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 h-3 w-3"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => onSelectLead?.(lead.id, e.target.checked)}
                    />
                  </TableCell>
                )}
                <TableCell className="py-1">{lead.nombre_completo}</TableCell>
                <TableCell className="py-1">{lead.origen}</TableCell>
                <TableCell className="py-1">{lead.telefono}</TableCell>
                <TableCell className="py-1">
                  <div className={cn(
                    "px-3 py-1 text-xs rounded-md",
                    lead.estado === "SIN_LLAMAR" && "bg-white",
                    lead.estado === "LLAMAR_DESPUES" && "bg-blue-100",
                    lead.estado === "CITA_PROGRAMADA" && "bg-yellow-100",
                    lead.estado === "MATRICULA" && "bg-green-100",
                  )}>
                    {LEAD_STATUS_LABELS[lead.estado]}
                  </div>
                </TableCell>
                <TableCell className="py-1">{lead.users?.nombre_completo}</TableCell>
                <TableCell className="py-1">{format(new Date(lead.created_at), "dd/MM/yyyy")}</TableCell>
                <TableCell className="py-1">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onEdit?.(lead)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onGestion?.(lead)}
                    >
                      <ClipboardList className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onHistorial?.(lead)}
                    >
                      <History className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Modificar la sección de paginación */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, leads?.totalCount || 0)} de{' '}
              {leads?.totalCount || 0} resultados
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Mostrar:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  console.log('Changing items per page to:', value);
                  const newValue = Number(value);
                  setItemsPerPage(newValue);
                  setCurrentPage(1);
                  console.log('New items per page:', newValue);
                }}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 30, 50].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Primera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            
            {getPageRange().map(pageNum => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Última
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsTable;
