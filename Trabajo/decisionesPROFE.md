**---------------------------------------------         TP 1             ---------------------------------------------------**




**Registro de Decisiones de Arquitectura y DevOps** (decisiones.md)**

🔷 Gestión de Conflictos de Integración (Merge Conflicts) en el TP1
- Fecha: 08-10-2026
- Ubicación: Servidor remoto de GitHub (Herramienta Resolve conflicts del Pull Request en la web).


----------------------------------------------------------------------------------------------


* 1. **¿Por qué Git no pudo resolver el conflicto solo?**

 - **Razón Técnica:** Git utiliza el algoritmo de fusión en tres vías (3-way merge algorithm) analizando las diferencias desde un ancestro común. Al modificar intencionalmente el mismo rango de líneas del archivo README.md tanto en la rama main (Versión A) como en la rama feature/titulo-b (Versión B), Git detectó cambios concurrentes sobre los mismos bytes. Como el motor de Git no posee lógica de negocio ni semántica para determinar cuál de los dos textos era el "correcto", detuvo el proceso automático para evitar la pérdida no determinista de información.


----------------------------------------------------------------------------------------------


* 2. **¿Qué habría tenido que pasar para que el conflicto NUNCA apareciera?**

* **Alternativas Preventivas:** 
 - **Secuenciamiento de Pull Requests:** Que la rama feature/titulo-b se hubiera creado después de integrar la rama feature/titulo-a en main, habiendo ejecutado previamente un git pull o git rebase para partir del código actualizado.
 
  - **Independencia de Archivos/Líneas:** Que ambas ramas hubieran editado archivos diferentes o renglones no superpuestos dentro del README.md.
  

----------------------------------------------------------------------------------------------


* 3. **¿Qué problemas encontré y cómo los resolví?**
  
   - **Problema Encontrado:** Bloqueo de la integración en la interfaz del Pull Request de GitHub desplegando el aviso This branch has conflicts that must be resolved y marcadores tridireccionales (<<<<<<<, =======, >>>>>>>) dentro del visor web.
   
   - **Resolución Aplicada:**
   . Se ingresó al editor web de conflictos de GitHub (Resolve conflicts).
   . Se extrajo la captura de pantalla de los marcadores previa modificación como evidencia obligatoria para evidencias.md.
   . Se seleccionó manualmente la versión definitiva (Versión B), eliminando completamente las 3 líneas de delimitadores de conflicto de Git.
   . Se validó la sintaxis, se presionó Mark as resolved y se selló el commit de resolución mediante Commit merge.


----------------------------------------------------------------------------------------------


* 4. **Declaración de Uso de Inteligencia Artificial**

 - **Uso de IA:** Se consultó al Asistente de la Cátedra para interpretar el motivo por el cual el algoritmo de Git interrumpió el merge y para estructurar la resolución según los criterios evaluables de la defensa P1.
 
 - **Verificación:** Se verificó de forma autónoma la desaparición de las alertas en GitHub, se confirmó que el historial de main quedó consolidado sin símbolos de conflicto y se trajo la versión final al entorno local mediante git pull.


---------------------------------------------------------------------------------------------

















**---------------------------------------------         TP 2             ---------------------------------------------------**


* 1. **Selección y Justificación de la Aplicación del Semestre**

 - **Decisión tomada:** Selección de la aplicación full-stack `.NET 8 + React/Vite + PostgreSQL` ubicada en la carpeta `Trabajo/`.

 - **Evaluación frente a los 5 Criterios de Selección:**
  1. **Ejecución local inmediata:** Se verificó que la aplicación clona y levanta de forma local en menos de una tarde sin dependencias externas complejas.

  2. **Comandos de compilación conocidos:** Se identificaron los comandos exactos de build (`dotnet run` para backend y `npm run dev` para frontend).

  3. **Parametrización de BD:** La cadena de conexión se encuentra centralizada en variables de entorno (`ConnectionStrings__Default` / `.env`), permitiendo redirigir el host (`Host=db`) sin modificar el código fuente.

  4. **Lógica testeable:** Cuenta con más de 4 reglas de negocio en el backend y 2 comportamientos en el frontend para cubrir los 8 tests unitarios y 4 de interfaz exigidos en el TP5.

  5. **Comprensión del código:** Se comprende la arquitectura en capas para realizar modificaciones de código en vivo durante el examen final.


---------------------------------------------------------------------------------------------


* 2. **Definición del Proceso de Build y Multietapa (Dockerfiles)**

 - **Decisión tomada:** Implementar la estrategia Multi-Stage Build en los Dockerfiles de Backend y Frontend.

 - **Detalle de etapas del Build:**

  - **Etapa 1 (Build / Compilación):** Utiliza la imagen base con SDK completo (`dotnet/sdk:8.0` / `node:20-alpine`). Se copian primero los archivos de definición de dependencias (`.csproj` / `package.json`), se ejecuta la restauración (`dotnet restore` / `npm install`) para aprovechar el caché de capas de Docker, y finalmente se compilan los artefactos binarios o estáticos.

  - **Etapa 2 (Runtime / Producción):** Utiliza una imagen liviana de ejecución (`dotnet/aspnet:8.0` / `nginx:alpine`). Se migran únicamente los artefactos generados en la Etapa 1 mediante `COPY --from=build`.

 - **Justificación técnica:** Se reduce drásticamente el tamaño de la imagen final (de ~800 MB a ~100 MB), se agiliza la descarga en registries y se minimiza la superficie de ataque al no incluir compiladores ni herramientas de desarrollo en producción.

---------------------------------------------------------------------------------------------


## 🔷 4. Declaración de Uso de Inteligencia Artificial
- **Uso de IA:** Se consultó al Asistente de la Cátedra para interpretar el motivo por el cual el algoritmo de Git interrumpió el merge, estructurar el Dockerfile multi-stage y redactar la justificación técnica según los criterios evaluables de la defensa P1.
- **Verificación:** Se verificó de forma autónoma la desaparición de las alertas en GitHub, se confirmó que el historial de `main` quedó consolidado sin símbolos de conflicto, se comprobó la compilación limpia de la imagen Docker y se trajo la versión final al entorno local mediante `git pull`.