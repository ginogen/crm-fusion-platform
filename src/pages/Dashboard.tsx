import { useState } from "react";
import { Button } from "@/components/ui/button";
import LeadsTable from "@/components/leads/LeadsTable";
import ModifyLeadsDialog from "@/components/leads/ModifyLeadsDialog";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MANAGEMENT_TYPES } from "@/lib/constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo de Gestión</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {MANAGEMENT_TYPES.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(tipo === "CITA" || tipo === "LLAMADA") && (
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="datetime-local"
                value={fecha ? format(fecha, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => setFecha(new Date(e.target.value))}
              />
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

const LeadHistorialSheet = ({ lead, isOpen, onClose }: { lead: any, isOpen: boolean, onClose: () => void }) => {
  const { data: historial } = useQuery({
    queryKey: ["lead-history", lead?.id],
    queryFn: async () => {
      const { data: historialData, error: historialError } = await supabase
        .from("lead_history")
        .select('*')
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (historialError) throw historialError;

      const userIds = historialData?.map(item => item.user_id).filter(Boolean) || [];
      
      let usersData = [];
      if (userIds.length > 0) {
        const { data: userData, error: usersError } = await supabase
          .from("users")
          .select("id, nombre_completo")
          .in("id", userIds);

        if (usersError) throw usersError;
        usersData = userData || [];
      }

      return historialData?.map(item => ({
        ...item,
        users: usersData.find(user => user.id === item.user_id) || { nombre_completo: 'Usuario no encontrado' }
      })) || [];
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
                        <p className="font-medium">{item.action}</p>
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
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);
  const [showModifyLeadsDialog, setShowModifyLeadsDialog] = useState(false);

  const handleSelectLead = (leadId: number, selected: boolean) => {
    if (selected) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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

      <LeadsTable 
        showCheckboxes={true}
        selectedLeads={selectedLeads}
        onSelectLead={handleSelectLead}
        onEdit={(lead) => {
          setSelectedLead(lead);
          setShowEditModal(true);
        }}
        onGestion={(lead) => {
          setSelectedLead(lead);
          setShowGestionModal(true);
        }}
        onHistorial={(lead) => {
          setSelectedLead(lead);
          setShowHistorialSheet(true);
        }}
      />

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
