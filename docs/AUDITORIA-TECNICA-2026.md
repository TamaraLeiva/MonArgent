# Auditoría técnica — MonArgent

**Fecha:** 21/11/2026
**Commit auditado:** `46ac82f` (HEAD, working tree limpio salvo `PROJECT KICK OFF 2026.docx.pdf`)
**Alcance:** pipeline de tickets (imagen → OCR.Space → Gemini → preview → confirmación), seguridad/auth, grupos y liquidaciones, deuda técnica y cobertura de tests.
**Método:** lectura estática del código y verificación de documentación oficial de OCR.Space y Google Gemini. **No se pudieron ejecutar los tests** (`mvn test`) porque el entorno no tiene MySQL disponible; todo lo que sigue es análisis de código, no de comportamiento observado en runtime.

---

## Resumen ejecutivo

| Área | Estado | Riesgo principal |
|---|---|---|
| Precisión OCR con fotos reales | 🔴 Frágil | La compresión degrada tickets largos y no mejora fotos oscuras |
| Límite de tamaño OCR.Space | 🔴 Crítico | El backend acepta 5 MB, el plan free de OCR.Space corta en 1 MB |
| Timeouts de red | 🔴 Crítico | `new RestTemplate()` sin timeouts: un cuelgue externo bloquea threads |
| Modelo Gemini por defecto | 🔴 Crítico | `gemini-2.0-flash` está apagado: primer intento siempre falla |
| Seguridad de endpoints | 🟠 Alto | `anyRequest().permitAll()`: cualquier endpoint nuevo nace público |
| JWT | 🔴 Crítico | Secreto filtrado en el historial de git |
| N+1 queries | 🟠 Alto | Listados de grupos y transacciones escalan mal |
| Tests | 🟡 Medio | 161 tests backend, 0 frontend, y requieren MySQL local |

**Conclusión corta:** la arquitectura está bien. El problema no es el diseño, es la capa de borde: entradas, tiempos y fallos de terceros. Los 5 fixes de la sección 4 son los que más suben la nota en la defensa y los que más riesgo real eliminan.

---

## 1. Calidad de imagen y precisión del OCR

### 1.1 Pipeline actual

```
<input accept="image/*,application/pdf,...">   ScanPage.jsx:320-328
        │
        ▼
compressImageForOcr()                          imageCompress.js:9-53
  • solo si file.size > 280 KB                 :13-15
  • resize a 1600 px máx.                      :1, 24
  • JPEG 0.82                                  :2, 41
  • sin escala de grises, sin contraste, sin nitidez
        │
        ▼
POST /api/v1/imports/extract                   ScanPage.jsx:144-152 (timeout 90 s)
        │
        ▼
ImportServiceImpl.extract()                    ImportServiceImpl.java:51-69
  • @Transactional(readOnly = true)            :52
  • detectSourceType()                         ImportFileUtils.java:14-36
  • OCR → trim a 12.000 chars                  :42, 147-152
        │
        ▼
OCRSpaceServiceImpl.extractRawText()           OCRSpaceServiceImpl.java:30-81
  • OCREngine=2, scale=true, detectOrientation  :48-52
  • language=spa (deprecado en Engine 2)       :48
  • SIN isTable=true
        │
        ▼
GeminiFinancialExtractionServiceImpl           GeminiFinancialExtractionServiceImpl.java:49-71
  • prompt libre, sin generationConfig         GeminiAiCompletionClient.java:101-107
  • 3 modelos × 3 intentos                     GeminiAiCompletionClient.java:30-35
```

### 1.2 Hallazgos

#### OCR-01 · Crítico · Límite de tamaño inconsistente

- `backend/src/main/java/com/monargent/backend/utils/ImportFileUtils.java:9` → `MAX_BYTES = 5 * 1024 * 1024`
- `backend/src/main/resources/application.properties:71-72` → `max-file-size=5MB`, `max-request-size=5MB`
- `frontend/src/pages/Scan/ScanPage.jsx:320-328` → no hay validación de tamaño en el cliente.

El plan gratuito de OCR.Space acepta **1 MB por archivo** (25.000 requests/mes, 500/día/IP, PDF de hasta 3 páginas). Cualquier foto entre 1 MB y 5 MB pasa la validación del backend y muere en OCR.Space con un error genérico. **Este es el fallo más probable en la demo en vivo**, porque una foto de celular moderna pesa 2–6 MB.

#### OCR-02 · Alto · Se saltea la compresión justo cuando más se necesita

