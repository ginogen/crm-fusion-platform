import { createClient } from '@supabase/supabase-js';

// Crear cliente de Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Constantes para batch de Facebook
const FACEBOOK_BATCH_NAME = "Facebook Ads";

// Función para asegurar que existe el batch de Facebook
async function getFacebookBatchId() {
  try {
    console.log(`Buscando batch de Facebook con nombre "${FACEBOOK_BATCH_NAME}"...`);
    
    // Buscar el batch de Facebook
    const { data: existingBatch, error: searchError } = await supabase
      .from("lead_batches")
      .select("id, name")
      .eq("name", FACEBOOK_BATCH_NAME)
      .single();
    
    if (searchError) {
      console.log("No se encontró el batch, error:", searchError.message);
    }
    
    if (existingBatch) {
      console.log(`Batch "${FACEBOOK_BATCH_NAME}" encontrado con ID: ${existingBatch.id}`);
      return existingBatch.id;
    } else {
      console.log(`Batch "${FACEBOOK_BATCH_NAME}" no encontrado. Creando nuevo batch...`);
      
      // Crear el batch si no existe
      const { data: newBatch, error } = await supabase
        .from("lead_batches")
        .insert({
          name: FACEBOOK_BATCH_NAME,
          source: "bulk"
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error al crear el batch "${FACEBOOK_BATCH_NAME}":`, error);
        throw error;
      }
      
      console.log(`✅ Nuevo batch "${FACEBOOK_BATCH_NAME}" creado exitosamente con ID: ${newBatch.id}`);
      return newBatch.id;
    }
  } catch (error) {
    console.error(`Error al obtener/crear batch "${FACEBOOK_BATCH_NAME}":`, error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.query.token;
    
    // Verificar token
    const { data: webhookConfig } = await supabase
      .from("webhook_config")
      .select("*")
      .eq("webhook_token", token)
      .single();

    if (!webhookConfig || !webhookConfig.is_active) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const formData = req.body;
    console.log("Webhook recibido con datos:", JSON.stringify(formData, null, 2));
    
    // Determinar si es un lead de Facebook
    const isFacebookLead = formData.field_data || 
                          (formData.origen && formData.origen.toLowerCase().includes('facebook'));
    
    // Siempre usar el batch de Facebook para leads de Make/Facebook
    let batchId;
    if (isFacebookLead) {
      batchId = await getFacebookBatchId();
      console.log(`Procesando lead de Facebook, usando batch ID: ${batchId} (${FACEBOOK_BATCH_NAME})`);
    } else {
      // Para otros leads (no Facebook), usar el batch web estándar
      const { data: webBatch } = await supabase
        .from("lead_batches")
        .select("id")
        .eq("name", "Leads Web")
        .single();
      
      if (webBatch) {
        batchId = webBatch.id;
      } else {
        // Crear batch web si no existe
        const { data: newBatch } = await supabase
          .from("lead_batches")
          .insert({
            name: "Leads Web",
            source: "bulk"
          })
          .select()
          .single();
        
        batchId = newBatch?.id;
      }
    }

    // Extraer nombre, email y teléfono según la estructura
    let nombre = formData.nombre_completo || "";
    let email = formData.email || "";
    let telefono = formData.telefono || "";
    let observaciones = formData.observaciones || "";
    let estado = formData.estado || "SIN_LLAMAR"; // Estado por defecto: SIN_LLAMAR
    const origen = isFacebookLead ? "Facebook" : (formData.origen || "Web");
    
    // En algunos casos, Make puede enviar los datos en una estructura diferente
    if (formData.field_data) {
      // Formato alternativo desde Facebook lead
      const fullNameField = formData.field_data.find(f => f.name === 'full_name' || f.name === 'nombre_completo');
      const emailField = formData.field_data.find(f => f.name === 'email');
      const phoneField = formData.field_data.find(f => f.name === 'phone_number' || f.name === 'telefono');
      
      if (fullNameField && fullNameField.values && fullNameField.values.length > 0) {
        nombre = fullNameField.values[0];
      }
      
      if (emailField && emailField.values && emailField.values.length > 0) {
        email = emailField.values[0];
      }
      
      if (phoneField && phoneField.values && phoneField.values.length > 0) {
        telefono = phoneField.values[0];
      }
      
      // Información adicional para observaciones
      observaciones = `Lead de Facebook recibido el ${new Date().toLocaleString()}. Form ID: ${formData.form_id || 'N/A'}`;
    }

    // Validar campos requeridos
    if (!nombre || !email) {
      console.error("Datos incompletos:", formData);
      return res.status(400).json({ 
        success: false, 
        message: "Datos incompletos: se requiere nombre_completo y email" 
      });
    }

    // Insertar el lead
    console.log(`Insertando lead en batch_id: ${batchId} - Datos: nombre=${nombre}, email=${email}, telefono=${telefono}, origen=${origen}, estado=${estado}`);
    
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        batch_id: batchId,
        nombre_completo: nombre,
        email: email,
        telefono: telefono,
        origen: origen,
        estado: estado,
        observaciones: observaciones,
        created_at: new Date().toISOString(),
        is_from_batch: true,
        pais: formData.pais || "Chile"
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error insertando lead:", leadError);
      throw leadError;
    }

    const batchName = isFacebookLead ? FACEBOOK_BATCH_NAME : "Leads Web";
    console.log(`✅ Lead guardado exitosamente en tabla 'leads' con batch "${batchName}" - ID del lead: ${lead.id}`);

    // Incrementar contador de leads en webhookConfig
    const updateData = {
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
    return res.status(200).json({
      success: true,
      message: `Lead ${nombre} recibido correctamente`,
      lead_id: lead?.id,
      batch_id: batchId
    });
    
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
} 