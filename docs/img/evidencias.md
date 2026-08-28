# 📸 Registro de Evidencias de Ejecución (`evidencias.md`) — TP1
----------------------------------------------------------------------------------------------


## Evidencia 1: Funcionalidad de la Protección de la Rama main

![Bloqueo de Push Directo a Main](/docs/img/evidencia-01.png)

* **Descripción:** Intento de subida directa (`git push`) desde la terminal local sobre la rama `main` protegida.
* **Explicación Técnica:** El servidor remoto de GitHub rechaza el push devolviendo el error `remote: error: GH006: Protected branch update failed`. Esto certifica que la regla *Classic Branch Protection* está activa.


----------------------------------------------------------------------------------------------


## Evidencia 2: Detección Automática de Conflicto en Pull Request

![Generamos un conflicto adrede al editar las mismas líneas](/docs/img/evidencia-02.png)


* **Descripción:** Alerta de bloqueo de integración en la interfaz del Pull Request de la rama feature/titulo-b.
* **Explicación Técnica:** GitHub detecta que la rama feature/titulo-a se integró previamente en main modificando la misma línea del README.md. Al intentar fusionar feature/titulo-b, las historias divergen sobre los mismos bytes del archivo, desplegando el aviso This branch has conflicts that must be resolved y deshabilitando el botón de merge automático.


----------------------------------------------------------------------------------------------


## Evidencia 3: Marcadores de Conflicto en el Editor Web de GitHub

![Marcadores de Conflicto](/docs/img/evidencia-03.png)

* **Descripción:** Visor del editor de resolución de conflictos web mostrando los marcadores tridireccionales de Git.
* **Explicación Técnica:** Muestra los delimitadores nativos de Git sobre la línea en disputa:

--> `<<<<<<< feature/titulo-b` (Current change): Propuesta de la rama entrante (Versión B).

--> `=======`: Separador de fronteras.

--> `>>>>>>> main` (Incoming change): Estado actual persistido en la rama base (Versión A). Esta captura constituye la evidencia previa a la limpieza manual de marcadores y aprobación con Mark as resolved.


----------------------------------------------------------------------------------------------


## Evidencia 4: Publicación del Snapshot Inmutable (Tag v1.0.0 / tp1)

![Release TP1](/docs/img/evidencia-04.png)

* **Descripción:** Vista de la sección Releases/Tags en la interfaz web de GitHub confirmando la existencia de la versión congelada del TP1.

* **Explicación Técnica:** Muestra la etiqueta anotada v1.0.0 (o tp1) apuntando al commit consolidado en main tras resolver los PRs y sincronizar la terminal local. Certifica el cumplimiento del checkpoint del TP1 para las auditorías de evaluación P1.  


----------------------------------------------------------------------------------------------


## Evidencia 5: 

![]()

* **Descripción:** 
* **Explicación Técnica:**  

----------------------------------------------------------------------------------------------


## Evidencia 6: 

![]()

* **Descripción:** 
* **Explicación Técnica:** 

----------------------------------------------------------------------------------------------


## Evidencia 7: 

![]()

* **Descripción:** 

* **Explicación Técnica:** 


----------------------------------------------------------------------------------------------


## Evidencia 8: 

![]()

* **Descripción:** 

* **Explicación Técnica:** 