# MonArgent — Deploy en Render + Enzonic (plan técnico)

> Documento de preparación. No contiene secretos. Completar placeholders en los paneles de Render/Enzonic/Vercel.

## 1. Arquitectura objetivo

| Capa | Servicio | Notas |
|---|---|---|
| Frontend | Vercel (actual) | React 18 + Vite, build estático. Mantener URL actual. |
| Backend | Render Web Service (Docker) | Java 21 / Spring Boot 3.5.16, API REST `/api/v1`. |
| Base de datos | Enzonic MySQL 8.4 | DB nueva y vacía para producción. |
| Integraciones | OCR.Space, Google Gemini, SMTP | Opcionales para arranque; configurar según necesidad. |

Flujo: navegador → Vercel (HTTPS) → Render API (HTTPS) → Enzonic MySQL (TLS según proveedor).

## 2. Requisitos de proveedores (verificar en documentación oficial vigente)

### Render
- Web Service con Docker.
- Variable `PORT` inyectada por Render.
- Health check HTTP.
- Plan gratuito: verificar límites actuales de RAM, CPU, sleep por inactividad, disco efímero y horas de uso.

### Enzonic
Obtener desde el panel/documentación oficial antes de configurar:
- Host, puerto, nombre de base de datos.
- Usuario y contraseña.
- Requisito TLS/SSL y formato JDBC exacto recomendado.
- Certificado/CA si aplica.
- Límite máximo de conexiones del plan.
- Política de suspensión/reactivación y tiempos de wake-up.
- Restricciones de IP/firewall (Render free puede tener IPs salientes variables).

### Vercel
- Variable `VITE_API_URL` apuntando a `https://<render-service>.onrender.com/api/v1` (placeholder).
- Mantener despliegue frontend actual.

## 3. Archivos Docker

| Archivo | Propósito |
|---|---|
| `backend/Dockerfile` | Build multi-stage: Maven + JDK 21 → JRE 21. Build context: raíz del repo. |
| `.dockerignore` | Excluye secretos, frontend, target, docs, uploads, artefactos locales. |

### Build local (desde raíz del repo)
```bash
docker build -f backend/Dockerfile -t monargent-backend:local .
```

### Run local (ejemplo, sin secretos reales)
```bash
docker run --rm -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e PORT=8080 \
  -e SPRING_DATASOURCE_URL="<JDBC_ENZONIC_CON_TLS_SEGUN_DOC>" \
  -e DB_USERNAME="<DB_USER>" \
  -e DB_PASSWORD="<DB_PASSWORD>" \
  -e JWT_SECRET="<BASE64_32_BYTES_MIN>" \
  -e APP_FRONTEND_URL="https://<tu-app>.vercel.app" \
  -e CORS_ALLOWED_ORIGIN_PATTERNS="https://<tu-app>.vercel.app" \
  monargent-backend:local
```

## 4. Variables de entorno

| Variable | Obligatoria (prod) | Descripción |
|---|---:|---|
| `SPRING_PROFILES_ACTIVE` | Sí | `prod`. |
| `PORT` | Render la inyecta | Puerto HTTP. |
| `SPRING_DATASOURCE_URL` | Sí | JDBC MySQL de Enzonic. **Incluir parámetros TLS requeridos por Enzonic**. |
| `DB_USERNAME` | Sí | Usuario DB. |
| `DB_PASSWORD` | Sí | Contraseña DB. |
| `JWT_SECRET` | Sí | Base64, >= 32 bytes decodificados. Rotar el comprometido antes de publicar. |
| `APP_FRONTEND_URL` | Sí | Origen frontend Vercel exacto. |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | Sí | Orígenes exactos permitidos. |
| `APP_TIMEZONE` | Recomendada | Default `America/Argentina/Buenos_Aires`. |
| `JAVA_OPTS` | Recomendada | JVM conservadora para Render free. |
| `JWT_EXPIRATION_MS` | Opcional | Default 86400000. |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | Controlada | Default prod `validate`. No usar `update/create` en prod. |
| `FLYWAY_ENABLED` | Opcional | Default prod `true`. |
| `MAIL_*` | Opcionales | SMTP. Si falta, app arranca; flujos auth mail fallan controladamente. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Opcionales | IA opcional. |
| `OCR_API_KEY` | Opcional | OCR opcional. |
| `DB_POOL_MAX_SIZE` | Opcional | Default conservador `5`. Ajustar al límite Enzonic. |
| `APP_RATE_LIMIT_*` | Opcionales | Rate limiting en memoria por IP/cuenta. En Render free (single instance) es aceptable; se reinicia con el proceso y no es distribuido. |

## 5. Inicialización de MySQL (Flyway)

- Migración baseline: `backend/src/main/resources/db/migration/V1__baseline.sql`.
- Prod: `spring.flyway.enabled=true`, `ddl-auto=validate`.
- La DB de producción debe estar **vacía** en el primer arranque para que Flyway aplique V1.
- No ejecutar migraciones sobre DB reales antes de validar en DB local descartable.
- **Flyway administra las modificaciones del esquema.** Hibernate usa `ddl-auto=validate` y no modifica el esquema.
- **`GroupSchemaMigration` y `SavingGoalSchemaMigration` están deshabilitadas por defecto y en producción** (`app.schema.legacy-migration.enabled=false`, `matchIfMissing=false`). No se deben agregar modificaciones de esquema mediante `ApplicationRunner`, `CommandLineRunner` u otros mecanismos runtime equivalentes.
- **Futuras modificaciones de esquema**: incorporarlas como migraciones Flyway versionadas (`V2__...`, `V3__...`) tras validarlas en DB local descartable.

