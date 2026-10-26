# Registro de Decisiones de Arquitectura y DevOps (decisiones.md)

Este documento registra de forma acumulativa y justificada las decisiones técnicas, arquitecturales y de gestión tomadas a lo largo de los Trabajos Prácticos (TP1 a TP4) de la materia **Ingeniería del Software 3 (UCC)**.

---

## ## TP1 — Git Colaborativo, Gobernanza y Manejo de Conflictos

### 1. ¿Por qué Git no pudo resolver el conflicto solo?
* **Razón técnica:** Git utiliza un **algoritmo de fusión en tres vías (3-way merge)** que compara los cambios de dos ramas divergentes (`main` y `feature/titulo-b`) a partir de su commit ancestro común más cercano (*merge base*). 
* Al detectarse modificaciones concurrentes y directas sobre el **mismo rango de líneas / mismos bytes** en el archivo `README.md`, el motor de Git no posee criterio semántico ni conocimiento de reglas de negocio para determinar automáticamente cuál de las dos versiones es la válida sin riesgo de sobrescribir o descartar información.
* Por diseño de seguridad e integridad, Git suspende el proceso de merge automático, inserta delimitadores de conflicto (`<<<<<<<`, `=======`, `>>>>>>>`) y transfiere la responsabilidad al desarrollador para una resolución manual explícita.

### 2. ¿Qué habría tenido que pasar para que el conflicto nunca apareciera?
Para prevenir la colisión de cambios concurrentes se podrían haber aplicado dos estrategias:
1. **Secuenciamiento y sincronización de ramas:** Que la rama `feature/titulo-b` se hubiera originado o actualizado **después** de haber integrado `feature/titulo-a` en `main`. Al ejecutar un `git pull` o `git rebase origin/main` antes de realizar las modificaciones locales, los cambios se habrían aplicado linealmente sobre la versión definitiva.
2. **Desacoplamiento e independencia de archivos/líneas:** Que cada rama hubiese trabajado sobre archivos distintos (por ejemplo, secciones modulares separadas) o en rangos de líneas distantes dentro del documento, permitiendo a Git fusionar automáticamente ambos aportes sin solapamiento.

### 3. Problemas encontrados y cómo se resolvieron
* **Problema:** Tras abrir el Pull Request, GitHub bloqueó la fusión directa mostrando el estado de advertencia *"This branch has conflicts that must be resolved"* y marcadores tridireccionales en el visor.
* **Resolución:**
  1. Se inspeccionó el diff en la herramienta web de resolución de conflictos de GitHub (*Resolve conflicts*).
  2. Se extrajo la captura de pantalla de los marcadores previa modificación como evidencia técnica obligatoria para `evidencias.md`.
  3. Se consolidó manualmente la versión final (Versión B), eliminando meticulosamente todas las líneas de delimitadores (`<<<<<<< HEAD`, `=======`, `>>>>>>>`).
  4. Se validó la coherencia del documento, se marcó como resuelto (*Mark as resolved*) y se ejecutó el commit de merge en la rama principal.

### 4. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se consultó a Gemini / Asistente de Cátedra para profundizar en el funcionamiento interno del algoritmo 3-way merge y estructurar el análisis técnico del conflicto.
* **Verificación humana:** Se auditó manualmente el árbol de commits en GitHub, se verificó que la rama `main` quedara limpia y sin marcadores residuales de conflicto, y se trajo la versión definitiva al entorno local mediante `git pull`.

---

## ## TP2 — Contenedores, Docker y Publicación en Registry

### 1. Selección y Justificación de la Aplicación del Semestre
Se seleccionó una aplicación full-stack de **Gestión de Reservas y Turnos** (`.NET 8 + React/Vite + PostgreSQL`) ubicada en la carpeta `Trabajo/`, evaluada positivamente frente a los 4 criterios de selección de `elegir-app.md`:
1. **Ejecución local inmediata y conocida:** Clona y levanta de forma determinista sin herramientas exóticas mediante comandos estándar (`dotnet run --project Trabajo/backend/SistemaReservasBackend.csproj` y `npm run dev` en `Trabajo/frontend`).
2. **Parametrización limpia de Base de Datos:** La conexión utiliza el driver `Npgsql` desacoplado de cadenas fijas; toma las credenciales desde variables de entorno (`ConnectionStrings__Default` / `DB_PASSWORD`), permitiendo cambiar el host de base de datos (`Host=db`) transparentemente.
3. **Lógica testeable para TP5:** Posee 6 reglas de negocio claras en backend (control de horarios futuros en intervalos de 30 min, validación de formatos, bloqueo de solapamiento de turnos, inmutabilidad de cancelaciones, ventana límite >2hs, y máximo 3 turnos activos diarios por usuario) y comportamientos observables en UI (deshabilitación de submit ante datos inválidos, badges dinámicos y filtros de estado).
4. **Comprensión integral de la arquitectura:** Código estructurado en capas limpias (Controladores, Servicios, Modelos, DTOs y Componentes SPA) que permite auditoría y modificación en vivo.

### 2. Definición del Proceso de Build Multietapa (Multi-Stage Dockerfiles)
Tanto el Backend como el Frontend implementan **Multi-Stage Builds** divididos en dos etapas:
* **Etapa 1 (Build / Compilación):** Utiliza imágenes base completas con compiladores (`mcr.microsoft.com/dotnet/sdk:8.0` y `node:20-alpine`). Se copian primero los archivos de manifiesto (`.csproj` y `package.json`) y se ejecutan las restauraciones (`dotnet restore` y `npm install`) para aprovechar el **caché de capas de Docker**. Luego se compilan los binarios (`dotnet publish`) o estáticos (`npm run build`).
* **Etapa 2 (Runtime / Producción):** Utiliza imágenes mínimas de ejecución (`mcr.microsoft.com/dotnet/aspnet:8.0` y `nginx:alpine`). Se copian únicamente los artefactos generados en la Etapa 1 mediante `COPY --from=build`.
* **Justificación técnica:** Reduce el tamaño de las imágenes finales de ~800 MB a menos de ~100 MB, optimiza los tiempos de descarga desde registries públicos (`ghcr.io`), ahorra ancho de banda y minimiza drásticamente la superficie de ataque al no incluir SDKs, compiladores ni código fuente en el contenedor productivo.  

### 3. Cómo se encuentran los servicios
Los contenedores se ejecutan dentro de una red interna tipo *bridge* gestionada automáticamente por Docker Compose. Los servicios resuelven la comunicación mediante el **DNS interno de Docker**, utilizando el nombre asignado al servicio como hostname (el backend conecta a PostgreSQL mediante `Host=db;Database=app;Username=postgres;Password=...`).

### 4. Healthcheck vs depends_on
* **Problema de `depends_on` simple:** Por defecto, `depends_on` solo espera que el contenedor de la base de datos inicie su proceso a nivel sistema operativo, pero PostgreSQL requiere varios segundos adicionales para inicializar el motor de datos y habilitar el socket TCP en el puerto 5432. Si el backend arranca inmediatamente, la conexión falla por *connection refused*.
* **Solución con `healthcheck`:** Se configuró un sondeo de salud activo en el servicio `db` mediante `test: ["CMD-SHELL", "pg_isready -U postgres"]` con intervalos de 5 segundos. En el backend se especificó `depends_on: { db: { condition: service_healthy } }`, garantizando que la API solo arranque cuando PostgreSQL confirme que está listo para aceptar consultas reales.

### 5. Dónde viven los secretos y persistencia
* **Secretos:** Las credenciales y claves sensibles (`POSTGRES_PASSWORD`, tokens) **nunca** se almacenan en el código fuente ni en las imágenes de Docker. Viven en variables de entorno provistas localmente por un archivo `.env` que está estrictamente ignorado en `.gitignore`. En el repositorio público se proporciona únicamente `.env.example` con valores de referencia para documentación.
* **Persistencia:** Los datos relacionales residen en el volumen nombrado `db_data` montado en `/var/lib/postgresql/data`, asegurando que la información persista ante reinicios o eliminaciones de contenedores (`docker volume ls`).

### 6. Problemas encontrados y cómo se resolvieron
* **Problema:** Al levantar el compose con imágenes publicadas (`docker-compose.registry.yml`), el backend no lograba autenticar con PostgreSQL debido a que la variable interpolada `${DB_PASSWORD}` no existía en entornos limpios sin `.env`.
* **Resolución:** Se estandarizó la creación del archivo `.env` local a partir de `.env.example` antes del despliegue y se validó la asignación de variables en tiempo de ejecución.

