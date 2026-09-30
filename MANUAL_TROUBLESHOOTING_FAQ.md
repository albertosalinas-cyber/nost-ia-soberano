# 🛠️ MANUAL DE SOLUCIÓN DE PROBLEMAS Y PREGUNTAS FRECUENTES (TROUBLESHOOTING FAQ)

**NOST-IA: Nodo Operativo Soberano Territorial con Inteligencia Artificial**  
*Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA • Inteligencia Artificial al servicio del Territorio*

---

## ❓ 1. PREGUNTAS FRECUENTES DE OPERACIÓN DIARIA

### 🔴 ¿Qué pasa si finaliza el día comercial y cierro la ventana de NOST-IA? ¿Tengo que reinstalar o hacer todo de nuevo?
**NO, NUNCA.**  
NOST-IA utiliza el motor de persistencia local **Dexie / IndexedDB**, que guarda automáticamente cada producto, venta, factura y precio directamente en el disco rígido de tu computadora.
* Al cerrar la ventana o apagar la PC al final de la jornada comercial, los datos quedan guardados y protegidos.
* Al día siguiente, simplemente abrís el acceso directo de tu navegador o escritorio (`http://localhost:3000`) y todo tu catálogo, historial de ventas y configuraciones estarán exactamente como los dejaste.
* No requiere volver a ejecutar comandos de instalación ni reingresar productos.

---

### 🔴 ¿Qué pasa si el puerto 3000 está ocupado por otra aplicación?
Si tenés otra aplicación corriendo en el puerto 3000, el servidor local de NOST-IA o tu navegador pueden iniciarse en un puerto alternativo:
1. **Detección Automática de Puerto:** El servidor Express / Node / FastAPI intentará enlazarse al puerto configurado o buscará el siguiente puerto libre disponible (`3001`, `3002`, `8080`).
2. **Definir Puerto Manualmente:** Podés iniciar el sistema indicando el puerto deseado en la terminal:
   ```bash
   PORT=3001 npm run dev
   ```
3. **Liberar el Puerto 3000 en Windows / Linux:**
   * En Linux/Mac: `npx kill-port 3000`
   * En Windows: Abrir CMD y ejecutar `netstat -ano | findstr :3000` y luego `taskkill /PID <NUMERO_PID> /F`.

---

### 🔴 ¿Cómo recupero el acceso si cerré la pestaña del navegador por error?
1. **Acceso Rápido por Teclado:** Presioná `Ctrl + Shift + T` en tu teclado para reabrir la última pestaña cerrada.
2. **Historial:** Presioná `Ctrl + H`, buscá "NOST-IA" y hacé clic en el enlace.
3. **Acceso Directo en el Escritorio:**
   * En Chrome / Edge / Brave: Hacé clic en los 3 puntos arriba a la derecha `⋮` > *Guardar y compartir* > *Crear acceso directo* (marcar "Abrir como ventana"). Esto te crea un ícono de NOST-IA en el escritorio que funciona como un programa nativo de Windows o Linux.
   * O simplemente abrí tu navegador y escribí en la barra de direcciones: `http://localhost:3000`.

---

### 🔴 Cláusula Explícita de Responsabilidad de Datos Locales
> **IMPORTANTE:** Al ser un sistema 100% local, soberano y offline, **los datos viven exclusivamente en el disco rígido del usuario**. NOST-IA no almacena, no envía ni copia ningún archivo en servidores externos ni en la nube corporativa.  
> Si el comerciante sufre la rotura de su computadora, formateo accidental o extravío de su disco rígido sin haber realizado una copia de seguridad previa, **la responsabilidad de la pérdida de datos es exclusiva del usuario**.  
> **Recomendación Soberana:** Realizá una copia de seguridad periódica descargando el archivo JSON desde el botón de **Resguardo / Cierre de Día** y guardalo en un pendrive físico.

---

### 🔴 ¿Cómo restauro un backup si cambio de computadora?
1. En la nueva computadora abrís NOST-IA.
2. Vas a la sección de **Configuración / Resguardo**.
3. Hacés clic en **«Importar / Restaurar Backup»** y seleccionás tu archivo `backup_nost_ia_*.json`.
4. El sistema verificará la firma criptográfica SHA-256 e importará instantáneamente todos tus productos, listas de costos y registros comerciales.

---

### 🔴 ¿Cómo funciona el Sistema de Actualizaciones Soberanas?
* **Usuarios del Servicio Completo:** Con la **Doble Clave** (Clave maestra de gestión + Clave oficial entregada por Alberto Salinas), acceden a parches de seguridad, nuevas plantillas de facturas y mejoras continuas garantizando que la base de datos `comercio.db` nunca sea sobrescrita.
* **Usuarios Libres:** Reciben el aviso informativo de nuevas versiones y mejoras disponibles para contratar el acompañamiento oficial si lo desean.
