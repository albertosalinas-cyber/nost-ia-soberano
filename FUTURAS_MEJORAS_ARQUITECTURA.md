# 🚀 FUTURAS MEJORAS Y EVOLUCIÓN ARQUITECTÓNICA DE NOST-IA
**Documento Técnico de Planificación Estratégica para el Almacén y la PyME Argentina**  
**Autor:** Alberto Salinas & Equipo de Arquitectura de Software y Ciberseguridad  
**Versión:** 3.1 — Soberana, Territorial y 100% Offline

---

## 1. ⚠️ DIAGNÓSTICO DE VIABILIDAD TÉCNICA: MODELOS NEURONALES MASIVOS vs. HARDWARE POPULAR

### 1.1. La Realidad del Parque Informático Barrial
El almacén de barrio, la cooperativa popular, la ferretería y la casa de repuestos argentina operan comúnmente sobre computadoras de escritorio recicladas, notebooks familiares o PCs de punto de venta humildes:
* **Procesadores:** Intel Celeron, Pentium Gold, Core i3 de 4ª a 8ª generación, o AMD Athlon / Ryzen 3.
* **Memoria RAM Total:** 4 GB (en muchos casos) a 8 GB de memoria DDR3/DDR4.
* **Sistema Operativo:** Windows 10/11 o distribuciones ligeras de Linux (Ubuntu/Debian). El sistema operativo y el navegador ya consumen entre **1.8 GB y 2.4 GB de RAM** en reposo.
* **GPU Dedicada:** **0% de presencia** (gráficos integrados Intel HD Graphics sin VRAM propia).

### 1.2. Requerimientos de los Modelos de Ingesta Masiva
Integrar en este instante el stack de:
1. **PP-DocLayoutV3 (OpenVINO IR):** Layout Analysis con multi-point bounding boxes (~320 MB de pesos).
2. **PaddleOCR-VL-1.5 ONNX (0.9B cuantizado Q4/Q8):** Encoder de visión y decoder GPTQ (~1.5 GB de pesos).
3. **TeleOCR (GGUF 1.2B vía llama.cpp):** Modelado geométrico con CGDP (~1.8 GB de pesos).

#### Impacto Técnico Crítico:
* **Descarga inicial:** **~3.62 GB de pesos neuronales** en cada máquina.
* **Consumo de Memoria RAM Pico:** **> 3.5 GB a 4.2 GB de memoria RAM** solo para levantar los runtimes de ONNX, OpenVINO y llama.cpp en CPU pura.
* **Consecuencia Ineludible en Mostrador Popular:** En una PC con 4 GB de RAM, la ejecución simultánea provocaría un **OOM Crash (Out of Memory - Cierre forzado del proceso por el Kernel)** o el congelamiento total del sistema operativo por saturación del archivo de paginación (`swap` en disco mecánico), dejando al comerciante sin caja registradora en plena hora pico de atención al público.

---

## 2. 🏛️ LA SOLUCIÓN SOBERANA ACTUAL: VDU 3.0 DETERMINISTA

Para garantizar que **NOST-IA no falle jamás en el mostrador**, se implementó el **Pipeline VDU (Visual Document Understanding) Soberano**:

```
                         [ Comprobante de Entrada ]
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
     [ PDF Digital Nativo ]                        [ Foto / PDF Escaneado ]
              │                                               │
   pdfjs-dist Vectorial 2D                         Canvas 300 DPI Local (2.0x)
      (< 10 ms / CPU nula)                                    │
              │                                    ZXing WASM (< 50 ms)
              │                                    (QR Oficial AFIP: CUIT,
              │                                     Nro, Fecha, Total 100%)
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                        [ VDU Layout Engine 2D ]
                        - Desacople EAN / Descripción
                        - Preservación de Subtítulos Técnicos
                        - Clasificación Gastos Fijos vs Stock
                                      │
                                      ▼
                      [ Post-Procesamiento Argentino ]
                      - parseNumeroArgentino ($ 45.000,00 -> 45000.00)
                      - Matriz de Veto (Harina 000 vs 0000, 50kg vs 1kg)
                      - Respaldo Cifrado con Checksum SHA-256
```

### Métricas de Rendimiento del Motor Soberano:
* **Consumo de Memoria RAM:** **< 45 MB** (98.7% menor que los modelos masivos).
* **Tiempo de Inferencia:** < 10 ms para PDFs digitales; < 1.2 segundos para fotos con decodificación QR AFIP.
* **Disponibilidad:** 100% offline, cero dependencias foráneas, cero fallos por falta de memoria.

---

## 3. 🗺️ HOJA DE RUTA GRADUAL: EVOLUCIÓN HACIA MODELOS NEURONALES

Para incorporar modelos de visión neuronal de manera responsable sin quebrar las computadoras del pueblo, se planifican tres fases de transición:

### Fase 1: Detección Dinámica de Capacidad de Hardware (Q1 2027)
* El sistema detecta `navigator.deviceMemory` y la cantidad de hilos lógicos (`navigator.hardwareConcurrency`).
* **Nivel Humilde (RAM < 6 GB):** Corre automáticamente el motor VDU 3.0 matricial ultraligero.
* **Nivel Avanzado (RAM >= 8 GB):** Habilita la aceleración opcional de modelos ONNX cuantizados a INT4.

### Fase 2: WebAssembly & WebGPU Pipeline (Q2 2027)
* Portar los kernels de atención y convolución a **WebGPU en el navegador** para aprovechar gráficos integrados Intel Iris / AMD Vega sin consumir memoria de CPU.
* Cuantización extrema a 2-bit / 3-bit (*BitNet b1.58*) para reducir los 3.6 GB a menos de 450 MB.

### Fase 3: TeleOCR On-Demand para Fotos Deformadas (Q3 2027)
* Activar `TeleOCR GGUF` exclusivamente como fallback de segundo nivel cuando:
  1. No exista código QR AFIP legible en la imagen.
  2. La curvatura del papel fotografiado supere un umbral de desviación del 35%.
  3. El equipo cuente con al menos 8 GB de memoria física disponible.

---

## 4. 📦 RESGUARDO Y SOBERANÍA: BACKUP DISPONIBLE
Cualquier comerciante o auditor puede descargar la base de datos preconfigurada directamente desde la ventana de **Futuras Mejoras (Roadmap)** o desde el pie de página de la aplicación, obteniendo un archivo JSON con firma de integridad SHA-256 para restaurar en cualquier equipo nuevo en segundos.
