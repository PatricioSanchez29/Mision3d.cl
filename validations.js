/**
 * Validaciones para formularios - Misión 3D
 * Incluye validación de RUT, email, teléfono con feedback visual
 */

// ==================== VALIDACIÓN DE RUT ====================
function cleanRUT(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
}

function formatRUT(rut) {
  let value = cleanRUT(rut);
  if (!value) return '';
  if (value.length < 2) return value;
  
  const dv = value.slice(-1);
  let body = value.slice(0, -1);
  body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${dv}`;
}

function validateRUT(rut) {
  if (!rut || typeof rut !== 'string') return false;
  let valor = cleanRUT(rut);
  
  // En Chile un RUT válido tiene entre 7 y 9 caracteres (cuerpo de 6 a 8 dígitos + DV)
  if (valor.length < 7 || valor.length > 9) return false;
  
  const cuerpo = valor.slice(0, -1);
  const dv = valor.slice(-1);
  
  if (!/^\d+$/.test(cuerpo)) return false;
  
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = (multiplicador === 7) ? 2 : multiplicador + 1;
  }
  
  const resto = 11 - (suma % 11);
  let dvCalculado = '0';
  if (resto === 11) dvCalculado = '0';
  else if (resto === 10) dvCalculado = 'K';
  else dvCalculado = String(resto);
  
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

// ==================== CONFIGURAR RUT CON FORMATEO INTELIGENTE ====================
function setupRutInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  function evaluate(isBlur = false) {
    const raw = input.value;
    const clean = cleanRUT(raw);

    if (!clean) {
      const parent = input.parentElement;
      if (parent) {
        parent.classList.remove('field-valid', 'field-invalid');
        parent.querySelector('.field-icon')?.remove();
        parent.querySelector('.field-error')?.remove();
      }
      return;
    }

    const isValid = validateRUT(clean);

    if (isValid) {
      input.value = formatRUT(clean);
      setFieldValidation(input, true);
    } else {
      if (isBlur) {
        if (clean.length >= 2) input.value = formatRUT(clean);
        setFieldValidation(input, false, 'RUT inválido. Verifica los dígitos (ej: 12.345.678-9)');
      } else if (clean.length >= 9) {
        setFieldValidation(input, false, 'RUT incorrecto. Revisa el dígito verificador.');
      } else {
        const parent = input.parentElement;
        if (parent && parent.classList.contains('field-invalid')) {
          parent.classList.remove('field-invalid');
          parent.querySelector('.field-icon')?.remove();
          parent.querySelector('.field-error')?.remove();
        }
      }
    }
  }

  input.addEventListener('input', () => {
    const clean = cleanRUT(input.value);
    // Si pegó o escribió 8 o más dígitos, evaluar y formatear inmediatamente
    if (clean.length >= 8) {
      evaluate(false);
    } else {
      const parent = input.parentElement;
      if (parent) {
        parent.classList.remove('field-valid', 'field-invalid');
        parent.querySelector('.field-icon')?.remove();
        parent.querySelector('.field-error')?.remove();
      }
    }
  });

  input.addEventListener('blur', () => {
    evaluate(true);
  });
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
  // RUT con formateo inteligente y validación inmediata
  setupRutInput('inputRut');
  
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
window.cleanRUT = cleanRUT;
window.validateRUT = validateRUT;
window.formatRUT = formatRUT;
window.setupRutInput = setupRutInput;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.formatPhone = formatPhone;
window.validateForm = validateForm;
window.setFieldValidation = setFieldValidation;
