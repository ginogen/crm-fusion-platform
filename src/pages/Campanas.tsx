import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Facebook, Globe, Upload, ChevronDown } from "lucide-react";

interface BatchLead {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  estado: string;
  created_at: string;
}

interface Batch {
  id: number;
  name: string;
  source: string;
  campaign_name: string | null;
  created_at: string;
  leads: BatchLead[];
}

interface Estructura {
  id: number;
  tipo: estructura_tipo;
  nombre: string;
  custom_name: string;
  created_at?: string;
  updated_at?: string;
  parent_id?: number | null;
}

type estructura_tipo = 'Empresa' | 'Paises' | 'Organizaciones';

interface BatchEstructuraPermiso {
  estructuras_id: number;
  estructuras: {
    id: number;
    tipo: estructura_tipo;
    nombre: string;
    custom_name: string;
  };
}

const CSV_HEADERS = [
  "Nombre Completo",
  "Email",
  "Telefono",
  "Origen",
  "Pais",
  "Filial",
  "Observaciones",
];

const Campanas = () => {
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedPais, setSelectedPais] = useState<number | null>(null);

  const { data: batches, refetch } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data: batchesData } = await supabase
        .from("lead_batches")
        .select(`
          *,
          batch_estructura_permisos (
            estructuras_id,
            estructuras (
              id,
              tipo,
              nombre,
              custom_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (!batchesData) return [];

      // Obtener leads para cada batch
      const batchesWithLeads = await Promise.all(
        batchesData.map(async (batch) => {
          const { data: leadsData } = await supabase
            .from("campaign_leads")
            .select("*")
            .eq("batch_id", batch.id);

          return {
            ...batch,
            leads: leadsData || [],
          };
        })
      );

      return batchesWithLeads;
    },
  });

  const { data: estructuras, isLoading: isLoadingEstructuras } = useQuery({
    queryKey: ["estructuras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estructuras")
        .select("*");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Filtrar estructuras por tipo
  const empresas = estructuras?.filter(e => e.tipo === 'Empresa') || [];
  const paises = estructuras?.filter(e => e.tipo === 'Paises') || [];

  // Agregar console.log después de la definición de las variables
  console.log('Todas las estructuras:', estructuras);
  console.log('Empresas filtradas:', empresas);
  console.log('Países filtrados:', paises);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      // Validar encabezados
      const isValidHeaders = CSV_HEADERS.every(header => 
        headers.includes(header)
      );

      if (!isValidHeaders) {
        toast.error("El archivo CSV no tiene los encabezados correctos");
        return;
      }

      // Procesar datos
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

  const distribuirLeads = async (batchId: number, leads: BatchLead[]) => {
    const { data: batchEstructuras } = await supabase
      .from("batch_estructura_permisos")
      .select(`
        estructuras_id,
        estructuras (
          id,
          tipo,
          nombre,
          created_at
        )
      `)
      .eq("lead_batch_id", batchId);

    if (!batchEstructuras) return;

    const estructurasPermisos = batchEstructuras as unknown as BatchEstructuraPermiso[];

    const empresaId = estructurasPermisos.find(be => be.estructuras.tipo === 'Empresa')?.estructuras_id;
    const paisId = estructurasPermisos.find(be => be.estructuras.tipo === 'Paises')?.estructuras_id;

    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("*")
      .eq("estructura_empresa_id", empresaId)
      .eq("estructura_pais_id", paisId);

    if (!usuarios || usuarios.length === 0) {
      toast.error("No hay usuarios disponibles para distribuir los leads");
      return;
    }

    // Distribuir leads uniformemente
    const leadsActualizados = leads.map((lead, index) => ({
      ...lead,
      usuario_id: usuarios[index % usuarios.length].id,
      estado: "PENDIENTE"
    }));

    const { error } = await supabase
      .from("campaign_leads")
      .upsert(leadsActualizados);

    if (error) {
      toast.error("Error al distribuir los leads");
      return;
    }

    toast.success("Leads distribuidos correctamente");
  };

  const handleBatchUpload = async () => {
    if (!batchName.trim()) {
      toast.error("Debes ingresar un nombre para el batch");
      return;
    }

    if (csvData.length === 0) {
      toast.error("No hay datos para cargar");
      return;
    }

    // Crear nuevo batch (sin estructuras)
    const { data: batchData, error: batchError } = await supabase
      .from("lead_batches")
      .insert([
        {
          name: batchName,
          source: "CSV",
        },
      ])
      .select()
      .single();

    if (batchError || !batchData) {
      toast.error("Error al crear el batch");
      return;
    }

    // Agregar batch_id a cada lead
    const leadsWithBatch = csvData.map(lead => ({
      ...lead,
      batch_id: batchData.id,
    }));

    // Insertar leads
    const { error: leadsError } = await supabase
      .from("campaign_leads")
      .insert(leadsWithBatch);

    if (leadsError) {
      toast.error("Error al cargar los leads");
      return;
    }

    toast.success(`Batch "${batchName}" creado con ${csvData.length} leads`);
    setBatchName("");
    setCsvData([]);
    setPreviewData([]);
    setIsBatchUploadModalOpen(false);
    refetch();
  };

  const handleVincularEstructuras = async (batchId: number, empresaId: number, paisId: number) => {
    const { error: estructurasError } = await supabase
      .from("batch_estructura_permisos")
      .insert([
        {
          estructuras_id: empresaId,
          lead_batch_id: batchId,
        },
        {
          estructuras_id: paisId,
          lead_batch_id: batchId,
        },
      ]);

    if (estructurasError) {
      toast.error("Error al vincular estructuras");
      return;
    }

    // Distribuir leads después de vincular estructuras
    const { data: leads } = await supabase
      .from("campaign_leads")
      .select("*")
      .eq("batch_id", batchId);

    if (leads) {
      await distribuirLeads(batchId, leads);
    }

    refetch();
    toast.success("Estructuras vinculadas y leads distribuidos correctamente");
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
      <h1 className="text-2xl font-bold">Campañas</h1>

      {/* Botones de conexión */}
      <div className="flex gap-4">
        <Dialog open={isFacebookModalOpen} onOpenChange={setIsFacebookModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-[200px]">
              <Facebook className="mr-2 h-4 w-4" />
              Conectar Facebook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar con Facebook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Conecta tu cuenta de Facebook para importar leads de tus formularios.
              </p>
              <Button className="w-full" onClick={() => toast.info("Función en desarrollo")}>
                Conectar con Facebook
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isWebhookModalOpen} onOpenChange={setIsWebhookModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-[200px]">
              <Globe className="mr-2 h-4 w-4" />
              Conectar Web
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Configura un webhook para recibir leads desde tu formulario de Elementor.
              </p>
              <div className="space-y-2">
                <Label>URL del Webhook</Label>
                <Input value="https://api.example.com/webhook" readOnly />
              </div>
              <Button className="w-full" onClick={() => toast.info("Función en desarrollo")}>
                Copiar URL
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sección de Batches */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Batches</h2>
          <Dialog open={isBatchUploadModalOpen} onOpenChange={setIsBatchUploadModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Cargar Batch CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Cargar Nuevo Batch</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Nombre del Batch</Label>
                  <Input
                    placeholder="Ingresa un nombre para identificar este batch"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Archivo CSV</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                    >
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
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>País</TableHead>
                            <TableHead>Filial</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((lead, index) => (
                            <TableRow key={index}>
                              <TableCell>{lead.nombre_completo}</TableCell>
                              <TableCell>{lead.email}</TableCell>
                              <TableCell>{lead.telefono}</TableCell>
                              <TableCell>{lead.pais}</TableCell>
                              <TableCell>{lead.filial}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleBatchUpload}>
                        Cargar {csvData.length} Leads
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Accordion type="multiple" className="space-y-4">
          {batches?.map((batch) => (
            <AccordionItem
              key={batch.id}
              value={batch.id.toString()}
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{batch.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(batch.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {batch.leads.length} leads
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {/* Agregar controles de estructura si no están vinculadas */}
                  {!batch.batch_estructura_permisos?.length && (
                    <div className="bg-gray-50 p-4 rounded-md space-y-4">
                      <h4 className="font-medium">Vincular Estructuras</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Empresa</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={selectedEmpresa || ""}
                            onChange={(e) => {
                              console.log('Empresa seleccionada:', e.target.value);
                              setSelectedEmpresa(Number(e.target.value));
                            }}
                          >
                            <option value="">Selecciona una empresa</option>
                            {empresas.map((empresa) => (
                              <option key={empresa.id} value={empresa.id}>
                                {empresa.custom_name || empresa.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>País</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={selectedPais || ""}
                            onChange={(e) => setSelectedPais(Number(e.target.value))}
                          >
                            <option value="">Selecciona un país</option>
                            {paises.map((pais) => (
                              <option key={pais.id} value={pais.id}>
                                {pais.custom_name || pais.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        disabled={!selectedEmpresa || !selectedPais}
                        onClick={() => handleVincularEstructuras(batch.id, selectedEmpresa!, selectedPais!)}
                      >
                        Vincular y Distribuir Leads
                      </Button>
                    </div>
                  )}

                  {/* Mostrar información de estructuras vinculadas */}
                  {batch.batch_estructura_permisos?.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-md mb-4">
                      <div className="flex gap-4">
                        <span>
                          <strong>Empresa:</strong> {
                            batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Empresa')?.estructuras.custom_name
                          }
                        </span>
                        <span>
                          <strong>País:</strong> {
                            batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Paises')?.estructuras.custom_name
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tabla de leads existente */}
                  <div className="rounded-md border mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batch.leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>{lead.nombre_completo}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.telefono}</TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${lead.estado === 'LLAMAR_DESPUES' ? 'bg-blue-100 text-blue-800' :
                                  lead.estado === 'CITA_PROGRAMADA' ? 'bg-yellow-100 text-yellow-800' :
                                  lead.estado === 'MATRICULA' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {lead.estado}
                              </div>
                            </TableCell>
                            <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default Campanas;
