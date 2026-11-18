/** O mesmo e-mail com outra caixa ou com espaços nas pontas é a mesma conta. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
