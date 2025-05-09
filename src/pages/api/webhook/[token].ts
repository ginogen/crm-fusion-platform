import { supabase } from "@/integrations/supabase/client";

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
    
    // Determinar el origen y el nombre del batch según la fuente
    let batchName = "Leads Web";
    let source = "WEB";
    let origen = formData.origen || "Web";
    
    // Si el origen indica Facebook, usar configuración específica
    // Ya no dependemos de webhook_name que no existe
    if (origen.toLowerCase().includes("facebook")) {
      batchName = "Leads Facebook vía Make";
      source = "FACEBOOK";
      origen = "Facebook";
    }
    
    console.log(`Procesando lead desde ${origen}, batch: ${batchName}`);
    
    // Buscar el batch correspondiente o crearlo
    const { data: existingBatch } = await supabase
      .from("lead_batches")
      .select("id")
      .eq("name", batchName)
      .single();

    let batchId;
    
    if (existingBatch) {
      batchId = existingBatch.id;
    } else {
      // Crear el batch si no existe
      const { data: newBatch } = await supabase
        .from("lead_batches")
        .insert({
          name: batchName,
          source: source
        })
        .select()
        .single();
      
      batchId = newBatch?.id;
    }

    // Validar campos requeridos
    if (!formData.nombre_completo || !formData.email) {
      console.error("Datos incompletos:", formData);
      return new Response("Datos incompletos: se requiere nombre_completo y email", { status: 400 });
    }

    // Extraer campos adicionales para Facebook leads
    let telefono = formData.telefono || "";
    let observaciones = formData.observaciones || "";
    
    // En algunos casos, Make puede enviar los datos en una estructura diferente
    if (formData.field_data) {
      // Formato alternativo desde Facebook lead
      const fullNameField = formData.field_data.find(f => f.name === 'full_name' || f.name === 'nombre_completo');
      const emailField = formData.field_data.find(f => f.name === 'email');
      const phoneField = formData.field_data.find(f => f.name === 'phone_number' || f.name === 'telefono');
      
      if (fullNameField && fullNameField.values && fullNameField.values.length > 0) {
        formData.nombre_completo = fullNameField.values[0];
      }
      
      if (emailField && emailField.values && emailField.values.length > 0) {
        formData.email = emailField.values[0];
      }
      
      if (phoneField && phoneField.values && phoneField.values.length > 0) {
        telefono = phoneField.values[0];
      }
      
      // Información adicional para observaciones
      observaciones = `Lead de Facebook recibido el ${new Date().toLocaleString()}. Form ID: ${formData.form_id || 'N/A'}`;
    }

    // Insertar el lead
    const { data: lead, error: leadError } = await supabase
      .from("campaign_leads")
      .insert({
        batch_id: batchId,
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        telefono: telefono,
        origen: origen,
        estado: "PENDIENTE",
        observaciones: observaciones,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error insertando lead:", leadError);
      throw leadError;
    }

    // Incrementar contador de leads en webhookConfig
    // Creamos un objeto de actualización solo con last_used
    // por si leads_count no existe en la tabla
    const updateData: any = {
      last_used: new Date().toISOString()
    };
    
    // Solo incluimos leads_count si ya existe un valor previo
    if (typeof webhookConfig.leads_count !== 'undefined') {
      updateData.leads_count = webhookConfig.leads_count ? webhookConfig.leads_count + 1 : 1;
    }
    
    await supabase
      .from("webhook_config")
      .update(updateData)
      .eq("id", webhookConfig.id);

    // Devolver respuesta con información del lead
    return new Response(JSON.stringify({
      success: true,
      message: `Lead ${formData.nombre_completo} recibido correctamente`,
      lead_id: lead?.id
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error en webhook:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : "Error desconocido"
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 