`frontend/src/utils/imageCompress.js:3,13-15`:

```js
const SKIP_BELOW_BYTES = 280 * 1024;
...
if (file.size <= SKIP_BELOW_BYTES) {
  return file;
}
```

Una foto de 270 KB suele ser exactamente el caso malo: poca luz, ruido, JPEG ya recomprimido por WhatsApp. Se sube tal cual, sin contraste ni nitidez. La optimización se está aplicando al revés de lo que conviene.

#### OCR-03 · Alto · No hay preprocesamiento de imagen

`imageCompress.js:37-42` solo hace `drawImage` + `toBlob('image/jpeg', 0.82)`. No hay:

- escala de grises (elimina ruido de color del papel térmico),
- contraste (separa texto del fondo),
- unsharp mask (recupera bordes en fotos fuera de foco),
- corrección de exposición.

Para un ticket arrugado o con sombra, esto es la diferencia entre leer el total y no leerlo.

#### OCR-04 · Alto · Tickets largos quedan ilegibles

`imageCompress.js:1,24`:

```js
const MAX_DIMENSION = 1600;
const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
```

Un ticket vertical de 4000×12000 px se reduce a **533×1600 px**. El texto de una línea de detalle queda en ~8 px de alto: por debajo de lo que cualquier OCR resuelve. El `Math.min(1, ...)` además impide upscalear una foto chica (por ejemplo 800×600), que también es un caso real de cámara con zoom.

#### OCR-05 · Alto · Falta `isTable=true`

`backend/src/main/java/com/monargent/backend/service/impl/OCRSpaceServiceImpl.java:46-53` no envía `isTable`. La documentación de OCR.Space recomienda explícitamente `isTable=true` para tickets y tablas porque preserva la estructura de filas y columnas. Sin eso, las columnas de descripción y precio se entremezclan y Gemini recibe texto ambiguo.

#### OCR-06 · Medio · `language=spa` está deprecado para Engine 2

`OCRSpaceServiceImpl.java:48,51` envía `language=spa` junto con `OCREngine=2`. En Engine 2 el parámetro `language` está deprecado: el idioma se detecta automáticamente. Enviarlo no rompe, pero agrega ruido y confunde el diagnóstico cuando algo falla.

#### OCR-07 · Alto · El truncado a 12.000 chars corta el final del ticket

`ImportServiceImpl.java:42,147-152`:

```java
private static final int MAX_OCR_TEXT_CHARS = 12_000;
...
return rawText.substring(0, MAX_OCR_TEXT_CHARS);
```

Se conserva **el principio** del texto y se descarta el final. En un ticket largo, el final es donde están el **TOTAL**, la fecha y el medio de pago. El modelo entonces inventa o deja `date: null`, y el usuario ve un preview sin total. La truncación debería ser consciente: primeras N líneas + últimas M líneas.

#### OCR-08 · Alto · El prompt no protege contra alucinaciones ni reconcilia totales

`GeminiFinancialExtractionServiceImpl.java:25-32`:

```
Extrae items de tickets/facturas argentinas del texto OCR.
Responde SOLO JSON valido:
{"movements":[{"type":"EXPENSE","description":"producto","suggestedCategory":"Comida","amount":1234.56,"date":"2026-03-15"}]}
Reglas: un objeto por linea de producto; sin subtotales/IVA/total; type EXPENSE salvo ingreso claro;
suggestedCategory: Comida, Limpieza, Transporte, Servicios, Salud, Entretenimiento, Otros;
amount numerico positivo (formato AR 1.234,56); date ISO o null; si no hay items: {"movements":[]}
```

Falta lo que más impacta en tickets reales:

- **"No inventes productos que no estén en el texto"** (sin esto, el modelo completa líneas plausibles).
- **"Si hay cantidad × precio unitario, usa el importe de la línea, no el unitario"** (error clásico: 3 × 450 termina como 450).
- **"Ignora descuentos, redondeos, propina, vuelto y líneas de pago"**.
- **"Si el total del ticket no coincide con la suma de items, priorizá los items y no agregues una línea de ajuste"**.
- **"No inventes fecha: si no es legible, devolvé null"**.

#### OCR-09 · Alto · Gemini se llama sin `generationConfig`

`GeminiAiCompletionClient.java:101-107`:

```java
Map<String, Object> requestBody = Map.of(
    "contents", List.of(Map.of("parts", List.of(Map.of("text", combinedPrompt))))
);
```

