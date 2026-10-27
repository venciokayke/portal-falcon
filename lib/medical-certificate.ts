export const MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024;

export function validateCertificate(name: string, mime: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_CERTIFICATE_BYTES) throw new Error("O anexo deve ter entre 1 byte e 5 MB.");
  const extension = name.toLowerCase().split('.').pop();
  const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!((extension === 'pdf' && mime === 'application/pdf' && pdf)
    || (extension === 'png' && mime === 'image/png' && png)
    || ((extension === 'jpg' || extension === 'jpeg') && mime === 'image/jpeg' && jpeg))) {
    throw new Error("Envie um arquivo PDF, JPG ou PNG válido.");
  }
  // shortcut: valida formato e assinatura, mas não substitui antivírus; integrar antes de ampliar o uso externo.
  return name.replace(/[\\/\r\n\x00-\x1f]/g, '_').slice(0, 150);
}
