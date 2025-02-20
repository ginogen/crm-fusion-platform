import { supabase } from "@/integrations/supabase/client";
import { toast } from "react-hot-toast";
import { useQueryClient } from "react-query";

export async function POST(request: Request) {
  try {
    const token = request.url.split("/").pop();
    
    // Verificar token
    const { data: webhookConfig } = await supabase
      .from("webhook_config")
      .select("*")
      .eq("webhook_token", token)
      .single();

    if (!webhookConfig || !webhookConfig.is_active) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await request.json();

    // Usar un batch fijo para todos los leads web
    const batchName = "Leads Web";
    
    const { data: existingBatch } = await supabase
      .from("lead_batches")
      .select("id")
      .eq("name", batchName)
      .single();

    let batchId;
    
    if (existingBatch) {
      batchId = existingBatch.id;
    } else {
      // Crear el batch "Leads Web" si no existe
      const { data: newBatch } = await supabase
        .from("lead_batches")
        .insert({
          name: batchName,
          source: "WEB"
        })
        .select()
        .single();
      
      batchId = newBatch?.id;
    }

    // Insertar el lead
    const { error: leadError } = await supabase
      .from("campaign_leads")
      .insert({
        batch_id: batchId,
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        telefono: formData.telefono,
        origen: formData.origen || "Web",
        estado: "PENDIENTE",
        observaciones: formData.observaciones
      });

    if (leadError) {
      throw leadError;
    }

    // Enviar notificación al cliente
    toast.success(`Nuevo lead recibido: ${formData.nombre_completo}`);
    
    // Refrescar la query de leads
    const queryClient = useQueryClient();
    queryClient.invalidateQueries(["today-webhook-leads"]);
    queryClient.invalidateQueries(["batches"]);

    return new Response("Success", { status: 200 });
  } catch (error) {
    console.error("Error en webhook:", error);
    return new Response("Error interno", { status: 500 });
  }
} 