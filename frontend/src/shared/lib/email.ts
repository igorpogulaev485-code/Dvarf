const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  if (!email) {
    return false
  }
  return EMAIL_PATTERN.test(email)
}

export const EMAIL_ERROR_TEXT =
  'Введите корректный email, например name@mail.ru'
