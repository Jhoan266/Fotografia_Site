export function fitsPasswordLimit(password: string) {
  return password.length > 0 && Buffer.byteLength(password, "utf8") <= 72;
}

export function validNewPassword(password: string) {
  return password.length >= 12 && fitsPasswordLimit(password);
}
