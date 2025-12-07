#!/usr/bin/env node

/**
 * Script para probar las validaciones de seguridad del webhook de Flow
 * Uso: node test-webhook-security.js
 */

import crypto from 'crypto';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const FLOW_SECRET = process.env.FLOW_SECRET || 'tu_secret_flow';

// Función para generar firma (igual a la del backend)
function flowSign(params, secret) {
  const keys = Object.keys(params).sort();
  const toSign = keys.map(k => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
}

console.log('🧪 Testing Webhook Security\n');

// Test 1: Webhook sin firma (debería advertir pero aceptar)
async function testSinFirma() {
  console.log('1️⃣  Test: Webhook SIN firma');
  try {
    const res = await axios.post(`${BASE_URL}/flow/confirm`, {
      token: 'test_token_sin_firma_' + Date.now()
    }, {
      validateStatus: () => true // No lanzar error en 4xx/5xx
    });
    
    if (res.status === 400 && res.data.error) {
      console.log('   ⚠️  Rechazado (esperado si hay validación estricta):', res.data.error);
    } else {
      console.log('   ⚠️  Advertencia emitida pero procesado (modo desarrollo)');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  console.log('');
}

// Test 2: Webhook con firma INVÁLIDA (debería rechazar)
async function testFirmaInvalida() {
  console.log('2️⃣  Test: Webhook con firma INVÁLIDA');
  try {
    const token = 'test_token_firma_invalida_' + Date.now();
    const res = await axios.post(`${BASE_URL}/flow/confirm`, {
      token,
      s: 'firma_falsa_12345_abcdef'
    }, {
      validateStatus: () => true
    });
    
    if (res.status === 401) {
      console.log('   ✅ Rechazado correctamente (401):', res.data.error);
    } else {
      console.log('   ❌ ERROR: Debería rechazar con 401, recibió:', res.status);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  console.log('');
}

// Test 3: Webhook con firma VÁLIDA (debería aceptar)
async function testFirmaValida() {
  console.log('3️⃣  Test: Webhook con firma VÁLIDA');
  try {
    const token = 'test_token_firma_valida_' + Date.now();
    const params = { token };
    const firma = flowSign(params, FLOW_SECRET);
    
    const res = await axios.post(`${BASE_URL}/flow/confirm`, {
      token,
      s: firma
    }, {
      validateStatus: () => true
    });
    
    // Nota: Este test fallará porque el token no existe en Flow
    // Pero la firma debería pasar la validación
    if (res.status === 401 && res.data.error === 'Firma inválida') {
      console.log('   ❌ ERROR: Firma debería ser válida pero fue rechazada');
    } else {
      console.log('   ✅ Firma aceptada (puede fallar después por token inexistente)');
      console.log('      Status:', res.status, res.data?.error || res.data?.message || '');
    }
  } catch (err) {
    console.log('   ⚠️  Error (esperado si token no existe en Flow):', err.message);
  }
  console.log('');
}

// Test 4: Replay Attack - mismo token dos veces
async function testReplayAttack() {
  console.log('4️⃣  Test: REPLAY ATTACK (mismo token 2 veces)');
  try {
    const token = 'test_token_replay_' + Date.now();
    const params = { token };
    const firma = flowSign(params, FLOW_SECRET);
    
    // Primera petición
    console.log('   Primera petición...');
    const res1 = await axios.post(`${BASE_URL}/flow/confirm`, {
      token,
      s: firma
    }, {
      validateStatus: () => true
    });
    console.log('   Status:', res1.status);
    
    // Esperar 100ms
    await new Promise(r => setTimeout(r, 100));
    
    // Segunda petición con el MISMO token
    console.log('   Segunda petición (mismo token)...');
    const res2 = await axios.post(`${BASE_URL}/flow/confirm`, {
      token,
      s: firma
    }, {
      validateStatus: () => true
    });
    
    if (res2.status === 409 && res2.data.error === 'Token duplicado') {
      console.log('   ✅ Replay attack bloqueado correctamente (409)');
    } else {
      console.log('   ❌ ERROR: Debería rechazar con 409, recibió:', res2.status, res2.data);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  console.log('');
}

// Test 5: Token sin parámetros obligatorios
async function testTokenVacio() {
  console.log('5️⃣  Test: Webhook SIN token');
  try {
    const res = await axios.post(`${BASE_URL}/flow/confirm`, {
      s: 'alguna_firma'
    }, {
      validateStatus: () => true
    });
    
    if (res.status === 400) {
      console.log('   ✅ Rechazado correctamente (400):', res.data || 'Token requerido');
    } else {
      console.log('   ❌ ERROR: Debería rechazar con 400, recibió:', res.status);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  console.log('');
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  WEBHOOK SECURITY TESTS - Flow Payment Gateway');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('⚙️  Backend URL:', BASE_URL);
  console.log('🔑 Flow Secret:', FLOW_SECRET.substring(0, 10) + '...\n');
  
  // Verificar que el backend esté corriendo
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 2000 });
    console.log('✅ Backend está corriendo\n');
  } catch (err) {
    console.log('❌ ERROR: Backend no responde en', BASE_URL);
    console.log('   Asegúrate de ejecutar: npm start\n');
    process.exit(1);
  }
  
  await testTokenVacio();
  await testSinFirma();
  await testFirmaInvalida();
  await testFirmaValida();
  await testReplayAttack();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Tests completados');
  console.log('═══════════════════════════════════════════════════════\n');
}

runAllTests().catch(console.error);
