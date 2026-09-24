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

