/**
 * Controlador Principal de la Aplicación (main.js)
 * Conecta los eventos de la UI, la lógica de imposición y la vista previa.
 */

import '@radix-ui/themes/styles.css';
import { calculateLayout } from './components/layoutEngine.js';
import { PreviewViewer } from './components/previewViewer.js';
import { generatePdf } from './components/pdfGenerator.js';

// Estado global de la aplicación
const state = {
  prefix: 'E',
  startNum: 1,
  endNum: 90,
  padZeros: 'none',
  unitMode: 'cm', // Default 'cm'
  cardWidth: 60,
  cardHeight: 40,
  arrowDirection: 'down',
  paperSize: 'letter',
  paperOrientation: 'portrait',
  gutterSize: 5,
  pageMargin: 10,
  showCropMarks: true,
  currentPageIndex: 0,
  layoutData: null
};

// Referencias DOM
let previewViewer = null;

document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  initPreviewViewer();
  bindEvents();
  updateApp();
});

function initDOMReferences() {
  state.elements = {
    prefixInput: document.getElementById('prefix-input'),
    padZerosSelect: document.getElementById('pad-zeros'),
    startNumInput: document.getElementById('start-num'),
    endNumInput: document.getElementById('end-num'),
    unitModeSelect: document.getElementById('unit-mode'),
    cardWidthInput: document.getElementById('card-width'),
    cardHeightInput: document.getElementById('card-height'),
    arrowBtns: document.querySelectorAll('.arrow-btn'),
    paperSizeSelect: document.getElementById('paper-size'),
    paperOrientationSelect: document.getElementById('paper-orientation'),
    gutterSizeInput: document.getElementById('gutter-size'),
    pageMarginInput: document.getElementById('page-margin'),
    showCropMarksCheckbox: document.getElementById('show-crop-marks'),
    showCardOutlineCheckbox: document.getElementById('show-card-outline'),

    // Etiquetas de Unidad
    unitLabels: document.querySelectorAll('.unit-label'),

    // Estadísticas
    statCardsPerPage: document.getElementById('stat-cards-per-page'),
    statTotalPages: document.getElementById('stat-total-pages'),
    statGridLayout: document.getElementById('stat-grid-layout'),
    statEfficiency: document.getElementById('stat-efficiency'),

    // Navegación
    currentPageNum: document.getElementById('current-page-num'),
    totalPagesNum: document.getElementById('total-pages-num'),
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page'),

    // Zoom
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomFit: document.getElementById('btn-zoom-fit'),
    zoomLevelText: document.getElementById('zoom-level-text'),

    // Acciones
    btnExportPdf: document.getElementById('btn-export-pdf'),
    paperStage: document.getElementById('paper-stage'),
    viewportContainer: document.getElementById('viewport-container')
  };
}

function initPreviewViewer() {
  previewViewer = new PreviewViewer(state.elements.paperStage, state.elements.viewportContainer);
}

