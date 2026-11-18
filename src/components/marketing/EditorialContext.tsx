"use client";
import { createContext, useContext } from "react";
import { brand, heroImage, aboutImage, gallery } from "@/lib/content";

export const EditorialContext = createContext({
  media: {
    heroImage,
    aboutImage,
    heroAlt: "Fotografía de portada",
    aboutAlt: "Retrato de la fotógrafa",
    ...Object.fromEntries(
      gallery.flatMap((item) => [
        [item.id + "Image", item.src],
        [item.id + "Alt", item.alt],
      ]),
    ),
  } as Record<string, string>,
  contactEnabled: true,
  channels: {
    email: brand.email,
    whatsapp: brand.whatsapp,
    whatsappMessage: brand.whatsappMessage,
  } as Record<string, string>,
});
export const useEditorial = () => useContext(EditorialContext);
export function EditorialProvider({
  children,
  media,
  channels,
  contactEnabled,
}: {
  children: React.ReactNode;
  contactEnabled: boolean;
  media: Record<string, string>;
  channels: Record<string, string>;
}) {
  return (
    <EditorialContext.Provider value={{ media, channels, contactEnabled }}>
      {children}
    </EditorialContext.Provider>
  );
}
