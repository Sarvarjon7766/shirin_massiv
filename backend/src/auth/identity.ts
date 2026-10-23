export type Identity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

// Frontend (ChatGPT Sites) autentifikatsiyadan o'tgan foydalanuvchini shu sarlavhalar orqali uzatadi.
// Sarlavhalarga faqat X-Internal-Secret tekshiruvidan o'tgan so'rovlarda ishoniladi (src/index.ts).
export function getUser(request: Request): Identity | null {
  const h = request.headers;
  const userId = h.get("oai-authenticated-user-id");
  const email = h.get("oai-authenticated-user-email");
  if (!userId || !email) return null;

  const encoded = h.get("oai-authenticated-user-full-name");
  let fullName: string | null = null;
  if (encoded && h.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try {
      fullName = decodeURIComponent(encoded);
    } catch {
      fullName = null;
    }
  }
  return { userId, displayName: fullName ?? email, email, fullName };
}
