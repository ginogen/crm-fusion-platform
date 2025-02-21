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
import { useQueryClient } from "@tanstack/react-query";

interface BatchLead {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  origen: string;
  pais: string;
  filial: string;
  observaciones: string;
  estado: string;
  batch_id: number;
  created_at?: string;
  user?: {
    id: number;
    nombre_completo: string;
    email: string;
  };
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

interface WebhookConfig {
  id: number;
  webhook_url: string;
  webhook_token: string;
  is_active: boolean;
  created_at: string;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

interface FacebookForm {
  id: string;
  name: string;
  status: string;
  page_id: string;
  page_name: string;
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

interface BatchEstructuraResponse {
  estructuras_id: number;
  estructuras: {
    id: number;
    tipo: estructura_tipo;
    nombre: string;
    custom_name: string;
    parent_id: number | null;
  };
}

interface EstructuraWithOrganization {
  id: number;
  organizations: {
    id: number;
  } | null;
}

interface BatchEstructura {
  estructuras_id: number;
  estructuras: {
    id: number;
    tipo: 'Empresa' | 'Paises' | 'Organizaciones';
    nombre: string;
    custom_name: string;
    parent_id: number | null;
  };
}

const Campanas = () => {
  const queryClient = useQueryClient();
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedPais, setSelectedPais] = useState<number | null>(null);
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [todayLeadsCount, setTodayLeadsCount] = useState(0);
  const [recentWebhookLeads, setRecentWebhookLeads] = useState<BatchLead[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [facebookForms, setFacebookForms] = useState<FacebookForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isLoadingFB, setIsLoadingFB] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);

  const { data: batches, refetch } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      // 1. Obtener los batches
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

      // 2. Obtener leads para cada batch desde la tabla leads
      const batchesWithLeads = await Promise.all(
        batchesData.map(async (batch) => {
          const { data: leadsData } = await supabase
            .from("leads")
            .select(`
              id,
              nombre_completo,
              email,
              telefono,
              estado,
              created_at,
              asignado_a,
              user:users!asignado_a (
                id,
                nombre_completo,
                email
              )
            `)
            .eq("batch_id", batch.id)
            .eq("is_from_batch", true);

          return {
            ...batch,
            leads: leadsData || []
          };
        })
      );

      return batchesWithLeads;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0
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

