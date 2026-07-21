# Imposición de Lotes

> Aplicación web para maquetación e imposición de pliegos, numeración secuencial de tarjetas o etiquetas y exportación de archivos PDF vectoriales listos para corte en guillotina.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Radix UI](https://img.shields.io/badge/Radix_UI-Themes-161618)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Características Principales

* **🔢 Numeración Secuencial**: Configuración de correlativos con prefijo personalizado, ceros a la izquierda y rango de inicio/fin.
* **📐 Imposición de Pliegos**: Cálculo dinámico del aprovechamiento de hoja en formatos estándar (Carta y A4) en orientación vertical u horizontal.
* **📏 Control de Medidas**: Ajuste fino de ancho/alto de tarjeta, sangría entre piezas y márgenes exteriores en milímetros o centímetros.
* **🔒 Bloqueo de Medidas**: Opción para guardar tus dimensiones predeterminadas en `localStorage` y recuperarlas automáticamente al recargar.
* **🎨 Flechas de Orientación y Color**: Selección de dirección de flecha (Arriba, Abajo, Izquierda, Derecha) y paleta de colores para diferenciación de lotes.
* **🎯 Marcas de Corte Hairline**: Generación de guías vectoriales exactas para guillotinar.
* **📄 Exportación PDF Vectorial**: Generación instantánea de archivos PDF de alta resolución sin pérdida de calidad.

---

## 🛠️ Tecnologías Utilizadas

* **[React 18](https://react.dev/)**: Biblioteca principal de interfaz de usuario.
* **[Vite](https://vitejs.dev/)**: Entorno de desarrollo rápido y empaquetador de módulos.
* **[@radix-ui/themes](https://www.radix-ui.com/)**: Sistema de diseño moderno y componentes accesibles.
* **[jsPDF](https://github.com/parallax/jsPDF)**: Motor de generación de documentos PDF vectoriales.

---

## 📦 Instalación y Desarrollo

Sigue estos pasos para ejecutar el proyecto de forma local:

### 1. Clonar el repositorio
```bash
git clone https://github.com/wilmerAndradev/imposicion-de-lotes.git
cd imposicion-de-lotes
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar servidor de desarrollo
```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`.

### 4. Compilar para producción
```bash
npm run build
```

---

## 👤 Autor

Diseñado y desarrollado por **Wilmer Andrade**.  
GitHub: [@wilmerAndradev](https://github.com/wilmerAndradev)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
