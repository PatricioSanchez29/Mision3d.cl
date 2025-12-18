// Pega esto en la consola del navegador (F12) en mision3d.cl
import { supabase } from './supabase-orders.js';
const { data } = await supabase.from('pedidos').select('id,email,user_id,created_at').eq('email', 'pato_4522@hotmail.com');
console.table(data);