  const { data: webhookConfig, isLoading: isLoadingWebhook } = useQuery({
    queryKey: ["webhook-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_config")
        .select("*")
        .single();
      
      if (data) {
        setWebhookUrl(`${window.location.origin}/api/webhook/${data.webhook_token}`);
        setWebhookToken(data.webhook_token);
      }
      return data;
    }
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
    try {
      // 1. Obtener las estructuras vinculadas al batch con tipado correcto
      const { data: batchEstructuras } = await supabase
        .from("batch_estructura_permisos")
        .select(`
          estructuras_id,
          estructuras!inner (
            id,
            tipo,
            nombre,
            custom_name,
            parent_id
          )
        `)
        .eq("lead_batch_id", batchId)
        .returns<BatchEstructura[]>();

      if (!batchEstructuras?.length) {
        toast.error("No hay estructuras vinculadas al batch");
        return;
      }

      // 2. Identificar empresa y país
      const empresaEstructura = batchEstructuras.find(
        be => be.estructuras.tipo === 'Empresa'
      );
      const paisEstructura = batchEstructuras.find(
        be => be.estructuras.tipo === 'Paises'
      );

      if (!empresaEstructura || !paisEstructura) {
        toast.error("No se encontraron todas las estructuras necesarias");
        return;
      }

      // 3. Obtener todas las estructuras relacionadas recursivamente
      const obtenerEstructurasHijas = async (estructuraId: number): Promise<number[]> => {
        const { data: hijas } = await supabase
          .from("estructuras")
          .select("id")
          .eq("parent_id", estructuraId);
        
        if (!hijas?.length) return [estructuraId];
        
        const estructurasHijas = await Promise.all(
          hijas.map(h => obtenerEstructurasHijas(h.id))
        );
        
        return [estructuraId, ...estructurasHijas.flat()];
      };

      // Obtener todas las estructuras relacionadas con la empresa y el país
      const estructurasEmpresa = await obtenerEstructurasHijas(empresaEstructura.estructuras_id);
      const estructurasPais = await obtenerEstructurasHijas(paisEstructura.estructuras_id);
      
      const todasLasEstructuras = [...new Set([...estructurasEmpresa, ...estructurasPais])];

      // 4. Obtener usuarios activos vinculados a cualquiera de estas estructuras
      const { data: usuarios } = await supabase
        .from("users")
        .select("id, nombre_completo, email")
        .in("estructura_id", todasLasEstructuras)
        .eq("is_active", true);

      if (!usuarios?.length) {
        toast.error("No hay usuarios disponibles para distribuir los leads");
        return;
      }

      // 5. Actualizar los leads en campaign_leads con el usuario asignado
      for (let i = 0; i < leads.length; i++) {
        const usuario = usuarios[i % usuarios.length];
        const { error: updateError } = await supabase
          .from("campaign_leads")
          .update({ 
            estado: "SIN_LLAMAR",
            assigned_user_id: usuario.id 
          })
          .eq("id", leads[i].id);

        if (updateError) {
          console.error('Error al actualizar lead:', updateError);
          throw new Error('Error al actualizar leads');
        }
      }

      // 6. Actualizar la vista de los leads
      const { data: updatedLeads } = await supabase
        .from("campaign_leads")
        .select(`
          *,
          user:users!assigned_user_id (
            id,
            nombre_completo,
            email
          )
        `)
        .eq("batch_id", batchId);

      if (!updatedLeads) {
        throw new Error('Error al obtener los leads actualizados');
      }

      toast.success(`${leads.length} leads distribuidos entre ${usuarios.length} usuarios`);
      refetch();
      return true;
    } catch (error) {
      console.error('Error en distribuirLeads:', error);
      toast.error("Error al distribuir los leads");
      return false;
    }
  };

