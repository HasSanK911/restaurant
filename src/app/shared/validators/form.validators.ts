import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Pakistani mobile number.
 *
 * Accepts the shapes people actually type: `03120991116`, `0312-0991116`,
 * `+92 312 0991116`, `92-312-0991116`.
 */
export function pakPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    const digits = value.replace(/[\s\-()]/g, '');
    const ok = /^(\+92|0092|92|0)3\d{9}$/.test(digits);
    return ok ? null : { pakPhone: true };
  };
}

/** Rejects dates before today. Used by the reservation date field. */
export function notPastDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const picked = new Date(String(value));
    if (Number.isNaN(picked.getTime())) return { pastDate: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return picked >= today ? null : { pastDate: true };
  };
}

/** Cross-field: the two named controls must hold the same value. */
export function matchFieldsValidator(source: string, confirm: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(source);
    const b = group.get(confirm);
    if (!a || !b || !b.value) return null;
    if (a.value === b.value) {
      if (b.hasError('passwordMismatch')) {
        const { passwordMismatch, ...rest } = b.errors ?? {};
        b.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }
    b.setErrors({ ...(b.errors ?? {}), passwordMismatch: true });
    return { passwordMismatch: true };
  };
}

/** Trims before checking, so a field of spaces is still "required". */
export function requiredTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    String(control.value ?? '').trim().length ? null : { required: true };
}

/** Normalises any accepted phone shape to `03XXXXXXXXX` for storage. */
export function normalisePhone(value: string): string {
  const digits = String(value ?? '').replace(/[\s\-()+]/g, '');
  if (digits.startsWith('0092')) return `0${digits.slice(4)}`;
  if (digits.startsWith('92')) return `0${digits.slice(2)}`;
  return digits;
}

/** Marks every control dirty and touched so all errors surface at once. */
export function revealErrors(control: AbstractControl): void {
  control.markAsTouched();
  control.markAsDirty();
  const group = control as unknown as { controls?: Record<string, AbstractControl> | AbstractControl[] };
  if (!group.controls) return;
  const children = Array.isArray(group.controls)
    ? group.controls
    : Object.values(group.controls);
  for (const child of children) revealErrors(child);
}
