// ===== VALIDATION UTILITIES =====

export const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(clean.charAt(10))
}

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const clean = phone.replace(/\D/g, '')
  return clean.length === 10 || clean.length === 11
}

export const validatePlate = (plate: string): boolean => {
  const clean = plate.replace(/[-\s]/g, '').toUpperCase()
  // Old format: ABC1234
  const oldFormat = /^[A-Z]{3}\d{4}$/
  // Mercosul format: ABC1D23
  const mercosulFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/
  return oldFormat.test(clean) || mercosulFormat.test(clean)
}

export const validateYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear()
  return year >= 1950 && year <= currentYear + 1
}

export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) return { valid: false, message: 'Mínimo de 8 caracteres' }
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Deve conter ao menos uma letra maiúscula' }
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Deve conter ao menos uma letra minúscula' }
  if (!/\d/.test(password)) return { valid: false, message: 'Deve conter ao menos um número' }
  return { valid: true, message: '' }
}

// ===== MASK HELPERS =====

export const applyCPFMask = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

export const applyPhoneMask = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11)
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return clean
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export const applyPlateMask = (value: string): string => {
  const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7)
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`
  }
  return clean
}

export const applyCurrencyMask = (value: string): string => {
  const clean = value.replace(/\D/g, '')
  const number = parseInt(clean, 10) / 100
  return isNaN(number) ? '' : number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ===== SANITIZERS =====

export const sanitizeCPF = (cpf: string): string => cpf.replace(/\D/g, '')
export const sanitizePhone = (phone: string): string => phone.replace(/\D/g, '')
export const sanitizePlate = (plate: string): string => plate.replace(/[-\s]/g, '').toUpperCase()