### Validación local descartable (ejemplo)
1. Crear DB temporal vacía.
2. Ejecutar app con `SPRING_PROFILES_ACTIVE=prod` y envs apuntando a esa DB.
3. Verificar que Flyway aplique V1 y Hibernate valide.
4. Eliminar DB temporal.

## 6. Configuración de Render

1. Crear Web Service (Docker) apuntando al repo/rama aprobada.
2. Dockerfile path: `backend/Dockerfile`. Build context: raíz del repo.
3. Configurar env vars de la sección 4 en el panel (sin secretos en Git).
4. Health check path: `/api/v1/health`.
5. Verificar límites del plan free y ajustar `JAVA_OPTS`/pool Hikari.
6. Habilitar HTTPS (Render lo provee para el dominio onrender).

## 7. Configuración de Enzonic

1. Crear MySQL 8.4 vacío.
2. Obtener credenciales y parámetros TLS/JDBC exactos desde documentación oficial.
3. Configurar `SPRING_DATASOURCE_URL` con TLS requerido por el proveedor. **No deshabilitar TLS**.
4. Verificar límite de conexiones y ajustar `DB_POOL_MAX_SIZE`.
5. Confirmar política de suspensión/reactivación y firewall/IPs.

## 8. Configuración de Vercel

- Mantener frontend en Vercel.
- Configurar `VITE_API_URL=https://<render-service>.onrender.com/api/v1`.
- Verificar que CORS en backend permita solo el origen Vercel exacto.

## 9. Health checks

- Endpoint: `GET /api/v1/health` (público, devuelve 200).
- Render: configurar health check path `/api/v1/health`.
- Smoke post-deploy: health, login, endpoint protegido con JWT, CORS desde Vercel.

## 10. Pruebas posteriores al despliegue

- [ ] `/api/v1/health` responde 200.
- [ ] Registro/verificación/login funcionan (si SMTP configurado).
- [ ] JWT protege endpoints privados.
- [ ] CORS permite origen Vercel y rechaza otros.
- [ ] CRUD básico persiste en MySQL.
- [ ] Aislamiento entre usuarios.
- [ ] Comprobantes: subida/descarga funciona; pérdida por filesystem efímero no rompe integridad.
- [ ] OCR/Gemini sin claves: error controlado, app sigue viva.
- [ ] Tras sleep/wake de Render: app recupera y DB reconecta.

## 11. Limitaciones del plan gratuito

- **Render free**: servicio puede dormir; cold start; filesystem efímero; RAM limitada (verificar valor actual). Schedulers no corren mientras duerme.
- **Enzonic free**: posibles límites de conexiones, almacenamiento, suspensión; verificar documentación actual.
- **Comprobantes**: en filesystem efímero se pierden al redeploy/restart. Aceptado inicialmente; evaluar almacenamiento externo después.
- **SMTP/Gemini/OCR**: dependen de cuotas/proveedores externos.
- **Rate limiting en memoria**: protección por IP/cuenta para auth y endpoints públicos sensibles; no distribuido, se reinicia con el proceso. Adecuado para una única instancia Render free; para multi-instancia requiere almacén compartido. El filtro usa `remoteAddr`; con `forward-headers-strategy=framework` la efectividad depende de que el servicio reciba tráfico solo detrás del proxy confiable de Render. No confiar ciegamente en `X-Forwarded-For`.
- **Headers de seguridad**: backend configura nosniff, Referrer-Policy, Permissions-Policy, frame denial y HSTS; frontend/Vercel debe configurar CSP/HSTS/nosniff/referrer/frame/permissions según `vercel.json`. Validar en despliegue real.
- **CORS prod fail-closed**: en perfil `prod`, la app falla al iniciar si faltan orígenes explícitos o si la configuración es inválida (localhost/wildcards no permitidos). Configurar `APP_FRONTEND_URL` y `CORS_ALLOWED_ORIGIN_PATTERNS` con orígenes HTTPS exactos.

## 12. Recuperación ante fallos

| Escenario | Acción |
|---|---|
| Fallo de arranque por env faltante | Revisar logs Render; ProductionConfigValidator indica nombres faltantes. |
| Fallo DB/TLS | Verificar JDBC URL y parámetros TLS según Enzonic; no deshabilitar TLS. |
| DB suspendida | Verificar wake-up Enzonic; Hikari reintenta conexiones; ajustar timeouts/pool. |
| Pérdida de comprobantes | Aceptada en fase inicial; restaurar desde backup de uploads si se implementa. |
| JWT comprometido | Rotar `JWT_SECRET` en Render, redeploy, invalidar sesiones. |
| Migración fallida | No usar `ddl-auto=update`. Revisar Flyway history en DB descartable antes de tocar prod. |


## 13. Pendientes manuales antes del despliegue

- Rotar `JWT_SECRET` comprometido y limpiar historial Git solo con autorización expresa.
- Obtener parámetros TLS/JDBC exactos de Enzonic.
- Crear DB vacía en Enzonic.
- Configurar env vars en Render.
- Configurar `VITE_API_URL` en Vercel.
- Ejecutar smoke tests post-deploy.
- **Decisión pendiente (legacy):** `GroupSchemaMigration` contiene un backfill DML idempotente para `financial_groups.created_by_user_id`; `SavingGoalSchemaMigration` contiene DDL legacy para `saving_goals.icon_key` (ya cubierta por V1 en bases nuevas). No se creó migración Flyway V2 especulativa porque no hay evidencia confirmada de bases históricas que lo requieran. Antes de habilitar o eliminar estas clases, confirmar si existen DBs legacy; si aplica, trasladar la lógica necesaria a migraciones Flyway versionadas controladas.
