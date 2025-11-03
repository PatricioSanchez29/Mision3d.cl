// Supabase Orders Integration
// Este archivo permite guardar pedidos en Supabase asociados al usuario autenticado.
// Incluye funciones para insertar pedidos y obtener el usuario actual.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuración de Supabase (reemplaza con tus claves reales si es necesario)
const SUPABASE_URL = 'https://ytuwkynphdttotifgyaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dXdreW5waGR0dG90aWZneWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODUyMzYsImV4cCI6MjA3NzM2MTIzNn0.JIFDBzpYTcChc1fnmp6pFL0K9SZPnn2ltp4iKxLdSus';

// Singleton en el navegador para evitar múltiples GoTrueClient
let supabase;
try {
  if (typeof window !== 'undefined' && window.__supabaseClient) {
    supabase = window.__supabaseClient;
  } else {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (typeof window !== 'undefined') window.__supabaseClient = supabase;
  }
} catch {
  // Fallback por si window no existe (SSR/otros entornos)
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export { supabase };

// Obtiene el usuario autenticado actual
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// Guarda un pedido en la tabla "pedidos" de Supabase
export async function saveOrderSupabase(pedido) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para registrar tu pedido.');
  // Asociar el pedido al usuario
  const pedidoData = { ...pedido, user_id: user.id };
  const { data, error } = await supabase.from('pedidos').insert([pedidoData]).select('id');
  if (error) throw error;
  return data && data[0];
}
