/**
 * Görsel üretim veya harici placeholder API çağrılarında kullanılacak sabit politika.
 * Üretim istemlerine aşağıdaki kısıtlar eşlik etmelidir; burada yalnızca sabit metin tutulur.
 */
export const PLACEHOLDER_IMAGE_POLICY = {
  /** Yüz içermesin */
  noFacesVi: "yüz olmasın",
  /** Yazı, logo veya tipografi içermesin */
  noTextVi: "yazısız ver",
} as const;
