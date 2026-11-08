export const brand = {
  name: "Vera Solís",
  taglineKey: "hero.tagline",
  city: "Barcelona",
  country: "España",
  whatsapp: "34600000000",
  whatsappMessage: "Hola Vera, me gustaría reservar una sesión.",
  email: "hola@verasolis.studio",
  instagram: "https://instagram.com/",
  specialty: "Fotografía",
};

export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  category: "bodas" | "sesiones" | "book";
  span: "normal" | "tall" | "wide";
};

export const gallery: GalleryItem[] = [
  {
    id: "g1",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
    alt: "Pareja en boda al atardecer",
    category: "bodas",
    span: "wide",
  },
  {
    id: "g2",
    src: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
    alt: "Retrato editorial en estudio",
    category: "book",
    span: "tall",
  },
  {
    id: "g3",
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    alt: "Sesión de pareja en la ciudad",
    category: "sesiones",
    span: "normal",
  },
  {
    id: "g4",
    src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=80",
    alt: "Detalle de anillos",
    category: "bodas",
    span: "normal",
  },
  {
    id: "g5",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
    alt: "Book profesional lifestyle",
    category: "book",
    span: "tall",
  },
  {
    id: "g6",
    src: "https://images.unsplash.com/photo-1529634597504-8a2f5f6c0b4b?auto=format&fit=crop&w=1400&q=80",
    alt: "Sesión outdoor con luz natural",
    category: "sesiones",
    span: "wide",
  },
  {
    id: "g7",
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=1200&q=80",
    alt: "Novios bailando",
    category: "bodas",
    span: "normal",
  },
  {
    id: "g8",
    src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1200&q=80",
    alt: "Retrato lifestyle",
    category: "book",
    span: "normal",
  },
];

export const heroImage =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2400&q=80";

export const aboutImage =
  "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=1400&q=80";
