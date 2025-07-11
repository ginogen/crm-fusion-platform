import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Facebook, Globe, Upload, ChevronDown, Edit, Check, X } from "lucide-react";
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
  asignado_a?: number | null;
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
  batch_estructura_permisos?: BatchEstructuraPermiso[];
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

type estructura_tipo = 'Empresa' | 'Paises' | 'Zonas' | 'Filial' | 'División' | 'Organizaciones' | 'Jefaturas' | 'Sub Organización';

interface BatchEstructuraPermiso {
  estructuras_id: number;
  estructuras: {
    id: number;
    tipo: estructura_tipo;
    nombre: string;
    custom_name: string;
    parent_id?: number | null;
    parent_estructura_id?: number | null;
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
  ads_account: string;
  access_token: string;
}

interface FacebookForm {
  id: string;
  name: string;
  status: string;
  page_id: string;
  page_name: string;
  created_time: string;
  leads_count: number;
}

interface FacebookAdAccount {
  id: string;
  name: string;
  account_id: string;
}

interface FacebookFormLead {
  id: string;
  created_time: string;
  field_data: {
    name: string;
    values: string[];
  }[];
}

interface FacebookConfig {
  id: number;
  access_token: string;
  created_at: string;
  expires_at: string;
  created_by: number;
  is_active: boolean;
  last_used: string;
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
    tipo: estructura_tipo;
    nombre: string;
    custom_name: string;
    parent_id: number | null;
    parent_estructura_id: number | null;
  };
}



// Función para dividir arrays en lotes
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Límites y configuraciones para cargas masivas
const MAX_LEADS_PER_UPLOAD = 10000;
const MAX_FILE_SIZE_MB = 50;
const LARGE_BATCH_THRESHOLD = 5000;

