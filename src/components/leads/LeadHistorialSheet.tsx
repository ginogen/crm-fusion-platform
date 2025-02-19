import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import type { LeadEstado } from "@/lib/types";

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

const formatAction = (action: string) => {
  const actionMap: { [key: string]: string } = {
    'LEAD_CREATED': 'Lead Creado',
    'LEAD_UPDATED': 'Lead Actualizado',
    'LEAD_ASSIGNED': 'Lead Asignado',
    'STATUS_CHANGED': 'Estado Cambiado',
    'COMMENT_ADDED': 'Comentario Agregado',
    'CAMBIO_ESTADO': 'Cambio de Estado',
    'ACTUALIZACIÓN': 'Actualización',
    // ... otros mappings según necesites
  };
  
  return actionMap[action] || action;
};

interface LeadHistorialSheetProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadHistorialSheet = ({ lead, isOpen, onClose }: LeadHistorialSheetProps) => {
  const { data: historial } = useQuery({
    queryKey: ["lead-history", lead?.id],
    queryFn: async () => {
      const { data: historialData, error: historialError } = await supabase
        .from("lead_history")
        .select('*')
        .eq("lead_id", Number(lead.id))
        .order("created_at", { ascending: false });

      if (historialError) throw historialError;

      if (!historialData || historialData.length === 0) return [];

      const userIds = historialData.map(item => item.user_id).filter(Boolean);
      
      let usersData = [];
      if (userIds.length > 0) {
        const { data: userData, error: usersError } = await supabase
          .from("users")
          .select("id, nombre_completo")
          .in("id", userIds);

        if (usersError) throw usersError;
        usersData = userData || [];
      }

      return historialData.map(item => ({
        ...item,
        users: usersData.find(user => user.id === item.user_id) || { nombre_completo: 'Usuario no encontrado' }
      }));
    },
    enabled: !!lead?.id
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-2xl">Historial del Lead</SheetTitle>
          <SheetDescription>
            Información completa y acciones realizadas para {lead?.nombre_completo}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-8">
          <Card className="p-6 bg-muted/50">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Nombre Completo</h4>
                <p className="font-medium">{lead?.nombre_completo}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                <p className="font-medium">{lead?.email}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Teléfono</h4>
                <p className="font-medium">{lead?.telefono}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Estado</h4>
                <div className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  lead?.estado === "SIN_LLAMAR" && "bg-gray-100 text-gray-800",
                  lead?.estado === "LLAMAR_DESPUES" && "bg-blue-100 text-blue-800",
                  lead?.estado === "CITA_PROGRAMADA" && "bg-yellow-100 text-yellow-800",
                  lead?.estado === "MATRICULA" && "bg-green-100 text-green-800"
                )}>
                  {LEAD_STATUS_LABELS[lead?.estado as LeadEstado] || lead?.estado}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Asignado a</h4>
                <p className="font-medium">{lead?.users?.nombre_completo || "Sin asignar"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Fecha de creación</h4>
                <p className="font-medium">{format(new Date(lead?.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Historial de Acciones</h3>
            <div className="space-y-6">
              {historial && historial.length > 0 ? (
                historial.map((item, index) => (
                  <div key={index} className="relative pl-8 pb-6">
                    {index !== historial.length - 1 && (
                      <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    
                    <Card className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-base">{formatAction(item.action)}</p>
                          <p className="text-sm text-muted-foreground">
                            Realizado por: {item.users?.nombre_completo}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                        </div>
                      </div>
                      {item.details && (
                        <div className="mt-3 text-sm bg-muted/50 p-3 rounded-md whitespace-pre-line border">
                          {formatHistoryDetails(item.details)}
                        </div>
                      )}
                    </Card>
                  </div>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No hay registros en el historial</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 