### 7. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó Gemini / Antigravity para estructurar los Dockerfiles multi-stage de .NET 8 y Vite/Nginx, y para generar la sintaxis de healthcheck en Compose.
* **Verificación humana:** Se compilaron y ejecutaron los contenedores localmente, se verificaron los tamaños de imagen resultantes con `docker images`, se publicaron en GitHub Container Registry (`ghcr.io`) y se comprobó el estado `healthy` mediante `docker compose -f docker-compose.registry.yml ps`.

---

## ## TP3 — Planificación Ágil - GitHub Projects 

### 1. Duración del Sprint (Iteraciones)
* **Duración elegida:** **2 semanas** (14 días).
* **Justificación:** |
  - Se alinea armónicamente con el ciclo de entregas y el calendario de trabajos prácticos de la cátedra.
  - Proporciona un período lo suficientemente corto para obtener **feedback rápido**, inspeccionar y adaptar, a la vez que brinda margen suficiente para completar incrementos de valor funcionales (historias completas con tests e integración continua) sin generar sobrecarga administrativa por ceremonias excesivamente frecuentes.

### 2. Límite de Trabajo en Progreso (WIP Limit)
* **Límite elegido para la columna *In Progress*:** **2 tarjetas simultáneas**.
* **Justificación:**
  - Aplica el principio central del flujo Kanban: **"Empezar menos, terminar más"** (*Stop starting, start finishing*).
  - Al trabajar individualmente o en equipos reducidos, acumular tareas en curso genera un elevado costo por **cambio de contexto (*context switching*)** y acumulación de "inventario" no entregado (código a medio testear, ramas desactualizadas y conflictos de merge).
  - Un límite de 2 permite trabajar en una tarea activa mientras se gestiona una revisión o bloqueo temporal en otra, forzando a destrabar y completar el ítem antes de jalar nuevo trabajo.

### 3. Análisis y Reescritura de la Historia de Usuario Mal Escrita
* **Historia mal escrita analizada:**
  > *"Como desarrollador quiero crear la tabla de usuarios en la base de datos para guardar la información."*
* **¿Por qué está mal escrita?**
  1. **Confunde una tarea técnica con una historia de usuario:** Crear una tabla es un detalle técnico de implementación (*el cómo*), no una capacidad funcional observable por el usuario final (*el qué*).
  2. **Rol incorrecto:** El "desarrollador" no es el usuario final ni el stakeholder que recibe el beneficio o valor del negocio.
  3. **No cumple el principio INVEST:** No es independiente ni valiosa por sí sola (ningún cliente obtiene valor de una tabla aislada si no hay una funcionalidad visible asociada).
* **¿Cómo se reescribe correctamente?**
  > **Historia de Usuario:** *"Como usuario quiero poder registrarme e iniciar sesión con mis credenciales para acceder de forma segura a mi cuenta y gestionar mis reservas."*
  >
  > **Criterios de Aceptación:**
  > - [ ] El formulario valida formato de email y fortaleza de contraseña en tiempo real.
  > - [ ] Un usuario registrado puede autenticarse exitosamente y recibir un token de sesión.
  > - [ ] Credenciales inválidas devuelven un mensaje genérico sin exponer detalles del sistema.
  > - [ ] Las contraseñas se almacenan con hashing seguro (BCrypt/Argon2).
  >
  > *(La creación del esquema de base de datos y la tabla pasa a ser una **Tarea Técnica hija** subordinada a esta historia).* 
  
### 4. Problemas encontrados y cómo se resolvieron
* **Problema:** Enlazar automáticamente el cierre de las tareas técnicas del tablero de GitHub Projects con los Pull Requests y commits de desarrollo.
* **Resolución:** Se configuraron palabras clave de cierre en los PRs (`Closes #ID`) y se verificó la trazabilidad completa: Tarea en Projects ➔ PR vinculado ➔ Commit ➔ Historia de Usuario ➔ Épica.

### 5. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó IA para contrastar la redacción de criterios de aceptación frente a la metodología INVEST y definir las dimensiones del tablero Kanban.
* **Verificación humana:** Se crearon manualmente las Épicas, Historias y Tareas en GitHub Projects, se asignaron los campos personalizados y se validó el flujo de estados.

---

## ## TP4 — Integración Continua (CI) con GitHub Actions

### 1. ¿Por qué esos Jobs y por qué en paralelo?
* **Estructura:** El pipeline define dos jobs independientes: `build-backend` y `build-frontend`.
* **Justificación técnica de ejecución en paralelo:**
  - El backend (.NET 8) y el frontend (React/Vite) son componentes completamente desacoplados a nivel de compilación y runtime.
  - Al ejecutarse concurrentemente en runners independientes (`runs-on: ubuntu-latest`), el tiempo total de feedback del pipeline se reduce al tiempo del job más lento (~1 minuto) en lugar de la suma secuencial de ambos (~2 minutos), cumpliendo con el principio de **Fast Feedback Loop** de Integración Continua.

### 2. ¿Qué se cachea y qué pasa si el caché desaparece?
* **Mecanismo de Caché:** En el job de frontend se utiliza el backend de caché nativo de GitHub Actions (`cache-from: type=gha,scope=frontend` y `cache-to: type=gha,mode=max,scope=frontend`) gestionado por `docker/setup-buildx-action`.
* **¿Qué ocurre si el caché desaparece o expira?:**
  - Si el caché no está disponible (por expiración de 7 días, límite de almacenamiento de 10 GB alcanzado o *cache miss* por cambio de dependencias), **el pipeline NO se rompe ni falla**.
  - Simplemente ocurre una recompilación completa (*cold build*): Docker descarga las capas base y reinstala los paquetes desde cero, tardando unos segundos más en finalizar, garantizando total resiliencia y reproducibilidad.

### 3. ¿Por qué construye con tu Dockerfile en lugar de comandos sueltos?
* Construir mediante `docker/build-push-action` ejecutando el `Dockerfile` de cada servicio garantiza el principio de **Paridad Dev/Prod** (de los principios de *Twelve-Factor App*).
* Si el pipeline validara la aplicación ejecutando comandos locales sueltos del runner (`dotnet build` o `npm run build`), podrían existir discrepancias de versiones de SDK o dependencias entre el runner de CI y el contenedor final que corre en producción. Al construir la imagen Docker en CI, se valida el mismo artefacto inmutable que será desplegado.

### 4. Problemas encontrados y cómo se resolvieron
* **Problema:** En la primera corrida del pipeline, el job de `build-frontend` falló en rojo debido a una discrepancia en la ruta del contexto (`context: ./frontend` en lugar de `context: ./Trabajo/frontend`), lo cual activó la regla de protección de rama y bloqueó el botón de merge en el Pull Request.
* **Resolución:** Se corrigió la ruta del contexto en `.github/workflows/ci.yml`, se commiteó el fix sobre la misma rama del PR, el pipeline volvió a ejecutarse de forma automática pasando a verde, y la protección de rama habilitó exitosamente el merge a `main`.

### 5. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó asistencia de IA para estructurar la sintaxis YAML del workflow `.github/workflows/ci.yml` y configurar los parámetros de Buildx y caché GHA.
* **Verificación humana:** Se provocó deliberadamente un fallo para verificar el bloqueo del PR en rojo, se aplicó la corrección, se validó el paso a verde en la pestaña Actions y se integró el badge de estado en el `README.md`.

---

## ## TP5 — Calidad Automatizada: Tests, Coverage y Quality Gates

### 1. Lógica elegida para testear y Justificación
* **Backend (.NET 8):** Se cubrieron las 6 reglas de negocio críticas del sistema de reservas (`ReservationService.cs`), donde un fallo impacta directamente en la integridad operativa:
  - **R1 (Fecha futura e intervalos exactos de 30 min):** Evita turnos en el pasado o en minutos no estándar (ej. 10:17).
  - **R2 (Validación de nombre y email con Regex):** Garantiza que todo turno posea contacto válido.
  - **R3 (Prevención de solapamiento de horarios):** Evita colisiones de turnos activos para el mismo horario exacto (código HTTP 409).
  - **R4 (Inmutabilidad de cancelaciones):** Bloquea cualquier reactivación de un turno cancelado.
  - **R5 (Ventana límite de cancelación >2hs):** Impide cancelaciones de último momento.
  - **R6 (Máximo 3 turnos activos diarios por usuario):** Evita acaparamiento de turnos.