function bindEvents() {
  const { elements } = state;

  // Escuchar cambios en la unidad de medida (mm / cm)
  if (elements.unitModeSelect) {
    elements.unitModeSelect.addEventListener('change', (e) => {
      const newUnit = e.target.value;
      const oldUnit = state.unitMode;

      if (newUnit !== oldUnit) {
        convertInputValues(oldUnit, newUnit);
        state.unitMode = newUnit;
        updateUnitLabels();
        readFormValues();
        updateApp();
      }
    });
  }

  // Escuchar cambios en campos numéricos y texto
  const inputsToListen = [
    elements.prefixInput,
    elements.startNumInput,
    elements.endNumInput,
    elements.cardWidthInput,
    elements.cardHeightInput,
    elements.gutterSizeInput,
    elements.pageMarginInput
  ];

  inputsToListen.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        readFormValues();
        updateApp();
      });
    }
  });

  // Escuchar cambios en desplegables y checkboxes
  const selectsToListen = [
    elements.padZerosSelect,
    elements.paperSizeSelect,
    elements.paperOrientationSelect,
    elements.showCropMarksCheckbox,
    elements.showCardOutlineCheckbox
  ];

  selectsToListen.forEach(select => {
    if (select) {
      select.addEventListener('change', () => {
        readFormValues();
        updateApp();
      });
    }
  });

  // Botones de dirección de flecha
  elements.arrowBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.arrowBtns.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      state.arrowDirection = targetBtn.getAttribute('data-direction');
      updateApp();
    });
  });

  // Navegación de páginas
  elements.btnPrevPage.addEventListener('click', () => {
    if (state.currentPageIndex > 0) {
      state.currentPageIndex--;
      renderCurrentPage();
    }
  });

  elements.btnNextPage.addEventListener('click', () => {
    if (state.layoutData && state.currentPageIndex < state.layoutData.totalPages - 1) {
      state.currentPageIndex++;
      renderCurrentPage();
    }
  });

  // Controles de Zoom
  elements.btnZoomIn.addEventListener('click', () => {
    previewViewer.zoomIn();
    updateZoomDisplay();
  });

  elements.btnZoomOut.addEventListener('click', () => {
    previewViewer.zoomOut();
    updateZoomDisplay();
  });

  elements.btnZoomFit.addEventListener('click', () => {
    if (!state.layoutData) {
      readFormValues();
      state.layoutData = calculateLayout(state);
    }
    if (state.layoutData && previewViewer) {
      previewViewer.fitToScreen(state.layoutData.sheetWidth, state.layoutData.sheetHeight);
      updateZoomDisplay();
    }
  });

  // Exportar PDF
  elements.btnExportPdf.addEventListener('click', () => {
    if (!state.layoutData) return;
    
    const btn = elements.btnExportPdf;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>Generando PDF...</span>`;
    btn.disabled = true;

    setTimeout(() => {
      try {
        const filename = `Lote_${state.prefix}${state.startNum}_a_${state.prefix}${state.endNum}.pdf`;
        generatePdf(state.layoutData, state.arrowDirection, filename);
      } catch (err) {
        console.error('Error al generar PDF:', err);
        alert('Ocurrió un error al generar el archivo PDF.');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }, 100);
  });

  // Ajustar zoom al redimensionar ventana
  window.addEventListener('resize', () => {
    if (state.layoutData) {
      previewViewer.fitToScreen(state.layoutData.sheetWidth, state.layoutData.sheetHeight);
      updateZoomDisplay();
    }
  });
}

/**
 * Convierte los valores de los inputs al cambiar entre mm y cm
 */
function convertInputValues(fromUnit, toUnit) {
  const { elements } = state;
  const factor = toUnit === 'cm' ? 0.1 : 10; // De mm a cm: /10, De cm a mm: *10

  const convertField = (inputEl) => {
    if (!inputEl) return;
    const currentVal = parseFloat(inputEl.value);
    if (!isNaN(currentVal)) {
      const converted = currentVal * factor;
      // Formatear decimales limpios
      inputEl.value = Number(converted.toFixed(2));
    }
  };

  convertField(elements.cardWidthInput);
  convertField(elements.cardHeightInput);
  convertField(elements.gutterSizeInput);
  convertField(elements.pageMarginInput);
}

function updateUnitLabels() {
  if (state.elements.unitLabels) {
    state.elements.unitLabels.forEach(label => {
      label.textContent = state.unitMode;
    });
  }
}

function readFormValues() {
  const { elements } = state;

  state.prefix = elements.prefixInput.value.trim() || 'E';
  state.startNum = parseInt(elements.startNumInput.value) || 1;
  state.endNum = parseInt(elements.endNumInput.value) || 1;
  state.padZeros = elements.padZerosSelect.value;
  state.unitMode = elements.unitModeSelect ? elements.unitModeSelect.value : 'mm';

  // Leer valores ingresados en el formulario
  const rawWidth = parseFloat(elements.cardWidthInput.value) || 0;
  const rawHeight = parseFloat(elements.cardHeightInput.value) || 0;
  const rawGutter = parseFloat(elements.gutterSizeInput.value) || 0;
  const rawMargin = parseFloat(elements.pageMarginInput.value) || 0;

  // Convertir internamente siempre a Milímetros (mm) para los motores de cálculo y PDF
  const unitFactor = state.unitMode === 'cm' ? 10 : 1;

  state.cardWidth = rawWidth * unitFactor;
  state.cardHeight = rawHeight * unitFactor;
  state.gutterSize = rawGutter * unitFactor;
  state.pageMargin = rawMargin * unitFactor;

  state.paperSize = elements.paperSizeSelect.value;
  state.paperOrientation = elements.paperOrientationSelect.value;
  state.showCropMarks = elements.showCropMarksCheckbox ? elements.showCropMarksCheckbox.checked : true;
  state.showCardOutline = elements.showCardOutlineCheckbox ? elements.showCardOutlineCheckbox.checked : true;

  // Asegurar rango numérico coherente
  if (state.startNum > state.endNum) {
    state.endNum = state.startNum;
    elements.endNumInput.value = state.endNum;
  }
}

function updateApp() {
  // Recalcular el diseño con la configuración actual
  state.layoutData = calculateLayout(state);

  // Resetear índice de página si supera el nuevo total de páginas
  if (state.currentPageIndex >= state.layoutData.totalPages) {
    state.currentPageIndex = 0;
  }

  updateStats();
  renderCurrentPage();
}

function updateStats() {
  const { elements, layoutData } = state;
  if (!layoutData) return;

  elements.statCardsPerPage.textContent = layoutData.cardsPerPage;
  elements.statTotalPages.textContent = layoutData.totalPages;
  elements.statGridLayout.textContent = `${layoutData.rows} × ${layoutData.cols}`;
  elements.statEfficiency.textContent = `${layoutData.efficiency}%`;

  elements.currentPageNum.textContent = state.currentPageIndex + 1;
  elements.totalPagesNum.textContent = layoutData.totalPages;

  elements.btnPrevPage.disabled = state.currentPageIndex === 0;
  elements.btnNextPage.disabled = state.currentPageIndex >= layoutData.totalPages - 1;
}

function renderCurrentPage() {
  if (!state.layoutData || !previewViewer) return;

  previewViewer.renderPage(state.layoutData, state.currentPageIndex, state.arrowDirection);
  
  // Actualizar indicador de página y estado de botones (Anterior / Siguiente)
  updateStats();

  // Ajustar escala en la primera renderización
  if (!state.initializedZoom) {
    previewViewer.fitToScreen(state.layoutData.sheetWidth, state.layoutData.sheetHeight);
    state.initializedZoom = true;
  }
  updateZoomDisplay();
}

function updateZoomDisplay() {
  if (state.elements.zoomLevelText && previewViewer) {
    state.elements.zoomLevelText.textContent = `${Math.round(previewViewer.scale * 100)}%`;
  }
}