Sin `generationConfig` el modelo usa temperatura ~1.0 y formato libre. Para extracción estructurada querés temperatura 0 y `responseMimeType: application/json`. Esto solo ya reduce drásticamente las respuestas con texto alrededor del JSON y los parseos fallidos.

#### OCR-10 · Medio · Los fallos de parseo se convierten en "no hay productos"

`GeminiFinancialExtractionServiceImpl.java:92-95` devuelve `List.of()` ante cualquier excepción de parseo. Después `ImportServiceImpl.java:139-143` lanza:

> "No se detectaron productos en el ticket. Probá con una imagen más nítida..."

Es decir: un JSON roto de Gemini se le presenta al usuario como una foto borrosa. El usuario vuelve a sacar la foto, vuelve a gastar cuota, y el problema era otro. Hay que distinguir `EMPTY_RESULT` de `PARSE_ERROR`.

#### OCR-11 · Medio · HEIC y formatos no decodificables

`imageCompress.js:17-22`:

```js
try {
  bitmap = await createImageBitmap(file);
} catch {
  return file;
}
```

Si el navegador no puede decodificar (típico con HEIC de iPhone en Chrome, o WebP en Safari viejo), se devuelve el archivo original. El backend lo acepta porque `ImportFileUtils.java:25` confía en `contentType.startsWith("image/")`, y OCR.Space probablemente lo rechace. El usuario ve un error sin explicación.

#### OCR-12 · Medio · Validación de tipo por MIME declarado, no por contenido

`ImportFileUtils.java:22-35` usa `file.getContentType()` y la extensión. Ambos son controlados por el cliente. Un `.jpg` corrupto o un archivo renombrado pasa la validación y explota más adelante. Falta leer los magic bytes (`FF D8 FF` para JPEG, `89 50 4E 47` para PNG, `25 50 44 46` para PDF).

#### OCR-13 · Bajo · La fecha extraída se descarta

`frontend/src/pages/Scan/ScanPage.jsx:98-99`:

```js
// Fecha del ticket suele ser distinta al mes actual: default hoy para que aparezcan en Gastos.
date: todayIsoDate(),
```

Es una decisión consciente, pero conviene que sea explícita en la UI: si el ticket es de otro mes, el usuario tiene que corregir la fecha a mano en cada línea. Mejor: usar la fecha extraída y mostrar un aviso "fecha detectada: 12/11/2026".

---

## 2. Robustez: bugs ocultos, manejo de errores y resiliencia

#### RES-01 · Crítico · `RestTemplate` sin timeouts

`backend/src/main/java/com/monargent/backend/config/ApplicationConfig.java:49-52`:

```java
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```

Por defecto, `SimpleClientHttpRequestFactory` usa `connectTimeout = 0` y `readTimeout = 0`, que significan **infinito**. Si OCR.Space o Gemini aceptan la conexión y no responden, el thread de Tomcat queda colgado para siempre. Con 10 usuarios escaneando, se agota el pool y **toda la app deja de responder**, incluido el login.

#### RES-02 · Crítico · La tormenta de reintentos supera el timeout del cliente

`GeminiAiCompletionClient.java:30-35,56-84` prueba hasta **3 modelos × 3 intentos**, con `sleepBackoff` entre intentos. En el peor caso son 9 round-trips más esperas. El frontend corta a los 90 s (`ScanPage.jsx:18`), pero el backend sigue trabajando: el usuario ve error, reintenta, y se duplican llamadas y consumo de cuota.

Además, el abort del cliente (`ScanPage.jsx:127-128`) no cancela el request del servidor.

#### RES-03 · Crítico · Modelo por defecto apagado

`application.properties:68` → `gemini.model=${GEMINI_MODEL:gemini-2.0-flash}`

`GeminiAiCompletionClient.java:31,42` repite el mismo default. Según la documentación actual de Google, `gemini-2.0-flash` está **shut down**; `gemini-2.5-flash` está deprecado y desde el 2026-12-01 rutea a `gemini-3.5-flash-lite`. Resultado: **cada escaneo arranca con un round-trip condenado a fallar** antes de caer al fallback. En la demo eso son segundos de espera extra y un `WARN` en el log.

#### RES-04 · Alto · Transacción de base de datos abierta durante llamadas HTTP

`ImportServiceImpl.java:51-53`:

```java
@Override
@Transactional(readOnly = true)
public ImportPreviewResponse extract(MultipartFile file) {
```

