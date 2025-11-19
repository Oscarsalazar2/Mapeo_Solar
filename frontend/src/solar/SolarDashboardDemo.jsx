import React, { useEffect, useMemo, useRef, useState } from "react";

// CONSTANTES

const OBJETIVO_LUX = 20000;
const FILAS = 3, COLUMNAS = 3;
const INTERVALO_ACTUALIZACION = 1000;

// FUNCIONES DEL MAPA DEL CALOR !NO MOVER

const limitar = (valor, minimo, maximo) =>
  Math.max(minimo, Math.min(maximo, valor));

const formatearLux = (valorLux) =>
  valorLux >= 1000
    ? `${(valorLux / 1000).toFixed(1)}k lx`
    : `${Math.round(valorLux)} lx`;

const porcentajeDeObjetivo = (valorLux) =>
  `${((valorLux / OBJETIVO_LUX) * 100).toFixed(0)}% del objetivo`;

function colorMapaCalor(valor) {
  const v = limitar(valor, 0, 2);
  if (v <= 0.5) {
    const t = v / 0.5;
    return `rgb(255,${Math.round(255 * t)},0)`;
  }
  const t = (v - 0.5) / 1.5;
  return `rgb(${Math.round(255 * (1 - t))},${Math.round(255 - 85 * t)},0)`;
}
//QUITAR ESTO CUANDO YA EXISTA NUESTRA API
function luxAleatorio() {
  const base = 12000 + Math.random() * 16000;
  const pulso = 2000 * Math.sin(Date.now() / 3000);
  const ruido = (Math.random() - 0.5) * 1500;
  return limitar(base + pulso + ruido, 100, 45000);
}

function crearCuadricula() {
  const cuadricula = [];
  for (let fila = 0; fila < FILAS; fila++) {
    const filaActual = [];
    for (let columna = 0; columna < COLUMNAS; columna++) {
      filaActual.push({
        id: `${String.fromCharCode(65 + fila)}${columna + 1}`,
        lux: luxAleatorio(),
        ts: new Date(),
      });
    }
    cuadricula.push(filaActual);
  }
  return cuadricula;
}

//QUITAR HASTA AQUI NO MAS ABAJO

// HISTORIAL Y AGRUPAR 

function generarHistorial(dias = 45) {
  const salida = [];
  const ahora = Date.now();

  for (let d = dias - 1; d >= 0; d--) {
    const marcaTiempoDia = new Date(ahora - d * 86400000);
    const base =
      16000 + 6000 * Math.sin((Math.PI * 2 * (dias - d)) / dias);
    const ruido = (Math.random() - 0.5) * 3000;
    salida.push({
      ts: new Date(
        marcaTiempoDia.getFullYear(),
        marcaTiempoDia.getMonth(),
        marcaTiempoDia.getDate()
      ),
      avgLux: limitar(base + ruido, 3000, 42000),
    });
  }
  return salida;
}