* **Frontend (React/Vite):** Se extrajo la lógica pura a `src/lib/reservas.js` (validación de datos, filtrado de reservas activas y cálculo de prioridad y descuentos según anticipación), permitiendo pruebas unitarias deterministas sin tocar DOM ni red.

### 2. Umbrales de Cobertura (Thresholds), Métricas y Justificación
* **Frontend:** Umbral establecido en **80% de líneas y 80% de ramas** en `vite.config.js`.
  - **Medición real lograda:** **91.3% de líneas** y **80.76% de ramas**.
  - **Justificación:** Al aislar la lógica en `src/lib/**`, el 80% es un estándar exigible que garantiza que casi todas las bifurcaciones condicionales (`if`, validaciones de formato) estén cubiertas sin pedir números ficticios.
* **Backend:** Umbral establecido en **50% de líneas** (`/p:Threshold=50 /p:ThresholdType=line` en `coverlet.msbuild`).
  - **Medición real lograda:** **56.21% de líneas**, **37.7% de ramas** y **84.61% de métodos**.
  - **Justificación:** El umbral se ancla en la medición real de la lógica ejecutada en memoria. Las ramas de persistencia SQL de bajo nivel a PostgreSQL caen en el bloque de fallback durante pruebas unitarias (se probarán end-to-end con la base de datos viva en el TP7). Un umbral de 50% garantiza que cualquier regresión en la lógica de validación frene el build.

### 3. Exclusiones de Cobertura y Justificación
Se excluyeron de la medición aquellas piezas sin lógica de negocio propia mediante el atributo `[ExcludeFromCodeCoverage]` y filtros de `ReportGenerator`:
* **`Program.cs` (Arranque):** Código de cableado, middleware y configuración del servidor web.
* **Modelos y DTOs (`Models/`, `DTOs/`):** Estructuras de datos anémicas que solo contienen propiedades auto-implementadas (`get; set;`).
* **Controladores (`ReservationsController.cs`):** Capa delgada de transporte HTTP que solo delega al servicio y retorna códigos de estado.
* **Servicio de Notificación Real (`EmailNotificationService.cs`):** Infraestructura de salida externa reemplazada por Mocks en pruebas unitarias.

### 4. ¿Por qué Coverage alto no garantiza Calidad? (Ejemplo y Mutantes)
* **La trampa de la métrica:** La cobertura mide **qué líneas se ejecutaron**, pero no si los tests comprueban el comportamiento esperado (*ejecución $\neq$ verificación*).
* **Ejemplo conceptual:**
  ```csharp
  [Fact]
  public void TestEnganoso() {
      var service = new ReservationService(_config);
      service.CreateReservationAsync(dto); // 100% de cobertura de líneas ejecutadas... ¡CERO Asserts!
  }
  ```
* **Mutantes (Mutation Testing):** Introducir un cambio deliberado en el código fuente (ej. cambiar `horasDiferencia < 2` por `horasDiferencia <= 2`). Si todos los tests siguen en verde, el mutante *sobrevivió*, demostrando que la suite tiene cobertura de ejecución pero no verifica el caso de borde.

### 5. Ejercicio de la Rama de Código sin Cubrir
* **Línea identificada en ReportGenerator:** `ReservationService.cs: línea 384` (`if (timeDifference < TimeSpan.FromHours(2))`).
* **Entrada que la recorre:** Una reserva con fecha exactamente a 1 hora del momento actual (`DateTime.UtcNow.AddHours(1)`).
* **Decisión tomada:** Se agregó el test unitario específico `ActualizarEstado_CancelarConMenosDeDosHoras_FallaReglaR5` para recorrer y verificar la rama verdadera del `if`, protegiendo la regla de negocio que bloquea cancelaciones con menos de 2 horas de anticipación.

### 6. Refactorización para Inyección de Dependencias y Mocks
* **Problema inicial:** `ReservationService` no podía testear notificaciones sin intentar enviar correos reales.
* **Refactor aplicado:**
  1. Se extrajo la interfaz `INotificationService` con el método `NotifyReservationCreatedAsync(...)`.
  2. `ReservationService` ahora **recibe** `INotificationService` en su constructor.
  3. En `Program.cs` se registró `builder.Services.AddScoped<INotificationService, EmailNotificationService>()`.
