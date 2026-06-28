const form = document.querySelector('#forecastForm');
const statusEl = document.querySelector('#status');
const currentValueEl = document.querySelector('#currentValue');
const sourceMetricEl = document.querySelector('#sourceMetric');
const confidenceMetricEl = document.querySelector('#confidenceMetric');
const updatedMetricEl = document.querySelector('#updatedMetric');
const locationLabelEl = document.querySelector('#locationLabel');
const meshLabelEl = document.querySelector('#meshLabel');
const todayListEl = document.querySelector('#todayList');
const hourlyListEl = document.querySelector('#hourlyList');
const dailyListEl = document.querySelector('#dailyList');
const weeklyListEl = document.querySelector('#weeklyList');
const twoWeekListEl = document.querySelector('#twoWeekList');
const hourlyToggle = document.querySelector('#hourlyToggle');
const locationButton = document.querySelector('#locationButton');
const themeButton = document.querySelector('#themeButton');
const globePanel = document.querySelector('#globePanel');
const globeToggle = document.querySelector('#globeToggle');
const globeFrame = document.querySelector('#globeFrame');

let forecast = null;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadForecast();
});

hourlyToggle.addEventListener('click', () => {
  const expanded = hourlyListEl.hidden;
  hourlyListEl.hidden = !expanded;
  hourlyToggle.setAttribute('aria-expanded', String(expanded));
  hourlyToggle.textContent = expanded ? 'Hide hourly' : 'Show hourly';
});

globeToggle.addEventListener('click', () => {
  const collapsed = globePanel.classList.toggle('collapsed');
  globeToggle.setAttribute('aria-expanded', String(!collapsed));
  globeToggle.setAttribute('aria-label', collapsed ? 'Show globe' : 'Hide globe');
  globeToggle.textContent = collapsed ? '⌄' : '⌃';
});

themeButton.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
});

locationButton.addEventListener('click', useCurrentLocation);

setTheme(localStorage.getItem('weathermesh-theme') ?? 'light');
loadForecast();
useCurrentLocation({ silent: true });

async function useCurrentLocation(options = {}) {
  if (!navigator.geolocation) {
    if (!options.silent) statusEl.textContent = 'Current location is not available in this browser.';
    return;
  }

  if (!options.silent) statusEl.textContent = 'Finding your location...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      form.elements.lat.value = latitude.toFixed(4);
      form.elements.lon.value = longitude.toFixed(4);
      form.elements.country.value = inferCountry(latitude, longitude);
      loadForecast();
    },
    () => {
      if (!options.silent) statusEl.textContent = 'Location permission was not granted.';
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
  );
}

async function loadForecast() {
  const params = new URLSearchParams(new FormData(form));
  params.set('limit', '240');
  statusEl.textContent = 'Building forecast consensus...';
  clearForecast();
  updateGlobeFrame();

  if (window.WEATHERMESH_STATIC_PREVIEW) {
    forecast = buildStaticPreviewForecast(params);
    render();
    statusEl.textContent = 'Static preview mode. Run the Node server for live WeatherMesh forecasts.';
    return;
  }

  try {
    const response = await fetch(`/api/forecast?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Forecast request failed with ${response.status}`);
    }
    forecast = await response.json();
    render();
  } catch (error) {
    forecast = buildStaticPreviewForecast(params);
    render();
    statusEl.textContent = `Static preview mode. Live WeatherMesh forecasts need the Node server. (${error.message})`;
  }
}

