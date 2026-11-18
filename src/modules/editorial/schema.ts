import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import { brand, heroImage, aboutImage, gallery } from "@/lib/content";

export const locales = ["es", "en", "fr"] as const;
export const modules = [
  ["hero", "Inicio"],
  ["services", "Servicios"],
  ["portfolio", "Portafolio"],
  ["about", "Sobre mí"],
  ["process", "Proceso"],
  ["contact", "Contacto"],
  ["nav", "Navegación"],
  ["footer", "Pie de página"],
  ["meta", "SEO"],
  ["media", "Imágenes"],
  ["channels", "Canales"],
  ["design", "Tipografía"],
  ["launch", "Publicación del sitio"],
] as const;
export type ModuleKey = (typeof modules)[number][0];
export type Values = Record<string, string>;

function flatten(value: unknown, prefix = ""): Values {
  if (typeof value === "string") return { [prefix]: value };
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      Object.entries(flatten(child, prefix ? prefix + "." + key : key)),
    ),
  );
}

export function defaults(locale: string, module: ModuleKey): Values {
  if (module === "launch")
    return {
      publicMode: "live",
      comingSoon: "Próximamente",
      contactEnabled: "true",
    };
  if (module === "media")
    return {
      heroImage,
      heroAlt: "Fotografía de portada",
      aboutImage,
      aboutAlt: "Retrato de la fotógrafa",
      ...Object.fromEntries(
        gallery.flatMap((item) => [
          [item.id + "Image", item.src],
          [item.id + "Alt", item.alt],
        ]),
      ),
    };
  if (module === "channels")
    return {
      email: brand.email,
      whatsapp: brand.whatsapp,
      whatsappMessage: brand.whatsappMessage,
    };
  if (module === "design")
    return { displayFont: "inherit", bodyFont: "inherit" };
  const messages = locale === "en" ? en : locale === "fr" ? fr : es;
  if (module === "nav") return Object.fromEntries(
    ["services", "portfolio", "about", "process", "contact", "clientArea", "whatsapp"].map(key =>
      [key, messages.nav[key as keyof typeof messages.nav]]));
  return flatten(messages[module]);
}

export function isModule(value: string): value is ModuleKey {
  return modules.some(([key]) => key === value);
}

export function validateValues(
  locale: string,
  module: ModuleKey,
  input: unknown,
): input is Values {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const values = input as Values;
  const expected = Object.keys(defaults(locale, module));
  if (Object.keys(values).length !== expected.length) return false;
  return expected.every((key) => {
    const value = values[key];
    if (typeof value !== "string" || !value.trim() || value.length > 4000)
      return false;
    if (module === "launch" && key === "publicMode")
      return ["live", "coming-soon"].includes(value);
    if (module === "launch" && key === "contactEnabled")
      return ["true", "false"].includes(value);
    if (module === "design")
      return ["inherit", "Georgia", "Arial", "Verdana"].includes(value);
    if (module === "media" && key.endsWith("Image")) {
      if (/^\/api\/editorial\/assets\/[a-z0-9-]+$/i.test(value)) return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }
    if (module === "channels" && key === "email")
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (module === "channels" && key === "whatsapp")
      return /^[0-9]{8,15}$/.test(value);
    if (!["media", "channels", "launch"].includes(module) && /[{}]/.test(value))
      return false;
    return true;
  });
}

export function expand(values: Values): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(values)) {
    const parts = path.split(".");
    let target = result;
    for (const part of parts.slice(0, -1)) {
      target[part] ??= {};
      target = target[part] as Record<string, unknown>;
    }
    target[parts.at(-1)!] = value;
  }
  return result;
}

const fieldNames: Record<string, string> = {
  location: "Ubicación",
  brand: "Nombre de la marca",
  specialty: "Especialidad",
  tagline: "Frase principal",
  subtitle: "Texto de presentación",
  title: "Título",
  label: "Texto de sección",
  body: "Descripción",
  cta: "Texto del botón",
  ctaWhatsapp: "Botón de contacto",
  ctaPortfolio: "Botón de portafolio",
  services: "Servicios",
  portfolio: "Portafolio",
  about: "Sobre mí",
  process: "Proceso",
  contact: "Contacto",
  clientArea: "Acceso de clientes",
  whatsapp: "WhatsApp",
  sessions: "Sesiones",
  logout: "Salir",
  admin: "Administración",
  clients: "Clientes",
  projects: "Proyectos",
  panel: "Panel",
  all: "Todas",
  weddings: "Bodas",
  book: "Book",
  rights: "Derechos",
  placeholder: "Texto adicional",
  description: "Descripción para buscadores",
  email: "Correo de contacto",
  whatsappMessage: "Mensaje inicial de WhatsApp",
  heroImage: "Imagen de portada",
  heroAlt: "Texto alternativo de portada",
  aboutImage: "Imagen de Sobre mí",
  aboutAlt: "Texto alternativo de Sobre mí",
  displayFont: "Tipografía de títulos",
  bodyFont: "Tipografía del texto",
  publicMode: "Modo público",
  comingSoon: "Mensaje de Próximamente",
  contactEnabled: "Contacto habilitado",
};
export function fieldLabel(key: string) {
  return key
    .split(".")
    .map(
      (part) =>
        fieldNames[part] ??
        (/^g[0-9]+Image$/.test(part)
          ? "Imagen " + part.match(/[0-9]+/)?.[0]
          : /^g[0-9]+Alt$/.test(part)
            ? "Texto alternativo " + part.match(/[0-9]+/)?.[0]
            : part === "items"
              ? "Servicios"
              : part === "steps"
                ? "Pasos"
                : part),
    )
    .join(" · ");
}
