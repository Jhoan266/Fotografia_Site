# Plataforma integrada para un fotógrafo

Alcance confirmado: un solo negocio fotográfico. Ampliar los paneles existentes,
las cuentas, las sesiones, la bóveda y el almacenamiento privado. Sin inventario.
No crear otra aplicación ni exigir registrar de nuevo a los clientes.

## Secuencia modular

1. Entrega profesional: descargas por sesión y caducidad (este módulo).
2. Colecciones: subálbumes, portada elegible, orden y presentación.
3. Revisión del cliente: listas de selección, confirmación final y exportación
   de nombres para el flujo de edición del fotógrafo.
4. Comunicación: invitaciones de galería, plantillas y recordatorios mediante
   un proveedor de correo configurado; historial y reintentos.
5. Agenda: servicios, disponibilidad, reservas y prevención de solapamientos.
6. Gestión comercial: oportunidades, presupuestos, cuestionarios, contratos y
   facturas asociados al cliente y a la sesión.
7. Cobros: pagos y anticipos mediante proveedor externo, webhooks verificados,
   conciliación y devoluciones; nunca almacenar tarjetas en la aplicación.
8. Tienda: catálogo de productos digitales e impresos, carrito y pedidos;
   producción y envío requieren concretar el laboratorio/proveedor.
9. Web pública: ampliar el editor actual con páginas, blog, formularios y SEO.
10. Experiencia móvil y automatización: galería instalable y notificaciones.
    Edición/selección con IA y sincronización con Lightroom se especifican como
    integraciones separadas, no como funciones ya disponibles.

Cada módulo tiene su rama y PR apilado, migraciones aditivas, pruebas de
autorización, integración y verificación tras desplegar. No modificar main
directamente. No se considera completada la equivalencia con Pixieset hasta
validar individualmente todos los módulos acordados.

## Entrega: comportamiento del primer módulo

- Valores iniciales compatibles: descargas permitidas, sin caducidad.
- Desactivar descargas bloquea el original a través de media, descarga individual
  y ZIP. Las miniaturas, favoritos y comentarios siguen disponibles.
- La caducidad bloquea portal, galería, archivos, comentarios, selección y pedidos
  del cliente. El fotógrafo conserva acceso y puede reabrir la sesión.
- La fecha incluye todo el día en UTC; la interfaz lo indica expresamente.
- No se borran fotos. No pueden revocarse archivos ya descargados, capturas de
  pantalla ni una transferencia que ya haya sido autorizada e iniciada.

## Referencias funcionales públicas consultadas (24 noviembre 2026)

- https://pixieset.com/client-gallery/
- https://pixieset.com/studio-manager/
- https://pixieset.com/online-store/
- https://pixieset.com/website/

Se toman como referencia las capacidades del producto. No se han inspeccionado
sus pantallas privadas ni se promete reproducir sus servicios externos.