function render() {
  if (!forecast) return;

  const label = `${forecast.location.latitude}, ${forecast.location.longitude} (${forecast.location.countryCode})`;
  locationLabelEl.textContent = label;
  meshLabelEl.textContent = label;
  updatedMetricEl.textContent = `Updated ${formatTime(forecast.generatedAt)}`;

  const current = forecast.views?.hourly?.find((row) => row.variable === 'temperature' && row.aggregateValue !== null);
  if (current) {
    currentValueEl.textContent = `${Math.round(current.aggregateValue)}°C`;
    sourceMetricEl.textContent = `Sources ${current.sourceCount}`;
    confidenceMetricEl.textContent = `Confidence ${Math.round(current.confidence)}%`;
  } else {
    currentValueEl.textContent = '--';
    sourceMetricEl.textContent = 'Sources --';
    confidenceMetricEl.textContent = 'Confidence --';
  }

  const daily = forecast.views?.daily ?? [];
  const weekly = forecast.views?.weekly ?? [];
  const twoWeek = forecast.views?.fourteenDay ?? [];
  const hourly = (forecast.views?.hourly ?? []).filter((row) => row.variable === 'temperature');

  renderCards(todayListEl, daily.slice(0, 1), dailyCard);
  renderCards(dailyListEl, daily.slice(0, 7), dailyCard);
  renderCards(weeklyListEl, weekly, periodCard);
  renderCards(twoWeekListEl, twoWeek.slice(0, 14), dailyCard);
  renderCards(hourlyListEl, hourly.slice(0, 24), hourlyCard);

  statusEl.textContent = '';
}

function clearForecast() {
  for (const element of [todayListEl, hourlyListEl, dailyListEl, weeklyListEl, twoWeekListEl]) {
    element.replaceChildren();
  }
}

function renderCards(container, rows, renderer) {
  container.replaceChildren();
  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'forecast-card muted-card';
    empty.textContent = 'No forecast data available.';
    container.append(empty);
    return;
  }
  for (const row of rows) container.append(renderer(row));
}

function dailyCard(row) {
  const temp = row.variables?.temperature;
  const precip = row.variables?.precipitation_probability;
  const card = document.createElement('article');
  card.className = 'forecast-card';
  card.innerHTML = `
    <div class="card-date">${escapeHtml(formatForecastTime(row.validTime))}</div>
    <div class="card-temp">${formatRange(temp)}</div>
    <div class="card-meta">${Math.round(row.confidence ?? temp?.confidence ?? 0)}% confidence</div>
    <div class="card-meta">${precip?.average === undefined ? 'Precip --' : `Precip ${Math.round(precip.average)}%`}</div>
    <div class="card-meta">Sources ${row.sourceCount ?? temp?.sourceCount ?? '--'}</div>
  `;
  return card;
}

function periodCard(row) {
  const card = dailyCard(row);
  card.classList.add('wide-card');
  return card;
}

function hourlyCard(row) {
  const card = document.createElement('article');
  card.className = 'forecast-card hourly-card';
  card.innerHTML = `
    <div class="card-date">${escapeHtml(formatForecastTime(row.validTime))}</div>
    <div class="card-temp">${Math.round(row.aggregateValue)}°C</div>
    <div class="card-meta">${Math.round(row.confidence)}% confidence</div>
    <div class="card-meta">${row.spread ?? 0}° spread</div>
    <details>
      <summary>Sources</summary>
      ${sourceTableHtml(row.sources ?? [])}
    </details>
  `;
  return card;
}