  const handleUpdateEstructuras = async (batchId: number, empresaId: number, paisId: number) => {
    try {
      // Primero eliminar las estructuras existentes
      const { error: deleteError } = await supabase
        .from("batch_estructura_permisos")
        .delete()
        .eq("lead_batch_id", batchId);

      if (deleteError) throw deleteError;

      // Luego insertar las nuevas estructuras
      const { error: insertError } = await supabase
        .from("batch_estructura_permisos")
        .insert([
          { estructuras_id: empresaId, lead_batch_id: batchId },
          { estructuras_id: paisId, lead_batch_id: batchId },
        ]);

      if (insertError) throw insertError;

      // Redistribuir los leads
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("*")
        .eq("batch_id", batchId);

      if (leads) {
        await distribuirLeads(batchId, leads);
      }

      setEditingBatchId(null);
      refetch();
      toast.success("Estructuras actualizadas y leads redistribuidos correctamente");
    } catch (error) {
      console.error('Error al actualizar estructuras:', error);
      toast.error("Error al actualizar las estructuras");
    }
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

    try {
      // 1. Crear nuevo batch
      const { data: batchData, error: batchError } = await supabase
        .from("lead_batches")
        .insert({
          name: batchName.trim(),
          source: "bulk"
        })
        .select()
        .single();

      if (batchError || !batchData) {
        throw new Error("Error al crear el batch");
      }

      // 2. Preparar los leads para la tabla leads
      const leadsToInsert = csvData
        .filter(lead => lead.nombre_completo && lead.email)
        .map(lead => ({
          nombre_completo: lead.nombre_completo,
          email: lead.email,
          telefono: lead.telefono || null,
          origen: "Batch",
          pais: lead.pais || null,
          filial: lead.filial || null,
          observaciones: lead.observaciones || null,
          estado: "SIN_LLAMAR",
          batch_id: batchData.id,
          is_from_batch: true,
          is_assigned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (leadsToInsert.length === 0) {
        throw new Error("No hay leads válidos para cargar");
      }

      // 3. Insertar leads directamente en la tabla leads
      const { error: leadsError } = await supabase
        .from("leads")
        .insert(leadsToInsert);

      if (leadsError) {
        throw new Error("Error al cargar los leads");
      }

      toast.success(`Batch "${batchName}" creado con ${leadsToInsert.length} leads`);
      setBatchName("");
      setCsvData([]);
      setPreviewData([]);
      setIsBatchUploadModalOpen(false);
      refetch();

    } catch (error) {
      console.error('Error en handleBatchUpload:', error);
      toast.error((error as Error).message || "Error al procesar la carga del batch");
    }
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

  const generateWebhookToken = async () => {
    const token = crypto.randomUUID();
    
    const { error } = await supabase
      .from("webhook_config")
      .upsert({
        webhook_token: token,
        is_active: true
      });

    if (error) {
      toast.error("Error al generar el token");
      return;
    }

    setWebhookToken(token);
    setWebhookUrl(`${window.location.origin}/api/webhook/${token}`);
    toast.success("Webhook configurado correctamente");
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada al portapapeles");
  };

  const deactivateWebhook = async () => {
    const { error } = await supabase
      .from("webhook_config")
      .update({ is_active: false })
      .eq("webhook_token", webhookToken);

    if (error) {
      toast.error("Error al desactivar el webhook");
      return;
    }

    setWebhookToken("");
    setWebhookUrl("");
    toast.success("Webhook desactivado correctamente");
  };

  const { data: todayLeads } = useQuery({
    queryKey: ["today-webhook-leads"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("*")
        .eq("origen", "Web")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      if (leads) {
        setTodayLeadsCount(leads.length);
        setRecentWebhookLeads(leads.slice(0, 5)); // Últimos 5 leads
      }

      return leads;
    },
    refetchInterval: 30000, // Refresca cada 30 segundos
  });

  const handleDeleteBatch = async (batchId: number) => {
    try {
      if (!confirm("¿Estás seguro de que deseas eliminar este batch y todos sus leads?")) {
        return;
      }

      // Deshabilitar la caché temporalmente
      await queryClient.cancelQueries({ queryKey: ["batches"] });

      // 1. Verificar si el batch existe antes de intentar eliminarlo
      const { data: batchExists } = await supabase
        .from("lead_batches")
        .select("id")
        .eq("id", batchId)
        .single();

      if (!batchExists) {
        throw new Error('El batch no existe');
      }

      // 2. Eliminar los leads
      const { error: leadsError } = await supabase
        .from("campaign_leads")
        .delete()
        .eq("batch_id", batchId);

      if (leadsError) {
        console.error('Error al eliminar leads:', leadsError);
        throw new Error(`Error al eliminar leads: ${leadsError.message}`);
      }

      // 3. Eliminar los permisos de estructura
      const { error: permisosError } = await supabase
        .from("batch_estructura_permisos")
        .delete()
        .eq("lead_batch_id", batchId);

      if (permisosError) {
        console.error('Error al eliminar permisos:', permisosError);
        throw new Error(`Error al eliminar permisos: ${permisosError.message}`);
      }

      // 4. Eliminar el batch directamente
      const { error: batchError } = await supabase
        .from("lead_batches")
        .delete()
        .eq("id", batchId);

      if (batchError) {
        console.error('Error al eliminar batch:', batchError);
        throw new Error(`Error al eliminar batch: ${batchError.message}`);
      }

      // Actualizar el estado local inmediatamente
      if (batches) {
        const updatedBatches = batches.filter(batch => batch.id !== batchId);
        queryClient.setQueryData(["batches"], updatedBatches);
      }

      // Forzar una actualización completa
      await queryClient.invalidateQueries({ 
        queryKey: ["batches"],
        exact: true,
        refetchType: 'all'
      });

      await refetch();
      toast.success("Batch eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar batch:", error);
      toast.error((error as Error).message || "Error al eliminar el batch");
      
      // Refrescar los datos en caso de error
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      await refetch();
    }
  };

  const loadFacebookPages = async () => {
    setIsLoadingFB(true);
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/me/accounts`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN}`
        }
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      setFacebookPages(data.data);
    } catch (error) {
      console.error('Error cargando páginas:', error);
      toast.error('Error al cargar páginas de Facebook');
    } finally {
      setIsLoadingFB(false);
    }
  };

  const loadFormsByPage = async (pageId: string) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN}`
          }
        }
      );
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      setFacebookForms(data.data);
    } catch (error) {
      console.error('Error cargando formularios:', error);
      toast.error('Error al cargar formularios');
    }
  };

  const importLeadsFromForm = async (formId: string) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${formId}/leads`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN}`
          }
        }
      );
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      const form = facebookForms.find(f => f.id === formId);
      const batchName = `FB - ${form?.page_name} - ${form?.name}`;
      
      const processedLeads = data.data.map((lead: any) => ({
        nombre_completo: lead.field_data.find((f: any) => f.name === 'full_name')?.values[0] || '',
        email: lead.field_data.find((f: any) => f.name === 'email')?.values[0] || '',
        telefono: lead.field_data.find((f: any) => f.name === 'phone_number')?.values[0] || '',
        origen: 'Facebook',
        created_at: lead.created_time
      }));

      // Crear batch
      const { data: batchData, error: batchError } = await supabase
        .from("lead_batches")
        .insert([{
          name: batchName,
          source: "Facebook",
          campaign_name: form?.name
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      // Insertar leads
      const leadsWithBatch = processedLeads.map(lead => ({
        ...lead,
        batch_id: batchData.id
      }));

      const { error: leadsError } = await supabase
        .from("campaign_leads")
        .insert(leadsWithBatch);

      if (leadsError) throw leadsError;

      toast.success(`Importados ${processedLeads.length} leads de ${form?.name}`);
      refetch();
    } catch (error) {
      console.error('Error importando leads:', error);
      toast.error('Error al importar leads');
    }
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Conectar con Facebook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!facebookPages.length ? (
                <Button 
                  className="w-full" 
                  onClick={loadFacebookPages}
                  disabled={isLoadingFB}
                >
                  {isLoadingFB ? "Cargando..." : "Cargar Páginas de Facebook"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Página de Facebook</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={selectedPage}
                      onChange={(e) => {
                        setSelectedPage(e.target.value);
                        if (e.target.value) {
                          loadFormsByPage(e.target.value);
                        }
                      }}
                    >
                      <option value="">Selecciona una página</option>
                      {facebookPages.map(page => (
                        <option key={page.id} value={page.id}>{page.name}</option>
                      ))}
                    </select>
                  </div>

                  {facebookForms.length > 0 && (
                    <div className="space-y-2">
                      <Label>Formularios Disponibles</Label>
                      <div className="space-y-2">
                        {facebookForms.map(form => (
                          <div key={form.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{form.name}</span>
                            <Button
                              size="sm"
                              onClick={() => importLeadsFromForm(form.id)}
                            >
                              Importar Leads
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isWebhookModalOpen} onOpenChange={setIsWebhookModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-[200px]">
              <Globe className="mr-2 h-4 w-4" />
              {webhookConfig?.is_active ? "Webhook Conectado" : "Conectar Web"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Configurar Webhook para Elementor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {webhookConfig?.is_active ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
                    <p className="text-sm text-green-800">
                      ✓ El webhook está activo y recibiendo leads
                    </p>
                    <p className="text-sm text-green-600">
                      Leads recibidos hoy: {todayLeadsCount}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>URL del Webhook</Label>
                    <div className="flex gap-2">
                      <Input value={webhookUrl} readOnly />
                      <Button onClick={copyWebhookUrl}>
                        Copiar
                      </Button>
                    </div>
                  </div>

                  {recentWebhookLeads.length > 0 && (
                    <div className="space-y-2">
                      <Label>Últimos leads recibidos:</Label>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Teléfono</TableHead>
                              <TableHead>Hora</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentWebhookLeads.map((lead) => (
                              <TableRow key={lead.id}>
                                <TableCell>{lead.nombre_completo}</TableCell>
                                <TableCell>{lead.email}</TableCell>
                                <TableCell>{lead.telefono}</TableCell>
                                <TableCell>
                                  {new Date(lead.created_at).toLocaleTimeString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsWebhookModalOpen(false)}
                    >
                      Cerrar
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={deactivateWebhook}
                    >
                      Desactivar Webhook
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sigue estos pasos para conectar tu formulario de Elementor:
                  </p>
                  
                  <div className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Genera un token único para tu webhook</li>
                      <li>Copia la URL del webhook</li>
                      <li>En Elementor, configura una acción después del envío del formulario</li>
                      <li>Selecciona "Webhook" y pega la URL</li>
                      <li>Asegúrate de que los campos del formulario tengan los siguientes nombres:
                        <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                          <li>nombre_completo</li>
                          <li>email</li>
                          <li>telefono</li>
                          <li>origen (opcional)</li>
                          <li>pais (opcional)</li>
                          <li>observaciones (opcional)</li>
                        </ul>
                      </li>
                    </ol>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsWebhookModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={generateWebhookToken}>
                      Generar Token
                    </Button>
                  </div>
                </>
              )}
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
                  <div className="flex items-center gap-2">
                    <div
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBatch(batch.id);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </div>
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
                            onChange={(e) => setSelectedEmpresa(Number(e.target.value))}
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
                      <div className="flex items-center justify-between">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingBatchId(batch.id)}
                          >
                            Editar Vinculación
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const empresaId = batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Empresa')?.estructuras_id;
                              const paisId = batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Paises')?.estructuras_id;
                              if (empresaId && paisId) {
                                await distribuirLeads(batch.id, batch.leads);
                                refetch();
                              }
                            }}
                          >
                            Redistribuir Leads
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const empresaId = batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Empresa')?.estructuras_id;
                              const paisId = batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Paises')?.estructuras_id;
                              if (empresaId && paisId) {
                                await handleVincularEstructuras(batch.id, empresaId, paisId);
                              }
                            }}
                          >
                            Refrescar Vinculación
                          </Button>
                        </div>
                      </div>
                      
                      {/* Panel de edición */}
                      {editingBatchId === batch.id && (
                        <div className="mt-4 p-4 border rounded-md bg-white">
                          <h4 className="font-medium mb-4">Editar Vinculación</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Empresa</Label>
                              <select
                                className="w-full p-2 border rounded-md"
                                value={selectedEmpresa || ""}
                                onChange={(e) => setSelectedEmpresa(Number(e.target.value))}
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
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setEditingBatchId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              disabled={!selectedEmpresa || !selectedPais}
                              onClick={() => handleUpdateEstructuras(batch.id, selectedEmpresa!, selectedPais!)}
                            >
                              Guardar Cambios
                            </Button>
                          </div>
                        </div>
                      )}
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
                          <TableHead>Asignado A</TableHead>
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
                                  lead.estado === 'SIN_LLAMAR' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {lead.estado}
                              </div>
                            </TableCell>
                            <TableCell>
                              {lead.user?.nombre_completo || 'No asignado'}
                            </TableCell>
                            <TableCell>{new Date(lead.created_at || '').toLocaleDateString()}</TableCell>
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
