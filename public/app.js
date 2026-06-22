const form = document.querySelector('#forecastForm');
const statusEl = document.querySelector('#status');
const listEl = document.querySelector('#forecastList');
const currentValueEl = document.querySelector('#currentValue');
const sourceMetricEl = document.querySelector('#sourceMetric');
const confidenceMetricEl = document.querySelector('#confidenceMetric');
const updatedMetricEl = document.querySelector('#updatedMetric');
const locationLabelEl = document.querySelector('#locationLabel');
const tabs = [...document.querySelectorAll('.tab')];

let activeView = 'hourly';
let forecast = null;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadForecast();
});

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    activeView = tab.dataset.view;
    tabs.forEach((item) => item.classList.toggle('active', item === tab));
    render();
  });
}

loadForecast();

async function loadForecast() {
  const params = new URLSearchParams(new FormData(form));
  params.set('limit', '240');
  statusEl.textContent = 'Loading forecast...';
  listEl.replaceChildren();

  try {
    const response = await fetch(`/api/forecast?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Forecast request failed with ${response.status}`);
    }
    forecast = await response.json();
    render();
  } catch (error) {
    statusEl.textContent = error.message;
    currentValueEl.textContent = '--';
  }
}

function render() {
  if (!forecast) return;

  const rows = rowsForView(forecast, activeView);
  locationLabelEl.textContent = `${forecast.location.latitude}, ${forecast.location.longitude} (${forecast.location.countryCode})`;
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

  listEl.replaceChildren();
  if (rows.length === 0) {
    statusEl.textContent = 'No forecast rows available for this view.';
    return;
  }

  statusEl.textContent = '';
  for (const row of rows) {
    listEl.append(rowElement(row));
  }
}

function rowsForView(data, view) {
  if (view === 'hourly') {
    return (data.views?.hourly ?? [])
      .filter((row) => row.variable === 'temperature')
      .slice(0, 24);
  }
  if (view === 'daily') return data.views?.daily ?? [];
  if (view === 'weekly') return data.views?.weekly ?? [];
  return data.views?.fourteenDay ?? [];
}

function rowElement(row) {
  const article = document.createElement('article');
  article.className = 'row';

  const time = document.createElement('div');
  time.className = 'time';
  time.textContent = formatForecastTime(row.validTime);

  const value = document.createElement('div');
  value.className = 'value';
  value.textContent = formatPrimaryValue(row);

  const confidence = document.createElement('div');
  confidence.className = 'detail';
  confidence.textContent = `${Math.round(row.confidence)}% confidence`;

  const spread = document.createElement('div');
  spread.className = `detail spread ${row.spread >= 5 ? 'warn' : ''}`;
  spread.textContent = formatSpread(row);

  article.append(time, value, confidence, spread);

  if (row.sources?.length > 0) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Source comparison';
    details.append(summary, sourceTable(row.sources));
    article.append(details);
  }

  return article;
}

function formatPrimaryValue(row) {
  const summary = row.variables?.temperature;
  if (summary) {
    return `${Math.round(summary.min)}° / ${Math.round(summary.max)}°C`;
  }

  return `${Math.round(row.aggregateValue)}°C`;
}

function formatSpread(row) {
  const summary = row.variables?.temperature;
  if (summary) {
    return `${Math.round(summary.average)}°C avg`;
  }

  return `${row.spread ?? 0}° spread`;
}

function sourceTable(sources) {
  const table = document.createElement('table');
  table.className = 'source-table';
  table.innerHTML = '<thead><tr><th>Source</th><th>Value</th><th>Delta</th></tr></thead>';
  const body = document.createElement('tbody');

  for (const source of sources) {
    const row = document.createElement('tr');
    const delta = source.deltaFromAggregate >= 0 ? `+${source.deltaFromAggregate}` : source.deltaFromAggregate;
    row.innerHTML = `<td>${escapeHtml(source.sourceId)}</td><td>${source.value} ${escapeHtml(source.unit)}</td><td>${delta}</td>`;
    body.append(row);
  }

  table.append(body);
  return table;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