Adentro se hacen dos llamadas externas (OCR y Gemini) que pueden tardar 10–60 s. Durante todo ese tiempo se retiene una conexión del pool. Con `spring.datasource.hikari.maximum-pool-size` por defecto (10), **dos o tres escaneos simultáneos pueden bloquear el resto de la app**. La transacción debería abrirse recién para las queries de categorías, no para las llamadas de red.

#### RES-05 · Crítico · Seguridad por defecto permisiva

`backend/src/main/java/com/monargent/backend/security/SecurityConfig.java:99-118`:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/auth/**", "/public/**", "/swagger-ui.html", ...).permitAll()
    .requestMatchers("/categories/**", "/transactions/**", "/imports/**",
                     "/receipts/**", "/groups/**", "/notifications/**").authenticated()
    .anyRequest().permitAll()
)
```

Todo endpoint que no esté en la lista nace **público**. Ya pasa con `/auth/me`: está bajo `/auth/**`, así que es `permitAll`. Hoy no filtra datos porque el controller resuelve el usuario actual y falla, pero devuelve **404 en vez de 401**, y el frontend no puede distinguir "no logueado" de "no existe".

El patrón correcto es default-deny: `anyRequest().authenticated()` y una lista blanca explícita.

#### RES-06 · Alto · Sin `ErrorBoundary` a nivel de ruta

`frontend/src/App.jsx:9-15` monta `<BrowserRouter>` y las rutas sin boundary. `main.jsx:60-64` renderiza `<App />` sin boundary. El único boundary existente es `Chart3DErrorBoundary` (`components/charts/Chart3DWrapper.jsx:16`), específico de los gráficos 3D.

Cualquier excepción de render en una página (por ejemplo un `data.movements.map` con `data` inesperado) desmonta **toda la app** y deja pantalla blanca. En una demo en vivo, eso es fatal.

#### RES-07 · Alto · Sin validación de archivo en el cliente

`ScanPage.jsx:69-78` acepta lo que venga del input. El `accept` del HTML es una sugerencia, no una validación: el usuario puede elegir "Todos los archivos" y subir un RAW de 40 MB. La petición viaja, el backend la rechaza por tamaño (`ImportFileUtils.java:18-20`) y el usuario esperó 30 s para nada.

#### RES-08 · Medio · Expiración de sesión solo reactiva

`frontend/src/services/api.js:35-53` reacciona a `401`. No hay chequeo proactivo del `exp` del JWT ni renovación. Si el token vence mientras el usuario está en una pantalla sin requests, la app sigue "logueada" hasta la próxima acción, y ahí redirige perdiendo el estado del formulario.

Además, `ScanPage.jsx:114,156` guarda el preview en `sessionStorage` y **no se limpia al cerrar sesión**. Otro usuario en el mismo dispositivo puede ver el último ticket procesado.

#### RES-09 · Medio · Errores de OCR.Space colapsados en 500

`OCRSpaceServiceImpl.java:63-79`:

```java
String errorMessage = ocrResponse.getErrorMessage();
if (StringUtils.hasText(errorMessage)) {
    throw new RuntimeException("Error del servicio OCR: " + errorMessage);
}
...
} catch (Exception e) {
    throw new RuntimeException("Error al procesar el OCR: " + e.getMessage(), e);
}
```

No se distingue cuota agotada (`E101`/límite mensual), archivo demasiado grande, PDF con demasiadas páginas o imagen ilegible. Todo termina como 500 con el mensaje crudo del proveedor. El frontend no puede mostrar un mensaje accionable.

#### RES-10 · Medio · `confirm` no es idempotente

`ImportServiceImpl.java:71-127` crea un `Receipt` y N `Transaction` en cada llamada. Un doble tap en "Confirmar" (o un retry del navegador) genera **duplicados**. Falta una clave de idempotencia por `fileFingerprint` o un chequeo de receipt ya confirmado.

#### RES-11 · Bajo · `MediaType.parseMediaType` puede tirar 500

En los servicios que arman la respuesta de comprobantes se parsea el `contentType` guardado. Si en la base hay un valor corrupto o vacío, el parseo lanza `InvalidMediaTypeException` y termina en 500. Conviene un `try/catch` con fallback a `application/octet-stream`.

---

## 3. Deuda técnica, limpieza y seguridad

#### SEC-01 · Crítico · Secreto JWT filtrado en el historial de git

En los commits `cb1e98e` y `0b8a005` aparece:

```
JWT_SECRET=MonArgentClaveSecretaTFI2026TamaraSoledadLeiva412349
```

El repositorio es público (`https://github.com/412349-Leiva/TFI-MonArget.git`). Cualquiera con acceso al historial puede firmar tokens válidos para cualquier usuario. **Rotar el secreto es obligatorio antes de la defensa**, y el valor nuevo debe vivir solo en el panel del proveedor (Render/Railway), nunca en el repo.

Reescribir el historial con `git filter-repo` es opcional y riesgoso; lo mínimo e imprescindible es rotar.

#### SEC-02 · Alto · Códigos de verificación impresos en stdout

`backend/src/main/java/com/monargent/backend/service/impl/AuthEmailServiceImpl.java:44-49`:

```java
System.out.println("==================================================");
System.out.println("MonArgent — correo no enviado (modo local)");
System.out.println("Para: " + toEmail);
System.out.println("Código: " + code);
```

En producción, los logs del proveedor quedan con códigos de verificación y recuperación en texto plano. Cualquiera con acceso a los logs puede tomar cuentas. Debe estar detrás de un perfil (`@Profile("!prod")`) y usar el logger, no `System.out`.

#### SEC-03 · Alto · `.env.production` versionado con URL de ngrok

`frontend/.env.production` está trackeado (`git ls-files`) y hornea una URL de ngrok. Eso ata el build a un túnel efímero y expone infraestructura interna. Debería estar en `.gitignore` y resolverse en build time desde el panel del proveedor.

#### SEC-04 · Medio · API key de Gemini en query string

`GeminiAiCompletionClient.java:109`:

```java
String url = GEMINI_BASE_URL + model + ":generateContent?key=" + geminiApiKey;
```

La key viaja en la URL, así que aparece en logs de proxies, en trazas y en cualquier captura de error que incluya la URL. Google soporta el header `x-goog-api-key`. Es un cambio de una línea.

#### SEC-05 · Medio · `console.error` con payloads del servidor

`frontend/src/context/AuthContext.jsx:66,92,114,128,140,162,176` y `TransactionContext.jsx:45`, `main.jsx:66`. En producción la consola del navegador queda con mensajes internos y detalles de error del backend. No es una filtración grave, pero es ruido y da mala imagen en la defensa si abrís DevTools.

#### DEBT-01 · Alto · N+1 en el listado de transacciones

`TransactionServiceImpl.java:70-75` mapea con `transactionMapper::toResponse`, que accede a `transaction.getCategory()`. La categoría es `@ManyToOne` lazy: una query extra **por cada transacción**. Con 200 movimientos son 201 queries.

Fix: `@EntityGraph(attributePaths = "category")` en el repositorio o `JOIN FETCH` en la specification.

#### DEBT-02 · Alto · N+1 en el listado de grupos

`GroupServiceImpl.java:140,150` llaman a `toSummary(group, userId)` por cada grupo. `toSummary` (líneas 930-932) hace **dos queries por grupo**:

```java
List<GroupGuestMember> guests = groupGuestMemberRepository.findAllByGroupId(group.getId());
List<GroupExpense> expenses = groupExpenseRepository.findAllByGroupId(group.getId());
```

Con 10 grupos son 21 queries para pintar una lista. `toDetail` (945-947) repite el patrón.

#### DEBT-03 · Alto · `findAll()` de usuarios y guests en memoria

`ProfileDocumentServiceImpl.java:44-48`:

```java
Map<Long, GroupGuestMember> guestsById = guestMemberRepository.findAll().stream()...
Map<Long, User> usersById = userRepository.findAll().stream()...
```

Carga **todas** las entidades de dos tablas para resolver los nombres de un puñado de pagos. En una demo con pocos datos no se nota; en producción es una bomba de memoria y tiempo.

#### DEBT-04 · Medio · Residuo de redondeo en liquidaciones

`GroupSettlementCalculator.java:51-55`:

```java
BigDecimal share = total.divide(
    BigDecimal.valueOf(participants.size()),
    2,
    RoundingMode.HALF_UP
);
```

Con `total = 100` y 3 participantes, `share = 33.33`, suma 99.99: **se pierde un centavo**. Los balances no cierran exacto y las transferencias pueden dejar un residuo sin asignar. El algoritmo correcto distribuye el resto: los primeros `total - share*n` participantes pagan un centavo más.

Es un caso de test que hoy no existe y que un jurado puede pedir en vivo.

#### DEBT-05 · Medio · Migraciones que se tragan los errores

`config/GroupSchemaMigration.java:33-35,42-44,50-54,61-63,82,98-100,109-113,148` y `config/SavingGoalSchemaMigration.java:24-26` hacen `try { ALTER TABLE ... } catch (Exception ex) { /* silencio */ }`. Si una migración falla por un motivo distinto de "la columna ya existe", la app arranca con un esquema inconsistente y falla más tarde con un error confuso. Hay que loguear al menos `WARN` con el SQL y el error, y distinguir el código de error de MySQL.

#### DEBT-06 · Medio · Tests atados a MySQL local y cero tests de frontend

Hay 161 `@Test` en 44 archivos, pero los de integración requieren un schema `monargent_test` en MySQL. No hay H2 ni Testcontainers, así que **no se pueden correr en CI ni en otra máquina** sin preparar la base a mano. Y el frontend no tiene framework de test: 0 cobertura en el flujo de escaneo, que es justo el más crítico.

#### DEBT-07 · Bajo · Duplicación de resolución de categorías

`TransactionServiceImpl.java:252-273` tiene `resolveGroupExpenseCategory` y `resolveGroupSettlementCategory` casi idénticos. Se pueden unificar en un método con `CategoryType` como parámetro.

#### DEBT-08 · Bajo · Código muerto y logs de diagnóstico

- `ImportServiceImpl.java:135-138` deja logs `[OCR-DIAG]` en nivel `INFO`; en producción son ruido.
- `ScanPage.jsx` mantiene `STAGE_LABELS` con `compressing`, pero si el archivo es PDF no hay compresión: el label miente un instante.
- `OCRSpaceServiceImpl.java:48` (`language=spa`) es parámetro muerto para Engine 2.

---

## 4. Top 5 para blindar la defensa

Ordenados por impacto real sobre la demo y por relación impacto/esfuerzo.

### Fix #1 — Timeouts en `RestTemplate` (30 min)

**Archivo:** `backend/src/main/java/com/monargent/backend/config/ApplicationConfig.java`

Reemplazá el bean actual (líneas 49-52):

```java
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
        .connectTimeout(Duration.ofSeconds(10))
        .readTimeout(Duration.ofSeconds(60))
        .build();
}
```

Agregá el import:

```java
import java.time.Duration;
import org.springframework.boot.web.client.RestTemplateBuilder;
```

**Por qué 10/60:** OCR de un ticket tarda 3–15 s; Gemini 5–30 s. 60 s de lectura cubre el p99 sin colgar el thread para siempre. Si querés ser más conservador en la demo, 45 s.

**Complemento en el frontend:** `ScanPage.jsx:18` tiene 90 s. Con backend a 60 s + un margen, 90 s sigue bien. No lo bajes: el problema no era el cliente.

**Test que podés mostrar:** un `@SpringBootTest` que verifique que el bean tiene timeouts distintos de 0. O más simple, un test unitario con `MockRestServiceServer` y `assertTimeout`.

---

### Fix #2 — Modelo Gemini correcto + `generationConfig` + key en header (45 min)

**Archivo 1:** `backend/src/main/resources/application.properties:68`

```properties
gemini.model=${GEMINI_MODEL:gemini-flash-latest}
```

**Archivo 2:** `backend/src/main/java/com/monargent/backend/service/impl/GeminiAiCompletionClient.java`

Cambiá la lista de fallback (líneas 30-34):

```java
private static final List<String> FALLBACK_MODELS = List.of(
    "gemini-flash-latest",
    "gemini-2.5-flash"
);
```

Cambiá `callApi` (líneas 101-110) para mandar la key en header y forzar JSON determinístico:

```java
private String callApi(String model, String combinedPrompt) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("x-goog-api-key", geminiApiKey);

    Map<String, Object> requestBody = Map.of(
        "contents", List.of(Map.of("parts", List.of(Map.of("text", combinedPrompt)))),
        "generationConfig", Map.of(
            "temperature", 0,
            "topP", 0.1,
            "maxOutputTokens", 4096,
            "responseMimeType", "application/json"
        )
    );

    String url = GEMINI_BASE_URL + model + ":generateContent";
    HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
    // ... resto igual
}
```

**Por qué:** `gemini-2.0-flash` está apagado; cada llamada actual empieza con un fallo garantizado. `temperature: 0` + `responseMimeType: application/json` reduce los parseos fallidos y hace la extracción reproducible, que es exactamente lo que un jurado quiere ver.

**Ojo:** si tu `GEMINI_MODEL` está seteado por env en el deploy, cambiá también esa variable. El default del properties no pisa una env existente.

---

### Fix #3 — OCR.Space: `isTable`, sin `language`, y prompt con reglas de ticket (1 h)

**Archivo 1:** `backend/src/main/java/com/monargent/backend/service/impl/OCRSpaceServiceImpl.java:46-53`

```java
MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
body.add("apikey", apiKey);
body.add("scale", "true");
body.add("detectOrientation", "true");
body.add("isTable", "true");
body.add("OCREngine", "2");
body.add("isOverwriteRequired", "false");
body.add("isOverlayRequired", "false");
body.add("file", fileResource);
```

**Archivo 2:** `backend/src/main/java/com/monargent/backend/service/impl/GeminiFinancialExtractionServiceImpl.java:25-32`

```java
private static final String SYSTEM_PROMPT = """
    You extract line items from Argentine receipts/invoices given OCR text.
    Return ONLY valid JSON:
    {"movements":[{"type":"EXPENSE","description":"product","suggestedCategory":"Food","amount":1234.56,"date":"2026-03-15"}]}

    Rules:
    - One object per product line. Never invent products, prices, or dates.
    - Skip subtotals, VAT, discounts, tips, change, payment lines, and the grand total.
    - If a line has quantity x unit price, use the line total, not the unit price.
    - If the sum of items does not match the receipt total, keep the items and do NOT add an adjustment line.
    - amount must be a positive number using dot decimals (AR "1.234,56" -> 1234.56).
    - date must be ISO yyyy-MM-dd, or null when not legible. Never default to today.
    - suggestedCategory must be one of: Food, Cleaning, Transport, Utilities, Health, Entertainment, Other.
    - If there are no items: {"movements":[]}
    """;