function sourceTableHtml(sources) {
  if (sources.length === 0) return '<p class="card-meta">No source detail.</p>';
  return `
    <table class="source-table">
      <thead><tr><th>Source</th><th>Value</th><th>Delta</th></tr></thead>
      <tbody>
        ${sources.map((source) => {
          const delta = source.deltaFromAggregate >= 0 ? `+${source.deltaFromAggregate}` : source.deltaFromAggregate;
          return `<tr><td>${escapeHtml(source.sourceId)}</td><td>${source.value} ${escapeHtml(source.unit)}</td><td>${delta}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

function updateGlobeFrame() {
  const lat = form.elements.lat.value;
  const lon = form.elements.lon.value;
  const globeUrl = new URL('globe.html', window.location.href);
  globeUrl.searchParams.set('embed', '1');
  globeUrl.searchParams.set('lat', lat);
  globeUrl.searchParams.set('lon', lon);
  globeFrame.src = globeUrl.toString();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('weathermesh-theme', theme);
  const isDark = theme === 'dark';
  themeButton.textContent = isDark ? 'Light' : 'Dark';
  themeButton.setAttribute('aria-pressed', String(isDark));
}

function formatRange(temp) {
  if (!temp || temp.min === null || temp.max === null) return '--';
  return `${Math.round(temp.min)}° / ${Math.round(temp.max)}°C`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatForecastTime(value) {
  if (value.startsWith('Week ')) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function inferCountry(latitude, longitude) {
  if (latitude >= 41 && latitude <= 84 && longitude >= -142 && longitude <= -52) return 'CA';
  if (latitude >= 18 && latitude <= 72 && longitude >= -172 && longitude <= -66) return 'US';
  return form.elements.country.value || 'US';
}

function buildStaticPreviewForecast(params) {
  const latitude = Number(params.get('lat') ?? form.elements.lat.value).toFixed(4);
  const longitude = Number(params.get('lon') ?? form.elements.lon.value).toFixed(4);
  const countryCode = String(params.get('country') ?? form.elements.country.value ?? 'US').toUpperCase();
  const generatedAt = new Date();
  generatedAt.setMinutes(0, 0, 0);

  const hourly = Array.from({ length: 48 }, (_, index) => {
    const validAt = new Date(generatedAt.getTime() + index * 60 * 60 * 1000);
    const value = 17 + Math.sin((index - 5) / 4) * 5 + Math.sin(index / 11) * 2;
    return {
      validTime: validAt.toISOString(),
      variable: 'temperature',
      unit: 'celsius',
      aggregateValue: Number(value.toFixed(1)),
      spread: Number((2.3 + (index % 5) * 0.4).toFixed(1)),
      confidence: 78,
      sourceCount: 5,
      sources: [
        sourceSample('open-meteo-best-match', value - 0.7, value),
        sourceSample('open-meteo-gfs', value + 0.8, value),
        sourceSample('open-meteo-ecmwf', value - 1.1, value),
        sourceSample('open-meteo-nbm', value + 0.3, value),
        sourceSample('noaa-nws-gridpoints', value + 0.6, value),
      ],
    };
  });

  const daily = Array.from({ length: 14 }, (_, index) => {
    const validAt = new Date(generatedAt.getTime() + index * 24 * 60 * 60 * 1000);
    const average = 16 + Math.sin(index / 2.8) * 6;
    return {
      validTime: validAt.toISOString().slice(0, 10),
      confidence: 76,
      sourceCount: 5,
      variables: {
        temperature: {
          min: Number((average - 5.2).toFixed(1)),
          max: Number((average + 4.8).toFixed(1)),
          confidence: 76,
          sourceCount: 5,
        },
        precipitation_probability: {
          average: Math.max(8, Math.min(78, Math.round(28 + Math.sin(index / 1.7) * 22))),
        },
      },
    };
  });

  return {
    location: { latitude, longitude, countryCode },
    generatedAt: generatedAt.toISOString(),
    views: {
      hourly,
      daily,
      weekly: [
        mergePreviewPeriod('Week 1', daily.slice(0, 7)),
        mergePreviewPeriod('Week 2', daily.slice(7, 14)),
      ],
      fourteenDay: daily,
    },
  };
}

function sourceSample(sourceId, sourceValue, aggregateValue) {
  const roundedSource = Number(sourceValue.toFixed(1));
  return {
    sourceId,
    value: roundedSource,
    unit: 'celsius',
    deltaFromAggregate: Number((roundedSource - aggregateValue).toFixed(1)),
  };
}

function mergePreviewPeriod(label, rows) {
  const mins = rows.map((row) => row.variables.temperature.min);
  const maxes = rows.map((row) => row.variables.temperature.max);
  return {
    validTime: label,
    confidence: 74,
    sourceCount: 5,
    variables: {
      temperature: {
        min: Math.min(...mins),
        max: Math.max(...maxes),
        confidence: 74,
        sourceCount: 5,
      },
      precipitation_probability: {
        average: Math.round(rows.reduce((sum, row) => sum + row.variables.precipitation_probability.average, 0) / rows.length),
      },
    },
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
