/**
 * Validaciones para formularios - Misión 3D
 * Incluye validación de RUT, email, teléfono con feedback visual
 */

// ==================== VALIDACIÓN DE RUT ====================
function formatRUT(rut) {
  // Eliminar todo excepto números y K
  let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  
  // Limitar a 9 caracteres (8 dígitos + 1 verificador)
  if (value.length > 9) {
    value = value.slice(0, 9);
  }
  
  // Si no hay nada, retornar vacío
  if (!value) return '';
  
  // Si solo hay un carácter, retornarlo tal cual
  if (value.length <= 1) return value;
  
  // Separar dígito verificador
  const dv = value.slice(-1);
  let body = value.slice(0, -1);
  
  // Agregar puntos cada 3 dígitos (de derecha a izquierda)
  body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar formateado
  return `${body}-${dv}`;
}

function validateRUT(rut) {
  // Limpiar RUT
  let valor = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  
  // Verificar largo mínimo
  if (valor.length < 2) return false;
  
  // Separar cuerpo y dígito verificador
  const cuerpo = valor.slice(0, -1);
  const dv = valor.slice(-1);
  
  // Validar que el cuerpo sean solo números
  if (!/^\d+$/.test(cuerpo)) return false;
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  let dvCalculado;
  
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();
  
  return dv === dvCalculado;
}

// ==================== VALIDACIÓN DE EMAIL ====================
function validateEmail(email) {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

// ==================== VALIDACIÓN DE TELÉFONO ====================
function formatPhone(phone) {
  // Limpiar
  let value = phone.replace(/\D/g, '');
  
  // Si empieza con 56, quitarlo temporalmente
  if (value.startsWith('56')) {
    value = value.slice(2);
  }
  
  // Formatear según largo
  if (value.length <= 1) return value;
  if (value.length <= 5) return `${value.slice(0, 1)} ${value.slice(1)}`;
  return `${value.slice(0, 1)} ${value.slice(1, 5)} ${value.slice(5, 9)}`;
}

function validatePhone(phone) {
  // Limpiar
  const cleaned = phone.replace(/\D/g, '');
  
  // Verificar formato chileno: 9 dígitos empezando con 9
  // O 11 dígitos empezando con 56 9
  if (cleaned.length === 9 && cleaned.startsWith('9')) return true;
  if (cleaned.length === 11 && cleaned.startsWith('569')) return true;
  
  return false;
}

// ==================== VALIDACIÓN VISUAL ====================
function setFieldValidation(input, isValid, message = '') {
  const container = input.parentElement;
  
  // Remover clases previas
  container.classList.remove('field-valid', 'field-invalid', 'field-neutral');
  
  // Remover mensaje de error previo
  const prevError = container.querySelector('.field-error');
  if (prevError) prevError.remove();
  
  // Remover icono previo
  const prevIcon = container.querySelector('.field-icon');
  if (prevIcon) prevIcon.remove();
  
  if (input.value.trim() === '') {
    container.classList.add('field-neutral');
    return;
  }
  
  if (isValid) {
    container.classList.add('field-valid');
    
    // Agregar check verde
    const icon = document.createElement('span');
    icon.className = 'field-icon field-icon-valid';
    icon.innerHTML = '✓';
    container.appendChild(icon);
  } else {
    container.classList.add('field-invalid');
    
    // Agregar X roja
    const icon = document.createElement('span');
    icon.className = 'field-icon field-icon-invalid';
    icon.innerHTML = '✕';
    container.appendChild(icon);
    
    // Agregar mensaje de error
    if (message) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'field-error';
      errorMsg.textContent = message;
      container.appendChild(errorMsg);
    }
  }
}

