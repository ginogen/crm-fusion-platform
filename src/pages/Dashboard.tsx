import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarCheck2, Users, Calendar as CalendarIcon, GraduationCap, Eye, ClipboardList, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { LeadEstado } from "@/lib/types";
import ModifyLeadsDialog from "@/components/leads/ModifyLeadsDialog";
import TaskList from "@/components/tasks/TaskList";

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

const GestionModal = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const [tipo, setTipo] = useState<string>("");
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
            <Select value={tipo} onValueChange={setTipo}>
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

const LeadHistorialSheet = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const { data: historial } = useQuery({
    queryKey: ["lead-history", lead?.id],
    queryFn: async () => {
      console.log("Fetching history for lead:", lead.id);

      const { data: historialData, error: historialError } = await supabase
        .from("lead_history")
        .select('*')
        .eq("lead_id", Number(lead.id))
        .order("created_at", { ascending: false });

      if (historialError) {
        console.error("Error fetching lead history:", historialError);
        throw historialError;
      }

      console.log("Raw historial data:", historialData);

      if (!historialData || historialData.length === 0) {
        console.log("No history data found");
        return [];
      }

      const userIds = historialData.map(item => item.user_id).filter(Boolean);
      console.log("User IDs to fetch:", userIds);
      
      let usersData = [];
      if (userIds.length > 0) {
        const { data: userData, error: usersError } = await supabase
          .from("users")
          .select("id, nombre_completo")
          .in("id", userIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
          throw usersError;
        }
        usersData = userData || [];
        console.log("Users data:", usersData);
      }

      const historialConUsuarios = historialData.map(item => ({
        ...item,
        users: usersData.find(user => user.id === item.user_id) || { nombre_completo: 'Usuario no encontrado' }
      }));

      console.log("Final processed history:", historialConUsuarios);
      return historialConUsuarios;
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
              {historial && historial.length > 0 ? (
                historial.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{formatAction(item.action)}</p>
                        <p className="text-sm text-muted-foreground">
                          Por: {item.users?.nombre_completo}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    {item.details && (
                      <div className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-line">
                        {formatHistoryDetails(item.details)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No hay registros en el historial</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showModifyLeadsDialog, setShowModifyLeadsDialog] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);

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
    
    const leadIds = leads.map(lead => lead.id);
    if (checked) {
      setSelectedLeads(leadIds);
    } else {
      setSelectedLeads([]);
    }
    setAllSelected(checked);
  };

  useEffect(() => {
    if (leads?.length && leads.length > 0) {
      const allLeadsSelected = leads.every(lead => selectedLeads.includes(lead.id));
      setAllSelected(allLeadsSelected);
    }
  }, [selectedLeads, leads]);

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

      <TaskList />

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Leads Recientes</h2>
          <div className="flex gap-2">
            {selectedLeads.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground self-center">
                  {selectedLeads.length} leads seleccionados
                </p>
                <Button 
                  variant="default"
                  onClick={() => setShowModifyLeadsDialog(true)}
                >
                  Modificar Leads
                </Button>
              </>
            )}
            <Button variant="outline">Ver Todos</Button>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium p-0">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.nombre_completo}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.telefono}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className={cn(
                        "ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        lead.estado === "SIN_LLAMAR" && "bg-yellow-100 text-yellow-800",
                        lead.estado === "EN_CONTACTO" && "bg-blue-100 text-blue-800",
                        lead.estado === "CITA_PROGRAMADA" && "bg-purple-100 text-purple-800",
                        lead.estado === "INTERESADO" && "bg-green-100 text-green-800",
                        lead.estado === "NO_INTERESADO" && "bg-red-100 text-red-800",
                        lead.estado === "MATRICULA" && "bg-gray-100 text-gray-800"
                      )}>
                        {LEAD_STATUS_LABELS[lead.estado as LeadEstado]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{lead.users?.nombre_completo}</TableCell>
                  <TableCell className="text-right">
                    <Select onValueChange={(value: LeadEstado) => updateLeadStatus.mutate({ leadId: lead.id, newStatus: value })}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Cambiar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STATUS_LABELS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
        isOpen={showModifyLeadsDialog}
        onClose={() => setShowModifyLeadsDialog(false)}
        selectedLeads={selectedLeads}
      />
    </div>
  );
};

export default Dashboard;