function agruparHistorial(historial, rango) {
  const porClave = new Map();

  const formatearFecha = (fecha) => {
    const dt = new Date(fecha);

    if (rango === "day") {
      return dt.toISOString().slice(0, 10);
    }

    if (rango === "week") {
      const t = new Date(
        Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())
      );
      const diaSemana = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - diaSemana);
      const inicioAnio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      const semana = Math.ceil(((t - inicioAnio) / 86400000 + 1) / 7);
      return `${t.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
    }

    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  for (const elemento of historial) {
    const clave = formatearFecha(elemento.ts);
    if (!porClave.has(clave)) {
      porClave.set(clave, {
        key: clave,
        sum: 0,
        n: 0,
        max: 0,
        min: Infinity,
      });
    }
    const acumulado = porClave.get(clave);
    acumulado.sum += elemento.avgLux;
    acumulado.n++;
    acumulado.max = Math.max(acumulado.max, elemento.avgLux);
    acumulado.min = Math.min(acumulado.min, elemento.avgLux);
  }

  return Array.from(porClave.values())
    .map((x) => ({
      key: x.key,
      avg: x.sum / x.n,
      max: x.max,
      min: x.min,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// COMPONENTE PRINCIPAL

export default function SolarDashboardDemo() {
  const [pestana, setPestana] = useState("weather"); // Clima | Sensore | Reportes
  const [cuadricula, setCuadricula] = useState(crearCuadricula());
  const [enEjecucion, setEnEjecucion] = useState(true);
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [rangoReporte, setRangoReporte] = useState("day");
  const [historial] = useState(generarHistorial(45));
  const referenciaTemporizador = useRef(null);

  useEffect(() => {
    if (enEjecucion) {
      referenciaTemporizador.current = setInterval(() => {
        setCuadricula((anterior) =>
          anterior.map((fila) =>
            fila.map((celda) => ({
              ...celda,
              lux: luxAleatorio(),
              ts: new Date(),
            }))
          )
        );
      }, INTERVALO_ACTUALIZACION);
    }
    return () =>
      referenciaTemporizador.current &&
      clearInterval(referenciaTemporizador.current);
  }, [enEjecucion]);

  const celdasPlanas = useMemo(() => cuadricula.flat(), [cuadricula]);

  const estadisticas = useMemo(() => {
    const valoresLux = celdasPlanas.map((celda) => celda.lux);
    const promedio =
      valoresLux.reduce((ac, v) => ac + v, 0) / valoresLux.length;
    const minimo = Math.min(...valoresLux);
    const maximo = Math.max(...valoresLux);
    const porcentajeBajoObjetivo =
      (valoresLux.filter((v) => v < OBJETIVO_LUX).length /
        valoresLux.length) *
      100;

    return {
      promedio,
      min: minimo,
      max: maximo,
      porcentajeBajoObjetivo,
    };
  }, [celdasPlanas]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold">Mapeo Solar</h1>
          <button
            onClick={() => setEnEjecucion((valor) => !valor)}
            className={`px-3 py-1.5 rounded-xl text-sm border ${
              enEjecucion
                ? "border-emerald-400 text-emerald-300"
                : "border-slate-600 text-slate-300"
            } hover:bg-slate-900`}
          >
            {enEjecucion ? "En vivo" : "Pausado"}
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          <BotonPestana
            activo={pestana === "weather"}
            onClick={() => setPestana("weather")}
          >
            Clima
          </BotonPestana>
          <BotonPestana
            activo={pestana === "sensors"}
            onClick={() => setPestana("sensors")}
          >
            Sensores
          </BotonPestana>
          <BotonPestana
            activo={pestana === "reports"}
            onClick={() => setPestana("reports")}
          >
            Reportes
          </BotonPestana>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          {pestana === "weather" ? (
            <PanelClima />
          ) : pestana === "sensors" ? (
            <PanelSensores cuadricula={cuadricula} />
          ) : (
            <PanelReportes
              rango={rangoReporte}
              onCambioRango={setRangoReporte}
              onAbrirModal={() => setReporteAbierto(true)}
              historial={historial}
            />
          )}
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <IndicadorKPI
              etiqueta="Promedio"
              valor={formatearLux(estadisticas.promedio)}
              subtitulo={porcentajeDeObjetivo(estadisticas.promedio)}
            />
            <IndicadorKPI
              etiqueta="Máximo"
              valor={formatearLux(estadisticas.max)}
              subtitulo={porcentajeDeObjetivo(estadisticas.max)}
            />
            <IndicadorKPI
              etiqueta="Mínimo"
              valor={formatearLux(estadisticas.min)}
              subtitulo={porcentajeDeObjetivo(estadisticas.min)}
            />
            <IndicadorKPI
              etiqueta="Bajo objetivo"
              valor={`${estadisticas.porcentajeBajoObjetivo.toFixed(0)}%`}
              subtitulo="de celdas"
              advertencia={estadisticas.porcentajeBajoObjetivo > 0}
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold mb-2">Estado del sistema</h3>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>
                Simulación:{" "}
                <span
                  className={`font-medium ${
                    enEjecucion ? "text-emerald-300" : "text-slate-300"
                  }`}
                >
                  {enEjecucion ? "En vivo" : "Pausado"}
                </span>
              </li>
              <li>
                Grid: {FILAS} × {COLUMNAS} sensores
              </li>
              <li>
                Última actualización:{" "}
                {celdasPlanas[0]?.ts.toLocaleTimeString?.() || "--:--:--"}
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold mb-2">Alertas rápidas</h3>
            <p className="text-xs text-slate-300">
              Se activa si alguna celda cae &lt; 50% del objetivo.
            </p>
            <ListaAlertas cuadricula={cuadricula} />
          </div>

          {pestana === "weather" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold mb-3">
                Mini mapa de luz(sensores)
              </h3>
              <MapaCalorMini cuadricula={cuadricula} />
            </div>
          )}
        </aside>
      </main>

      {reporteAbierto && (
        <ModalReporte
          onCerrar={() => setReporteAbierto(false)}
          rango={rangoReporte}
          historial={historial}
        />
      )}

      <footer className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-400 flex flex-wrap items-center gap-2">
          <span>Sistemas Programables</span>
        </div>
      </footer>
    </div>
  );
}

// COMPONENTES AUXILIARES UI ============

function BotonPestana({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-xl border ${
        activo
          ? "border-emerald-400 text-emerald-200 bg-slate-900"
          : "border-slate-700 text-slate-300 hover:bg-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

// Panel de Sensores

function PanelSensores({ cuadricula }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Mapa de iluminación</h2>
        <div className="text-xs text-slate-400">
          Objetivo:{" "}
          <span className="text-slate-200 font-medium">
            {formatearLux(OBJETIVO_LUX)}
          </span>
        </div>
      </div>
      <MapaCalor cuadricula={cuadricula} />
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: colorMapaCalor(0.2) }}
        />{" "}
        Bajo
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: colorMapaCalor(0.6) }}
        />{" "}
        Medio
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: colorMapaCalor(1.1) }}
        />{" "}
        Óptimo
      </div>
    </>
  );
}

function MapaCalor({ cuadricula }) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${COLUMNAS}, minmax(0, 1fr))`,
      }}
    >
      {cuadricula.map((fila) =>
        fila.map((celda) => {
          const relacion = celda.lux / OBJETIVO_LUX;
          const fondo = colorMapaCalor(relacion);
          const fuerte = relacion >= 1;

          return (
            <div
              key={celda.id}
              className="relative aspect-square rounded-2xl shadow-lg ring-1 ring-black/10 overflow-hidden"
              title={`${celda.id} — ${formatearLux(celda.lux)} (${Math.round(
                relacion * 100
              )}% del objetivo)\n${celda.ts.toLocaleTimeString()}`}
              style={{ background: fondo }}
            >
              <div className="absolute inset-0 p-2 flex flex-col">
                <div className="text-xs font-semibold drop-shadow-sm opacity-90">
                  {celda.id}
                </div>
                <div className="mt-auto">
                  <div className="text-base sm:text-lg font-semibold drop-shadow">
                    {formatearLux(celda.lux)}
                  </div>
                  <div
                    className={`text-[11px] ${
                      fuerte ? "text-emerald-100" : "text-rose-50"
                    } opacity-90`}
                  >
                    {Math.round(relacion * 100)}% del objetivo
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MapaCalorMini({ cuadricula }) {
  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${COLUMNAS}, minmax(0, 1fr))`,
      }}
    >
      {cuadricula.map((fila) =>
        fila.map((celda) => {
          const relacion = celda.lux / OBJETIVO_LUX;
          const fondo = colorMapaCalor(relacion);
          return (
            <div
              key={celda.id}
              className="relative aspect-square rounded-lg ring-1 ring-black/10"
              style={{ background: fondo }}
            >
              <div className="absolute inset-0 p-1 flex flex-col">
                <div className="text-[10px] font-semibold opacity-90">
                  {celda.id}
                </div>
                <div className="mt-auto text-[10px] font-semibold">
                  {Math.round(celda.lux)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function IndicadorKPI({ etiqueta, valor, subtitulo, advertencia }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {etiqueta}
      </div>
      <div
        className={`mt-1 text-lg font-semibold ${
          advertencia ? "text-rose-300" : "text-slate-100"
        }`}
      >
        {valor}
      </div>
      {subtitulo && (
        <div className="text-[11px] text-slate-400">{subtitulo}</div>
      )}
    </div>
  );
}

function ListaAlertas({ cuadricula }) {
  const alertas = cuadricula
    .flat()
    .filter((celda) => celda.lux < OBJETIVO_LUX * 0.5);

  if (alertas.length === 0) {
    return (
      <div className="mt-2 text-xs text-emerald-300">Sin alertas</div>
    );
  }

  return (
    <ul className="mt-2 space-y-2">
      {alertas.slice(0, 5).map((celda) => (
        <li
          key={celda.id}
          className="text-xs bg-rose-900/30 border border-rose-800/50 rounded-xl px-3 py-2"
        >
          <span className="font-semibold">{celda.id}</span> bajo (
          {formatearLux(celda.lux)}) —{" "}
          {Math.round((celda.lux / OBJETIVO_LUX) * 100)}% del objetivo
        </li>
      ))}
      {alertas.length > 5 && (
        <li className="text-[11px] text-slate-400">
          +{alertas.length - 5} más…
        </li>
      )}
    </ul>
  );
}

// PANEL DE CLIMA

function PanelClima() {
  const [latitud, setLatitud] = useState(25.869),
    [longitud, setLongitud] = useState(-97.504);
  const [cargando, setCargando] = useState(false),
    [error, setError] = useState("");
  const [datos, setDatos] = useState(null);

  async function obtenerClima() {
    try {
      setCargando(true);
      setError("");
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&hourly=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,is_day&daily=sunrise,sunset,uv_index_max,precipitation_sum&timezone=America%2FMatamoros`;
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error("No se pudo obtener el clima");
      setDatos(await respuesta.json());
    } catch (e) {
      setError(e.message || "Error de red");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    obtenerClima();
  }, []);

  const ahora = new Date();
  const actual = datos?.current;
  const diario = datos?.daily;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Clima de hoy</h2>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={obtenerClima}
            className="px-3 py-1.5 rounded-xl text-sm border border-slate-700 hover:bg-slate-900"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm text-slate-300">
            Ahora — {ahora.toLocaleTimeString()}
          </div>
          {cargando && <div className="mt-2 text-sm">Cargando…</div>}
          {error && (
            <div className="mt-2 text-sm text-rose-300">{error}</div>
          )}
          {!cargando && !error && actual && (
            <div className="mt-2">
              <div className="text-4xl font-semibold">
                {Math.round(actual.temperature_2m)}°C
              </div>
              <div className="text-slate-300 text-sm">
                Sensación: {Math.round(actual.apparent_temperature)}°C ·
                Viento: {Math.round(actual.wind_speed_10m)} km/h
              </div>
              <div className="text-slate-300 text-sm">
                Humedad: {Math.round(actual.relative_humidity_2m)}%
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold mb-2">Hoy</div>
          {!cargando && !error && diario && (
            <ul className="text-sm text-slate-300 space-y-1">
              <li>
                Salida del sol:{" "}
                {new Date(diario.sunrise[0]).toLocaleTimeString()}
              </li>
              <li>
                Puesta del sol:{" "}
                {new Date(diario.sunset[0]).toLocaleTimeString()}
              </li>
              <li>UV máx: {diario.uv_index_max[0]}</li>
              <li>Precipitación (mm): {diario.precipitation_sum[0]}</li>
            </ul>
          )}
          {!diario && !cargando && (
            <div className="text-sm text-slate-400">Sin datos aún.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="text-sm font-semibold mb-2">
          Resumen intradía
        </div>
        {datos?.hourly ? (
          <ResumenPorHora porHora={datos.hourly} />
        ) : (
          <div className="text-sm text-slate-400">
            Sin datos por hora.
          </div>
        )}
      </div>
    </div>
  );
}

function ResumenPorHora({ porHora }) {
  const ahoraMs = Date.now();
  const elementos = porHora.time
    .map((t, indice) => ({
      t: new Date(t),
      temp: porHora.temperature_2m[indice],
      hum: porHora.relative_humidity_2m[indice],
      viento: porHora.wind_speed_10m[indice],
      lluvia: porHora.precipitation[indice],
      nubes: porHora.cloud_cover[indice],
    }))
    .filter((x) => x.t.getTime() >= ahoraMs)
    .slice(0, 6);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
      {elementos.map((elem, indice) => (
        <div
          key={indice}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300"
        >
          <div className="font-semibold text-slate-200">
            {elem.t.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div>Temp: {Math.round(elem.temp)}°C</div>
          <div>Hum: {Math.round(elem.hum)}%</div>
          <div>Viento: {Math.round(elem.viento)} km/h</div>
          <div>Lluvia: {elem.lluvia} mm</div>
          <div>Nubes: {elem.nubes}%</div>
        </div>
      ))}
    </div>
  );
}

// ================== PANEL DE REPORTES ==================

function PanelReportes({ rango, onCambioRango, onAbrirModal, historial }) {
  const filas = React.useMemo(
    () => agruparHistorial(historial, rango),
    [historial, rango]
  );
  const promedioGlobal = filas.length
    ? filas.reduce((ac, fila) => ac + fila.avg, 0) / filas.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Reportes</h2>
        <div className="flex items-center gap-2">
          <ChipRango
            etiqueta="Día"
            activo={rango === "day"}
            onClick={() => onCambioRango("day")}
          />
          <ChipRango
            etiqueta="Semana"
            activo={rango === "week"}
            onClick={() => onCambioRango("week")}
          />
          <ChipRango
            etiqueta="Mes"
            activo={rango === "month"}
            onClick={() => onCambioRango("month")}
          />
          <button
            onClick={onAbrirModal}
            className="ml-2 px-3 py-1.5 rounded-xl text-sm border border-emerald-400 text-emerald-300 hover:bg-slate-900"
          >
            Ver reporte
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="text-sm text-slate-300 mb-3">
          Vista rápida ({filas.length} periodos)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <IndicadorKPI
            etiqueta="Promedio"
            valor={formatearLux(promedioGlobal)}
          />
          <IndicadorKPI
            etiqueta="Máximo periodo"
            valor={formatearLux(
              Math.max(...filas.map((f) => f.max), 0)
            )}
          />
          <IndicadorKPI
            etiqueta="Mínimo periodo"
            valor={formatearLux(
              Math.min(...filas.map((f) => f.min), Infinity)
            )}
          />
          <IndicadorKPI
            etiqueta="Periodos"
            valor={filas.length}
          />
        </div>

        <div className="mt-4 flex items-end gap-1 h-28">
          {filas.map((fila) => {
            const altura = Math.max(
              4,
              Math.round((fila.avg / 40000) * 100)
            );
            return (
              <div
                key={fila.key}
                title={`${fila.key} — ${Math.round(
                  fila.avg
                )} lx`}
                className="bg-emerald-400/70 hover:bg-emerald-300 transition-all"
                style={{
                  height: altura + "%",
                  width: filas.length > 40 ? "4px" : "8px",
                }}
              />
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => downloadCSV(filas, `reporte_${rango}.csv`)}
            className="px-3 py-1.5 rounded-xl text-sm border border-slate-700 hover:bg-slate-900"
          >
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipRango({ etiqueta, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border ${
        activo
          ? "border-emerald-400 text-emerald-200 bg-slate-900"
          : "border-slate-700 text-slate-300 hover:bg-slate-900"
      }`}
    >
      {etiqueta}
    </button>
  );
}

function ModalReporte({ onCerrar, rango, historial }) {
  const filas = React.useMemo(
    () => agruparHistorial(historial, rango),
    [historial, rango]
  );

  const indicadores = React.useMemo(
    () =>
      !filas.length
        ? { avg: 0, min: 0, max: 0 }
        : {
            avg:
              filas.reduce((ac, fila) => ac + fila.avg, 0) /
              filas.length,
            min: Math.min(...filas.map((fila) => fila.min)),
            max: Math.max(...filas.map((fila) => fila.max)),
          },
    [filas]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Reporte por{" "}
            {rango === "day"
              ? "día"
              : rango === "week"
              ? "semana"
              : "mes"}
          </h3>
          <button
            onClick={onCerrar}
            className="text-slate-300 hover:text-white text-sm"
          >
            Cerrar
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <IndicadorKPI
              etiqueta="Promedio"
              valor={formatearLux(indicadores.avg)}
            />
            <IndicadorKPI
              etiqueta="Máximo"
              valor={formatearLux(indicadores.max)}
            />
            <IndicadorKPI
              etiqueta="Mínimo"
              valor={formatearLux(indicadores.min)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="py-2 pr-3">Periodo</th>
                  <th className="py-2 pr-3">Lux promedio</th>
                  <th className="py-2 pr-3">Lux máx</th>
                  <th className="py-2 pr-3">Lux mín</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr
                    key={fila.key}
                    className="border-t border-slate-800"
                  >
                    <td className="py-2 pr-3">{fila.key}</td>
                    <td className="py-2 pr-3">
                      {Math.round(fila.avg)}
                    </td>
                    <td className="py-2 pr-3">
                      {Math.round(fila.max)}
                    </td>
                    <td className="py-2 pr-3">
                      {Math.round(fila.min)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-2 flex gap-2">
            <button
              onClick={() =>
                downloadCSV(filas, `reporte_detallado_${rango}.csv`)
              }
              className="px-3 py-1.5 rounded-xl text-sm border border-slate-700 hover:bg-slate-800"
            >
              Descargar CSV
            </button>
            <button
              onClick={onCerrar}
              className="px-3 py-1.5 rounded-xl text-sm border border-slate-700 hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================== EXPORTS AUXILIARES ==================

export { agruparHistorial, generarHistorial };
