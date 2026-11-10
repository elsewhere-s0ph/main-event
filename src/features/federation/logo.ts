// Converte un'immagine scelta dall'utente in un dataURL PNG quadrato pronto per
// il logo della federazione. Vive qui e non in game/core perché usa le API del
// browser (createImageBitmap + canvas): i motori di gioco restano puri.

export async function fileToLogoDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas non disponibile");
  }
  // Contiene l'immagine intera nel quadrato, centrata: nessun ritaglio a sorpresa.
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