```

**Por qué:** `isTable=true` es la recomendación oficial de OCR.Space para tickets; sin eso las columnas se mezclan. Las reglas de cantidad y total atacan los dos errores más frecuentes en la demo: el precio unitario tomado como total y la línea de ajuste inventada.

**Cuidado con el idioma:** si cambiás las categorías del prompt a inglés, tenés que mapearlas a las categorías reales de la base (`Comida`, `Limpieza`, etc.) en `enrichWithSuggestedCategories`. Si preferís no tocar ese mapeo, dejá las categorías en español y traducí solo las reglas.

---

### Fix #4 — Preprocesamiento de imagen adaptativo (2 h)

**Archivo:** `frontend/src/utils/imageCompress.js` (reemplazo completo)

```js
const MAX_LONG_SIDE = 2600;
const MAX_LONG_SIDE_TALL = 3400; // tickets verticales largos
const MIN_LONG_SIDE = 1800;
const OCR_MAX_BYTES = 1024 * 1024; // límite del plan free de OCR.Space
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.62];

export async function compressImageForOcr(file) {
  if (!file?.type?.startsWith('image/')) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Formato de imagen no soportado. Probá con JPG o PNG.');
  }

  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const shortSide = Math.min(bitmap.width, bitmap.height);
    const isTall = longSide / shortSide >= 2;
    const cap = isTall ? MAX_LONG_SIDE_TALL : MAX_LONG_SIDE;
    const targetLong = Math.min(cap, Math.max(longSide, MIN_LONG_SIDE));

    let scale = Math.min(1, targetLong / longSide);
    let canvas = drawToCanvas(bitmap, scale);
    enhanceForOcr(canvas);

    let blob = await encodeJpeg(canvas, QUALITY_STEPS);
    while (blob && blob.size > OCR_MAX_BYTES && scale > 0.35) {
      scale *= 0.8;
      canvas = drawToCanvas(bitmap, scale);
      enhanceForOcr(canvas);
      blob = await encodeJpeg(canvas, QUALITY_STEPS);
    }

    if (!blob) return file;
    if (blob.size >= file.size && file.size <= OCR_MAX_BYTES) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'receipt';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close?.();
  }
}