// ==================== CONFIGURAR CAMPO CON VALIDACIÓN ====================
function setupFieldValidation(inputId, validatorFn, errorMessage, formatter = null) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  // Evento para formatear mientras escribe
  if (formatter) {
    input.addEventListener('input', (e) => {
      const cursorPos = e.target.selectionStart;
      const oldValue = e.target.value;
      const oldLength = oldValue.length;
      
      // Aplicar formato
      const newValue = formatter(oldValue);
      
      if (newValue !== oldValue) {
        e.target.value = newValue;
        
        // Ajustar posición del cursor
        const newLength = newValue.length;
        const lengthDiff = newLength - oldLength;
        
        // Si se agregaron caracteres (como puntos o guión), mover cursor
        let newCursorPos = cursorPos + lengthDiff;
        
        // Asegurar que el cursor no esté fuera de rango
        newCursorPos = Math.max(0, Math.min(newCursorPos, newLength));
        
        e.target.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }
  
  // Validar en blur (cuando pierde foco)
  input.addEventListener('blur', () => {
    if (input.value.trim() === '') {
      setFieldValidation(input, true);
      return;
    }
    
    const isValid = validatorFn(input.value);
    setFieldValidation(input, isValid, isValid ? '' : errorMessage);
  });
  
  // Limpiar error mientras escribe
  input.addEventListener('input', () => {
    if (input.parentElement.classList.contains('field-invalid')) {
      input.parentElement.classList.remove('field-invalid');
      const icon = input.parentElement.querySelector('.field-icon-invalid');
      if (icon) icon.remove();
      const error = input.parentElement.querySelector('.field-error');
      if (error) error.remove();
    }
  });
}

// ==================== VALIDAR FORMULARIO COMPLETO ====================
function validateForm(formId, fieldsConfig) {
  // formId es opcional, si no se pasa o es null, validar directamente los campos
  
  let isValid = true;
  let errors = [];
  
  fieldsConfig.forEach(config => {
    const input = document.getElementById(config.id);
    if (!input) {
      console.warn('Campo no encontrado:', config.id);
      return; // Saltar este campo
    }
    
    const value = input.value.trim();
    
    // Si es requerido y está vacío
    if (config.required && !value) {
      setFieldValidation(input, false, config.emptyMessage || 'Este campo es obligatorio');
      errors.push({ field: config.id, message: config.emptyMessage || 'Campo vacío' });
      isValid = false;
      return;
    }
    
    // Si tiene valor y validator, validar
    if (value && config.validator) {
      const valid = config.validator(value);
      if (!valid) {
        setFieldValidation(input, false, config.errorMessage || 'Valor inválido');
        errors.push({ field: config.id, message: config.errorMessage || 'Valor inválido' });
        isValid = false;
      } else {
        setFieldValidation(input, true);
      }
    } else if (value) {
      // Tiene valor pero no validator, marcar como válido
      setFieldValidation(input, true);
    }
  });
  
  if (!isValid) {
    console.warn('Errores de validación:', errors);
  }
  
  return isValid;
}

// ==================== INICIALIZACIÓN ====================
function initValidations() {
  // RUT
  setupFieldValidation(
    'inputRut',
    validateRUT,
    'RUT inválido. Ej: 12.345.678-9',
    formatRUT
  );
  
  // Email
  setupFieldValidation(
    'inputEmail',
    validateEmail,
    'Email inválido. Ej: correo@ejemplo.cl'
  );
  
  // Teléfono
  setupFieldValidation(
    'inputTelefono',
    validatePhone,
    'Teléfono inválido. Ej: 9 1234 5678',
    formatPhone
  );
  
  // Nombre (mínimo 2 caracteres)
  setupFieldValidation(
    'inputName',
    (value) => value.length >= 2,
    'El nombre debe tener al menos 2 caracteres'
  );
  
  // Apellido (mínimo 2 caracteres)
  setupFieldValidation(
    'inputApellido',
    (value) => value.length >= 2,
    'El apellido debe tener al menos 2 caracteres'
  );
  
  // Dirección (mínimo 5 caracteres)
  setupFieldValidation(
    'inputDireccion',
    (value) => value.length >= 5,
    'La dirección debe tener al menos 5 caracteres'
  );
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initValidations);
} else {
  initValidations();
}

// Exportar funciones para uso global
window.validateRUT = validateRUT;
window.formatRUT = formatRUT;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.formatPhone = formatPhone;
window.validateForm = validateForm;
window.setFieldValidation = setFieldValidation;
