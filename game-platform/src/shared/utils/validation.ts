/**
 * Sanitiza strings removendo caracteres perigosos
 */
export const sanitizeString = (input: string): string => {
  if (!input) return ''
  
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Valida código de sessão (apenas alfanuméricos e caracteres especiais permitidos)
 */
export const validateSessionCode = (code: string): boolean => {
  if (!code || code.length < 3 || code.length > 20) return false
  
  // Apenas letras, números e alguns caracteres especiais
  const valid_pattern = /^[a-zA-Z0-9\-_βα]+$/
  return valid_pattern.test(code)
}

/**
 * Valida email
 */
export const validateEmail = (email: string): boolean => {
  const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return email_pattern.test(email)
}

export const INSTITUTIONAL_EMAIL_DOMAIN = 'fho.edu.br'

/**
 * Valida e-mail institucional (@fho.edu.br), exigido no cadastro de docentes
 */
export const validateInstitutionalEmail = (email: string): boolean => {
  const normalized_email = email.trim().toLowerCase()
  return validateEmail(normalized_email) && normalized_email.endsWith(`@${INSTITUTIONAL_EMAIL_DOMAIN}`)
}

/**
 * Limita comprimento de string
 */
export const truncateString = (str: string, max_length: number): string => {
  if (str.length <= max_length) return str
  return str.substring(0, max_length)
}

/**
 * Valida input baseado no tipo
 */
export const validateInput = (value: string, type: 'text' | 'email' | 'number' | 'select'): boolean => {
  if (!value) return false
  
  switch (type) {
    case 'email':
      return validateEmail(value)
    case 'number':
      // ponytail bugfix: Number(' ') coerces to 0, so a whitespace-only value
      // used to pass as a valid number without this trim check
      return value.trim() !== '' && !isNaN(Number(value))
    case 'text':
      return value.length > 0 && value.length <= 500
    default:
      return true
  }
}
