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

// Componente TaskList separado
const TaskList = () => {
  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tareas")
        .select(`
          *,
          leads (nombre_completo)
        `)
        .order('fecha', { ascending: true })
        .limit(5);
      return data;
    }
  });

  if (!tasks || tasks.length === 0) {
    return <Card className="p-6">
      <p className="text-muted-foreground">No hay tareas pendientes</p>
    </Card>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Tareas Pendientes</h2>
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="flex justify-between items-start border-b pb-4">
            <div>
              <p className="font-medium">{task.tipo}</p>
              <p className="text-sm text-muted-foreground">
                Lead: {task.leads?.nombre_completo}
              </p>
              <p className="text-sm text-muted-foreground">{task.observaciones}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(task.fecha), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Componentes de modales
const LeadEditModal = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre_completo: lead?.nombre_completo || "",
    email: lead?.email || "",
    telefono: lead?.telefono || "",
    origen: lead?.origen || "",
    pais: lead?.pais || "",
    filial: lead?.filial || "",
    observaciones: lead?.observaciones || ""
  });

  const updateLead = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("leads")
        .update(data)
        .eq("id", lead.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead actualizado correctamente");
      onClose();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={formData.nombre_completo}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre_completo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>
            <div>
              <Label>Origen</Label>
              <Input
                value={formData.origen}
                onChange={(e) => setFormData(prev => ({ ...prev, origen: e.target.value }))}
              />
            </div>
            <div>
              <Label>País</Label>
              <Input
                value={formData.pais}
                onChange={(e) => setFormData(prev => ({ ...prev, pais: e.target.value }))}
              />
            </div>
            <div>
              <Label>Filial</Label>
              <Input
                value={formData.filial}
                onChange={(e) => setFormData(prev => ({ ...prev, filial: e.target.value }))}
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              />
            </div>
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
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState<Date>();
  const [observaciones, setObservaciones] = useState("");
  const queryClient = useQueryClient();

  const createGestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tareas")
        .insert({
          lead_id: lead.id,
          tipo,
          fecha: fecha?.toISOString(),
          observaciones
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Gestión registrada correctamente");
      onClose();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Gestión</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo de Gestión</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LLAMADA">Llamada</SelectItem>
                <SelectItem value="WHATSAPP">Whatsapp</SelectItem>
                <SelectItem value="CITA">Cita</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Input
              type="datetime-local"
              value={fecha ? format(fecha, "yyyy-MM-dd'T'HH:mm") : ""}
              onChange={(e) => setFecha(new Date(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ingrese las observaciones..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => createGestion.mutate()}>Guardar</Button>
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
      const { data } = await supabase
        .from("lead_history")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: !!lead?.id
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Historial del Lead</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {historial?.map((item) => (
            <div key={item.id}>
              <p>{item.action}</p>
              <p>{item.details}</p>
            </div>
          ))}
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
          </div>
        </div>

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
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
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
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                      />
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
      </Card>
    </div>
  );
};

export default Dashboard;
