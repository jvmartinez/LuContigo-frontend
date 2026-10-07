---
name: docker-dev
description: >
  Guía segura para desarrollar, inspeccionar y validar MediCita Web con Docker o Compose. Úsala
  únicamente cuando la tarea incluya contenedores, imágenes, servicios o builds Docker.
---

# Desarrollo con Docker

## Antes de ejecutar comandos

- Inspecciona primero si existen `Dockerfile*` o `docker-compose*.yml` y consulta sus servicios,
  puertos, volúmenes y variables; no asumas nombres como `app-dev` ni archivos `*.prod.yml`.
- Revisa `.env.example` si hace falta conocer nombres de variables. Nunca leas, copies ni imprimas
  valores de `.env` o credenciales.
- Si el entorno proporciona una configuración de comandos Docker/Compose, consúltala antes de
  generar o ejecutar comandos.
- Asegura que cada comando corresponda a un servicio y archivo existentes. No inicies procesos ni
  cambies recursos compartidos sin que formen parte explícita de la tarea.

## Comandos de referencia

Usa solo los que correspondan a la configuración inspeccionada:

- `docker compose config` para validar Compose sin iniciar servicios.
- `docker compose build <servicio>` para construir un servicio conocido.
- `docker compose up <servicio>` para iniciar un servicio cuando la tarea lo requiere.
- `docker compose logs <servicio>` para consultar sus logs.
- `docker compose exec <servicio> <comando>` solo con un contenedor en ejecución y el servicio
  confirmado.
- `docker compose down` para detener los servicios de este proyecto si se solicitó detenerlos.

No uses `docker compose down -v`, `docker volume prune`, borrados de volúmenes ni comandos
equivalentes sin autorización explícita del usuario: pueden destruir datos persistentes.
