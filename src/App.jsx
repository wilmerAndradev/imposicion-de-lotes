import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Theme,
  Button,
  Flex,
  Grid,
  Box,
  Text,
  Heading,
  Badge,
  Select,
  Switch,
  TextField
} from '@radix-ui/themes';
import {
  DownloadIcon,
  FontFamilyIcon,
  SizeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  LockClosedIcon,
  LockOpen1Icon
} from '@radix-ui/react-icons';

import { calculateLayout } from './components/layoutEngine.js';
import { generateCardSvgContent } from './components/templateEngine.js';
import { generatePdf } from './components/pdfGenerator.js';

export default function App() {
  // Estado de configuración de la secuencia y lienzo
  const [prefix, setPrefix] = useState('E');
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(90);
  const [padZeros, setPadZeros] = useState('none');
  // Cargar dimensiones guardadas de localStorage si existen
  const [isDimensionsLocked, setIsDimensionsLocked] = useState(() => {
    try {
      return !!localStorage.getItem('locked_card_dimensions');
    } catch {
      return false;
    }
  });

  const getSavedDimension = (key, fallback) => {
    try {
      const saved = localStorage.getItem('locked_card_dimensions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {
      console.error(e);
    }
    return fallback;
  };

  const [unitMode, setUnitMode] = useState(() => getSavedDimension('unitMode', 'cm'));

  // Medidas ingresadas por el usuario
  const [cardWidthInput, setCardWidthInput] = useState(() => getSavedDimension('width', 6));
  const [cardHeightInput, setCardHeightInput] = useState(() => getSavedDimension('height', 4));
  const [gutterSizeInput, setGutterSizeInput] = useState(0.5);
  const [pageMarginInput, setPageMarginInput] = useState(1);

  // Alternar bloqueo de medidas en localStorage
  const toggleLockDimensions = () => {
    if (isDimensionsLocked) {
      setIsDimensionsLocked(false);
      try {
        localStorage.removeItem('locked_card_dimensions');
      } catch (e) {
        console.error(e);
      }
    } else {
      setIsDimensionsLocked(true);
      try {
        localStorage.setItem(
          'locked_card_dimensions',
          JSON.stringify({ width: Number(cardWidthInput), height: Number(cardHeightInput), unitMode })
        );
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Guardar automáticamente cambios si la medida está bloqueada
  useEffect(() => {
    if (isDimensionsLocked) {
      try {
        localStorage.setItem(
          'locked_card_dimensions',
          JSON.stringify({ width: Number(cardWidthInput), height: Number(cardHeightInput), unitMode })
        );
      } catch (e) {
        console.error(e);
      }
    }
  }, [cardWidthInput, cardHeightInput, unitMode, isDimensionsLocked]);

  // Parámetros de imposición y diseño
  const [showArrow, setShowArrow] = useState(true);
  const [arrowDirection, setArrowDirection] = useState('down');
  const [arrowColor, setArrowColor] = useState('#0090ff');
  const [paperSize, setPaperSize] = useState('letter');
  const [paperOrientation, setPaperOrientation] = useState('portrait');
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [showCardOutline, setShowCardOutline] = useState(true);

  // Estado de acordeón desplegable por pasos
  const [openSteps, setOpenSteps] = useState({ 1: true, 2: true, 3: true, 4: true });

  const toggleStep = (stepNum) => {
    setOpenSteps(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  // Estado de navegación y visor
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isExporting, setIsExporting] = useState(false);

  const viewportRef = useRef(null);

  // Cambiar entre mm y cm con conversión automática de campos
  const handleUnitModeChange = (newUnit) => {
    if (newUnit === unitMode) return;
    const factor = newUnit === 'cm' ? 0.1 : 10;

    setCardWidthInput(prev => Number((prev * factor).toFixed(2)));
    setCardHeightInput(prev => Number((prev * factor).toFixed(2)));
    setGutterSizeInput(prev => Number((prev * factor).toFixed(2)));
    setPageMarginInput(prev => Number((prev * factor).toFixed(2)));

    setUnitMode(newUnit);
  };

  // Cálculo de imposición memoizado usando el motor original (layoutEngine)
  const layoutData = useMemo(() => {
    const unitFactor = unitMode === 'cm' ? 10 : 1;
    const start = Math.max(0, parseInt(startNum) || 1);
    const end = Math.max(start, parseInt(endNum) || 1);

    return calculateLayout({
      prefix,
      startNum: start,
      endNum: end,
      padZeros,
      cardWidth: (parseFloat(cardWidthInput) || 0) * unitFactor,
      cardHeight: (parseFloat(cardHeightInput) || 0) * unitFactor,
      paperSize,
      paperOrientation,
      gutterSize: (parseFloat(gutterSizeInput) || 0) * unitFactor,
      pageMargin: (parseFloat(pageMarginInput) || 0) * unitFactor,
      showCropMarks,
      showCardOutline
    });
  }, [
    prefix, startNum, endNum, padZeros, unitMode,
    cardWidthInput, cardHeightInput, gutterSizeInput, pageMarginInput,
    paperSize, paperOrientation, showCropMarks, showCardOutline
  ]);

  // Ajustar página si supera el nuevo límite total
  useEffect(() => {
    if (currentPageIndex >= layoutData.totalPages) {
      setCurrentPageIndex(0);
    }
  }, [layoutData.totalPages, currentPageIndex]);

  // Función de ajuste automático a pantalla (Fit to screen)
  const handleFitToScreen = () => {
    const doFit = () => {
      if (!viewportRef.current || !layoutData) return;
      const viewport = viewportRef.current;
      const rect = viewport.getBoundingClientRect();

      // Espacio real del viewport menos padding interno (40px cada lado)
      const padding = 80;
      const availableW = rect.width  - padding;
      const availableH = rect.height - padding;

      if (availableW <= 0 || availableH <= 0) return;

      const ppi = 3.7795275591;
      const stageWidthPx  = layoutData.sheetWidth  * ppi;
      const stageHeightPx = layoutData.sheetHeight * ppi;

      if (stageWidthPx <= 0 || stageHeightPx <= 0) return;

      // Escala que hace que TODA la hoja quepa con un 4% de margen de seguridad
      const scaleX = (availableW / stageWidthPx)  * 0.96;
      const scaleY = (availableH / stageHeightPx) * 0.96;
      const idealScale = Math.max(0.1, Math.min(2.5, Math.min(scaleX, scaleY)));

      setZoomScale(idealScale);

      // Centrar el scroll después de que React aplique el nuevo scale
      requestAnimationFrame(() => {
        if (viewportRef.current) {
          const vp = viewportRef.current;
          vp.scrollLeft = (vp.scrollWidth  - vp.clientWidth)  / 2;
          vp.scrollTop  = (vp.scrollHeight - vp.clientHeight) / 2;
        }
      });
    };

    // Primer intento inmediato; segundo con un pequeño delay para el layout
    doFit();
    setTimeout(doFit, 60);
  };

  // Ajustar la primera vez
  useEffect(() => {
    handleFitToScreen();
  }, [layoutData.sheetWidth, layoutData.sheetHeight]);

  // Manejar exportación a PDF usando el motor original (pdfGenerator)
  const handleExportPdf = () => {
    if (!layoutData) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const filename = `Lote_${prefix}${startNum}_a_${prefix}${endNum}.pdf`;
        generatePdf(layoutData, arrowDirection, filename, arrowColor, showArrow);
      } catch (err) {
        console.error('Error al generar PDF:', err);
        alert('Ocurrió un error al generar el archivo PDF.');
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  // Página activa
  const currentPage = layoutData.pages[currentPageIndex] || layoutData.pages[0];
  const cropLines = layoutData.getCropMarksForPage(currentPage ? currentPage.cards : []);

  const ppi = 3.7795275591;
  const stageWidthPx = layoutData.sheetWidth * ppi;
  const stageHeightPx = layoutData.sheetHeight * ppi;

  const arrowLabelMap = {
    up: 'Arriba ↑',
    down: 'Abajo ↓',
    left: 'Izquierda ←',
    right: 'Derecha →'
  };

  // Estado para la pantalla de bienvenida inicial
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return !localStorage.getItem('welcome_seen');
    } catch {
      return true;
    }
  });

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem('welcome_seen', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Theme accentColor="blue" grayColor="slate" radius="large">
      {/* ── Modal de Bienvenida a Pantalla Completa ── */}
      {showWelcome && (
        <div className="welcome-overlay">
          <div className="welcome-card">
            <div className="welcome-icon-badge">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.4383 11.6622L12.2483 20.8522C11.1225 21.9781 9.59552 22.6106 8.00334 22.6106C6.41115 22.6106 4.88418 21.9781 3.75834 20.8522C2.63249 19.7264 2 18.1994 2 16.6072C2 15.015 2.63249 13.4881 3.75834 12.3622L12.9483 3.17222C13.6989 2.42166 14.7169 2 15.7783 2C16.8398 2 17.8578 2.42166 18.6083 3.17222C19.3589 3.92279 19.7806 4.94077 19.7806 6.00222C19.7806 7.06368 19.3589 8.08166 18.6083 8.83222L9.40834 18.0222C9.03306 18.3975 8.52406 18.6083 7.99334 18.6083C7.46261 18.6083 6.95362 18.3975 6.57834 18.0222C6.20306 17.6469 5.99222 17.138 5.99222 16.6072C5.99222 16.0765 6.20306 15.5675 6.57834 15.1922L15.0683 6.71222" />
              </svg>
            </div>

            <Heading size="6" weight="bold" align="center" style={{ color: '#002f44', marginBottom: '8px' }}>
              Diagramador de Impresión
            </Heading>
            
            <Text size="2" color="gray" align="center" style={{ maxWidth: '440px', marginBottom: '24px', lineHeight: '1.5' }}>
              Maqueta, numera y genera pliegos de impresión en PDF listos para corte.
            </Text>

            <div className="welcome-features">
              <div className="wf-item">
                <div className="wf-num">1</div>
                <div className="wf-text">
                  <strong>Numeración y Secuencias</strong>
                  <span>Generación automática de correlativos con prefijo y formato de dígitos.</span>
                </div>
              </div>

              <div className="wf-item">
                <div className="wf-num">2</div>
                <div className="wf-text">
                  <strong>Diagramación de Pliegos</strong>
                  <span>Imposición precisa de lienzos, sangrías y márgenes en formato Carta o A4.</span>
                </div>
              </div>

              <div className="wf-item">
                <div className="wf-num">3</div>
                <div className="wf-text">
                  <strong>Exportación PDF Vectorial</strong>
                  <span>Archivo de alta definición listo para imprenta con marcas de corte hairline.</span>
                </div>
              </div>
            </div>

            <Button
              size="3"
              variant="solid"
              color="blue"
              onClick={handleDismissWelcome}
              style={{ width: '100%', marginTop: '24px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', height: '46px' }}
            >
              Comenzar →
            </Button>
          </div>
        </div>
      )}

      <div id="app">
        {/* Header principal */}
        <header className="app-header">
          <Flex align="center" gap="3">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.4383 11.6622L12.2483 20.8522C11.1225 21.9781 9.59552 22.6106 8.00334 22.6106C6.41115 22.6106 4.88418 21.9781 3.75834 20.8522C2.63249 19.7264 2 18.1994 2 16.6072C2 15.015 2.63249 13.4881 3.75834 12.3622L12.9483 3.17222C13.6989 2.42166 14.7169 2 15.7783 2C16.8398 2 17.8578 2.42166 18.6083 3.17222C19.3589 3.92279 19.7806 4.94077 19.7806 6.00222C19.7806 7.06368 19.3589 8.08166 18.6083 8.83222L9.40834 18.0222C9.03306 18.3975 8.52406 18.6083 7.99334 18.6083C7.46261 18.6083 6.95362 18.3975 6.57834 18.0222C6.20306 17.6469 5.99222 17.138 5.99222 16.6072C5.99222 16.0765 6.20306 15.5675 6.57834 15.1922L15.0683 6.71222" />
              </svg>
            </div>
            <Flex direction="column">
              <Heading size="4" weight="bold" style={{ color: '#002f44' }}>
                Diagramador de Impresión
              </Heading>
              <Text size="1" color="gray">
                Maquetado y numeración de lotes para corte en PDF
              </Text>
            </Flex>
          </Flex>

          <Flex align="center" gap="3">
            <Button
              size="3"
              variant="solid"
              disabled={isExporting}
              onClick={handleExportPdf}
              style={{ cursor: 'pointer', fontWeight: 'bold' }}
            >
              <DownloadIcon width={18} height={18} />
              {isExporting ? 'Generando PDF...' : 'Exportar PDF listo para corte'}
            </Button>
          </Flex>
        </header>

        {/* Cuerpo de la aplicación */}
        <div className="app-body">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-scroll">
              
              {/* Paso 1: Secuencia */}
              <div className={`step-card ${openSteps[1] ? 'active' : ''}`}>
                <div className="step-header" onClick={() => toggleStep(1)}>
                  <div className="step-header-left">
                    <span className="step-number">1</span>
                    <h2 className="step-title">
                      <FontFamilyIcon width={16} height={16} style={{ color: 'var(--accent-9)' }} />
                      Secuencia de Etiquetas
                    </h2>
                  </div>
                  <div className="step-header-right">
                    {!openSteps[1] && (
                      <span className="step-badge-summary">
                        {prefix}{startNum} a {prefix}{endNum}
                      </span>
                    )}
                    <ChevronDownIcon className="step-chevron" width={18} height={18} />
                  </div>
                </div>

                {openSteps[1] && (
                  <div className="step-body">
                    <Grid columns="2" gap="3" mb="3">
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Prefijo
                        </Text>
                        <TextField.Root
                          size="2"
                          value={prefix}
                          maxLength={10}
                          onChange={(e) => setPrefix(e.target.value)}
                          placeholder="Ej: E, A, LOT"
                        />
                      </Box>
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Formato ceros
                        </Text>
                        <Select.Root value={padZeros} onValueChange={setPadZeros}>
                          <Select.Trigger size="2" style={{ width: '100%' }} />
                          <Select.Content position="popper">
                            <Select.Item value="none">Sin ceros (1, 2)</Select.Item>
                            <Select.Item value="2">2 dígitos (01, 02)</Select.Item>
                            <Select.Item value="3">3 dígitos (001, 002)</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </Box>
                    </Grid>

                    <Grid columns="2" gap="3">
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Empieza en
                        </Text>
                        <TextField.Root
                          size="2"
                          type="number"
                          value={startNum}
                          min="0"
                          onChange={(e) => setStartNum(e.target.value)}
                        />
                      </Box>
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Termina en
                        </Text>
                        <TextField.Root
                          size="2"
                          type="number"
                          value={endNum}
                          min="1"
                          onChange={(e) => setEndNum(e.target.value)}
                        />
                      </Box>
                    </Grid>
                  </div>
                )}
              </div>

              {/* Paso 2: Lienzo Individual */}
              <div className={`step-card ${openSteps[2] ? 'active' : ''}`}>
                <div className="step-header" onClick={() => toggleStep(2)}>
                  <div className="step-header-left">
                    <span className="step-number">2</span>
                    <h2 className="step-title">
                      <SizeIcon width={16} height={16} style={{ color: 'var(--accent-9)' }} />
                      Tamaño de la Tarjeta
                    </h2>
                  </div>
                  <div className="step-header-right">
                    {!openSteps[2] && (
                      <span className="step-badge-summary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {isDimensionsLocked && <LockClosedIcon width={10} height={10} style={{ color: 'var(--accent-9)' }} />}
                        {cardWidthInput} × {cardHeightInput} {unitMode}
                      </span>
                    )}
                    <ChevronDownIcon className="step-chevron" width={18} height={18} />
                  </div>
                </div>

                {openSteps[2] && (
                  <div className="step-body">
                    <Flex align="center" justify="between" mb="3">
                      <Flex align="center" gap="2">
                        <Text size="1" weight="bold" color="gray">Unidad</Text>
                        <Select.Root value={unitMode} onValueChange={handleUnitModeChange}>
                          <Select.Trigger size="1" style={{ fontWeight: 'bold' }} />
                          <Select.Content position="popper">
                            <Select.Item value="mm">mm</Select.Item>
                            <Select.Item value="cm">cm</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </Flex>

                      <Button
                        size="1"
                        variant={isDimensionsLocked ? 'solid' : 'soft'}
                        color={isDimensionsLocked ? 'blue' : 'gray'}
                        onClick={toggleLockDimensions}
                        title={isDimensionsLocked ? 'Medida fijada como predeterminada' : 'Bloquear para que no se borre al recargar la página'}
                        style={{ cursor: 'pointer', gap: '4px', fontWeight: '500' }}
                      >
                        {isDimensionsLocked ? <LockClosedIcon width={12} height={12} /> : <LockOpen1Icon width={12} height={12} />}
                        {isDimensionsLocked ? 'Fijada' : 'Bloquear'}
                      </Button>
                    </Flex>

                    <Grid columns="2" gap="3">
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Ancho ({unitMode})
                        </Text>
                        <TextField.Root
                          size="2"
                          type="number"
                          value={cardWidthInput}
                          min="0.1"
                          step="any"
                          onChange={(e) => setCardWidthInput(e.target.value)}
                        />
                      </Box>
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Alto ({unitMode})
                        </Text>
                        <TextField.Root
                          size="2"
                          type="number"
                          value={cardHeightInput}
                          min="0.1"
                          step="any"
                          onChange={(e) => setCardHeightInput(e.target.value)}
                        />
                      </Box>
                    </Grid>
                  </div>
                )}
              </div>

              {/* Paso 3: Dirección de Flecha */}
              <div className={`step-card ${openSteps[3] ? 'active' : ''}`}>
                <div className="step-header" onClick={() => toggleStep(3)}>
                  <div className="step-header-left">
                    <span className="step-number">3</span>
                    <h2 className="step-title">
                      <ArrowDownIcon width={16} height={16} style={{ color: 'var(--accent-9)' }} />
                      Flecha de Orientación
                    </h2>
                  </div>
                  <div className="step-header-right">
                    {!openSteps[3] && (
                      <span className="step-badge-summary">
                        {showArrow ? arrowLabelMap[arrowDirection] : 'Sin flechas'}
                      </span>
                    )}
                    <ChevronDownIcon className="step-chevron" width={18} height={18} />
                  </div>
                </div>

                {openSteps[3] && (
                  <div className="step-body">
                    {/* Activar / Desactivar flechas */}
                    <Flex align="center" gap="3" mb={showArrow ? "3" : "0"}>
                      <Switch checked={showArrow} onCheckedChange={setShowArrow} />
                      <Text size="2" weight="bold" style={{ color: '#002f44' }}>
                        Incluir flechas de orientación
                      </Text>
                    </Flex>

                    {showArrow && (
                      <>
                        {/* Dirección */}
                        <Grid columns="4" gap="2">
                          <Button
                            size="2"
                            variant={arrowDirection === 'up' ? 'solid' : 'soft'}
                            color={arrowDirection === 'up' ? 'blue' : 'gray'}
                            onClick={() => setArrowDirection('up')}
                            style={{ cursor: 'pointer', flexDirection: 'column', height: '56px', gap: '4px' }}
                          >
                            <ArrowUpIcon width={18} height={18} />
                            <Text size="1">Arriba</Text>
                          </Button>
                          <Button
                            size="2"
                            variant={arrowDirection === 'down' ? 'solid' : 'soft'}
                            color={arrowDirection === 'down' ? 'blue' : 'gray'}
                            onClick={() => setArrowDirection('down')}
                            style={{ cursor: 'pointer', flexDirection: 'column', height: '56px', gap: '4px' }}
                          >
                            <ArrowDownIcon width={18} height={18} />
                            <Text size="1">Abajo</Text>
                          </Button>
                          <Button
                            size="2"
                            variant={arrowDirection === 'left' ? 'solid' : 'soft'}
                            color={arrowDirection === 'left' ? 'blue' : 'gray'}
                            onClick={() => setArrowDirection('left')}
                            style={{ cursor: 'pointer', flexDirection: 'column', height: '56px', gap: '4px' }}
                          >
                            <ArrowLeftIcon width={18} height={18} />
                            <Text size="1">Izquierda</Text>
                          </Button>
                          <Button
                            size="2"
                            variant={arrowDirection === 'right' ? 'solid' : 'soft'}
                            color={arrowDirection === 'right' ? 'blue' : 'gray'}
                            onClick={() => setArrowDirection('right')}
                            style={{ cursor: 'pointer', flexDirection: 'column', height: '56px', gap: '4px' }}
                          >
                            <ArrowRightIcon width={18} height={18} />
                            <Text size="1">Derecha</Text>
                          </Button>
                        </Grid>

                        {/* Color de Flecha */}
                        <div className="color-picker-section">
                          <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Color de Flecha
                          </Text>
                          <div className="color-swatches">
                            {[
                              { color: '#0090ff', label: 'Azul' },
                              { color: '#e30915', label: 'Rojo' },
                              { color: '#16a34a', label: 'Verde' },
                              { color: '#f59e0b', label: 'Amarillo' },
                              { color: '#7c3aed', label: 'Morado' },
                              { color: '#ea580c', label: 'Naranja' },
                              { color: '#db2777', label: 'Rosa' },
                              { color: '#0f172a', label: 'Negro' },
                            ].map(({ color, label }) => (
                              <button
                                key={color}
                                className={`color-swatch ${arrowColor === color ? 'selected' : ''}`}
                                style={{ '--swatch-color': color }}
                                title={label}
                                onClick={() => setArrowColor(color)}
                                aria-label={`Color de flecha: ${label}`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Paso 4: Hoja e Imposición */}
              <div className={`step-card ${openSteps[4] ? 'active' : ''}`}>
                <div className="step-header" onClick={() => toggleStep(4)}>
                  <div className="step-header-left">
                    <span className="step-number">4</span>
                    <h2 className="step-title">
                      <FileTextIcon width={16} height={16} style={{ color: 'var(--accent-9)' }} />
                      Papel e Imposición
                    </h2>
                  </div>
                  <div className="step-header-right">
                    {!openSteps[4] && (
                      <span className="step-badge-summary">
                        {paperSize === 'letter' ? 'Carta' : 'A4'} • {gutterSizeInput}{unitMode}
                      </span>
                    )}
                    <ChevronDownIcon className="step-chevron" width={18} height={18} />
                  </div>
                </div>

                {openSteps[4] && (
                  <div className="step-body">
                    <Grid columns="2" gap="3" mb="3">
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Tamaño papel
                        </Text>
                        <Select.Root value={paperSize} onValueChange={setPaperSize}>
                          <Select.Trigger size="2" style={{ width: '100%' }} />
                          <Select.Content position="popper">
                            <Select.Item value="letter">Carta (215.9 × 279.4 mm)</Select.Item>
                            <Select.Item value="a4">A4 (210 × 297 mm)</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </Box>
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Orientación
                        </Text>
                        <Select.Root value={paperOrientation} onValueChange={setPaperOrientation}>
                          <Select.Trigger size="2" style={{ width: '100%' }} />
                          <Select.Content position="popper">
                            <Select.Item value="portrait">Vertical</Select.Item>
                            <Select.Item value="landscape">Horizontal</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </Box>
                    </Grid>

                    <Grid columns="2" gap="3" mb="3">
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Espaciado ({unitMode})
                        </Text>
                        <TextField.Root
                          size="2"
                          type="number"
                          value={gutterSizeInput}
                          min="0"
                          step="any"
                          onChange={(e) => setGutterSizeInput(e.target.value)}
                        />
                      </Box>
                      <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Text size="1" weight="bold" color="gray" mb="1" as="div" style={{ whiteSpace: 'nowrap', minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                          Margen ({unitMode})
                        </Text>
                        <TextField.Root
                          size="2"
                          type="number"
                          value={pageMarginInput}
                          min="0"
                          step="any"
                          onChange={(e) => setPageMarginInput(e.target.value)}
                        />
                      </Box>
                    </Grid>

                    <Flex direction="column" gap="3" mt="2">
                      <Flex align="center" gap="3">
                        <Switch checked={showCropMarks} onCheckedChange={setShowCropMarks} />
                        <Text size="2" weight="bold" style={{ color: '#002f44' }}>
                          Marcas de corte para guillotina
                        </Text>
                      </Flex>

                      <Flex align="center" gap="3">
                        <Switch checked={showCardOutline} onCheckedChange={setShowCardOutline} />
                        <Text size="2" weight="bold" style={{ color: '#002f44' }}>
                          Mostrar borde de cada tarjeta
                        </Text>
                      </Flex>
                    </Flex>
                  </div>
                )}
              </div>

              {/* Footer Créditos */}
              <div className="sidebar-footer-credit" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                <Text size="1" color="gray" style={{ fontSize: '0.72rem', letterSpacing: '0.02em' }}>
                  Diseñado y desarrollado por <strong style={{ color: '#002f44', fontWeight: 600 }}>Wilmer Andrade</strong>
                </Text>
              </div>

            </div>{/* /sidebar-scroll */}

          </aside>


          {/* Previsualización */}
          <main className="preview-area">

            {/* Viewport Stage — ocupa todo el espacio disponible */}
            <div className="viewport-container" ref={viewportRef}>


              <div
                className="paper-stage"
                style={{
                  width: `${stageWidthPx}px`,
                  height: `${stageHeightPx}px`,
                  transform: `scale(${zoomScale})`
                }}
              >
                <svg
                  width={stageWidthPx}
                  height={stageHeightPx}
                  viewBox={`0 0 ${layoutData.sheetWidth} ${layoutData.sheetHeight}`}
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ backgroundColor: '#ffffff', display: 'block' }}
                >
                  <rect width={layoutData.sheetWidth} height={layoutData.sheetHeight} fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5"/>

                  {/* Tarjetas de la página activa */}
                  <g id="cards-group">
                    {currentPage && currentPage.cards.map(card => (
                      <g key={card.index} transform={`translate(${card.x}, ${card.y})`}>
                        {showCardOutline && (
                          <rect
                            width={card.width}
                            height={card.height}
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="0.25"
                            strokeDasharray="1.5 1.5"
                          />
                        )}
                        <g dangerouslySetInnerHTML={{
                          __html: generateCardSvgContent(card.labelText, card.width, card.height, arrowDirection, layoutData.maxLabelText, arrowColor, showArrow)
                        }} />
                      </g>
                    ))}
                  </g>

                  {/* Marcas de corte */}
                  <g id="crop-marks-group">
                    {cropLines.map((line, idx) => (
                      <line
                        key={idx}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="#000000"
                        strokeWidth="0.25"
                        strokeLinecap="square"
                      />
                    ))}
                  </g>
                </svg>
              </div>
            </div>{/* /viewport-container */}

            {/* ── Toolbar inferior fija — paginación + zoom ── */}
            <div className="toolbar">
              <Flex align="center" gap="3">
                <Button
                  size="2"
                  variant="outline"
                  color="gray"
                  disabled={currentPageIndex === 0}
                  onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                  title="Página Anterior"
                  style={{ cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeftIcon width={16} height={16} />
                </Button>
                <Badge variant="soft" color="slate" radius="full" size="2">
                  Página <strong style={{ color: '#002f44', marginLeft: '4px', marginRight: '4px' }}>{currentPageIndex + 1}</strong> de <strong style={{ color: '#002f44', marginLeft: '4px' }}>{layoutData.totalPages}</strong>
                </Badge>
                <Button
                  size="2"
                  variant="outline"
                  color="gray"
                  disabled={currentPageIndex >= layoutData.totalPages - 1}
                  onClick={() => setCurrentPageIndex(prev => Math.min(layoutData.totalPages - 1, prev + 1))}
                  title="Página Siguiente"
                  style={{ cursor: currentPageIndex >= layoutData.totalPages - 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRightIcon width={16} height={16} />
                </Button>
              </Flex>

              <Flex align="center" gap="2">
                <Button
                  size="2"
                  variant="outline"
                  color="gray"
                  onClick={() => setZoomScale(prev => Math.max(0.2, prev - 0.15))}
                  title="Reducir Zoom"
                  style={{ cursor: 'pointer' }}
                >
                  <ZoomOutIcon width={16} height={16} />
                </Button>
                <Badge variant="soft" color="blue" radius="medium" size="2" style={{ fontWeight: 'bold' }}>
                  {Math.round(zoomScale * 100)}%
                </Badge>
                <Button
                  size="2"
                  variant="outline"
                  color="gray"
                  onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.15))}
                  title="Aumentar Zoom"
                  style={{ cursor: 'pointer' }}
                >
                  <ZoomInIcon width={16} height={16} />
                </Button>
                <Button size="1" variant="soft" color="gray" onClick={handleFitToScreen} style={{ cursor: 'pointer' }}>
                  Ajustar
                </Button>
              </Flex>
            </div>{/* /toolbar */}

            {/* ── Métricas flotantes — fuera del scroll, ancladas al preview-area ── */}
            <div className="metrics-float-card">
              <div className="mfc-item">
                <span className="mfc-value">{layoutData.cardsPerPage}</span>
                <span className="mfc-label">por hoja</span>
              </div>
              <div className="mfc-sep" />
              <div className="mfc-item">
                <span className="mfc-value">{layoutData.totalPages}</span>
                <span className="mfc-label">hojas</span>
              </div>
              <div className="mfc-sep" />
              <div className="mfc-item">
                <span className="mfc-value">{layoutData.rows}×{layoutData.cols}</span>
                <span className="mfc-label">cuadrícula</span>
              </div>
              <div className="mfc-sep" />
              <div className="mfc-item">
                <span className="mfc-value mfc-accent">{layoutData.efficiency}%</span>
                <span className="mfc-label">uso</span>
              </div>
            </div>

          </main>
        </div>
      </div>
    </Theme>
  );
}