function drawToCanvas(bitmap, scale) {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function enhanceForOcr(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  // Grayscale + contrast: thermal paper and shadows become readable.
  const contrast = 1.35;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    data[i] = data[i + 1] = data[i + 2] = value;
  }

  // Unsharp mask (3x3 kernel) to recover blurred edges.
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const source = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sum += source[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const idx = (y * width + x) * 4;
      const value = Math.max(0, Math.min(255, sum));
      data[idx] = data[idx + 1] = data[idx + 2] = value;
    }
  }

  ctx.putImageData(image, 0, 0);
}

async function encodeJpeg(canvas, qualities) {
  let last = null;
  for (const quality of qualities) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) continue;
    last = blob;
    if (blob.size <= OCR_MAX_BYTES) return blob;
  }
  return last;
}

export function fileFingerprint(file) {
  if (!file) return '';
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}
```

**Y en `ScanPage.jsx:134-140`**, capturá el error de formato para no mandar el archivo original:

```js
setStage('compressing');
let uploadFile;
try {
  uploadFile = await compressImageForOcr(file);
} catch (e) {
  setStage(null);
  setError(e.message);
  return;
}
```

**Por qué:** sube el techo de resolución para tickets largos, aplica grises + contraste + nitidez, y garantiza que el archivo salga por debajo de 1 MB. Es el fix que más se nota con fotos reales y el más fácil de demostrar en vivo con un ticket arrugado.

---

### Fix #5 — `ErrorBoundary` + default-deny + rotación de JWT (1 h)

**Archivo nuevo:** `frontend/src/components/ErrorBoundary.jsx`

```jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[render]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-6 text-center">
          <h2 className="text-lg font-semibold">Algo salió mal en esta pantalla</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tus datos están a salvo. Probá recargar.
          </p>
          <button
            className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**En `frontend/src/App.jsx:9-15`**, envolvé las rutas:

