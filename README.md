[English/Español](./README.md) | [中文](./README-zh.md)
[![Sitio web](https://img.shields.io/badge/Sitio_Web-nostia.com.ar-00e5ff?style=for-the-badge)](https://nostia.com.ar)

# NOST-IA: Nodo Operativo Soberano Territorial con Inteligencia Artificial

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-black?logo=ollama)
![Status](https://img.shields.io/badge/Status-En_Desarrollo-orange)
![Sovereign AI](https://img.shields.io/badge/Soberan%C3%ADa-100%25_Offline-red)

> **Software Libre (GPLv3), Soberano y 100% Offline para Almacenes de Barrio, Comercios Populares, Cooperativas, Clubes de Barrio y Organizaciones Libres del Pueblo.**  
> *Concebido y desarrollado por el **Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA**.*  
> *Lema: Inteligencia Artificial al servicio del Territorio • Mataderos, Buenos Aires, Argentina*

![Demo de NOST-IA](https://github.com/albertosalinas-cyber/nost-ia-soberano/assets/7d34534f-8bfa-4cab-8974-e92f71473d4)

<img width="800" height="450" alt="Demo NOST-IA" src="https://github.com/user-attachments/assets/7d34534f-8bfa-4cab-8974-e92f71473d4" />
---

## 🌐 Sitio web oficial

**👉 [https://nostia.com.ar](https://nostia.com.ar)**

Ahí podés ver el video demo, conocer las funciones y contactarme directamente.

---
### Demo visual del Compañero IA

![Demo del Compañero IA](https://github.com/albertosalinas-cyber/nostia-web/raw/main/activos/demo.gif)

## 🎬 Demo

[![NOST-IA Demo](https://img.youtube.com/vi/MGZjfRAD410/maxresdefault.jpg)](https://www.youtube.com/watch?v=MGZjfRAD410)

Mirá el video completo: [youtube.com/watch?v=MGZjfRAD410](https://www.youtube.com/watch?v=MGZjfRAD410)

---

## 🎯 ¿Qué es NOST-IA?

**NOST-IA** es un sistema integral de AUTOMATIZACION y control de invenatrios, stock inteligente, cálculo de costos y compañero de mostrador con Inteligencia Artificial local.

Fue diseñado con una premisa inquebrantable de **soberanía tecnológica**:
* **100% Offline:** Funciona sin conexión a internet. La información sensible de compras, ventas, costos y proveedores nunca sale de tu computadora.
* **Privacidad y Ciberseguridad Total:** No almacena datos en servidores externos ni expone puertos a redes públicas.
* **Persistencia Local Inmutable:** Corre sobre **Dexie / IndexedDB** en el disco duro físico del comerciante. Al cerrar la jornada comercial, no se requiere reinstalar ni reiniciar datos al día siguiente.
* **Optimizado para Computadoras Populares:** Funciona en equipos de 4 GB de RAM (Intel Celeron, Core i3 o AMD Athlon).

---

## 🚀 Características Principales

1. **Control de Inventario y Alertas de Stock:** Detección de quiebres de stock en tiempo real y cálculo exacto del **Capital en Góndola** (inversión a costo mayorista vs. recaudación potencial a precio de venta).
2. **Cálculo de Costos Fijos y Precios Justos:** Prorrateo del alquiler, la luz, internet y tasas municipales sobre cada producto para no vender jamás a pérdida.
3. **Compañero IA de Mostrador Soberano:**
   * Diálogo natural, cálido y argentino.
   * Sugerencia de **Combos Relámpago** para mover mercadería dormida y conseguir efectivo rápido.
   * Integración con modelos locales ultra-livianos como **Qwen 2.5 Coder 1.5B** vía Ollama local.
4. **Carga Inteligente de Facturas y Remitos (Pipeline VDU 2D):** Procesamiento geométrico de facturas A/B/C, tickets fiscales AFIP con código QR y remitos mayoristas con Matriz de Veto de 5 etapas (50kg vs 1kg, Harina 000 vs 0000).
5. **Cierre de Día Comercial y Backup Soberano:** Descarga y restauración de copias de seguridad en formato JSON con firma criptográfica SHA-256 en un solo clic para guardar en pendrive.
6. **Sistema de Actualizaciones Soberanas:** Protocolo respetuoso sin telemetría con validación de doble clave para nodos con servicio completo.

---

## 🛠️ Requisitos Mínimos

* **Sistema Operativo:** Windows 10 / 11, Linux (Ubuntu, Debian, Fedora) o macOS.
* **Procesador:** Cualquier CPU moderna o de oficina (Intel Core i3/i5/i7 o AMD Ryzen / Athlon).
* **Memoria RAM:** Mínimo 4 GB de RAM.
* **Software:** [Node.js (v18+)](https://nodejs.org/) y opcionalmente [Ollama](https://ollama.com/) para el copiloto local.

---

## ⚡ Instalación y Puesta en Marcha

Para usuarios de Windows (sin conocimientos técnicos):
Descargá el archivo NOST-IA-v1.0.1-Windows.zip desde la sección Releases, descomprimilo y en el archivo descomprimido buscá un archivo con el nombre "INICIAR.bat", hacé doble click + Ejecutar y después solo espera hasta que el sistema desrcague todo el sistema, las librerias y programas necesarios. Al finalizar, se abrirá automaticamente una web que corre de local con la dirección de `http://localhost:3000`, LISTO" puedes usarlo libremente.

Los siguientes pasos son solo para desarrolladores que quieran correr el código fuente:

```bash
# 1. Clonar el repositorio
git clone https://github.com/albertosalinas-cyber/nost-ia-soberano.git
cd nost-ia-soberano

# 2. Instalar dependencias
npm install

# 3. Descargar el modelo ligero en tu terminal local (opcional)
ollama pull qwen2.5-coder:1.5b

# 4. Iniciar NOST-IA
npm run dev
```

Abre tu navegador en `http://localhost:3000`.

---

## 📖 Documentación y Guías del Proyecto

* **[PHILOSOPHY.md](./PHILOSOPHY.md):** Manifiesto, Prompt Maestro y Filosofía Soberana.
* **[MANUAL_TROUBLESHOOTING_FAQ.md](./MANUAL_TROUBLESHOOTING_FAQ.md):** Solución de problemas comunes (puertos ocupados, accesos directos, persistencia).
* **[AUDITORIA_INTEGRAL_LANZAMIENTO.md](./AUDITORIA_INTEGRAL_LANZAMIENTO.md):** Auditoría exhaustiva de funcionamiento, UI/UX, ingesta y ciberseguridad.
* **[LICENSE](./LICENSE):** Licencia de Código Abierto GNU General Public License v3 (GPLv3).

---

## ⚠️ Cláusula Soberana de Responsabilidad de Datos
Al ser un sistema 100% local, los datos viven exclusivamente en el disco rígido de la computadora del usuario. NOST-IA no almacena ni copia nada en servidores externos. Si la computadora sufre una falla de hardware sin un resguardo previo, la responsabilidad es del usuario. Se recomienda realizar copias periódicas a un pendrive físico.

---

## 🤝 Contacto y Aporte Solidario
Para consultas de soporte, capacitaciones o contrataciones del servicio completo:
* **Titular:** Profesor ALBERTO SALINAS MENDIETA
* **Email:** `alberto.salinas@bue.edu.ar`
* **WhatsApp:** `11-3768-9803`
* **Alias Oficial:** `NOST.IA.SOBERANO`
