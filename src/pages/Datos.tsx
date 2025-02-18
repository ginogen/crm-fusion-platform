
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, UserPlus, Download } from "lucide-react";
import LeadsTable from "@/components/leads/LeadsTable";

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

const Datos = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewLeadForm>(initialFormState);
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [csvData, setCsvData] = useState<NewLeadForm[]>([]);
  const [previewData, setPreviewData] = useState<NewLeadForm[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);

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
      .or(`email.eq.${formData.email},telefono.eq.${formData.telefono}`);

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

    const { error } = await supabase.from("leads").insert([formData]);

    if (error) {
      toast.error("Error al guardar el lead");
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

    const { error } = await supabase.from("leads").insert(csvData);

    if (error) {
      toast.error("Error al cargar los leads");
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
    </div>
  );
};

export default Datos;
