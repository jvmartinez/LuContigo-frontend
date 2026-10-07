---
name: form-validation
description: >
  Guía de MediCita para crear o cambiar formularios con React Hook Form, Zod compartido y
  resolverZod. Úsala al trabajar con campos, validación o presentación de errores de formulario.
---

# Formularios y validación

## Convenciones del proyecto

- Revisa formularios existentes del mismo dominio antes de crear uno nuevo.
- Usa React Hook Form para el estado y los handlers del formulario.
- Valida con el esquema Zod del contrato en `src/shared/` cuando exista; evita duplicar reglas
  divergentes en el cliente.
- Integra el esquema usando `resolverZod` de `src/lib/formulario.ts`. No asumas ni añadas
  `@hookform/resolvers/zod`: el proyecto tiene su propia integración y el paquete no forma parte del
  manifiesto actual.
- Usa mensajes en español coherentes con `resolverZod`. Convierte explícitamente los valores del
  formulario al tipo que espera el esquema o la API y aprovecha `sinVacios` cuando corresponda.
- Para errores de validación de API, reutiliza `erroresDeApiEnFormulario`; muestra los errores junto
  al campo asociado y conserva los errores que no correspondan a un campo.
- Asegura etiquetas accesibles, asociación entre campo y error, foco adecuado y estados de envío,
  éxito y fallo. No borres silenciosamente valores que el usuario ya ingresó.

## Verificación

Prueba validación correcta e incorrecta, presentación de errores de API y envío del formulario. Usa
pruebas existentes del dominio y ejecuta el typecheck cuando estén disponibles.
