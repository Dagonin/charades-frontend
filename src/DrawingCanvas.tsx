import React, { useRef, useEffect, useState, useCallback } from 'react';
import './DrawingCanvas.css';

// --- 1. Konfiguracja ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 10; 
const SYNC_INTERVAL = 2000; 

const COLS = Math.floor(CANVAS_WIDTH / PIXEL_SIZE);
const ROWS = Math.floor(CANVAS_HEIGHT / PIXEL_SIZE);

type Tool = 'pen' | 'eraser';

interface PixelGroup {
  color: string;
  pixels: number[][]; 
}

// Mapa: "x,y" -> "kolor"
type PixelGrid = Map<string, string>;

// --- Algorytm Bresenhama ---
const getPointsOnLine = (x0: number, y0: number, x1: number, y1: number): number[][] => {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while(true) {
        points.push([x0, y0]);
        if ((x0 === x1) && (y0 === y1)) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return points;
};

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Stan całego obrazka (do wyświetlania)
  const [pixelGrid, setPixelGrid] = useState<PixelGrid>(new Map());
  
  // NOWOŚĆ: Stan tylko nowych zmian (do wysyłki)
  const [unsyncedGrid, setUnsyncedGrid] = useState<PixelGrid>(new Map());

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastGridPoint, setLastGridPoint] = useState<number[] | null>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');

  // --- Renderowanie (Bez zmian - renderuje zawsze pełny obraz) ---
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Siatka
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += PIXEL_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += PIXEL_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Piksele
    pixelGrid.forEach((color, key) => {
        const [gx, gy] = key.split(',').map(Number);
        ctx.fillStyle = color;
        ctx.fillRect(gx * PIXEL_SIZE, gy * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    });
  }, [pixelGrid]);

  useEffect(() => {
    renderCanvas();
  }, [pixelGrid, renderCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }
  }, []);

  // --- Logika Rysowania (Aktualizuje oba stany) ---
  const paintPixels = useCallback((targetX: number, targetY: number, prevX: number | null, prevY: number | null) => {
    
    // Obliczamy punkty do zmiany
    let pointsToDraw: number[][] = [];
    if (prevX !== null && prevY !== null) {
        pointsToDraw = getPointsOnLine(prevX, prevY, targetX, targetY);
    } else {
        pointsToDraw = [[targetX, targetY]];
    }

    // 1. Aktualizacja Głównego Obrazu (Wizualna)
    setPixelGrid(prevGrid => {
        const newGrid = new Map(prevGrid);
        
        pointsToDraw.forEach(([gx, gy]) => {
            if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
            const key = `${gx},${gy}`;
            
            if (currentTool === 'eraser') {
                newGrid.delete(key);
            } else {
                newGrid.set(key, currentColor);
            }
        });
        return newGrid;
    });

    // 2. Aktualizacja Bufora Zmian (Do wysyłki)
    setUnsyncedGrid(prevUnsynced => {
        const newUnsynced = new Map(prevUnsynced);

        pointsToDraw.forEach(([gx, gy]) => {
            if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
            const key = `${gx},${gy}`;

            if (currentTool === 'eraser') {
                // Jeśli zmazujemy, usuwamy z bufora zmian (jeśli tam był)
                // UWAGA: To nie wysyła komendy "skasuj stary pixel", tylko "nie wysyłaj tego nowego".
                // Aby obsługiwać kasowanie starych pixeli, protokół JSON musiałby wspierać kolor null.
                newUnsynced.delete(key);
            } else {
                // Dodajemy/Nadpisujemy pixel w buforze zmian
                newUnsynced.set(key, currentColor);
            }
        });
        return newUnsynced;
    });

  }, [currentTool, currentColor]);

  const getGridCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offsetX, offsetY } = e.nativeEvent;
      return [Math.floor(offsetX / PIXEL_SIZE), Math.floor(offsetY / PIXEL_SIZE)];
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const [gx, gy] = getGridCoordinates(e);
    paintPixels(gx, gy, null, null);
    setLastGridPoint([gx, gy]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastGridPoint) return;
    const [gx, gy] = getGridCoordinates(e);
    if (gx === lastGridPoint[0] && gy === lastGridPoint[1]) return;
    paintPixels(gx, gy, lastGridPoint[0], lastGridPoint[1]);
    setLastGridPoint([gx, gy]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastGridPoint(null);
  };

  const clearCanvas = () => {
    setPixelGrid(new Map());
    setUnsyncedGrid(new Map()); // Czyścimy też bufor zmian
  };

  // --- Funkcja formatująca dane do JSON ---
  const formatGridToJson = (gridToFormat: PixelGrid): PixelGroup[] => {
    const colorMap: Record<string, number[][]> = {};

    gridToFormat.forEach((color, key) => {
        const coords = key.split(',').map(Number);
        if (!colorMap[color]) {
            colorMap[color] = [];
        }
        colorMap[color].push(coords);
    });

    return Object.keys(colorMap).map(color => ({
        color: color,
        pixels: colorMap[color]
    }));
  };

  // --- Synchronizacja ---
  const syncDrawingData = useCallback(() => {
    // 1. Sprawdź czy są zmiany
    if (unsyncedGrid.size === 0) return;

    // 2. Przygotuj dane TYLKO z bufora zmian
    const dataToSend = formatGridToJson(unsyncedGrid);

    console.log("--- WYSYŁKA DELTA (Tylko nowe pixele) ---");
    console.log(`Liczba zmienionych pikseli: ${unsyncedGrid.size}`);
    console.log(JSON.stringify(dataToSend, null, 2));

    // 3. Wyczyść bufor zmian po wysłaniu
    setUnsyncedGrid(new Map());

  }, [unsyncedGrid]); // Zależy od stanu unsyncedGrid

  useEffect(() => {
    const intervalId = setInterval(syncDrawingData, SYNC_INTERVAL);
    return () => clearInterval(intervalId);
  }, [syncDrawingData]);

  return (
    <div className="drawing-container">
      <div className="toolbar">
        <button onClick={() => setCurrentTool('pen')} className={currentTool === 'pen' ? 'active' : ''}>✏️ Ołówek</button>
        <button onClick={() => setCurrentTool('eraser')} className={currentTool === 'eraser' ? 'active' : ''}>🧽 Gumka</button>
        <div className="color-picker-wrapper">
            <span>Kolor:</span>
            <input type="color" value={currentColor} onChange={(e) => { setCurrentColor(e.target.value); setCurrentTool('pen'); }}/>
        </div>
        <button onClick={clearCanvas}>🗑️ Wyczyść</button>
        <button onClick={syncDrawingData} style={{ backgroundColor: '#a0e0a0' }}>Wyślij zmiany teraz</button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onMouseMove={draw}
      />

      <div style={{ marginTop: '10px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'left' }}>
          <strong>Status:</strong> Siatka {COLS}x{ROWS}<br/>
          <strong>Pamięć (Total):</strong> {pixelGrid.size} pixeli<br/>
          <strong>Do wysłania (Delta):</strong> {unsyncedGrid.size} pixeli
      </div>
    </div>
  );
};

export default DrawingCanvas;