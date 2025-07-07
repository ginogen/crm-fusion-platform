import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, UserPlus, Download } from "lucide-react";
import LeadsTable from "@/components/leads/LeadsTable";
import ModifyLeadsDialog from "@/components/leads/ModifyLeadsDialog";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MANAGEMENT_TYPES, REJECTION_REASONS } from "@/lib/constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LeadHistorialSheet } from "@/components/leads/LeadHistorialSheet";
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
    
    if (data.previous && data.new) {
      const changes = [];
      for (const key in data.new) {
        if (data.previous[key] !== data.new[key]) {
          changes.push(`${key}: ${data.previous[key] || 'No definido'} → ${data.new[key] || 'No definido'}`);
        }
      }
      return changes.join('\n');
    }
    
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return details;
  }
};

interface NewLeadForm {
  nombre_completo: string;
  email: string;
  telefono: string;
  origen: string;
  pais: string;
  filial: string;
  observaciones: string;
}

const initialFormState: NewLeadForm = {
  nombre_completo: "",
  email: "",
  telefono: "",
  origen: "",
  pais: "",
  filial: "",
  observaciones: "",
};

const CSV_HEADERS = [
  "Nombre Completo",
  "Email",
  "Telefono",
  "Origen",
  "Pais",
  "Filial",
  "Observaciones",
];

const ORIGEN_OPTIONS = [
  "Redes Sociales",
  "Directo",
  "Referido"
];

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
      const updateData = {
        ...data,
        telefono: lead.telefono,
        origen: lead.origen
      };

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", lead.id);

      if (error) throw error;

      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "ACTUALIZACIÓN",
        details: JSON.stringify({ 
          previous: lead,
          new: updateData,
          changes: Object.keys(updateData).filter(key => updateData[key] !== lead[key])
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
      logger.error("Error updating lead:", error);
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
                disabled
                className="bg-muted"
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
                disabled
                className="bg-muted"
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
      } else if (tipo === "NO_INTERESA" || tipo === "SIN_RESPUESTA") {
        await supabase
          .from("leads")
          .update({ estado: "RECHAZADO" })
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
        logger.error("Error creating gestion:", error);
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

const Datos = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [showModifyLeadsDialog, setShowModifyLeadsDialog] = useState(false);
  const [formData, setFormData] = useState<NewLeadForm>(initialFormState);
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [csvData, setCsvData] = useState<NewLeadForm[]>([]);
  const [previewData, setPreviewData] = useState<NewLeadForm[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);
  const [origenOptions, setOrigenOptions] = useState<string[]>(ORIGEN_OPTIONS);
  const [showNewOrigenInput, setShowNewOrigenInput] = useState(false);
  const [newOrigenValue, setNewOrigenValue] = useState("");

  const handleSelectLead = (leadId: number, selected: boolean) => {
    if (selected) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDuplicate(null);
  };

  const checkDuplicate = async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("telefono", formData.telefono);

    const isDup = data && data.length > 0;
    setIsDuplicate(isDup);
    
    if (isDup) {
      toast.error("El lead ya existe en la base de datos");
    } else {
      toast.success("El lead no existe en la base de datos");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDuplicate) {
      toast.error("No se puede guardar un lead duplicado");
      return;
    }

    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { error } = await supabase.from("leads").insert([{
      ...formData,
      user_id: userId,
      asignado_a: userId,
      estado: "SIN_LLAMAR"
    }]);

    if (error) {
      toast.error("Error al guardar el lead");
      console.error("Error al guardar:", error);
      return;
    }

    toast.success("Lead guardado exitosamente");
    setFormData(initialFormState);
    setIsDialogOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const isValidHeaders = CSV_HEADERS.every(header => 
        headers.includes(header)
      );

      if (!isValidHeaders) {
        toast.error("El archivo CSV no tiene los encabezados correctos");
        return;
      }

      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          nombre_completo: values[0] || "",
          email: values[1] || "",
          telefono: values[2] || "",
          origen: values[3] || "",
          pais: values[4] || "",
          filial: values[5] || "",
          observaciones: values[6] || "",
        };
      }).filter(lead => lead.nombre_completo && lead.email && lead.telefono);

      setCsvData(parsedData);
      setPreviewData(parsedData.slice(0, 5));
      toast.success(`${parsedData.length} leads encontrados en el archivo`);
    };

    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (csvData.length === 0) {
      toast.error("No hay datos para cargar");
      return;
    }

    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const leadsWithUserId = csvData.map(lead => ({
      ...lead,
      user_id: userId,
      asignado_a: userId,
      estado: "SIN_LLAMAR"
    }));

    const { error } = await supabase.from("leads").insert(leadsWithUserId);

    if (error) {
      toast.error("Error al cargar los leads");
      console.error("Error en carga masiva:", error);
      return;
    }

    toast.success(`${csvData.length} leads cargados exitosamente`);
    setCsvData([]);
    setPreviewData([]);
    setIsBulkDialogOpen(false);
  };

  const downloadTemplate = () => {
    const template = CSV_HEADERS.join(',') + '\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_leads.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Datos</h1>
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
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Carga Masiva
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Carga Masiva de Leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Archivo CSV</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Plantilla
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </div>

                {previewData.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Vista Previa (5 primeros registros)</h3>
                    <div className="rounded-md border">
                      <LeadsTable />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleBulkUpload}>
                        Cargar {csvData.length} Leads
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    {showNewOrigenInput ? (
                      <div className="flex gap-2">
                        <Input
                          id="new-origen"
                          value={newOrigenValue}
                          onChange={(e) => setNewOrigenValue(e.target.value)}
                          placeholder="Nuevo origen..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (newOrigenValue.trim()) {
                              setOrigenOptions(prev => [...prev, newOrigenValue.trim()]);
                              setFormData(prev => ({ ...prev, origen: newOrigenValue.trim() }));
                              setNewOrigenValue("");
                              setShowNewOrigenInput(false);
                            }
                          }}
                        >
                          Añadir
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setNewOrigenValue("");
                            setShowNewOrigenInput(false);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select
                          value={formData.origen}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, origen: value }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar origen" />
                          </SelectTrigger>
                          <SelectContent>
                            {origenOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full justify-start px-2 py-1.5 text-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowNewOrigenInput(true);
                              }}
                            >
                              + Crear nuevo origen
                            </Button>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={checkDuplicate}
                  >
                    Chequear Duplicado
                  </Button>
                  {isDuplicate === false && (
                    <Button type="submit">Guardar</Button>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

export default Datos;