const Campanas = () => {
  const queryClient = useQueryClient();
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [isMakeWebhookModalOpen, setIsMakeWebhookModalOpen] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedPais, setSelectedPais] = useState<number | null>(null);
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [makeWebhookToken, setMakeWebhookToken] = useState<string>("");
  const [makeWebhookUrl, setMakeWebhookUrl] = useState<string>("");
  const [makeLeadsCount, setMakeLeadsCount] = useState(0);
  const [recentMakeLeads, setRecentMakeLeads] = useState<BatchLead[]>([]);
  const [todayLeadsCount, setTodayLeadsCount] = useState(0);
  const [recentWebhookLeads, setRecentWebhookLeads] = useState<BatchLead[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [facebookForms, setFacebookForms] = useState<FacebookForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isLoadingFB, setIsLoadingFB] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [availablePages, setAvailablePages] = useState<{
    id: string;
    name: string;
    access_token: string;
  }[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [showWebhookDeleteModal, setShowWebhookDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEvacuacionModal, setShowEvacuacionModal] = useState(false);
  const [evacuacionEmpresa, setEvacuacionEmpresa] = useState<number | null>(null);
  const [evacuacionPais, setEvacuacionPais] = useState<number | null>(null);
  const [selectedBatchForUpload, setSelectedBatchForUpload] = useState<number | null>(null);
  const [isAddingLeadsModalOpen, setIsAddingLeadsModalOpen] = useState(false);
  const [editingBatchName, setEditingBatchName] = useState<number | null>(null);
  const [newBatchName, setNewBatchName] = useState("");
  const [isUpdatingBatchName, setIsUpdatingBatchName] = useState(false);
  
  // Estados para manejo de cargas masivas
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [cancelUpload, setCancelUpload] = useState(false);

  // Estados para paginación y filtros de leads
  const [leadsPage, setLeadsPage] = useState<{ [batchId: number]: number }>({});
  const [leadsPerPage, setLeadsPerPage] = useState(20);
  const [leadsFilter, setLeadsFilter] = useState<{ [batchId: number]: 'all' | 'assigned' | 'unassigned' }>({});

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
          // Primero contar el total de leads para este batch
          const { count: totalLeads } = await supabase
            .from("leads")
            .select("*", { count: 'exact', head: true })
            .eq("batch_id", batch.id)
            .eq("is_from_batch", true);

          logger.log(`Batch ${batch.id} (${batch.name}): Total de leads en BD: ${totalLeads}`);

          // Función para obtener todos los leads usando paginación
          const getAllLeadsForBatch = async (batchId: number): Promise<any[]> => {
            const allLeads: any[] = [];
            let from = 0;
            const pageSize = 1000; // Tamaño de página grande para eficiencia
            
            while (true) {
              const { data: pageLeads, error } = await supabase
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
                .eq("batch_id", batchId)
                .eq("is_from_batch", true)
                .order("created_at", { ascending: false })
                .range(from, from + pageSize - 1);

              if (error) {
                logger.error('Error al cargar página de leads:', error);
                break;
              }

              if (!pageLeads || pageLeads.length === 0) {
                break; // No hay más leads
              }

              allLeads.push(...pageLeads);
              from += pageSize;

              // Si obtuvimos menos leads que el tamaño de página, hemos terminado
              if (pageLeads.length < pageSize) {
                break;
              }
            }

            return allLeads;
          };

          // Obtener todos los leads usando paginación
          const leadsData = await getAllLeadsForBatch(batch.id);

          logger.log(`Batch ${batch.id} (${batch.name}): ${leadsData.length} leads cargados (de ${totalLeads} totales)`);

          // Verificar si hay discrepancia entre el conteo y los datos cargados
          if (totalLeads && leadsData.length !== totalLeads) {
            logger.warn(`⚠️ DISCREPANCIA: Batch ${batch.id} tiene ${totalLeads} leads en BD pero se cargaron ${leadsData.length}`);
          }

          return {
            ...batch,
            leads: leadsData
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

  // Consulta para obtener la configuración del webhook
  const { data: webhookConfig, isLoading: isLoadingWebhook } = useQuery({
    queryKey: ["webhook-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_config")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    }
  });

  // Mostrar el contador de leads o un valor por defecto
  const leadsCount = webhookConfig && 'leads_count' in webhookConfig 
    ? webhookConfig.leads_count 
    : 0;

  // Filtrar estructuras por tipo
  const empresas = estructuras?.filter(e => e.tipo === 'Empresa') || [];
      const paises = estructuras?.filter(e => e.tipo === 'Paises') || [];

  // Logs de debug para estructuras
  logger.log('Todas las estructuras:', estructuras);
  logger.log('Empresas filtradas:', empresas);
  logger.log('Países filtrados:', paises);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones para archivos grandes
    const fileSizeMB = file.size / (1024 * 1024);
    
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE_MB}MB permitido. Tamaño actual: ${fileSizeMB.toFixed(2)}MB`);
      event.target.value = ''; // Limpiar el input
      return;
    }

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
      }).filter(lead => lead.nombre_completo && lead.telefono); // Removida la validación de email

      // Validar cantidad de leads
      if (parsedData.length > MAX_LEADS_PER_UPLOAD) {
        toast.error(`Máximo ${MAX_LEADS_PER_UPLOAD.toLocaleString()} leads por carga. Tu archivo contiene ${parsedData.length.toLocaleString()} leads. Por favor, divide el archivo en partes más pequeñas.`);
        event.target.value = ''; // Limpiar el input
        return;
      }

      setCsvData(parsedData);
      setPreviewData(parsedData.slice(0, 5));
      
      // Mostrar mensaje apropiado según el tamaño
      if (parsedData.length > LARGE_BATCH_THRESHOLD) {
        toast.success(`${parsedData.length.toLocaleString()} leads encontrados. Este es un archivo grande, la carga tomará varios minutos.`);
      } else {
        toast.success(`${parsedData.length.toLocaleString()} leads encontrados en el archivo`);
      }
    };

    reader.readAsText(file);
  };

  const distribuirLeads = async (batchId: number) => {
    try {
      logger.log('Iniciando distribución de leads para batch:', batchId);
      logger.log('NOTA: Esta función ahora distribuye leads SOLO a usuarios online/conectados');

      // 1. Obtener las estructuras vinculadas al batch
      const { data: batchEstructuras } = await supabase
        .from("batch_estructura_permisos")
        .select(`
          estructuras_id,
          estructuras (
            id,
            tipo,
            nombre,
            custom_name,
            parent_id,
            parent_estructura_id
          )
        `)
        .eq("lead_batch_id", batchId) as { data: BatchEstructuraPermiso[] | null };

      logger.log('Estructuras vinculadas al batch:', batchEstructuras);

      if (!batchEstructuras?.length) {
        toast.error("No hay estructuras vinculadas al batch");
        return;
      }

      // 2. Identificar la empresa y el país
      const empresaEstructura = batchEstructuras.find(
        be => be.estructuras.tipo === 'Empresa'
      );
      const paisEstructura = batchEstructuras.find(
        be => be.estructuras.tipo === 'Paises'
      );

      logger.log('Empresa estructura:', empresaEstructura);
      logger.log('País estructura:', paisEstructura);

      if (!empresaEstructura || !paisEstructura) {
        toast.error("Falta vincular empresa o país");
        return;
      }

      // 3. Función recursiva mejorada para obtener todas las estructuras de la jerarquía
      const obtenerEstructurasRecursivas = async (estructuraId: number): Promise<number[]> => {
        logger.log(`Buscando estructuras hijas para ID: ${estructuraId}`);
        const estructurasIds = [estructuraId];
        
        // Obtener todas las estructuras hijas directas usando parent_id
        const { data: estructurasHijas, error } = await supabase
          .from("estructuras")
          .select("id, nombre, tipo, parent_id")
          .eq("parent_id", estructuraId);

        logger.log(`Estructura ${estructuraId} - Hijas encontradas:`, estructurasHijas);
        logger.log(`Error en consulta:`, error);

        if (estructurasHijas && estructurasHijas.length > 0) {
          logger.log(`Procesando ${estructurasHijas.length} estructuras hijas de ${estructuraId}`);
          // Para cada estructura hija, obtener recursivamente sus descendientes
          for (const hija of estructurasHijas) {
            logger.log(`Procesando estructura hija: ${hija.id} (${hija.nombre} - ${hija.tipo})`);
            const descendientes = await obtenerEstructurasRecursivas(hija.id);
            estructurasIds.push(...descendientes);
          }
        } else {
          logger.log(`No se encontraron estructuras hijas para ${estructuraId}`);
        }

        logger.log(`Estructura ${estructuraId} - Total IDs obtenidos:`, estructurasIds);
        return estructurasIds;
      };

      // 3.5. También intentar buscar usando el campo parent_estructura_id como alternativa
      const obtenerEstructurasAlternativa = async (): Promise<number[]> => {
        logger.log('Intentando método alternativo: buscar TODAS las estructuras y filtrar manualmente');
        
        const { data: todasLasEstructuras } = await supabase
          .from("estructuras")
          .select("id, nombre, tipo, parent_id, parent_estructura_id");
        
        logger.log('TODAS las estructuras en el sistema:', todasLasEstructuras);
        
        if (!todasLasEstructuras) return [];
        
        // Construir un mapa de jerarquía
        const construirJerarquia = (parentId: number): number[] => {
          const estructurasIds = [parentId];
          
          // Buscar por parent_id
          const hijasPorParentId = todasLasEstructuras.filter(e => e.parent_id === parentId);
          logger.log(`Hijas de ${parentId} por parent_id:`, hijasPorParentId);
          
          // Buscar por parent_estructura_id como alternativa
          const hijasPorParentEstructuraId = todasLasEstructuras.filter(e => e.parent_estructura_id === parentId);
          logger.log(`Hijas de ${parentId} por parent_estructura_id:`, hijasPorParentEstructuraId);
          
          // Combinar ambos resultados
          const todasLasHijas = [...hijasPorParentId, ...hijasPorParentEstructuraId];
          
          for (const hija of todasLasHijas) {
            if (!estructurasIds.includes(hija.id)) {
              const descendientes = construirJerarquia(hija.id);
              estructurasIds.push(...descendientes);
            }
          }
          
          return [...new Set(estructurasIds)]; // Eliminar duplicados
        };
        
        const empresaId = empresaEstructura.estructuras_id;
        const paisId = paisEstructura.estructuras_id;
        
        const estructurasEmpresa = construirJerarquia(empresaId);
        const estructurasPais = construirJerarquia(paisId);
        
        logger.log('Método alternativo - Estructuras de empresa:', estructurasEmpresa);
        logger.log('Método alternativo - Estructuras de país:', estructurasPais);
        
        return [...new Set([...estructurasEmpresa, ...estructurasPais])];
      };

      // 4. Obtener TODAS las estructuras de la jerarquía para empresa y país
      logger.log('Obteniendo estructuras para empresa:', empresaEstructura.estructuras_id);
      logger.log('Obteniendo estructuras para país:', paisEstructura.estructuras_id);

      let estructurasEmpresa = await obtenerEstructurasRecursivas(empresaEstructura.estructuras_id);
      let estructurasPais = await obtenerEstructurasRecursivas(paisEstructura.estructuras_id);

      // Combinar todas las estructuras y eliminar duplicados
      let todasLasEstructurasIds = [...new Set([
        ...estructurasEmpresa,
        ...estructurasPais
      ])];

      logger.log('Estructuras de empresa obtenidas (método recursivo):', estructurasEmpresa);
      logger.log('Estructuras de país obtenidas (método recursivo):', estructurasPais);
      logger.log('TODAS las estructuras combinadas (método recursivo):', todasLasEstructurasIds);

      // Si solo obtenemos las estructuras padre, intentar método alternativo
      if (todasLasEstructurasIds.length <= 2) {
        logger.log('Pocos resultados con método recursivo, probando método alternativo...');
        const estructurasAlternativas = await obtenerEstructurasAlternativa();
        if (estructurasAlternativas.length > todasLasEstructurasIds.length) {
          logger.log('Método alternativo obtuvo más resultados, usando esos:', estructurasAlternativas);
          todasLasEstructurasIds = estructurasAlternativas;
        }
      }

      // Verificar que efectivamente tengamos estructuras
      if (todasLasEstructurasIds.length === 0) {
        toast.error("No se encontraron estructuras en la jerarquía");
        return;
      }

      const estructurasIds = todasLasEstructurasIds;
      logger.log('RESUMEN: Estructuras finales para buscar usuarios:', estructurasIds);

      logger.log('IDs de todas las estructuras:', estructurasIds);

      // 5. Primero, vamos a investigar qué usuarios existen y a qué estructuras están vinculados
      const { data: todosLosUsuarios, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          nombre_completo,
          email,
          estructura_id,
          is_active
        `);

      logger.log('TODOS los usuarios en el sistema:', todosLosUsuarios);
      logger.log('Error al obtener usuarios:', usersError);

      if (todosLosUsuarios) {
        const usuariosEnEstructuras = todosLosUsuarios.filter(u => estructurasIds.includes(u.estructura_id));
        logger.log('Usuarios encontrados en las estructuras target:', usuariosEnEstructuras);
        
        // Mostrar estadísticas por estructura
        estructurasIds.forEach(estructuraId => {
          const usuariosEnEstructura = todosLosUsuarios.filter(u => u.estructura_id === estructuraId);
          logger.log(`Estructura ${estructuraId}: ${usuariosEnEstructura.length} usuarios`, usuariosEnEstructura);
        });
      }

      // Obtener usuarios vinculados a las estructuras específicas
      const { data: usuariosEstructuras } = await supabase
        .from("users")
        .select(`
          id,
          nombre_completo,
          email,
          estructura_id,
          is_active
        `)
        .in("estructura_id", estructurasIds);

      logger.log('Usuarios filtrados por estructuras target:', usuariosEstructuras);

      // 5.1. Filtrar solo usuarios que estén online (conectados)
      const { data: usuariosOnline } = await supabase
        .from("user_activity")
        .select("user_id, is_online, last_active")
        .eq("is_online", true)
        .gte("last_active", new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Solo usuarios activos en los últimos 5 minutos

      logger.log('Usuarios online:', usuariosOnline);

      // 5.2. Filtrar usuarios que estén tanto en las estructuras como online
      const userIdsOnline = usuariosOnline?.map(u => u.user_id) || [];
      let usuarios = usuariosEstructuras?.filter(u => userIdsOnline.includes(u.id)) || [];

      logger.log('Usuarios finales (en estructuras + online):', usuarios);

      if (!usuarios?.length) {
        // Intentar una estrategia alternativa: buscar usuarios online en general
        logger.log('No se encontraron usuarios online en estructuras específicas, buscando alternativas...');
        
        // Buscar usuarios online en CUALQUIER estructura
        const { data: usuariosOnlineGenerales } = await supabase
          .from("users")
          .select(`
            id,
            nombre_completo,
            email,
            estructura_id,
            is_active
          `)
          .eq("is_active", true)
          .in("id", userIdsOnline);
        
                  logger.log('Usuarios online generales:', usuariosOnlineGenerales);
        
        if (usuariosOnlineGenerales && usuariosOnlineGenerales.length > 0) {
          console.log('WORKAROUND: Usando usuarios online del sistema general:', usuariosOnlineGenerales);
          toast.info(`MODO DEBUG: No hay usuarios online en estructuras específicas, usando ${usuariosOnlineGenerales.length} usuarios online del sistema como alternativa`);
          
          // Usar estos usuarios como backup
          usuarios = usuariosOnlineGenerales;
        }
        
        if (!usuarios?.length) {
          toast.error(`No hay usuarios online disponibles en las estructuras seleccionadas (IDs: ${estructurasIds.join(', ')}). Verifica que existan usuarios conectados asignados a estas estructuras.`);
          return;
        }
      }

      // 6. Obtener los leads del batch que no están asignados y SOLO tienen estado SIN_LLAMAR
      const { data: batchLeads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("batch_id", batchId)
        .eq("estado", "SIN_LLAMAR") // Solo leads SIN_LLAMAR
        .is("asignado_a", null);

      if (leadsError) {
        logger.error('Error al obtener leads:', leadsError);
        throw leadsError;
      }

      logger.log('Leads sin asignar del batch:', batchLeads);

      if (!batchLeads?.length) {
        // Verificar si hay leads en el batch en general
        const { data: todosLosLeads } = await supabase
          .from("leads")
          .select("id, estado, asignado_a")
          .eq("batch_id", batchId);
        
        logger.log('Todos los leads del batch:', todosLosLeads);
        
        const leadsSinAsignar = todosLosLeads?.filter(lead => !lead.asignado_a) || [];
        const leadsSinLlamar = todosLosLeads?.filter(lead => lead.estado === "SIN_LLAMAR") || [];
        
        logger.log('Leads sin asignar (total):', leadsSinAsignar.length);
        logger.log('Leads SIN_LLAMAR (total):', leadsSinLlamar.length);
        
        if (leadsSinAsignar.length === 0) {
          toast.error("Todos los leads de este batch ya están asignados");
        } else if (leadsSinLlamar.length === 0) {
          toast.error("No hay leads con estado SIN_LLAMAR en este batch");
        } else {
          toast.error("No hay leads pendientes por asignar en este batch (SIN_LLAMAR y sin asignar)");
        }
        return;
      }

      // 7. Distribuir los leads de manera equitativa entre todos los usuarios
      const leadsUpdates = [];
      const MAX_LEADS_POR_USUARIO = 10;
      const totalLeads = batchLeads.length;
      const totalUsuarios = usuarios.length;

      logger.log(`Distribución: ${totalLeads} leads entre ${totalUsuarios} usuarios`);
      
      // Calcular distribución base equitativa
      const leadsBasePorUsuario = Math.floor(totalLeads / totalUsuarios);
      const leadsMaximoPorUsuario = Math.min(MAX_LEADS_POR_USUARIO, leadsBasePorUsuario);
      const leadsSobrantes = totalLeads - (leadsMaximoPorUsuario * totalUsuarios);
      
      logger.log(`Distribución base: ${leadsMaximoPorUsuario} leads por usuario`);
      logger.log(`Leads sobrantes después de distribución base: ${leadsSobrantes}`);
      
      // Crear array para tracking de leads asignados por usuario
      const leadsAsignadosPorUsuario = usuarios.map(usuario => ({
        usuario: usuario,
        leadsAsignados: 0
      }));

      let leadIndex = 0;

      // FASE 1: Distribución base equitativa
      logger.log('FASE 1: Distribución base equitativa');
      for (const usuarioData of leadsAsignadosPorUsuario) {
        for (let i = 0; i < leadsMaximoPorUsuario && leadIndex < totalLeads; i++) {
          leadsUpdates.push({
            id: batchLeads[leadIndex].id,
            estado: "SIN_LLAMAR",
            asignado_a: usuarioData.usuario.id,
            origen: "Batch",
            updated_at: new Date().toISOString()
          });
          usuarioData.leadsAsignados++;
          leadIndex++;
        }
      }

      logger.log(`Después de FASE 1: ${leadIndex} leads asignados`);
      
      // FASE 2: Distribuir leads sobrantes uno por uno hasta completar MAX_LEADS_POR_USUARIO
      if (leadIndex < totalLeads) {
        logger.log('FASE 2: Distribuyendo leads sobrantes');
        let usuarioIndex = 0;
        
        while (leadIndex < totalLeads) {
          const usuarioData = leadsAsignadosPorUsuario[usuarioIndex];
          
          // Si este usuario puede recibir más leads (no ha llegado al máximo)
          if (usuarioData.leadsAsignados < MAX_LEADS_POR_USUARIO) {
            leadsUpdates.push({
              id: batchLeads[leadIndex].id,
              estado: "SIN_LLAMAR",
              asignado_a: usuarioData.usuario.id,
              origen: "Batch",
              updated_at: new Date().toISOString()
            });
            usuarioData.leadsAsignados++;
            leadIndex++;
          }
          
          // Pasar al siguiente usuario (circular)
          usuarioIndex = (usuarioIndex + 1) % totalUsuarios;
          
          // Si todos los usuarios han llegado al máximo, salir del loop
          if (leadsAsignadosPorUsuario.every(u => u.leadsAsignados >= MAX_LEADS_POR_USUARIO)) {
            logger.log('Todos los usuarios han alcanzado el máximo de leads permitidos');
            break;
          }
        }
      }

      // Mostrar estadísticas finales
      logger.log('ESTADÍSTICAS FINALES DE DISTRIBUCIÓN:');
      leadsAsignadosPorUsuario.forEach(usuarioData => {
        logger.log(`Usuario ${usuarioData.usuario.nombre_completo}: ${usuarioData.leadsAsignados} leads`);
      });
      logger.log(`Total de leads procesados: ${leadIndex} de ${totalLeads}`);
      
      if (leadIndex < totalLeads) {
        const leadsNoAsignados = totalLeads - leadIndex;
        logger.log(`ADVERTENCIA: ${leadsNoAsignados} leads no pudieron ser asignados (todos los usuarios alcanzaron el máximo)`);
        toast.info(`Se distribuyeron ${leadIndex} leads. ${leadsNoAsignados} leads no asignados (usuarios en capacidad máxima).`);
      }

      logger.log('Actualizaciones de leads a realizar:', leadsUpdates);

      // 8. Actualizar los leads en la base de datos
      if (leadsUpdates.length === 0) {
        toast.error("No hay actualizaciones de leads para procesar");
        return false;
      }

              logger.log('Ejecutando actualización en base de datos para', leadsUpdates.length, 'leads');
      
      const { error: updateError } = await supabase
        .from("leads")
        .upsert(leadsUpdates);

              if (updateError) {
          logger.error('Error al actualizar leads:', updateError);
          throw updateError;
        }

        logger.log('Actualización completada exitosamente');
      
      // Verificar que los leads se actualizaron correctamente
      const { data: verificacionLeads } = await supabase
        .from("leads")
        .select("id, asignado_a, estado")
        .eq("batch_id", batchId)
        .not("asignado_a", "is", null);
      
              logger.log('Leads asignados después de la actualización:', verificacionLeads);

      await refetch();
      toast.success(`${leadsUpdates.length} leads distribuidos entre ${usuarios.length} usuarios. ${verificacionLeads?.length || 0} leads confirmados como asignados.`);
      return true;

    } catch (error) {
      logger.error('Error en distribuirLeads:', error);
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

      if (deleteError) {
        logger.error('Error al eliminar estructuras existentes:', deleteError);
        throw deleteError;
      }

      // Esperar un momento para que se complete la eliminación
      await new Promise(resolve => setTimeout(resolve, 100));

      // Luego insertar las nuevas estructuras usando upsert para evitar conflictos
      const { error: insertError } = await supabase
        .from("batch_estructura_permisos")
        .upsert([
          { estructuras_id: empresaId, lead_batch_id: batchId },
          { estructuras_id: paisId, lead_batch_id: batchId },
        ], {
          onConflict: 'estructuras_id,lead_batch_id'
        });

      if (insertError) {
        logger.error('Error al insertar nuevas estructuras:', insertError);
        throw insertError;
      }

      // Redistribuir los leads
      await distribuirLeads(batchId);

      setEditingBatchId(null);
      setSelectedEmpresa(null);
      setSelectedPais(null);
      refetch();
      toast.success("Estructuras actualizadas y leads redistribuidos correctamente");
    } catch (error) {
      logger.error('Error al actualizar estructuras:', error);
      toast.error(`Error al actualizar las estructuras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      setIsUploading(true);
      setUploadProgress(0);
      setCancelUpload(false);

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
        .filter(lead => lead.nombre_completo) // Solo validar nombre_completo
        .map(lead => ({
          nombre_completo: lead.nombre_completo,
          email: lead.email || null, // Permitir email nulo
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

      // 3. NUEVA LÓGICA: Dividir en lotes e insertar por partes
      const isLargeFile = leadsToInsert.length > LARGE_BATCH_THRESHOLD;
      const BATCH_SIZE = isLargeFile ? 250 : 500; // Lotes más pequeños para archivos grandes
      const DELAY_MS = isLargeFile ? 300 : 100; // Pausas más largas para archivos grandes
      
      const chunks = chunkArray(leadsToInsert, BATCH_SIZE);
      let insertedCount = 0;
      
      console.log(`Iniciando carga: ${leadsToInsert.length} leads en ${chunks.length} lotes de ${BATCH_SIZE}`);
      
      // 4. Insertar lote por lote
      for (let i = 0; i < chunks.length; i++) {
        // Verificar si el usuario canceló
        if (cancelUpload) {
          toast.error("Carga cancelada por el usuario");
          return;
        }

        const chunk = chunks[i];
        
        try {
          const { error: leadsError } = await supabase
            .from("leads")
            .insert(chunk);

          if (leadsError) {
            console.error(`Error en lote ${i + 1}:`, leadsError);
            throw new Error(`Error al cargar el lote ${i + 1}: ${leadsError.message}`);
          }
          
          insertedCount += chunk.length;
          
          // Actualizar progreso
          const progress = Math.round((insertedCount / leadsToInsert.length) * 100);
          setUploadProgress(progress);
          
          console.log(`Lote ${i + 1}/${chunks.length} completado. Progreso: ${progress}% (${insertedCount}/${leadsToInsert.length})`);
          
          // Pausa entre lotes para no sobrecargar la DB
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        } catch (chunkError) {
          console.error(`Error específico en lote ${i + 1}:`, chunkError);
          throw chunkError;
        }
      }

      toast.success(`Batch "${batchName}" creado exitosamente con ${insertedCount.toLocaleString()} leads (procesados en ${chunks.length} lotes)`);
      setBatchName("");
      setCsvData([]);
      setPreviewData([]);
      setIsBatchUploadModalOpen(false);
      refetch();

    } catch (error) {
      console.error('Error en handleBatchUpload:', error);
      toast.error((error as Error).message || "Error al procesar la carga del batch");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCancelUpload(false);
    }
  };

  const handleVincularEstructuras = async (batchId: number, empresaId: number, paisId: number) => {
    try {
      // Usar upsert para evitar conflictos de duplicados
      const { error: estructurasError } = await supabase
        .from("batch_estructura_permisos")
        .upsert([
          {
            estructuras_id: empresaId,
            lead_batch_id: batchId,
          },
          {
            estructuras_id: paisId,
            lead_batch_id: batchId,
          },
        ], {
          onConflict: 'estructuras_id,lead_batch_id'
        });

      if (estructurasError) {
        console.error('Error al vincular estructuras:', estructurasError);
        toast.error(`Error al vincular estructuras: ${estructurasError.message}`);
        return;
      }

      // Distribuir leads después de vincular estructuras
      await distribuirLeads(batchId);

      // Limpiar los valores seleccionados
      setSelectedEmpresa(null);
      setSelectedPais(null);
      refetch();
      toast.success("Estructuras vinculadas y leads distribuidos correctamente");
    } catch (error) {
      console.error('Error en handleVincularEstructuras:', error);
      toast.error(`Error al vincular estructuras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
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

    // Para desarrollo local con ngrok
    const isLocalDev = window.location.hostname === 'localhost';
    const baseUrl = isLocalDev 
      ? "https://ed6a-181-92-102-131.ngrok-free.app" // URL de ngrok proporcionada
      : window.location.origin;
    
    setWebhookToken(token);
    setWebhookUrl(`${baseUrl}/api/webhook/${token}`);
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

  // Consulta para buscar la configuración del webhook de Make
  const { data: makeWebhookConfig, refetch: refetchMakeWebhook } = useQuery({
    queryKey: ["make-webhook-config"],
    queryFn: async () => {
      // No filtramos por webhook_name ya que no existe esa columna
      const { data: configs } = await supabase
        .from("webhook_config")
        .select("*")
        .eq("is_active", true);
      
      // Buscamos el webhook más reciente o el primero disponible
      const config = configs && configs.length > 0 ? configs[0] : null;
      
      if (config) {
        setMakeWebhookToken(config.webhook_token);
        setMakeWebhookUrl(`${window.location.origin}/api/webhook/${config.webhook_token}`);
      }
      return config;
    },
    staleTime: 60000
  });

  const { data: makeLeads } = useQuery({
    queryKey: ["make-leads"],
    queryFn: async () => {
      // Obtener los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("*")
        .eq("origen", "Facebook")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (leads) {
        setMakeLeadsCount(leads.length);
        setRecentMakeLeads(leads.slice(0, 5)); // Últimos 5 leads
      }

      return leads;
    },
    refetchInterval: 60000, // Refresca cada minuto
    staleTime: 30000
  });

  const generateMakeWebhookToken = async () => {
    const token = crypto.randomUUID();
    
    const { error } = await supabase
      .from("webhook_config")
      .upsert({
        webhook_token: token,
        is_active: true,
        // No incluimos webhook_name ya que no existe esa columna
        created_at: new Date().toISOString()
      });

    if (error) {
      toast.error("Error al generar el token");
      return;
    }

    // Para desarrollo local con ngrok
    const isLocalDev = window.location.hostname === 'localhost';
    const baseUrl = isLocalDev 
      ? "https://ed6a-181-92-102-131.ngrok-free.app" // URL de ngrok proporcionada
      : window.location.origin;
    
    setMakeWebhookToken(token);
    setMakeWebhookUrl(`${baseUrl}/api/webhook/${token}`);
    toast.success("Webhook para Make configurado correctamente");
    
    // Actualizar la configuración
    refetchMakeWebhook();
  };

  const copyMakeWebhookUrl = () => {
    navigator.clipboard.writeText(makeWebhookUrl);
    toast.success("URL copiada al portapapeles");
  };

  const deactivateMakeWebhook = async () => {
    const { error } = await supabase
      .from("webhook_config")
      .update({ is_active: false })
      .eq("webhook_token", makeWebhookToken);

    if (error) {
      toast.error("Error al desactivar el webhook");
      return;
    }

    setMakeWebhookToken("");
    setMakeWebhookUrl("");
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

      // 2. Eliminar los leads de la tabla leads (no campaign_leads)
      const { error: leadsError } = await supabase
        .from("leads")
        .delete()
        .eq("batch_id", batchId)
        .eq("is_from_batch", true);

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

      // 4. Eliminar el batch
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

  const { data: facebookConfig, refetch: refetchFacebookConfig } = useQuery({
    queryKey: ["facebook-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facebook_config")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (data?.access_token) {
        localStorage.setItem('fb_access_token', data.access_token);
      }
      
      return data;
    }
  });

  const saveFacebookToken = async (token: string) => {
    try {
      // Verificar el token antes de guardarlo
      const verifyResponse = await fetch(
        'https://graph.facebook.com/v18.0/me',
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!verifyResponse.ok) {
        throw new Error('Token inválido');
      }

      // 1. Verificar si el usuario es superuser
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Usuario actual:', user); // Depuración

      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("role") // Seleccionar solo el campo role
        .eq("id", user?.id)
        .single();

      console.log('Perfil de usuario:', userProfile); // Depuración
      console.log('Error al obtener perfil:', userError); // Depuración

      if (userError) {
        throw new Error(`Error al verificar permisos: ${userError.message}`);
      }

      // Verificar si el rol es superuser
      if (userProfile?.role !== 'superuser') {
        console.log('role no es superuser:', userProfile); // Depuración
        toast.error("Solo los superusuarios pueden configurar la conexión con Facebook");
        return;
      }

      // 2. Desactivar tokens anteriores
      const { error: updateError } = await supabase
        .from("facebook_config")
        .update({ is_active: false })
        .eq("is_active", true);

      if (updateError) {
        console.error('Error al desactivar tokens:', updateError);
      }

      // 3. Guardar el nuevo token (asegurarse de que el token está limpio)
      const cleanToken = token.trim();
      const { data: newConfig, error: insertError } = await supabase
        .from("facebook_config")
        .insert({
          access_token: cleanToken,
          created_by: user?.id,
          is_active: true,
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          last_used: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 4. Actualizar localStorage con el token limpio
      localStorage.setItem('fb_access_token', cleanToken);
      
      // Recargar la configuración
      await refetchFacebookConfig();
      
      // Intentar cargar las cuentas inmediatamente
      await loadFacebookPages();
      
      toast.success("Token de Facebook guardado correctamente");

    } catch (error) {
      console.error('Error completo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage === 'Token inválido') {
        toast.error('El token proporcionado no es válido');
      } else {
        toast.error('Error al guardar el token de Facebook');
      }
    }
  };

  const loadFacebookPages = async () => {
    setIsLoadingFB(true);
    try {
      const fbToken = localStorage.getItem('fb_access_token');
      if (!fbToken) {
        toast.error('No hay token de acceso configurado');
        return;
      }

      // Verificar el token antes de usarlo
      const verifyResponse = await fetch(
        'https://graph.facebook.com/v18.0/me',
        { 
          headers: { 
            'Authorization': `Bearer ${fbToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!verifyResponse.ok) {
        throw new Error('Token inválido o expirado');
      }

      // Actualizar last_used en la base de datos
      await supabase
        .from("facebook_config")
        .update({ last_used: new Date().toISOString() })
        .eq("access_token", fbToken);

      // Obtener cuentas publicitarias
      const response = await fetch(
        'https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,id',
        { 
          headers: { 
            'Authorization': `Bearer ${fbToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error en la respuesta de Facebook');
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.data)) {
        throw new Error('No se encontraron cuentas publicitarias');
      }

      const adAccounts = data.data.map((account: any) => ({
        id: account.id || '',
        name: account.name || 'Cuenta sin nombre',
        access_token: fbToken,
        ads_account: account.account_id || account.id?.replace('act_', '') || ''
      })).filter(account => account.id && account.ads_account);

      if (adAccounts.length === 0) {
        throw new Error('No se encontraron cuentas publicitarias disponibles');
      }

      setFacebookPages(adAccounts);
      toast.success(`${adAccounts.length} cuentas publicitarias cargadas`);
      
    } catch (error) {
      console.error('Error detallado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('Token inválido') || 
          errorMessage.includes('Invalid OAuth') || 
          errorMessage.includes('expired')) {
        toast.error('Token de Facebook inválido o expirado. Por favor reconfigura el token.');
        localStorage.removeItem('fb_access_token');
        await supabase
          .from("facebook_config")
          .update({ is_active: false })
          .eq("is_active", true);
        await refetchFacebookConfig();
        setIsEditingToken(true);
      } else {
        toast.error(errorMessage);
      }
      
      setFacebookPages([]);
    } finally {
      setIsLoadingFB(false);
    }
  };

  const loadPagesForAccount = async (adAccountId: string) => {
    try {
      const fbToken = localStorage.getItem('fb_access_token');
      if (!fbToken) {
        toast.error('No hay token de acceso configurado');
        return;
      }

      // Primero obtener las páginas a las que tenemos acceso
      const response = await fetch(
        'https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token',
        { headers: { 'Authorization': `Bearer ${fbToken}` } }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error en la respuesta de Facebook');
      }

      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('No se encontraron páginas');
      }

      // Filtrar solo las páginas que tienen formularios de leads
      const pagesWithForms = [];
      for (const page of data.data) {
        try {
          // Verificar si la página tiene formularios
          const formCheckResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?limit=1`,
            { headers: { 'Authorization': `Bearer ${page.access_token}` } }
          );
          
          const formData = await formCheckResponse.json();
          if (formData.data && formData.data.length > 0) {
            pagesWithForms.push({
              id: page.id,
              name: page.name,
              access_token: page.access_token
            });
          }
        } catch (error) {
          console.log(`Saltando página ${page.name} - sin acceso a formularios`);
          continue;
        }
      }

      if (pagesWithForms.length === 0) {
        throw new Error('No se encontraron páginas con formularios de leads');
      }

      setAvailablePages(pagesWithForms);
      setSelectedPageId(""); // Resetear página seleccionada
      setFacebookForms([]); // Limpiar formularios anteriores
      
      toast.success(`${pagesWithForms.length} páginas con formularios encontradas`);
    } catch (error) {
      console.error('Error cargando páginas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al cargar páginas: ${errorMessage}`);
      setAvailablePages([]);
    }
  };

  const loadFormsByPage = async (pageId: string) => {
    try {
      // Obtener la página seleccionada con su token
      const selectedPage = availablePages.find(p => p.id === pageId);
      if (!selectedPage) {
        throw new Error('Página no encontrada');
      }

      // Usar el token de la página para obtener los formularios
      const formsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count`,
        { headers: { 'Authorization': `Bearer ${selectedPage.access_token}` } }
      );

      if (!formsResponse.ok) {
        const errorData = await formsResponse.json();
        throw new Error(errorData.error?.message || 'Error al obtener formularios');
      }

      const formsData = await formsResponse.json();
      if (!formsData.data) {
        throw new Error('No se encontraron formularios');
      }

      const formsWithPageInfo = formsData.data.map((form: any) => ({
        ...form,
        page_id: pageId,
        page_name: selectedPage.name
      }));

      setFacebookForms(formsWithPageInfo);
      toast.success(`${formsWithPageInfo.length} formularios encontrados`);

    } catch (error) {
      console.error('Error cargando formularios:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al cargar formularios: ${errorMessage}`);
      setFacebookForms([]);
    }
  };

  const importLeadsFromForm = async (formId: string) => {
    try {
      const fbToken = localStorage.getItem('fb_access_token');
      if (!fbToken) {
        toast.error('No hay token de acceso de Facebook');
        return;
      }

      const form = facebookForms.find(f => f.id === formId);
      if (!form) {
        toast.error('Formulario no encontrado');
        return;
      }

      // Crear el batch primero
      const { data: batchData, error: batchError } = await supabase
        .from("lead_batches")
        .insert([{
          name: `FB - ${form.page_name} - ${form.name}`,
          source: "Facebook",
          campaign_name: form.name
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      // Obtener los leads del formulario
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${formId}/leads?fields=created_time,field_data`,
        {
          headers: {
            'Authorization': `Bearer ${fbToken}`
          }
        }
      );
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      // Procesar y transformar los leads
      const processedLeads = data.data.map((lead: any) => ({
        nombre_completo: lead.field_data.find((f: any) => f.name === 'full_name')?.values[0] || '',
        email: lead.field_data.find((f: any) => f.name === 'email')?.values[0] || '',
        telefono: lead.field_data.find((f: any) => f.name === 'phone_number')?.values[0] || '',
        origen: 'Facebook',
        estado: 'SIN_LLAMAR',
        batch_id: batchData.id,
        is_from_batch: true,
        created_at: lead.created_time
      }));

      // Insertar los leads en la base de datos
      const { error: leadsError } = await supabase
        .from("leads")
        .insert(processedLeads);

      if (leadsError) throw leadsError;

      // Actualizar timestamp de última importación
      await supabase
        .from("facebook_forms")
        .update({ 
          last_import: new Date().toISOString(),
          leads_count: data.data.length
        })
        .eq("form_id", formId);

      await refetchForms();
      toast.success(`Batch creado con ${processedLeads.length} leads de ${form.name}`);
      refetch();

    } catch (error) {
      console.error('Error importando leads:', error);
      toast.error('Error al importar leads');
    }
  };

  // Modificar la función para evacuar leads sin llamar
  const evacuarLeadsSinLlamar = async (empresaId?: number, paisId?: number) => {
    try {
      setLoading(true);
      
      // Construir la consulta base - ahora incluye tanto SIN_LLAMAR como RECHAZADO
      let query = supabase
        .from("leads")
        .select("id, estado, asignado_a")
        .in("estado", ["SIN_LLAMAR", "RECHAZADO"])
        .not("asignado_a", "is", null);
      
      // Si se especificaron empresa y país, filtrar por estructuras jerárquicas (UNIÓN)
      if (empresaId && paisId) {
        // Función recursiva para obtener todas las estructuras hijas
        const obtenerEstructurasRecursivas = async (estructuraId: number): Promise<number[]> => {
          const estructurasIds = [estructuraId];
          const { data: hijas } = await supabase
            .from("estructuras")
            .select("id")
            .eq("parent_id", estructuraId);
          if (hijas && hijas.length > 0) {
            for (const hija of hijas) {
              const descendientes = await obtenerEstructurasRecursivas(hija.id);
              estructurasIds.push(...descendientes);
            }
          }
          return estructurasIds;
        };

        // Obtener todas las estructuras hijas de empresa y país
        const estructurasEmpresa = await obtenerEstructurasRecursivas(empresaId);
        const estructurasPais = await obtenerEstructurasRecursivas(paisId);
        // Usar la UNIÓN de ambas listas
        const estructurasIds = [...new Set([...estructurasEmpresa, ...estructurasPais])];

        console.log('Estructuras hijas de empresa:', estructurasEmpresa);
        console.log('Estructuras hijas de país:', estructurasPais);
        console.log('Estructuras finales para filtrar usuarios (UNIÓN):', estructurasIds);

        // Obtener usuarios vinculados a esas estructuras usando user_estructuras
        const { data: userEstructuras, error: userEstructurasError } = await supabase
          .from("user_estructuras")
          .select("user_id")
          .in("estructura_id", estructurasIds);

        if (userEstructurasError) throw userEstructurasError;

        const userIds = userEstructuras?.map(ue => ue.user_id) || [];
        console.log('Usuarios vinculados a las estructuras:', userIds);

        if (userIds.length > 0) {
          // Filtrar solo los leads asignados a estos usuarios
          query = query.in("asignado_a", userIds);
        } else {
          toast.error("No se encontraron usuarios en las estructuras seleccionadas");
          setLoading(false);
          return;
        }
      }

      // Ejecutar la consulta
      const { data: leadsAEvacuar, error: queryError } = await query;
      if (queryError) throw queryError;

      if (leadsAEvacuar?.length) {
        // Actualizar los leads quitando la asignación pero manteniendo su estado
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            asignado_a: null,
            updated_at: new Date().toISOString()
          })
          .in("id", leadsAEvacuar.map(lead => lead.id));

        if (updateError) throw updateError;

        // Contar leads por estado para el mensaje
        const sinLlamarCount = leadsAEvacuar.filter(lead => lead.estado === "SIN_LLAMAR").length;
        const rechazadosCount = leadsAEvacuar.filter(lead => lead.estado === "RECHAZADO").length;

        console.log(`${leadsAEvacuar.length} leads evacuados (${sinLlamarCount} SIN_LLAMAR, ${rechazadosCount} RECHAZADO)`);
        toast.success(`${leadsAEvacuar.length} leads evacuados (${sinLlamarCount} SIN_LLAMAR, ${rechazadosCount} RECHAZADO)`);
        await refetch();
      } else {
        toast.info("No se encontraron leads para evacuar con los criterios seleccionados");
      }
    } catch (error) {
      console.error("Error al evacuar leads:", error);
      toast.error("Error al evacuar leads");
    } finally {
      setLoading(false);
      setShowEvacuacionModal(false);
    }
  };

  // Programar la evacuación de leads a las 00:00 hora de Chile
  useEffect(() => {
    const programarEvacuacion = () => {
      const ahora = new Date();
      const zonaHoraria = 'America/Santiago';
      const horaChile = new Date(ahora.toLocaleString('en-US', { timeZone: zonaHoraria }));
      
      // Calcular tiempo hasta la próxima medianoche en Chile
      const medianoche = new Date(horaChile);
      medianoche.setHours(24, 0, 0, 0);
      
      const tiempoHastaMedianoche = medianoche.getTime() - horaChile.getTime();
      
      // Programar la evacuación
      const timer = setTimeout(() => {
        evacuarLeadsSinLlamar();
        // Reprogramar para la siguiente medianoche
        programarEvacuacion();
      }, tiempoHastaMedianoche);

      return () => clearTimeout(timer);
    };

    return programarEvacuacion();
  }, []);

  // Agregar función para cargar formulario por ID
  const loadFormById = async (formId: string) => {
    try {
      const fbToken = localStorage.getItem('fb_access_token');
      if (!fbToken) {
        toast.error('No hay token de acceso configurado');
        return;
      }

      // Obtener información del formulario
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${formId}?fields=id,name,status,created_time,leads_count`,
        { headers: { 'Authorization': `Bearer ${fbToken}` } }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al obtener el formulario');
      }

      const formData = await response.json();
      
      // Crear array con el único formulario
      const formWithInfo = [{
        ...formData,
        page_id: formId, // Usamos el mismo ID como referencia
        page_name: 'Formulario directo' // Nombre genérico
      }];

      setFacebookForms(formWithInfo);
      toast.success('Formulario encontrado');

    } catch (error) {
      console.error('Error cargando formulario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al cargar formulario: ${errorMessage}`);
      setFacebookForms([]);
    }
  };

  // Agregar query para obtener formularios guardados
  const { data: savedForms, refetch: refetchForms } = useQuery({
    queryKey: ["facebook-forms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facebook_forms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  // Modificar la función para guardar formulario
const saveFormById = async (formId: string) => {
  try {
    const fbToken = localStorage.getItem('fb_access_token');
    if (!fbToken) {
      toast.error('No hay token de acceso configurado');
      return;
    }

    // Verificar si el formulario ya existe
    const existingForm = savedForms?.find(f => f.form_id === formId);
    if (existingForm) {
      toast.error('Este formulario ya está registrado');
      return;
    }

    // Limpiar el ID del formulario
    const cleanFormId = formId.replace('form_', '');
    console.log('ID del formulario limpio:', cleanFormId);

    // Intentar obtener el formulario directamente
    const formResponse = await fetch(
      `https://graph.facebook.com/v18.0/${cleanFormId}?fields=id,name,status,created_time,leads_count,page`,
      { headers: { 'Authorization': `Bearer ${fbToken}` } }
    );
    
    const formData = await formResponse.json();
    console.log('Respuesta directa del formulario:', formData);
    
    if (formData.error) {
      throw new Error(`Error al obtener el formulario: ${formData.error.message}`);
    }
    
    // Guardar el formulario en la base de datos
    const { error: saveError } = await supabase
      .from("facebook_forms")
      .insert({
        form_id: formData.id,
        name: formData.name || `Formulario ${formData.id}`,
        status: formData.status || 'ACTIVE',
        leads_count: formData.leads_count || 0,
        page_id: formData.page?.id || 'direct_access',
        page_name: formData.page?.name || 'Acceso directo',
        page_access_token: fbToken
      });

    if (saveError) throw saveError;

    await refetchForms();
    toast.success('Formulario guardado correctamente');
    setSelectedPageId(''); // Limpiar input
    
  } catch (error) {
    console.error('Error completo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    toast.error(`Error al guardar formulario: ${errorMessage}`);
  }
};

  const handleWebhookDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("webhook_config")
        .update({ is_active: false })
        .eq("id", webhookConfig && 'id' in webhookConfig ? webhookConfig.id : '');

      if (error) throw error;
      toast.success("Configuracion de webhook eliminada correctamente");
      setShowWebhookDeleteModal(false);
      webHookConfigRemoved();
    } catch (error) {
      console.error("Error deleting webhook config:", error);
      toast.error("Error al eliminar la configuracion de webhook");
    } finally {
      setLoading(false);
    }
  };

  const webHookConfigRemoved = () => {
    // Actualizar la interfaz de usuario después de eliminar la configuración del webhook
    setWebhookToken("");
    setWebhookUrl("");
    queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
  };

  const handleAddLeadsToBatch = async (batchId: number) => {
    if (csvData.length === 0) {
      toast.error("No hay datos para cargar");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setCancelUpload(false);

      // Preparar los leads para la tabla leads
      const leadsToInsert = csvData
        .filter(lead => lead.nombre_completo) // Solo validar nombre_completo
        .map(lead => ({
          nombre_completo: lead.nombre_completo,
          email: lead.email || null, // Permitir email nulo
          telefono: lead.telefono || null,
          origen: "Batch",
          pais: lead.pais || null,
          filial: lead.filial || null,
          observaciones: lead.observaciones || null,
          estado: "SIN_LLAMAR",
          batch_id: batchId,
          is_from_batch: true,
          is_assigned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (leadsToInsert.length === 0) {
        throw new Error("No hay leads válidos para cargar");
      }

      // NUEVA LÓGICA: Dividir en lotes e insertar por partes
      const isLargeFile = leadsToInsert.length > LARGE_BATCH_THRESHOLD;
      const BATCH_SIZE = isLargeFile ? 250 : 500; // Lotes más pequeños para archivos grandes
      const DELAY_MS = isLargeFile ? 300 : 100; // Pausas más largas para archivos grandes
      
      const chunks = chunkArray(leadsToInsert, BATCH_SIZE);
      let insertedCount = 0;
      
      console.log(`Agregando leads al batch ${batchId}: ${leadsToInsert.length} leads en ${chunks.length} lotes de ${BATCH_SIZE}`);
      
      // Insertar lote por lote
      for (let i = 0; i < chunks.length; i++) {
        // Verificar si el usuario canceló
        if (cancelUpload) {
          toast.error("Carga cancelada por el usuario");
          return;
        }

        const chunk = chunks[i];
        
        try {
          const { error: leadsError } = await supabase
            .from("leads")
            .insert(chunk);

          if (leadsError) {
            console.error(`Error en lote ${i + 1}:`, leadsError);
            throw new Error(`Error al cargar el lote ${i + 1}: ${leadsError.message}`);
          }
          
          insertedCount += chunk.length;
          
          // Actualizar progreso
          const progress = Math.round((insertedCount / leadsToInsert.length) * 100);
          setUploadProgress(progress);
          
          console.log(`Lote ${i + 1}/${chunks.length} completado. Progreso: ${progress}% (${insertedCount}/${leadsToInsert.length})`);
          
          // Pausa entre lotes para no sobrecargar la DB
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        } catch (chunkError) {
          console.error(`Error específico en lote ${i + 1}:`, chunkError);
          throw chunkError;
        }
      }

      toast.success(`${insertedCount.toLocaleString()} leads agregados al batch exitosamente (procesados en ${chunks.length} lotes)`);
      setCsvData([]);
      setPreviewData([]);
      setIsAddingLeadsModalOpen(false);
      refetch();

    } catch (error) {
      console.error('Error en handleAddLeadsToBatch:', error);
      toast.error((error as Error).message || "Error al procesar la carga de leads");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCancelUpload(false);
    }
  };

  const handleUpdateBatchName = async (batchId: number, newName: string) => {
    if (!newName.trim()) {
      toast.error("El nombre del batch no puede estar vacío");
      return;
    }

    try {
      setIsUpdatingBatchName(true);
      
      const { error } = await supabase
        .from("lead_batches")
        .update({ name: newName.trim() })
        .eq("id", batchId);

      if (error) throw error;

      toast.success("Nombre del batch actualizado correctamente");
      setEditingBatchName(null);
      setNewBatchName("");
      refetch();

    } catch (error) {
      console.error('Error al actualizar nombre del batch:', error);
      toast.error("Error al actualizar el nombre del batch");
    } finally {
      setIsUpdatingBatchName(false);
    }
  };

  const startEditingBatchName = (batchId: number, currentName: string) => {
    setEditingBatchName(batchId);
    setNewBatchName(currentName);
  };

  const cancelEditingBatchName = () => {
    setEditingBatchName(null);
    setNewBatchName("");
  };

  // Funciones auxiliares para paginación y filtros
  const getFilteredLeads = (batch: Batch) => {
    const filter = leadsFilter[batch.id] || 'all';
    let filteredLeads = batch.leads;

    switch (filter) {
      case 'assigned':
        filteredLeads = batch.leads.filter(lead => lead.asignado_a);
        break;
      case 'unassigned':
        filteredLeads = batch.leads.filter(lead => !lead.asignado_a);
        break;
      default:
        filteredLeads = batch.leads;
    }

    return filteredLeads;
  };

  const getPaginatedLeads = (batch: Batch) => {
    const filteredLeads = getFilteredLeads(batch);
    const currentPage = leadsPage[batch.id] || 1;
    const startIndex = (currentPage - 1) * leadsPerPage;
    const endIndex = startIndex + leadsPerPage;
    
    return {
      leads: filteredLeads.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredLeads.length / leadsPerPage),
      currentPage,
      totalLeads: filteredLeads.length
    };
  };

  const handlePageChange = (batchId: number, page: number) => {
    setLeadsPage(prev => ({
      ...prev,
      [batchId]: page
    }));
  };

  const handleFilterChange = (batchId: number, filter: 'all' | 'assigned' | 'unassigned') => {
    setLeadsFilter(prev => ({
      ...prev,
      [batchId]: filter
    }));
    // Resetear a la primera página cuando cambia el filtro
    setLeadsPage(prev => ({
      ...prev,
      [batchId]: 1
    }));
  };

  const handleLeadsPerPageChange = (newValue: number) => {
    setLeadsPerPage(newValue);
    // Resetear todas las páginas a 1 cuando cambia el número de elementos por página
    setLeadsPage({});
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Campañas</h1>

      {/* Modal de confirmación para eliminar webhook */}
      <Dialog open={showWebhookDeleteModal} onOpenChange={setShowWebhookDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar desactivación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>¿Estás seguro que deseas desactivar este webhook? Esta acción eliminará la configuración actual.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowWebhookDeleteModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleWebhookDelete}
              disabled={loading}
            >
              {loading ? "Desactivando..." : "Desactivar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para evacuación de leads */}
      <Dialog open={showEvacuacionModal} onOpenChange={setShowEvacuacionModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Evacuar Leads Sin Llamar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Selecciona la empresa y el país para evacuar leads con estado SIN_LLAMAR. Esta acción quitará la asignación de todos los leads sin llamar en las estructuras seleccionadas.</p>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={evacuacionEmpresa || ""}
                  onChange={(e) => setEvacuacionEmpresa(e.target.value ? Number(e.target.value) : null)}
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
                  value={evacuacionPais || ""}
                  onChange={(e) => setEvacuacionPais(e.target.value ? Number(e.target.value) : null)}
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
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <p className="font-medium">Importante:</p>
              <ul className="list-disc list-inside pl-2">
                <li>Si seleccionas empresa y país, solo se evacuarán los leads de esas estructuras</li>
                <li>Si dejas ambos campos vacíos, se evacuarán TODOS los leads sin llamar del sistema</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEvacuacionModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => evacuarLeadsSinLlamar(evacuacionEmpresa || undefined, evacuacionPais || undefined)}
              disabled={loading}
            >
              {loading ? "Evacuando..." : "Evacuar Leads"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Botones de conexión */}
      <div className="flex gap-4">
        {/* Botón de Facebook - Oculto */}
        {/*
        <Dialog open={isFacebookModalOpen} onOpenChange={setIsFacebookModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-[200px]">
              <Facebook className="mr-2 h-4 w-4" />
              Conectar Facebook
            </Button>
          </DialogTrigger>
          ...resto del código del diálogo...
        </Dialog>
        */}

        {/* Botón de Webhook - Oculto */}
        {/*
        <Dialog open={isWebhookModalOpen} onOpenChange={setIsWebhookModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-[200px]">
              <Globe className="mr-2 h-4 w-4" />
              {webhookConfig?.is_active ? "Webhook Conectado" : "Conectar Web"}
            </Button>
          </DialogTrigger>
          ...resto del código del diálogo...
        </Dialog>
        */}

        <Dialog open={isMakeWebhookModalOpen} onOpenChange={setIsMakeWebhookModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-[200px]">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Conectar con Make
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Configurar Make para Facebook Leads</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {makeWebhookToken ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
                    <p className="text-sm text-green-800">
                      ✓ El webhook está listo para ser usado con Make
                    </p>
                    {makeLeadsCount > 0 && (
                      <p className="text-sm text-green-600">
                        Leads recibidos desde Facebook en los últimos 30 días: {makeLeadsCount}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>URL del Webhook para Make</Label>
                    <div className="flex gap-2">
                      <Input value={makeWebhookUrl} readOnly />
                      <Button onClick={copyMakeWebhookUrl}>
                        Copiar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Probar el Webhook</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={async () => {
                          try {
                            toast.loading("Enviando datos de prueba...");
                            
                            const testData = {
                              nombre_completo: "Cliente Prueba",
                              email: "prueba@ejemplo.com",
                              telefono: "123456789",
                              origen: "Test desde UI",
                              observaciones: "Lead de prueba generado manualmente"
                            };
                            
                            const response = await fetch(makeWebhookUrl, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(testData)
                            });
                            
                            const result = await response.json();
                            
                            if (response.ok) {
                              toast.success("Prueba exitosa: Lead de prueba creado correctamente");
                              refetch(); // Actualizar los datos para mostrar el nuevo lead
                            } else {
                              throw new Error(result.message || "Error en la respuesta del servidor");
                            }
                          } catch (error) {
                            console.error("Error al probar webhook:", error);
                            toast.error(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
                          }
                        }}
                      >
                        Enviar Lead de Prueba
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esto enviará datos de prueba al webhook para verificar que todo está configurado correctamente
                    </p>
                  </div>

                  {recentMakeLeads.length > 0 && (
                    <div className="space-y-2">
                      <Label>Últimos leads de Facebook recibidos:</Label>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Teléfono</TableHead>
                              <TableHead>Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentMakeLeads.map((lead) => (
                              <TableRow key={lead.id}>
                                <TableCell>{lead.nombre_completo}</TableCell>
                                <TableCell>{lead.email}</TableCell>
                                <TableCell>{lead.telefono}</TableCell>
                                <TableCell>
                                  {new Date(lead.created_at).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Formato de datos esperado</Label>
                    <div className="rounded-md bg-gray-50 p-4 text-sm font-mono">
                      {`{
  "nombre_completo": "Nombre del lead",
  "email": "email@ejemplo.com",
  "telefono": "+123456789",
  "origen": "Facebook",
  "observaciones": "Lead de Facebook via Make"
}`}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Configuración en Make</Label>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Crea un escenario en Make.com</li>
                      <li>Añade un módulo trigger "Facebook Lead Ads"</li>
                      <li>Selecciona tu página y formulario</li>
                      <li>Añade un módulo HTTP para enviar datos a este webhook</li>
                      <li>Mapea los campos según el formato mostrado arriba</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Label>Guía detallada</Label>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="config-make">
                        <AccordionTrigger>Configuración paso a paso</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 text-sm">
                            <div className="space-y-2">
                              <h4 className="font-semibold">1. Crear un escenario en Make</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li>Inicia sesión en <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Make.com</a></li>
                                <li>Haz clic en "Crear un nuevo escenario"</li>
                                <li>Elige un nombre descriptivo (ej. "Facebook Leads a CRM")</li>
                              </ul>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-semibold">2. Configurar Facebook Lead Ads</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li>Busca y selecciona el módulo "Facebook Lead Ads" como trigger</li>
                                <li>Crea una conexión con Facebook (sigue los pasos de autenticación)</li>
                                <li>Selecciona la página de Facebook que contiene el formulario</li>
                                <li>Elige el formulario de leads específico</li>
                                <li>Configura la frecuencia de verificación (recomendado: 15 minutos)</li>
                              </ul>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-semibold">3. Añadir módulo HTTP</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li>Añade un nuevo módulo y selecciona "HTTP"</li>
                                <li>Configura el método como "POST"</li>
                                <li>En URL, pega la URL del webhook mostrada arriba</li>
                                <li>En "Tipo de contenido", selecciona "application/json"</li>
                              </ul>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-semibold">4. Mapear los campos</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li>En el cuerpo de la solicitud, configura un objeto JSON con:</li>
                                <li className="pl-4">nombre_completo: Mapea al campo de nombre completo del lead</li>
                                <li className="pl-4">email: Mapea al campo de email del lead</li>
                                <li className="pl-4">telefono: Mapea al campo de teléfono del lead</li>
                                <li className="pl-4">origen: Escribe "Facebook" o el nombre de la campaña</li>
                                <li className="pl-4">observaciones: Puedes incluir información adicional</li>
                              </ul>
                              <div className="bg-gray-50 p-3 rounded-md font-mono text-xs">
                                {`{
  "nombre_completo": {{1.lead_id.field_data.full_name.values.[0]}},
  "email": {{1.lead_id.field_data.email.values.[0]}},
  "telefono": {{1.lead_id.field_data.phone_number.values.[0]}},
  "origen": "Facebook",
  "observaciones": "Formulario: {{1.form_id.name}}"
}`}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-semibold">5. Activar el escenario</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li>Guarda el escenario haciendo clic en "Guardar"</li>
                                <li>Activa el escenario con el botón "Ejecutar una vez" para probar</li>
                                <li>Si no hay errores, activa la programación para que se ejecute automáticamente</li>
                              </ul>
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                              <p className="text-blue-800 font-medium">Consejos:</p>
                              <ul className="list-disc list-inside pl-2 text-blue-700">
                                <li>Puedes añadir filtros para procesar solo ciertos leads</li>
                                <li>Configura notificaciones de error para que te alerten si algo falla</li>
                                <li>En la primera ejecución, Make puede procesar leads anteriores</li>
                              </ul>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="troubleshooting">
                        <AccordionTrigger>Solución de problemas</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 text-sm">
                            <div className="space-y-2">
                              <h4 className="font-semibold">Problemas comunes</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li><span className="font-medium">Los leads no llegan:</span> Verifica que el escenario esté activo y que el webhook URL sea correcto</li>
                                <li><span className="font-medium">Error de formato:</span> Asegúrate de que el formato JSON sea exactamente como se muestra</li>
                                <li><span className="font-medium">Campos faltantes:</span> Algunos formularios pueden tener nombres de campo diferentes, ajusta el mapeo</li>
                                <li><span className="font-medium">Límites de Make:</span> Verifica los límites de operaciones de tu plan en Make</li>
                              </ul>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-semibold">Para probar el webhook</h4>
                              <ul className="list-disc list-inside pl-2 space-y-1">
                                <li>Puedes usar Postman o similar para enviar un POST con datos de prueba</li>
                                <li>Asegúrate de incluir al menos los campos obligatorios (nombre_completo, email)</li>
                              </ul>
                              <div className="bg-gray-50 p-3 rounded-md font-mono text-xs">
                                {`// Ejemplo de datos para prueba
{
  "nombre_completo": "Cliente Prueba",
  "email": "prueba@ejemplo.com",
  "telefono": "123456789",
  "origen": "Facebook Test",
  "observaciones": "Lead de prueba"
}`}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsMakeWebhookModalOpen(false)}
                    >
                      Cerrar
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={deactivateMakeWebhook}
                    >
                      Desactivar Webhook
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Configura un webhook para recibir leads de Facebook a través de Make:
                  </p>
                  
                  <div className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Genera un token único para tu webhook</li>
                      <li>Usa la URL generada en tu escenario de Make</li>
                      <li>Conecta Facebook Lead Ads con Make</li>
                      <li>Configura Make para enviar los datos a este webhook</li>
                    </ol>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsMakeWebhookModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={generateMakeWebhookToken}>
                      Generar Token
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Nuevo botón para evacuación manual */}
        <Button 
          variant="outline" 
          className="w-[200px]"
          onClick={() => setShowEvacuacionModal(true)}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
            />
          </svg>
          Forzar Evacuación
        </Button>
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
                          {previewData.length === 0 ? (
                            [...Array(3)].map((_, index) => (
                              <TableRow key={index}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              </TableRow>
                            ))
                          ) : (
                            previewData.map((lead, index) => (
                              <TableRow key={index}>
                                <TableCell>{lead.nombre_completo}</TableCell>
                                <TableCell>{lead.email}</TableCell>
                                <TableCell>{lead.telefono}</TableCell>
                                <TableCell>{lead.pais}</TableCell>
                                <TableCell>{lead.filial}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Indicador de progreso para cargas grandes */}
                    {isUploading && (
                      <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">
                            Cargando leads... {uploadProgress}%
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelUpload(true)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Cancelar
                          </Button>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-700">
                          {csvData.length > LARGE_BATCH_THRESHOLD 
                            ? "Este es un archivo grande. La carga puede tardar varios minutos."
                            : "Procesando leads en lotes para optimizar el rendimiento."
                          }
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsBatchUploadModalOpen(false);
                          setCsvData([]);
                          setPreviewData([]);
                          setCancelUpload(false);
                        }}
                        disabled={isUploading}
                      >
                        {isUploading ? "Cargando..." : "Cancelar"}
                      </Button>
                      <Button 
                        onClick={handleBatchUpload}
                        disabled={isUploading || csvData.length === 0}
                      >
                        {isUploading 
                          ? `Procesando... ${uploadProgress}%` 
                          : `Cargar ${csvData.length.toLocaleString()} Leads`
                        }
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Skeleton loading para batches */}
        {!batches && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-18" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Accordion type="multiple" className="space-y-4">
          {batches?.map((batch: Batch) => (
            <AccordionItem
              key={batch.id}
              value={batch.id.toString()}
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    {editingBatchName === batch.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newBatchName}
                          onChange={(e) => setNewBatchName(e.target.value)}
                          className="font-semibold"
                          disabled={isUpdatingBatchName}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateBatchName(batch.id, newBatchName);
                            } else if (e.key === 'Escape') {
                              cancelEditingBatchName();
                            }
                          }}
                          autoFocus
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateBatchName(batch.id, newBatchName);
                          }}
                          className="p-1 h-8 w-8 border rounded cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                          style={{ opacity: isUpdatingBatchName ? 0.5 : 1, pointerEvents: isUpdatingBatchName ? 'none' : 'auto' }}
                        >
                          {isUpdatingBatchName ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditingBatchName();
                          }}
                          className="p-1 h-8 w-8 border rounded cursor-pointer hover:bg-gray-50 flex items-center justify-center"
                          style={{ opacity: isUpdatingBatchName ? 0.5 : 1, pointerEvents: isUpdatingBatchName ? 'none' : 'auto' }}
                        >
                          <X className="h-3 w-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{batch.name}</span>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingBatchName(batch.id, batch.name);
                          }}
                          className="p-1 h-6 w-6 opacity-50 hover:opacity-100 cursor-pointer rounded"
                        >
                          <Edit className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {new Date(batch.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Total: {batch.leads.length}
                      </span>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        Asignados: {batch.leads.filter(lead => lead.asignado_a).length}
                      </span>
                      <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Sin Asignar: {batch.leads.filter(lead => !lead.asignado_a).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatchForUpload(batch.id);
                        setIsAddingLeadsModalOpen(true);
                      }}
                      className="border border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 rounded cursor-pointer text-sm flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Agregar Leads
                    </div>
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
                      {isLoadingEstructuras ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Empresa</Label>
                            <Skeleton className="h-10 w-full rounded-md" />
                          </div>
                          <div className="space-y-2">
                            <Label>País</Label>
                            <Skeleton className="h-10 w-full rounded-md" />
                          </div>
                        </div>
                      ) : (
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
                      )}
                      <Button 
                        className="w-full"
                        disabled={!selectedEmpresa || !selectedPais || isLoadingEstructuras}
                        onClick={() => handleVincularEstructuras(batch.id, selectedEmpresa!, selectedPais!)}
                      >
                        {isLoadingEstructuras ? "Cargando..." : "Vincular y Distribuir Leads"}
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
                              || batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Empresa')?.estructuras.nombre
                              || <span className="text-gray-400">No vinculado</span>
                            }
                          </span>
                          <span>
                            <strong>País:</strong> {
                              batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Paises')?.estructuras.custom_name
                              || batch.batch_estructura_permisos.find(be => be.estructuras.tipo === 'Paises')?.estructuras.nombre
                              || <span className="text-gray-400">No vinculado</span>
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
                                await distribuirLeads(batch.id);
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
                    {/* Controles de filtro y paginación */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        {/* Filtros */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Filtrar:</Label>
                            <select
                              className="text-sm border rounded px-2 py-1"
                              value={leadsFilter[batch.id] || 'all'}
                              onChange={(e) => handleFilterChange(batch.id, e.target.value as 'all' | 'assigned' | 'unassigned')}
                            >
                              <option value="all">Todos</option>
                              <option value="assigned">Asignados</option>
                              <option value="unassigned">No Asignados</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Por página:</Label>
                            <select
                              className="text-sm border rounded px-2 py-1"
                              value={leadsPerPage}
                              onChange={(e) => handleLeadsPerPageChange(Number(e.target.value))}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>

                        {/* Información de paginación */}
                        {(() => {
                          const paginationInfo = getPaginatedLeads(batch);
                          return (
                            <div className="text-sm text-gray-600">
                              Mostrando {((paginationInfo.currentPage - 1) * leadsPerPage) + 1} - {Math.min(paginationInfo.currentPage * leadsPerPage, paginationInfo.totalLeads)} de {paginationInfo.totalLeads} leads
                            </div>
                          );
                        })()}
                      </div>
                    </div>

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
                        {(() => {
                          const paginationInfo = getPaginatedLeads(batch);
                          
                          if (paginationInfo.leads.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                  {paginationInfo.totalLeads === 0 
                                    ? "No hay leads en este batch" 
                                    : "No hay leads que coincidan con el filtro seleccionado"
                                  }
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return paginationInfo.leads.map((lead) => (
                            <TableRow key={lead.id}>
                              <TableCell>{lead.nombre_completo}</TableCell>
                              <TableCell>{lead.email}</TableCell>
                              <TableCell>{lead.telefono}</TableCell>
                              <TableCell>
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${lead.estado === 'LLAMAR_DESPUES' ? 'bg-blue-100 text-blue-800' :
                                    lead.estado === 'CITA_PROGRAMADA' ? 'bg-yellow-100 text-yellow-800' :
                                    lead.estado === 'MATRICULA' ? 'bg-green-100 text-green-800' :
                                    lead.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
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
                          ));
                        })()}
                      </TableBody>
                    </Table>

                    {/* Controles de paginación */}
                    {(() => {
                      const paginationInfo = getPaginatedLeads(batch);
                      
                      if (paginationInfo.totalPages <= 1) return null;

                      const renderPageNumbers = () => {
                        const pages = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, paginationInfo.currentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(paginationInfo.totalPages, startPage + maxVisiblePages - 1);
                        
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }

                        // Primera página
                        if (startPage > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => handlePageChange(batch.id, 1)}
                              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                            >
                              1
                            </button>
                          );
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipsis1" className="px-2 py-1 text-sm text-gray-500">
                                ...
                              </span>
                            );
                          }
                        }

                        // Páginas del medio
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => handlePageChange(batch.id, i)}
                              className={`px-3 py-1 text-sm border rounded ${
                                i === paginationInfo.currentPage
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }

                        // Última página
                        if (endPage < paginationInfo.totalPages) {
                          if (endPage < paginationInfo.totalPages - 1) {
                            pages.push(
                              <span key="ellipsis2" className="px-2 py-1 text-sm text-gray-500">
                                ...
                              </span>
                            );
                          }
                          pages.push(
                            <button
                              key={paginationInfo.totalPages}
                              onClick={() => handlePageChange(batch.id, paginationInfo.totalPages)}
                              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                            >
                              {paginationInfo.totalPages}
                            </button>
                          );
                        }

                        return pages;
                      };

                      return (
                        <div className="p-4 border-t bg-gray-50">
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-600">
                              Página {paginationInfo.currentPage} de {paginationInfo.totalPages}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePageChange(batch.id, paginationInfo.currentPage - 1)}
                                disabled={paginationInfo.currentPage === 1}
                                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Anterior
                              </button>
                              
                              <div className="flex items-center gap-1">
                                {renderPageNumbers()}
                              </div>
                              
                              <button
                                onClick={() => handlePageChange(batch.id, paginationInfo.currentPage + 1)}
                                disabled={paginationInfo.currentPage === paginationInfo.totalPages}
                                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Siguiente
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Agregar el nuevo modal para añadir leads a un batch existente */}
      <Dialog open={isAddingLeadsModalOpen} onOpenChange={setIsAddingLeadsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Agregar Leads al Batch</DialogTitle>
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
                      {previewData.length === 0 ? (
                        [...Array(3)].map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        previewData.map((lead, index) => (
                          <TableRow key={index}>
                            <TableCell>{lead.nombre_completo}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.telefono}</TableCell>
                            <TableCell>{lead.pais}</TableCell>
                            <TableCell>{lead.filial}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Indicador de progreso para cargas grandes */}
                {isUploading && (
                  <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        Agregando leads... {uploadProgress}%
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelUpload(true)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Cancelar
                      </Button>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-700">
                      {csvData.length > LARGE_BATCH_THRESHOLD 
                        ? "Este es un archivo grande. La carga puede tardar varios minutos."
                        : "Procesando leads en lotes para optimizar el rendimiento."
                      }
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingLeadsModalOpen(false);
                      setCsvData([]);
                      setPreviewData([]);
                      setCancelUpload(false);
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? "Cargando..." : "Cancelar"}
                  </Button>
                  <Button 
                    onClick={() => selectedBatchForUpload && handleAddLeadsToBatch(selectedBatchForUpload)}
                    disabled={isUploading || csvData.length === 0}
                  >
                    {isUploading 
                      ? `Procesando... ${uploadProgress}%` 
                      : `Agregar ${csvData.length.toLocaleString()} Leads`
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campanas;