```jsx
<BrowserRouter>
  <ErrorBoundary>
    {/* layout + Routes actuales */}
  </ErrorBoundary>
</BrowserRouter>
```

**En `backend/.../security/SecurityConfig.java:99-118`**, default-deny:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers(
        "/auth/login",
        "/auth/register",
        "/auth/verify",
        "/auth/resend-code",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/resend-reset-code"
    ).permitAll()
    .requestMatchers(
        "/public/**",
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/v3/api-docs.yaml"
    ).permitAll()
    .anyRequest().authenticated()
)
```

**Rotación de JWT:** generá un secreto nuevo (mínimo 64 bytes aleatorios):

```bash
openssl rand -base64 64
```

Setealo como `JWT_SECRET` en el panel del proveedor, redeployá, y verificá que el valor viejo ya no exista en ningún `.env` del repo. Los tokens emitidos con el secreto viejo quedan inválidos: es lo esperado, todos vuelven a loguearse.

**Por qué:** el boundary evita la pantalla blanca en la demo; el default-deny evita que un endpoint nuevo quede público sin que nadie lo note; la rotación cierra la vulnerabilidad más grave del repo.

---

## Anexo A — Checklist de demo en vivo

Antes de sentarte frente al jurado:

- [ ] `JWT_SECRET` rotado y seteado en el deploy (no en el repo).
- [ ] `GEMINI_MODEL` apunta a un modelo vivo (`gemini-flash-latest`).
- [ ] `OCR_API_KEY` con cuota disponible (verificá el contador del plan).
- [ ] Probar con: ticket limpio, ticket arrugado, foto oscura, ticket largo vertical, PDF de 2 páginas.
- [ ] Probar doble tap en "Confirmar" y verificar que no duplique.
- [ ] Probar token vencido: la app debe redirigir a login sin pantalla blanca.
- [ ] Tener a mano un ticket de respaldo ya confirmado por si la red del aula falla.
- [ ] Cerrar DevTools: no debe haber `console.error` en el flujo feliz.

## Anexo B — Tests que conviene agregar (si queda tiempo)

| Test | Qué cubre | Archivo sugerido |
|---|---|---|
| `GroupSettlementCalculatorTest` — 100/3 | Residuo de redondeo | extender el existente |
| `ImportServiceImplTest` — texto > 12k | Que el total del final no se pierda | extender el existente |
| `OCRSpaceServiceImplTest` — respuesta vacía / error code | Mapeo de errores accionables | extender el existente |
| `GeminiFinancialExtractionServiceImplTest` — JSON con texto alrededor | Parseo robusto | extender el existente |
| Frontend: `compressImageForOcr` con mock de canvas | Que nunca suba > 1 MB | nuevo, requiere Vitest |

---

**Nota final:** este documento es un análisis estático. Los puntos marcados como "Crítico" están verificados contra el código y la documentación de los proveedores; los de rendimiento (N+1) son estimaciones de complejidad, no mediciones. Si querés, el próximo paso es aplicar los 5 fixes en una rama y correr la suite con MySQL levantado para tener números reales.
