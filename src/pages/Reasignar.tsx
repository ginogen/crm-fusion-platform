import { useState, useEffect } from "react";
import LeadsTable from "@/components/leads/LeadsTable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MANAGEMENT_TYPES, REJECTION_REASONS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LeadHistorialSheet } from "@/components/leads/LeadHistorialSheet";
import ModifyLeadsDialog from "@/components/leads/ModifyLeadsDialog";
import { GestionTipo } from "@/lib/types";

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

const GestionModal = ({ lead, isOpen, onClose, initialData }: { lead: any, isOpen: boolean, onClose: () => void, initialData?: any }) => {
  const [tipo, setTipo] = useState<GestionTipo | "">(initialData?.tipo || "");
  const [fecha, setFecha] = useState<Date | undefined>(initialData?.fecha ? new Date(initialData.fecha) : undefined);
  const [observaciones, setObservaciones] = useState(initialData?.observaciones || "");
  const [razonRechazo, setRazonRechazo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData?.observaciones) {
      const parts = initialData.observaciones.split(" - ");
      if (parts.length > 1) {
        setRazonRechazo(parts[0]);
        setObservaciones(parts[1]);
      }
    }
  }, [initialData]);

  const { data: existingGestion } = useQuery({
    queryKey: ["lead-gestion", lead.id],
    queryFn: async () => {
      if (!initialData) {
        const { data } = await supabase
          .from("tareas")
          .select("*")
          .eq("lead_id", lead.id);
        return data?.[0];
      }
      return null;
    },
    enabled: !initialData && isOpen
  });

  const createGestion = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      if (!initialData && existingGestion) {
        throw new Error("Ya existe una gestión para este lead");
      }

      const gestionData = {
        lead_id: lead.id,
        tipo,
        fecha: fecha?.toISOString(),
        observaciones: razonRechazo ? `${razonRechazo} - ${observaciones}` : observaciones,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      if (initialData) {
        const { error: updateError } = await supabase
          .from("tareas")
          .update(gestionData)
          .eq("id", initialData.id);

        if (updateError) throw updateError;
      } else {
        const { error: createError } = await supabase
          .from("tareas")
          .insert([gestionData]);

        if (createError) throw createError;
      }

      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: initialData ? "ACTUALIZACIÓN_GESTIÓN" : tipo,
        details: JSON.stringify({ 
          fecha, 
          observaciones: razonRechazo ? `${razonRechazo} - ${observaciones}` : observaciones,
          tipo_anterior: initialData?.tipo,
          tipo_nuevo: tipo
        })
      });

      if (tipo === "CITA") {
        await supabase
          .from("leads")
          .update({ estado: "CITA_PROGRAMADA" })
          .eq("id", lead.id);
      }
    },
    onSuccess: () => {
      toast.success(initialData ? "Gestión actualizada correctamente" : "Gestión registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: (error: any) => {
      if (error.message === "Ya existe una gestión para este lead") {
        toast.error("Este lead ya tiene una gestión registrada");
      } else {
        toast.error("Error al registrar la gestión");
        console.error("Error creating gestion:", error);
      }
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleTipoChange = (value: GestionTipo) => {
    setTipo(value);
    setRazonRechazo("");
  };

  if (!initialData && existingGestion) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Gestión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-red-600">
              Este lead ya tiene una gestión registrada. No es posible crear múltiples gestiones para el mismo lead.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Modificar Gestión" : "Nueva Gestión"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modifica la gestión para" : "Registra una nueva gestión para"} {lead.nombre_completo}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo de Gestión</label>
            <Select value={tipo} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {MANAGEMENT_TYPES.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "NO_INTERESA" && (
            <div>
              <label className="text-sm font-medium">Razón</label>
              <Select value={razonRechazo} onValueChange={setRazonRechazo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar razón..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.NO_INTERESA.map((razon) => (
                    <SelectItem key={razon} value={razon}>
                      {razon.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "NO_CUMPLE_REQUISITO" && (
            <div>
              <label className="text-sm font-medium">Razón</label>
              <Select value={razonRechazo} onValueChange={setRazonRechazo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar razón..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.NO_CUMPLE_REQUISITO.map((razon) => (
                    <SelectItem key={razon} value={razon}>
                      {razon.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              disabled={
                loading ||
                !tipo || 
                ((tipo === "CITA" || tipo === "LLAMADA") && !fecha) || 
                !observaciones ||
                ((tipo === "NO_INTERESA" || tipo === "NO_CUMPLE_REQUISITO") && !razonRechazo)
              }
            >
              {loading ? "Guardando..." : initialData ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Reasignar = () => {
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
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
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reasignar</h1>
        <div className="flex gap-2">
          {selectedLeads.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
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
            initialData={selectedLead}
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

      {selectedLeads.length > 0 && (
        <ModifyLeadsDialog
          isOpen={showModifyLeadsDialog}
          onClose={() => setShowModifyLeadsDialog(false)}
          selectedLeads={selectedLeads}
        />
      )}
    </div>
  );
};

export default Reasignar;
