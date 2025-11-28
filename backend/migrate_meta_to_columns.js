/*
  Script de migración ligero: copia campos comunes desde `meta` hacia columnas top-level
  Uso: desde carpeta `backend` (mismo entorno que tu servidor)
    PS> node migrate_meta_to_columns.js

  Requisitos:
  - Tener instaladas dependencias en backend (npm install @supabase/supabase-js dotenv)
  - Archivo .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (service role)

  Nota: El script actualiza filas una a una e imprime resumen.
*/
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

(async () => {
  try {
    console.log('Buscando pedidos con meta para migrar...');
    // Ajusta el filtro si quieres limitar por fecha/estado
    const { data: rows, error } = await supabase
      .from('pedidos')
      .select('id, meta, address, phone')
      .limit(1000);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      console.log('No hay filas encontradas.');
      return;
    }

    let updated = 0;
    for (const row of rows) {
      const id = row.id;
      const meta = row.meta || {};
      const toUpdate = {};

      // Si ya existe valor top-level, saltar
      if (!row.address) {
        const addr = meta.address || meta.direccion || meta.direccion_completa || meta.addressLine || meta.shipping_address || meta.address_line;
        if (addr) toUpdate.address = addr;
      }
      if (!row.phone) {
        const ph = meta.phone || meta.telefono || meta.contact_phone || meta.phone_number || meta.phoneContact;
        if (ph) toUpdate.phone = ph;
      }

      if (Object.keys(toUpdate).length === 0) continue; // nada que actualizar

      const { error: upErr } = await supabase.from('pedidos').update(toUpdate).eq('id', id);
      if (upErr) {
        console.warn('Error actualizando id', id, upErr.message || upErr);
      } else {
        updated++;
        console.log('Actualizado id', id, toUpdate);
      }
    }

    console.log(`Migración finalizada. Filas actualizadas: ${updated}`);
  } catch (e) {
    console.error('Error en migración:', e?.message || e);
    process.exit(1);
  }
})();
