/** Digits-only phone for reliable comparison across formatting. */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeClientName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function clientNamesMatch(stored: string, submitted: string): boolean {
  return (
    normalizeClientName(stored).localeCompare(normalizeClientName(submitted), 'pt-BR', {
      sensitivity: 'accent',
    }) === 0
  );
}

export function clientEmailsMatch(stored: string | null | undefined, submitted: string): boolean {
  if (!stored) return false;
  return normalizeEmail(stored) === normalizeEmail(submitted);
}

export function clientPhonesMatch(stored: string, submitted: string): boolean {
  const a = digitsOnlyPhone(stored);
  const b = digitsOnlyPhone(submitted);
  return a.length > 0 && a === b;
}

export type ClientIdentityRecord = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

export type PublicClientInput = {
  name: string;
  email: string;
  phone: string;
};

export type ClientIdentityDecision =
  | { type: 'create'; name: string; email: string; phone: string }
  | { type: 'reuse'; clientId: string; fillEmail?: string }
  | { type: 'reject'; message: string };

/**
 * Pure identity rules for public booking — never mutates name/email/phone on mismatch.
 */
export function decidePublicClientIdentity(
  input: PublicClientInput,
  byPhone: ClientIdentityRecord | null,
  byEmail: ClientIdentityRecord | null,
): ClientIdentityDecision {
  const name = normalizeClientName(input.name);
  const email = normalizeEmail(input.email);
  const phone = input.phone.trim();

  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    return {
      type: 'reject',
      message:
        'E-mail e telefone informados pertencem a cadastros diferentes. Verifique seus dados ou entre em contato com o salão.',
    };
  }

  const existing = byPhone ?? byEmail;

  if (!existing) {
    return { type: 'create', name, email, phone };
  }

  if (!clientNamesMatch(existing.name, name)) {
    return {
      type: 'reject',
      message:
        'Este e-mail ou telefone já está cadastrado com outro nome. Use os mesmos dados do cadastro anterior ou fale com o salão.',
    };
  }

  if (existing.email && !clientEmailsMatch(existing.email, email)) {
    return {
      type: 'reject',
      message: 'Este telefone já está vinculado a outro e-mail.',
    };
  }

  if (byEmail && !clientPhonesMatch(existing.phone, phone)) {
    return {
      type: 'reject',
      message:
        'Este e-mail já está cadastrado com outro telefone. Use o telefone do cadastro ou entre em contato com o salão.',
    };
  }

  if (!existing.email) {
    return { type: 'reuse', clientId: existing.id, fillEmail: email };
  }

  return { type: 'reuse', clientId: existing.id };
}