* **Prueba con Mock (`Moq` en C# y `vi.fn()` en JS):**
  - **Backend (Moq):** Se verificó que al crear una reserva válida se invoque el notificador exactamente una vez:
    `mockNotifier.Verify(n => n.NotifyReservationCreatedAsync(...), Times.Once);`
  - **Frontend (Vitest):** En `reservas.test.js`, se mockeó el cliente HTTP mediante `vi.fn()` y se verificó `expect(mockTraer).toHaveBeenCalledWith(...)`.

### 7. Demostración del Quality Gate y Enlaces de Evidencia

| Evidencia requerida | Descripción del Logro | Enlace de Verificación |
|---|---|---|
| **Corrida Inicial Roja por Umbral** | Job `build-frontend` fallando por no alcanzar el umbral del 80% al subir código sin tests (`calcularPrioridadReserva`). | [Ver Run #35936517964](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/35936517964) |
| **Pull Request #1 (Mergeado)** | Secuencia completa: PR abierto $\to$ Fallo de Quality Gate en rojo $\to$ Agregado de tests $\to$ Paso a verde $\to$ Merge a `main`. | [Ver Pull Request #20](https://github.com/NicoGrosso19/ingsoft3-tp01/pull/20) |
| **Pull Request #2 (Abierto y en Rojo)** | PR chiquito con función `calcularDescuentoPorAnticipacion` sin tests, mantenido abierto en rojo para la defensa oral. | [Ver Pull Request #21](https://github.com/NicoGrosso19/ingsoft3-tp01/pull/21) |

### 8. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó asistencia de IA (Antigravity / Gemini) para estructurar los proyectos de prueba xUnit y Vitest, diseñar las matrices de casos parametrizados de las reglas R1 a R6, y configurar los reporters de cobertura en GitHub Actions.
* **Verificación humana:** Se ejecutaron los tests localmente, se comprobaron las salidas visuales de ReportGenerator en navegador, se auditó el bloqueo efectivo del botón de merge en los Pull Requests de GitHub y se validó el pase a verde tras la incorporación de los tests faltantes.



---

## ## TP6 — Entrega Continua (CD): Environments, Aprobaciones y Deployment Patterns

### 1. Enlaces de este TP (Entregables Obligatorios)

| Recurso | Descripción | Enlace de Verificación |
|---|---|---|
| **Paquete Backend en GHCR** | Imagen de backend en GitHub Packages (Pública, etiquetada con commit SHA) | [ghcr.io/nicogrosso19/ingsoft3-tp01-backend](https://github.com/NicoGrosso19/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend) |
| **Paquete Frontend en GHCR** | Imagen de frontend en GitHub Packages (Pública, etiquetada con commit SHA) | [ghcr.io/nicogrosso19/ingsoft3-tp01-frontend](https://github.com/NicoGrosso19/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend) |
| **Cadena Eslabón 1: PR con tests OK y Registry salteado** | Corrida de PR donde los tests pasan en verde pero «Entrar al registry» y la publicación se **saltean** | [Ver Run #36422786621 (Job Backend)](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/36422786621/job/108929341987?pr=23) |
| **Cadena Eslabón 2: Corrida en Main con publicación al final** | Corrida en `main` donde «Construir y publicar la imagen» es el **último paso** post-tests | [Ver Run #36426021696 (Job Backend)](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/36426021696/job/108939768652) |
| **API QA (Render + Neon)** | Backend en entorno QA conectado a base de datos `app_qa` | [https://ingsoft3-tp01-api-qa-new.onrender.com](https://ingsoft3-tp01-api-qa-new.onrender.com) |
| **Frontend QA (Render)** | Frontend en entorno QA con Nginx configurado dinámicamente | [https://ingsoft3-tp01-front-qa.onrender.com](https://ingsoft3-tp01-front-qa.onrender.com) |
| **API PROD (Render + Neon)** | Backend en entorno Producción conectado a base de datos `app_prod` | [https://ingsoft3-tp01-api-prod.onrender.com](https://ingsoft3-tp01-api-prod.onrender.com) |
| **Frontend PROD (Render)** | Frontend en entorno Producción (Versión v6.0.0 visible) | [https://ingsoft3-tp01-front-prod.onrender.com](https://ingsoft3-tp01-front-prod.onrender.com) |
| **Gate Humano: Corrida Rechazada** | Corrida con despliegue a PROD rechazado manualmente con motivo escrito | [Ver Run Rechazado #36440863748](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/36440863748) |
| **Gate Humano: Corrida Aprobada** | Corrida con despliegue a PROD aprobado y smoke test en verde | [Ver Run Aprobado #36445891650](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/36445891650) |
| **Release de Cierre v6.0.0** | Release formal del práctico en GitHub con changelog autogenerado | [Release v6.0.0](https://github.com/NicoGrosso19/ingsoft3-tp01/releases/tag/v6.0.0) |

---

### 2. El Artefacto y la Cadena de Confianza del Registry
* **El principio:** *«Un pipeline que no produce artefacto no es integración continua: es compilación»*. El registry no debe ser un depósito ciego de imágenes construidas en cualquier momento, sino un catálogo inmutable de software **verificado y listo para desplegar**.
* **La cadena de 3 eslabones:**
  1. **Nada entra a `main` sin el pipeline en verde:** Garantizado por las protecciones de rama y los quality gates del TP4 y TP5.
  2. **Sólo lo que entra a `main` se publica:** Condicionado explícitamente en el paso mediante `push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}`. Los Pull Requests construyen y testean, pero no suben paquetes al registry.
  3. **Publicar es el ÚLTIMO paso del job de testing:** En `.github/workflows/ci.yml`, el paso de construir y publicar se ubicó estrictamente después de `docker run` de tests y el reporte de cobertura. Dado que GitHub Actions corta la ejecución ante el primer fallo, si los tests fallan el paso de publicación jamás llega a ejecutarse.
* **Etiquetado determinista:** Cada imagen se publica bajo el tag `:sha-${{ github.sha }}`, permitiendo la trazabilidad biunívoca entre la imagen binaria en ejecución y el commit exacto que la originó.

---

### 3. Continuous Delivery vs. Continuous Deployment
* **Enfoque Implementado:** **Continuous Delivery**.
* **Justificación:**
  - En Continuous Delivery, todo cambio validado se despliega de forma **100% automática al entorno de QA**, pero la promoción a **Producción requiere una aprobación humana explícita** (*Gate*).
  - Continuous Deployment elimina el gate humano, desplegando directo a producción tras pasar los tests. Esto requiere una suite de tests end-to-end exhaustiva y observabilidad en tiempo real (canary deployments automatizados con rollback por métricas).
  - En nuestro contexto, Continuous Delivery es la opción profesional adecuada: permite a los stakeholders y al equipo validar la estabilidad del sistema en QA, verificar ventanas de mantenimiento y tomar la decisión de negocio de cuándo impactar en los usuarios finales.

---

### 4. Arquitectura de Entornos y Aislamiento de Secretos
* **Environments de GitHub (`qa` y `production`):**
  - **`qa`:** Entorno sin reglas de protección. Ejecuta inmediatamente al mergear en `main`.
  - **`production`:** Entorno protegido con **Required Reviewers**. El job `deploy-prod` queda en estado *Waiting* hasta la aprobación manual.
* **Alcance de Secretos (Environment Secrets):**
  - Los Deploy Hooks de Producción (`RENDER_HOOK_API_PROD` y `RENDER_HOOK_FRONT_PROD`) están confinados exclusivamente dentro del environment `production`. Ningún job no autorizado ni ejecución en QA puede leerlos ni interactuar con la infraestructura productiva.
* **Aislamiento de Datos:**
  - Se crearon dos bases de datos independientes en Neon PostgreSQL: `app_qa` y `app_prod`. Los servicios de QA y PROD no comparten datos bajo ninguna circunstancia.

---

### 5. Desacoplamiento de Configuración: Nginx Dinámico
* **El problema:** Si la URL del backend se quema (*hardcodea*) durante el `npm run build` de React, la misma imagen no puede reutilizarse en múltiples entornos sin recompilar.
* **La solución implementada:**
  - Se reemplazó el archivo estático `nginx.conf` por una plantilla `default.conf.template` en `/etc/nginx/templates/`.
  - El frontend realiza todas las peticiones a la ruta relativa `/api/...` (mismo origen).
  - Al arrancar el contenedor Nginx, el entrypoint nativo procesa las variables de entorno `${BACKEND_URL}` y `${DNS_RESOLVER}` inyectadas por Render (`https://ingsoft3-tp01-api-qa-new.onrender.com` en QA y `https://ingsoft3-tp01-api-prod.onrender.com` en PROD).
  - Esto garantiza que **la misma imagen binaria sirve idéntica para QA y PROD**, habilitando el despliegue desacoplado.

---

### 6. Letra Chica de los Free Tiers y Manejo en el Pipeline
* **Condiciones de Render y Neon:**
  - **Render Free Tier:** 750 horas de cómputo por workspace al mes. Los servicios entran en suspensión (*sleep*) tras 15 minutos de inactividad, sufriendo un *cold start* de hasta 50 segundos en la primera petición.
  - **Neon Free Tier:** Suspende el cómputo tras 5 minutos de inactividad y cuenta con 0.5 GB de almacenamiento.
* **Diseño del Smoke Test:**
  - Un `curl` simple fallaría por timeout durante el arranque en frío.
  - Se implementó un bucle de sondeo con hasta **30 intentos espaciados cada 20 segundos** (`--max-time 10`), tolerando hasta 10 minutos de tiempo de construcción y cold start.
  - El smoke test valida tres puntos de falla críticos: `/health` (proceso vivo), `/api/reservations` (conexión a la base de datos operativa) y `/` (frontend servido por Nginx).

---

### 7. Estrategia de Despliegue en Producción Real y Medición de Rollback

#### A. Patrón de Despliegue para Producción Real: **Blue-Green Deployment**
* **Elección:** Para el Sistema de Reservas y Turnos, la estrategia recomendada en un entorno de producción empresarial es **Blue-Green Deployment**.
* **Justificación:**
  - En un sistema transaccional de turnos, el despliegue *Recreate* (downtime) provocaría pérdidas de reservas en curso.
  - En *Rolling Update*, conviven dos versiones simultáneas, lo cual puede generar inconsistencias si hay cambios en los DTOs o en las validaciones de turnos.
  - **Blue-Green** mantiene dos entornos idénticos (Azul y Verde). La nueva versión se despliega y valida completamente en Verde sin tráfico de usuarios. Una vez verificado el smoke test, el router/balanceador conmuta el 100% del tráfico de forma instantánea.
  - **Rollback instantáneo:** Si surge un problema crítico no detectado, el balanceador redirige inmediatamente el tráfico de vuelta al entorno Azul (tiempo de rollback: < 5 segundos).
* **Observabilidad faltante actual:** Para implementar Canary o Blue-Green avanzado se requiere instrumentación de métricas de latencia p95/p99, tasas de error HTTP 5xx y trazabilidad distribuida (objetivo del TP9).

#### B. Plan de Rollback Actual y Medición Real en Render
* **Plan de Acción ante Fallo Crítico en Producción:**
  1. Identificar el commit de la versión estable anterior desde GitHub Actions o Deployments (`SHA_ANTERIOR`).
  2. Disparar los Deploy Hooks de Producción de Render pasando explícitamente la referencia al commit previo:
     ```bash
     curl -fsS "$RENDER_HOOK_API_PROD&ref=$SHA_ANTERIOR"
     curl -fsS "$RENDER_HOOK_FRONT_PROD&ref=$SHA_ANTERIOR"
     ```
  3. Monitorear en el Dashboard de Render (*Deploys*) hasta que el commit anterior alcance el estado **Live**.
* **Medición Real del Rollback:**
  - **Tiempo medido en Render:** **47 segundos**.
  - El tiempo corresponde al ciclo completo de invocación del hook, aprovisionamiento del contenedor del commit previo y verificación de salud en Render.
* **Limitación crítica de datos:** El rollback de código **no revierte cambios estructurales o destructivos en la base de datos** (como columnas eliminadas o datos modificados). Para ello se requerirían scripts de migración inversa (*down migrations*) y restauración de backups puntuales (*Point-in-time Recovery*).

---

### 8. Problemas Encontrados y Cómo se Resolvieron
* **Problema 1 (Nombres duplicados en Render):** Al intentar crear los servicios con nombres genéricos (`ingsoft3-tp01-api-qa`), Render rechazó la creación con el error *"Name is already in use"* debido a que los subdominios `.onrender.com` son globales y ya estaban tomados por otros estudiantes.
  - **Resolución:** Se parametrizaron nombres únicos con identificador personal (`ingsoft3-tp01-api-qa-new` e `ingsoft3-tp01-front-qa`).
* **Problema 2 (Rutas fijas a localhost en el Frontend):** El código original de React realizaba llamadas a `http://localhost:3000/api/reservations`, lo cual en Render provocaba que el navegador del cliente intentara conectar a su propia máquina local en lugar de la API remota.
  - **Resolución:** Se refactorizaron los componentes (`App.jsx` y `ReservationForm.jsx`) para utilizar rutas relativas `/api/reservations`, permitiendo que Nginx procese las solicitudes a través del proxy inverso dinámico hacia la API de Render.

---

### 9. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó asistencia de IA (Antigravity / Gemini) para guiar el diseño del workflow de Continuous Delivery en GitHub Actions, estructurar la plantilla dinámica de Nginx con variables de entorno, y redactar las justificaciones técnicas y métricas de rollback.
* **Verificación humana:** Se crearon manualmente los servicios y variables en Render y Neon, se configuraron los Environments y Secrets en GitHub, se provocó y documentó el rechazo manual en el Gate de Producción, se aprobó el despliegue con cambio observable en UI, y se verificó el tiempo de rollback y la publicación de los paquetes en GHCR.



---

## ## TP7 — Contenedores en el Pipeline, Integración y End-to-End (E2E)

### 1. Enlaces del TP7 (Entregables Obligatorios)

| Recurso | Descripción | Enlace de Verificación |
|---|---|---|
| **Paquete Backend en GHCR** | Imagen de backend en GitHub Packages (Pública, etiquetada con commit SHA) | [ghcr.io/nicogrosso19/ingsoft3-tp01-backend:sha-85adfb956e13814312e3fa81b7666bee5eb0fea1](https://github.com/NicoGrosso19/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend) |
| **Paquete Frontend en GHCR** | Imagen de frontend en GitHub Packages (Pública, etiquetada con commit SHA) | [ghcr.io/nicogrosso19/ingsoft3-tp01-frontend:sha-85adfb956e13814312e3fa81b7666bee5eb0fea1](https://github.com/NicoGrosso19/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend) |
| **Commit que rompió la app (Freno de Gate)** | Commit con texto del botón modificado en el front para disparar fallo en E2E | [Commit #38cf59c](https://github.com/NicoGrosso19/ingsoft3-tp01/commit/38cf59c3e42ae4be38f43bb98009c9c235136de0) · [PR #29](https://github.com/NicoGrosso19/ingsoft3-tp01/pull/29) |
| **Corrida con Integración VERDE + E2E ROJA** | Corrida en `main` donde la integración pasó, la E2E falló y `deploy-prod` quedó **bloqueado sin ejecutar** | [Ver Run #38500367544](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/38500367544) |
| **Artefacto Reporte Integración (Verde)** | Reporte HTML de Playwright generado en la corrida con fallo (`3 passed`) | Descargable en [Run #38500367544 (Artifacts)](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/38500367544) |
| **Artefacto Reporte E2E (Rojo)** | Reporte HTML con traza y screenshot del botón no encontrado (`1 failed, 2 passed`) | Descargable en [Run #38500367544 (Artifacts)](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/38500367544) |
| **Corrida Completa en Verde hasta PROD** | Corrida posterior con el arreglo aplicado, pasando integración, E2E y deploy a PROD aprobado | [Ver Run Aprobado #38501988923](https://github.com/NicoGrosso19/ingsoft3-tp01/actions/runs/38501988923) |
| **API QA (Render + Neon)** | Backend en QA ejecutando la imagen binaria de GHCR | [https://ingsoft3-tp01-api-qa-new.onrender.com](https://ingsoft3-tp01-api-qa-new.onrender.com) |
| **Frontend QA (Render)** | Frontend en QA ejecutando la imagen binaria de GHCR | [https://ingsoft3-tp01-front-qa.onrender.com](https://ingsoft3-tp01-front-qa.onrender.com) |
| **API PROD (Render + Neon)** | Backend en Producción ejecutando la misma imagen binaria verificada | [https://ingsoft3-tp01-api-prod.onrender.com](https://ingsoft3-tp01-api-prod.onrender.com) |
| **Frontend PROD (Render)** | Frontend en Producción con versión visible v7.0.0 | [https://ingsoft3-tp01-front-prod.onrender.com](https://ingsoft3-tp01-front-prod.onrender.com) |
| **Release de Cierre v7.0.0** | Release oficial del TP7 en GitHub sobre el commit desplegado en Producción | [Release v7.0.0](https://github.com/NicoGrosso19/ingsoft3-tp01/releases/tag/v7.0.0) |

---

### 2. Build Once, Deploy Many: La Imagen como Unidad de Release
* **El problema resuelto del TP6:** En el TP6, el pipeline enviaba una señal a Render (`&ref=$GITHUB_SHA`) para que Render descargara el código y volviera a compilar la aplicación en cada entorno. Esto rompía el principio fundamental de inmutabilidad: lo que corría en Producción era una **reconstrucción** del código fuente y no el binario exacto probado en QA. Si entre el despliegue de QA y la aprobación a PROD una dependencia remota o una imagen base (`node:alpine`, `mcr.microsoft.com/...`) se actualizaba, Producción podía fallar inexplicablemente.
* **La solución en el TP7:** El pipeline compila y empaqueta la aplicación **una sola vez** durante los jobs de build y publica las imágenes binarias en `ghcr.io`. Luego, QA y PROD configuran sus servicios como *Existing Image* y el pipeline les indica exactamente qué imagen ejecutar mediante el parámetro `imgURL` en el Deploy Hook (`imgURL=ghcr.io/nicogrosso19/ingsoft3-tp01-backend:sha-<commit>`). De esta forma, **QA y PROD ejecutan exactamente el mismo artefacto inmutable bit a bit**.

---

### 3. Estrategia de Identidad y Versionado de Imágenes
* **`sha-<commit>` (Identidad de Release):** Cada imagen publicada en `ghcr.io` se etiqueta con el commit SHA completo de 40 caracteres (`sha-${{ github.sha }}`). Esto provee trazabilidad determinista: se sabe exactamente qué versión de código fuente generó la imagen binaria.
* **Por qué NO publicar `latest`:** La etiqueta `latest` es un puntero mutable que se desplaza en cada merge o push. Si un despliegue apuntara a `latest`, sería imposible auditar qué versión está corriendo en el servidor o ejecutar un rollback predecible.
* **Configuración inicial en Render vs. Ejecución Real:** Al migrar los servicios de Render a *Existing Image*, la plataforma solicita una URL de imagen inicial como punto de partida (se configuró con el commit anterior `sha-205ee13...`). Sin embargo, esa imagen **no es la que corre permanentemente**: en cada merge a `main`, el pipeline invoca el Deploy Hook pasando dinámicamente `imgURL=...:sha-<nuevo-commit>`, sobrescribiendo la imagen activa en tiempo de ejecución.

---

### 4. De la Release a la Imagen en un Solo Paso
Para relacionar un punto de entrega con su artefacto en el registry:
1. Desde el tag de Git se obtiene el commit SHA exacto en un solo comando:
   ```bash
   git rev-list -n1 v7.0.0
   # Devuelve: 85adfb956e13814312e3fa81b7666bee5eb0fea1
   ```
2. La imagen correspondiente en GitHub Packages es inmediatamente:
   - Backend: `ghcr.io/nicogrosso19/ingsoft3-tp01-backend:sha-85adfb956e13814312e3fa81b7666bee5eb0fea1`
   - Frontend: `ghcr.io/nicogrosso19/ingsoft3-tp01-frontend:sha-85adfb956e13814312e3fa81b7666bee5eb0fea1`
* **Rollback directo:** Volver a la versión `v7.0.0` no requiere compilar código antiguo; simplemente se invoca el hook de Render enviando el `imgURL` con ese SHA.

---

### 5. Comprobación de Ejecución de Imagen vs. Reconstrucción
* **Comprobación en Render:** En la pestaña **Events** de cada servicio en Render, el despliegue figura explícitamente como:
  *`Deploy live for ghcr.io/nicogrosso19/ingsoft3-tp01-...:sha-<commit> (Triggered via Deploy Hook)`*
  A diferencia del TP6 (donde decía *Build succeeded* y clonaba el repositorio git), ahora Render no ejecuta ningún build: solo descarga (*pull*) y levanta el contenedor.
* **Limitación del Smoke Test:** El smoke test (`curl /health`) solo verifica que el proceso responda con HTTP 200, pero no sabe qué commit o versión binaria está corriendo. Si un despliegue de imagen falla o tarda, el servicio anterior sigue vivo y el smoke daría verde contra la versión vieja. La verificación real de la imagen promovida se comprueba con la ejecución de las suites de Integración y E2E contra el entorno.

---

### 6. Suites de Prueba: Integración y E2E (La Pirámide en Acción)

#### A. Pruebas de Integración (`Trabajo/frontend/e2e/api.spec.js`)
* **Herramienta:** Playwright en modo cliente HTTP directo (`fixture request`), sin abrir navegador.
* **Objetivo:** Comunicarse directamente con la API desplegada en QA (`API_BASE_URL`) interactuando con la base de datos PostgreSQL real de Neon, sin dobles ni mocks.
* **Pruebas implementadas:**
  1. *Alta, Verificación y Borrado:* Crea un turno con nombre único (`Date.now()`), valida que el `GET /api/reservations` lo devuelva persistido en PostgreSQL, ejecuta `DELETE /api/reservations/{id}` y comprueba que desaparezca.
  2. *Alta inválida (Nombre vacío):* Envía un payload sin nombre y comprueba que la API responda `400 Bad Request` y que el conteo de registros en la base no se incremente.
  3. *Regla de Negocio R3 (Solapamiento de Horarios):* Crea un primer turno y luego intenta agendar un segundo turno con otro usuario en el mismo horario exacto; verifica que la API responda `409 Conflict`.
* **Por qué es Integración Amplia:** Se ejecuta contra la API **ya desplegada en QA** con su base de datos real. Gana realismo total de red, drivers de base de datos y configuración de entorno, evitando la sobrecarga de levantar bases de datos temporales en el runner.

#### B. Pruebas End-to-End (`Trabajo/frontend/e2e/reservas.spec.js`)
* **Herramienta:** Playwright controlando un navegador Chromium real.
* **Objetivo:** Ejercitar la aplicación tal como lo haría un usuario final a través de la interfaz web desplegada en QA (`E2E_BASE_URL`).
* **Flujos implementados:**
  1. *Creación, Verificación y Borrado en UI:* Completa los campos usando etiquetas accesibles (`getByLabel`), clickea `Confirmar Reserva`, espera que aparezca en el listado y lo borra con el botón `Borrar <nombre>`, validando que desaparezca del DOM.
  2. *Validación en Cliente y Accesibilidad:* Ingresa datos inválidos (email sin formato, horario con minutos no múltiplos de 30) y comprueba que aparezcan los mensajes de error con `role="alert"` y que el botón de confirmación permanezca deshabilitado (`toBeDisabled()`).
  3. *Flujo Cotidiano (Filtros interactivos):* Alterna entre los filtros "Confirmados", "Cancelados" y "Todos", comprobando que la interfaz aplique las clases activas y filtre la lista en pantalla.

---

### 7. Diagnóstico del Par Verde/Rojo: Qué ve cada capa
Durante la prueba obligatoria de la Tarea 4 se provocó un fallo deliberado en la interfaz cambiando el texto del botón de confirmación a `"Solicitar Cita"` en lugar de `"Confirmar Reserva"`. 

El resultado en la corrida **#38500367544** demostró el poder de diagnóstico de la pirámide:

| Suite | Resultado | Significado Técnico |
|---|---|---|
| **Smoke Test** | 🟢 **VERDE** | El proceso responde HTTP 200 en `/health` y los endpoints están vivos. |
| **Integración (`api.spec.js`)** | 🟢 **VERDE** | La API y la base de datos PostgreSQL funcionan perfectamente: crean, validan y borran reservas sin fallas. |
| **E2E (`reservas.spec.js`)** | 🔴 **ROJA** | El navegador no pudo encontrar el botón `"Confirmar Reserva"`, arrojando error de timeout en Playwright. |
| **Deploy a PROD (`deploy-prod`)** | ⛔ **SALTEADO** | Al fallar la E2E, la compuerta (`needs: e2e`) impidió la promoción a Producción. |

* **Diagnóstico:** Si la integración está VERDE y la E2E está ROJA, **la falla está exclusivamente en la capa de Frontend (UI/UX)**, ya que la API y la persistencia están sanas. Si se hubiera roto la API, la integración habría caído primero en ROJO y la E2E ni siquiera se habría ejecutado, ahorrando tiempo de cómputo en el runner.

---

### 8. Manejo de Free Tiers y Prevención de Tests Flaky
* **Auto-waiting:** Playwright espera automáticamente a que los elementos del DOM existan, sean visibles y estén habilitados antes de clickear o escribir. No se utilizan `sleep()` arbitrarios que generan tests inestables (*flaky*).
* **Timeouts y Retries:** Debido a la latencia y posibles arranques en frío de Render/Neon, en `playwright.config.js` se definieron `timeout: 60_000ms`, `expect: 15_000ms` y `retries: 1`. El reintento absorbe demoras transitorias de red, pero si el fallo es genuino, el test se marca como fallido en rojo.
* **Higiene de Datos:** Cada test genera identificadores únicos con `Date.now()` y ejecuta su correspondiente borrado al finalizar, evitando colisiones entre ejecuciones concurrentes en el entorno compartido de QA.

---

### 9. Problemas Encontrados y Soluciones
1. **Falta de endpoint de borrado en Backend:** El backend original solo soportaba cancelación de estado pero no eliminación física, lo que impedía limpiar la base de datos en los tests de integración.
   - *Solución:* Se implementó `DeleteReservationAsync` en `ReservationService.cs` y el endpoint `DELETE /api/reservations/{id}` en `ReservationsController.cs`.
2. **Desalineación de sintaxis JSX en Frontend:** Al incorporar roles accesibles en `ReservationForm.jsx`, se produjo un cierre incorrecto de etiquetas que impedía la compilación.
   - *Solución:* Se reestructuró el formulario con etiquetas consistentes y se validó la compilación localmente con `npm run build`.
3. **Colisión de Vitest con specs de Playwright:** Vitest intentaba ejecutar los tests de Playwright dentro del job de unit tests.
   - *Solución:* Se configuró `exclude: [...configDefaults.exclude, 'e2e/**']` en `vite.config.js`.

---

### 10. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó asistencia de IA (Antigravity / Gemini) para diseñar las suites de prueba en Playwright (`api.spec.js` y `reservas.spec.js`), estructurar los jobs de integración y E2E en GitHub Actions, y documentar el análisis del diagnóstico del par verde/rojo.
* **Verificación humana:** Se programaron y compilaron los endpoints del backend, se verificaron los selectores accesibles en los componentes React, se ejecutaron las suites localmente y en GitHub Actions, se auditó el bloqueo efectivo del Gate ante la rotura del front, y se aprobó manualmente el despliegue final a Producción.

---

## ## TP8 — Infraestructura como Código (IaC) con Terraform

### 1. Riel Tecnológico y Versiones de Providers Fijadas
* **Riel Seleccionado:** Riel Canónico de la materia (**Terraform + Neon + Render**), operando sobre la misma nube y cuentas utilizadas en los TPs anteriores.
* **Declaración de Entorno Nuevo (`preprod`):** Se diseñó e implementó un tercer entorno intermedio (`preprod`) completamente nuevo y efímero, compuesto por:
  - Base de datos relacional dedicada en **Neon PostgreSQL** (`neon_project`, `neon_role` y `neon_database`).
  - Servicios de Backend (API) y Frontend (Nginx SPA) en **Render** (`render_web_service`) consumiendo las imágenes binarias inmutables generadas en el TP7 desde GitHub Container Registry (`ghcr.io/nicogrosso19/ingsoft3-tp01-backend:sha-85adfb956e13814312e3fa81b7666bee5eb0fea1` y `ghcr.io/nicogrosso19/ingsoft3-tp01-frontend:sha-85adfb956e13814312e3fa81b7666bee5eb0fea1`).
* **Preservación de Entornos Preexistentes:** Los entornos `qa` y `production` configurados en TP6 y TP7 permanecieron intactos, sin sufrir modificaciones, importaciones ni afectación de servicio.
* **Versiones de Providers Fijadas en HCL (`infra/main.tf`):**
  - **`neon`:** Fuente `kislerdm/neon`, versión fijada estrictamente en `0.18.0`.
  - **`render`:** Fuente `render-oss/render`, versión fijada estrictamente en `1.9.1`.
  - Ambas versiones quedaron registradas de forma determinista con sus hashes criptográficos en el archivo de bloqueo `.terraform.lock.hcl`.
* **Derivación Dinámica de Secretos y Direcciones:**
  - La cadena de conexión `ConnectionStrings__Default` no se copió manualmente; se construyó dinámicamente en el bloque `locals` combinando el host (`neon_project.preprod.database_host`), nombre de la base, usuario y la contraseña generada por Neon (`neon_role.preprod.password`).
  - La variable `BACKEND_URL` del frontend se derivó directamente del atributo `render_web_service.api.url` emitido por el servicio del backend.

---

### 2. Ciclo de Vida, Idempotencia, Estado y Drift Observado

#### A. Idempotencia y Estado Local
* **Idempotencia Comprobada:** Tras aplicar la infraestructura inicial con `terraform apply`, la ejecución de una segunda pasada inmediata arrojó:
  `No changes. Your infrastructure matches the configuration.` demostrando la convergencia declarativa.
* **Inspección del Estado (`terraform.tfstate`):** Se verificó que el estado local mapea los identificadores y expone en texto plano atributos sensibles (contraseñas de rol `database_password: "npg_..."`). Por esta razón crítica de seguridad, el archivo de estado y sus respaldos están expresamente ignorados en `.gitignore` y jamás deben commitearse a control de versiones.

#### B. Experimento de Drift (Deriva de Infraestructura)
* **Drift Detectado:** Se eliminó manualmente la base de datos `app_preprod` fuera de Terraform mediante la API de Neon. Al ejecutar `terraform plan`, Terraform refrescó la realidad contra el estado y detectó la discrepancia (`# neon_database.preprod will be created`, `Plan: 1 to add, 0 to change, 0 to destroy`). Un posterior `terraform apply` convergió la realidad de regreso al código.
* **Lo que NO detecta:** Se creó manualmente en Neon una base de datos intrusa no declarada (`base_intrusa`). Al ejecutar `terraform plan`, la salida continuó indicando `No changes`, demostrando que Terraform únicamente audita los recursos declarados bajo su gobierno y es ciego ante recursos huérfanos creados externamente. La base intrusa fue depurada manualmente.

#### C. Red de Seguridad (`prevent_destroy`)
* Se ensayó temporalmente la instrucción `lifecycle { prevent_destroy = true }` sobre `neon_database.preprod`. Al intentar ejecutar `terraform destroy`, Terraform rechazó categóricamente la acción con el error:
  `Error: Instance cannot be destroyed ... Resource neon_database.preprod has lifecycle.prevent_destroy set`.
  Posteriormente se retiró la protección para permitir la naturaleza efímera del entorno de preproducción.

#### D. Ciclo de Destrucción y Recreación (`destroy` ➔ `apply`)
* Al ejecutar `terraform destroy`, se observó el desmontaje siguiendo estrictamente el grafo de dependencias en orden inverso:
  `render_web_service.front` ➔ `render_web_service.api` ➔ `neon_database.preprod` ➔ `neon_role.preprod` ➔ `neon_project.preprod`.
* Un posterior `terraform apply` recreó la totalidad del entorno desde cero en segundos, comprobándose el funcionamiento inmediato con:
  - `/health` ➔ HTTP 200 `{"status":"ok"}`
  - `/api/reservations` ➔ HTTP 200 `{"success":true,"data":[]}`
  - Frontend SPA ➔ HTTP 200 OK

---

### 3. Problemas Encontrados y Cómo se Resolvieron

1. **Límite de Retención de Historial en Neon Free Tier:**
   - *Problema:* El provider `kislerdm/neon` solicita por defecto 86400 segundos (24 horas) de retención. En el plan gratuito de Neon, el apply falló con `requested history retention seconds exceeds allowed maximum`.
   - *Resolución:* Se configuró explícitamente `history_retention_seconds = 21600` (6 horas, límite máximo admitido en la capa free) dentro del recurso `neon_project.preprod`.

2. **Requerimiento de Organization ID en Neon (`org_id`):**
   - *Problema:* Al aplicar la creación del proyecto, la API de Neon rechazó la solicitud con HTTP 400: `org_id is required, you can find it on your organization settings page`.
   - *Resolución:* Se consultó el endpoint de organizaciones de Neon (`/v1/users/me/organizations`), identificando la organización activa `org-silent-bread-82823361`. Se parametrizó en `infra/variables.tf` la variable `neon_org_id` y se asignó `org_id = var.neon_org_id` en el recurso `neon_project.preprod`.

3. **Owner ID Inválido en Provider de Render:**
   - *Problema:* Se intentó utilizar un identificador parcial/usuario `usr-dat6p8c9v7es73aocgcg`, ocasionando el error: `invalid ownerID: usr-... valid owner IDs can be found using the /v1/owners API`.
   - *Resolución:* Se auditó el endpoint `/v1/owners` de Render mediante script seguro, descubriendo que la cuenta opera como Team con el identificador `tea-dat6p8c9v7es73aocg20`. Se actualizó la variable de entorno `RENDER_OWNER_ID` con el ID de equipo correcto, permitiendo el aprovisionamiento inmediato de ambos servicios web.

4. **Defecto de Actualización en Servicios Free Tier de Render:**
   - *Problema:* En la capa gratuita de Render, cualquier intento de actualización in-place de un servicio existente falla con `maintenance mode can only be configured for non-free tier services` debido a una limitación del provider.
   - *Resolución:* Se adoptó la práctica recomendada de entornos efímeros: preprod no se actualiza en caliente; se destruye y se vuelve a aplicar (`terraform destroy && terraform apply`), o se utiliza reemplazo explícito (`-replace`), garantizando inmutabilidad y despliegues limpios sin costo adicional.

5. **Letra Chica de las 750 Horas Compartidas en Render:**
   - *Problema:* Las 750 horas mensuales gratuitas de Render son compartidas a nivel workspace entre todos los servicios (QA, PROD y PREPROD). Mantener 6 servicios levantados de forma permanente arriesga la suspensión total del workspace antes de la defensa oral.
   - *Resolución:* Se estableció como política operativa ejecutar `terraform destroy` al concluir las sesiones de prueba. Al estar la infraestructura 100% declarada en código en `infra/`, preprod puede nacer bajo demanda en vivo frente al docente en cuestión de segundos, sin comprometer la cuota de producción.

---

### 4. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó asistencia de IA (Antigravity / Gemini) para estructurar el código HCL modular de Terraform (`infra/main.tf`, `infra/variables.tf`, `infra/outputs.tf`), depurar las llamadas de introspección a las APIs de Neon y Render para la resolución de IDs de organización y equipo, y documentar el análisis del ciclo de vida y drift.
* **Verificación humana:** Se ejecutó localmente el flujo completo de Terraform (`init`, `fmt`, `validate`, `plan`, `apply`, `destroy`), se comprobaron las respuestas de los endpoints `/health` y `/api/reservations` en preprod, se provocó y validó la recuperación de drift manual en Neon, y se verificó que los entornos preexistentes de QA y Producción no sufrieran alteraciones.

---

## ## TP9 — DevSecOps + Observabilidad + Continuous Feedback

### 1. Enlaces y Entregables del TP9

| Recurso / Guardián | Descripción | Enlace / Estado de Verificación |
|---|---|---|
| **Dependabot (SCA)** | Configurado en `.github/dependabot.yml` para `nuget`, `npm` y `github-actions` | [`.github/dependabot.yml`](.github/dependabot.yml) |
| **Pull Request Dependabot Mergeado** | PR #45: `Bump DotNetEnv from 3.1.1 to 3.2.0` verificado con CI verde | [Ver Pull Request #45](https://github.com/NicoGrosso19/ingsoft3-tp01/pull/45) |
| **CodeQL (SAST)** | Análisis estático de código activo con default setup en GitHub Actions | [Security / Code scanning](https://github.com/NicoGrosso19/ingsoft3-tp01/security/code-scanning) |
| **Secret Scanning & Push Protection** | Protección activa bloqueando push de credenciales y PATs al repo | Verificado en *Settings → Code security and analysis* |
| **Monitor Externo (UptimeRobot)** | Sondeo HTTP HEAD cada 5 min sobre `/health` de Producción (Actualmente en pausa) | `https://ingsoft3-tp01-api-prod.onrender.com/health` |
| **Observabilidad (Sentry)** | Instrumentación en backend (`Sentry.AspNetCore`) y frontend (`@sentry/react`) | Org Sentry: `ucc-1h` |
| **Tarjeta en Tablero TP3** | Ítem creado a partir de métricas de latencia de producción observadas | [Tablero GitHub Projects](https://github.com/users/NicoGrosso19/projects/1) |
| **Release de Cierre v9.0.0** | Etiqueta y release formal de cierre del TP9 y la materia | [Release v9.0.0](https://github.com/NicoGrosso19/ingsoft3-tp01/releases/tag/v9.0.0) |

---

### 2. Análisis del Pull Request de Dependabot Mergeado

* **Pull Request Seleccionado:** [PR #45: Bump DotNetEnv from 3.1.1 to 3.2.0](https://github.com/NicoGrosso19/ingsoft3-tp01/pull/45).
* **Qué actualizaba:** Actualizó la biblioteca `DotNetEnv` del backend (`Trabajo/backend/SistemaReservasBackend.csproj`) de la versión `3.1.1` a la versión `3.2.0`. Siguiendo la especificación de SemVer (Semantic Versioning), el salto de versión corresponde a un incremento *Minor* ($3.1.1 \to 3.2.0$). El changelog de la release incorporó una migración del motor de parsing a Superpower, soporte robusto de codificación UTF-8 e interpolación de variables de entorno, manteniendo estricta compatibilidad hacia atrás en la API pública.
* **Por qué nos animamos a mergearlo:**
  1. **Red de seguridad completa del semestre:** Toda la suite de integración continua (CI) en GitHub Actions ejecutó y aprobó los jobs de compilación y pruebas unitarias (`build-backend` y `build-frontend`).
  2. **Calidad y Cobertura:** Los 19 tests unitarios de xUnit pasaron en verde, superando holgadamente el umbral de cobertura del 80% exigido por el Quality Gate implementado en el TP5.
  3. **Ausencia de Breaking Changes:** Al tratarse de un cambio *Minor* sin rupturas de contrato, se contó con total confianza técnica para realizar el squash & merge directamente sobre `main`.

---

### 3. Métricas de Observabilidad y Continuous Feedback

#### A. Monitoreo Externo con UptimeRobot
* **Configuración:** Monitor de disponibilidad HTTP(S) apuntando al endpoint de salud público de producción `https://ingsoft3-tp01-api-prod.onrender.com/health`, configurado a intervalos de 5 minutos y alertas automáticas vía email.
* **Tiempo de Detección de Caída:**
  - **Detección de DOWN:** Tras suspender intencionalmente el servicio web de la API en Render, el monitor tardó **5 minutos** en disparar la alerta por correo electrónico (el intervalo mínimo de sondeo de la capa gratuita).
  - **Detección de UP:** Al reactivar el servicio, la notificación de recuperación llegó a los **8 minutos**, reflejando el tiempo necesario para el cold start y el aprovisionamiento del contenedor.
* **Política Operativa de Ahorro:** Finalizada la verificación de las alertas, el monitor fue puesto en **Pause** para evitar agotar las 750 horas mensuales compartidas entre servicios en Render.

#### B. Telemetría y Rendimiento en Sentry
* **Instrumentación:**
  - **Backend:** `Sentry.AspNetCore` configurado con `TracesSampleRate = 1.0` y lectura segura del DSN desde la variable de entorno `SENTRY_DSN` en Render (sin exponer credenciales de ingesta en el código fuente).
  - **Frontend:** `@sentry/react` inicializado con `browserTracingIntegration()` y `tracesSampleRate: 1.0` en `main.jsx`.
* **Datos Reales Medidos en Producción:**
  - **Operación más usada:** `GET /api/reservations` con un tiempo total acumulado de **980.60 ms** y mayor volumen de invocaciones.
  - **Operación más lenta:** `GET /api/reservations` registró una latencia de **P95 de 903.46 ms** (frente a un P50 de **2.73 ms**). La diferencia drástica entre P50 y P95 ilustra el costo del primer arranque (*cold start*) de la base de datos en Neon. En segundo lugar, `POST /api/reservations` registró un P95 de **211.23 ms** (P50 de 138.90 ms).
  - **Frontend:** La carga inicial (`Pageload`) en `ingsoft3-tp01-front-prod.onrender.com` registró un tiempo de **1.30s**, con una calificación de rendimiento de **94 (Good)** en Sentry.
* **Captura de Errores y Cierre de Ciclo:**
  - Se verificó la captura del endpoint de prueba `/api/falla` en la sección *Issues* de Sentry (`InvalidOperationException: Falla de prueba del TP9 para verificar captura en Sentry.`), retirándolo inmediatamente después de la validación.
  - **Tarjeta en GitHub Projects (TP3):** Se cerró el feedback loop de DevSecOps abriendo la tarjeta *«Optimizar latencia de cold start y reconexión front-back en producción»* en el tablero de trabajo, transformando las señales de observabilidad de producción en backlog accionable para el siguiente ciclo de desarrollo.

---

### 4. Problemas Encontrados y Cómo se Resolvieron

1. **Rechazo de Métodos HTTP HEAD en el Endpoint de Salud (`/health`):**
   - *Problema:* El plan gratuito de UptimeRobot utiliza por defecto el método HTTP `HEAD` para verificar disponibilidad sin descargar el body. ASP.NET Core mapeaba `/health` únicamente mediante `app.MapGet`, respondiendo con HTTP `405 Method Not Allowed` y haciendo que el monitor marcara erróneamente la aplicación como DOWN.
   - *Resolución:* Se modificó la declaración en `Trabajo/backend/Program.cs` por `app.MapMethods("/health", new[] { "GET", "HEAD" }, ...)`. El cambio se integró a `main` y se desplegó por el pipeline a producción, restableciendo la respuesta HTTP 200 OK tanto para GET como para HEAD.

2. **Advertencia de Validación en `dependabot.yml`:**
   - *Problema:* El archivo de configuración de Dependabot fue colocado inicialmente dentro de `.github/workflows/`, lo cual provocaba errores de validación de sintaxis en el IDE al intentar interpretarlo como un flujo de trabajo de GitHub Actions.
   - *Resolución:* Se trasladó a su ruta estándar `.github/dependabot.yml`, permitiendo que GitHub detectara los tres ecosistemas (`nuget`, `npm` y `github-actions`) y abriera de forma automática las solicitudes de extracción de actualización.

3. **Bloqueo por Concurrencia en Despliegue de Producción:**
   - *Problema:* El job `deploy-prod` permanecía en estado de espera indefinido debido a que una corrida previa de GitHub Actions había quedado pendiente de aprobación en el entorno `production`, reteniendo el lock del grupo de concurrencia.
   - *Resolución:* Se canceló la corrida obsoleta mediante GitHub CLI (`gh run cancel`), permitiendo la aprobación inmediata y el despliegue de las nuevas imágenes con telemetría a producción.

---

### 5. Declaración de Uso de Inteligencia Artificial
* **Uso de IA:** Se utilizó asistencia de IA (Antigravity / Gemini) para diseñar la configuración de los paquetes de Sentry en .NET 8 y React, estructurar el monitor externo y los endpoints compatibles con HEAD, diagnosticar los bloqueos de concurrencia en GitHub Actions y redactar las métricas de latencia observadas.
* **Verificación humana:** Se ejecutaron y verificaron localmente las suites de tests (19 tests de backend y 15 de frontend en verde), se auditó el panel de control de Sentry confirmando la recepción de eventos de error y trazas de rendimiento, se comprobaron las alertas de correo enviadas por UptimeRobot, se gestionó la aprobación manual del gate a producción y se mergeó el PR de Dependabot con todas las validaciones de CI en verde.
