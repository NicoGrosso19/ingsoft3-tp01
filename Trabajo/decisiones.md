# Registro de Decisiones de Arquitectura y DevOps (decisiones.md)

## 1. Selección de la Aplicación y Stack Tecnológico
* **Fecha:** 2026-08-06
* **Decisión tomada:** Selección del **Sistema de Gestión de Reservas y Turnos** compuesto por Frontend SPA (React + Vite), Backend API REST (Node.js + Express) y Base de Datos Relacional (PostgreSQL).
* **Alternativas consideradas:** Se evaluó un e-commerce completo con pasarela de pagos. Se descartó por requerir dependencias exóticas y servicios de terceros que comprometen la compilación en los runners de CI/CD (violando `elegir-app.md`).
* **Justificación Técnica:**
  - **Arquitectura Reducida:** 2 a 3 pantallas que garantizan compilaciones e imágenes Docker livianas y rápidas.
  - **Cero Dependencias Exóticas:** Sin Redis, Kafka ni APIs pagas propensas a vencer.
  - **Desacoplamiento de BD:** La conexión en `src/db.js` utiliza el driver `pg` parametrizado mediante variables de entorno (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) sin valores hardcodeados, permitiendo apuntar a Docker local en TP2 y a QA/PROD en TP6/TP7[cite: 1, 2].
* **Verificación de Criterios y Testing (`elegir-app.md`):**
  - **Compilación/Ejecución Backend:** `npm run build` / `npm start`[cite: 2]
  - **Compilación Frontend:** `npm run build`[cite: 2]
  - **Lógica para TP5:** Incluye 6 reglas de negocio explícitas en backend (R1: intervalos 30min/futuro, R2: validación e-mail/nombre, R3: bloqueo de solapamiento, R4: inmutabilidad de estado cancelado, R5: ventana límite cancelación >2hs, R6: máximo 3 turnos activos/día por usuario) y 3 comportamientos en frontend (deshabilitación de submit, badges de estado y filtro interactivo)[cite: 2].
* **Declaración de Asistencia de IA (Política Sección 6):**
  - **Uso de IA:** Se utilizó Gemini y Antigravity para estructurar la selección y desglosar las reglas de negocio exigidas.
  - **Verificación:** Se auditó manualmente el código del controlador `reservationController.js` y `db.js`, confirmando la ausencia de credenciales hardcodeadas[cite: 1, 2].


----------------------------------------------------------------------------------------------


## 2. Entorno de Desarrollo, Tooling y Gobierno de IA
* **Fecha:** 2026-08-06
* **Decisión tomada:** Uso de Windows PowerShell con Antigravity CLI (`agy` v1.1.10) e IDE configurado en modo **`Review-driven development`**.
* **Justificación Técnica:**
  - El modo `Review-driven development` obliga al agente de IA a solicitar confirmación explícita (`Proceed` / `Review`) ante cada diff de código o comando, garantizando la auditoría humana exigida por la cátedra.
  - Se configuraron las reglas de contexto (`.cursorrules`) con los archivos `@reglamento-catedra.md` y `@elegir-app.md` en la raíz para alineación de respuestas[cite: 1, 2].
* **Declaración de Asistencia de IA:**
  - **Uso de IA:** Se consultó a Gemini para resolver el refresco del PATH tras instalar la CLI y diagnosticar los componentes del IDE.
  - **Verificación:** Se probó `agy --version` en PowerShell comprobando el correcto registro de variables del sistema.


----------------------------------------------------------------------------------------------


## 3. Gobernanza de Git, Protección de Rama y Resolución de Conflictos (TP1)
* **Fecha:** 2026-08-08
* **Decisión tomada:** Configuración de reglas de protección (Branch Protection Rules) en la rama `main` de GitHub, bloqueando el push directo y exigiendo integración exclusiva vía Pull Requests (con 0 aprobaciones obligatorias por ser desarrollo individual)[cite: 1].
* **Justificación Técnica del Conflicto de Merge:**
  - **Origen:** Se provocó una edición concurrente en la línea 5 de `decisiones.md` en la rama `main` remota y en la rama local `feature/reglas-negocio` a partir de un commit ancestro común[cite: 1].
  - **¿Por qué Git no lo resolvió solo?:** Los algoritmos de fusión de Git (3-way merge) no pueden determinar de forma autónoma cuál de las dos modificaciones sobre la misma línea debe prevalecer sin arriesgar la pérdida de información lógica[cite: 1].
  - **Resolución:** Se inspeccionó el diff en el editor, se eliminaron manualmente los marcadores de conflicto (`<<<<<<< HEAD`, `=======`, `>>>>>>>`), se unificó el texto y se completó el commit de merge en el PR #2[cite: 1].
* **Declaración de Asistencia de IA:**
  - **Uso de IA:** Se consultó a Gemini para conceptualizar la mecánica interna de las ramas y algoritmos de merge[cite: 1].
  - **Verificación:** Se verificaron las capturas del push rechazado y del conflicto resuelto en `evidencias.md`[cite: 1].


----------------------------------------------------------------------------------------------


## 4. Verificación de Herramientas de Virtualización (Preparación TP2)
* **Fecha:** 2026-08-08
* **Decisión tomada:** Adopción de Docker Desktop (Docker Engine v28.3.2 y Docker Compose Plugin V2 v2.38.2) para el empaquetamiento por contenedores de la aplicación en el TP2[cite: 1].
* **Justificación Técnica:** Garantiza paridad entre el entorno de desarrollo local y los runners desatendidos de CI/CD en GitHub Actions / Azure DevOps[cite: 1, 2].


----------------------------------------------------------------------------------------------


## 5. Autenticación Local con GitHub (GitHub CLI)
* **Fecha:** 2026-08-08
* **Decisión tomada:** Instalación de gh v2.97.0 (GitHub CLI) mediante winget y autenticación por flujo OAuth 2.0 (gh auth login -> HTTPS -> Login with a web browser).
* **Alternativas consideradas:** Personal Access Tokens (PAT) manuales. Se descartó para evitar manipular cadenas sensibles y riesgos de expiración durante la cursada.
* **Justificación Técnica:** Configura automáticamente el Git Credential Manager en Windows para firmar operaciones de git push y Pull Requests sobre ramas protegidas sin exponer contraseñas en texto plano.
* **Declaración de Asistencia de IA:**
  - **Uso de IA:** Guía de Gemini para validar el código de dispositivo temporal y la concesión de permisos.
  - **Verificación:** Ejecución de gh auth status confirmando sesión activa bajo NicoGrosso19.