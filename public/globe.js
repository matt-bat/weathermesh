import * as THREE from 'https://esm.sh/three@0.166.1';

const mount = document.querySelector('#globeMount');
const statusEl = document.querySelector('#status');
const timeInput = document.querySelector('#timeInput');
const nowButton = document.querySelector('#nowButton');
const levelLabel = document.querySelector('#levelLabel');
const selectedLabel = document.querySelector('#selectedLabel');
const tempLabel = document.querySelector('#tempLabel');
const sampleLabel = document.querySelector('#sampleLabel');
const rangeLabel = document.querySelector('#rangeLabel');
const urlParams = new URLSearchParams(window.location.search);
const embedMode = urlParams.get('embed') === '1';
const centerLat = Number(urlParams.get('lat'));
const centerLon = Number(urlParams.get('lon'));

if (embedMode) {
  document.body.classList.add('embed');
}

const state = {
  level: 'country',
  areas: [],
  selected: null,
  rotation: { x: -0.32, y: -0.7 },
  targetRotation: { x: -0.32, y: -0.7 },
  distance: 3.05,
  dragging: false,
  pointer: { x: 0, y: 0 },
};

if (Number.isFinite(centerLat) && Number.isFinite(centerLon)) {
  state.rotation.x = clamp(centerLat * Math.PI / 360, -1.05, 1.05);
  state.rotation.y = -(centerLon + 90) * Math.PI / 180;
  state.targetRotation.x = state.rotation.x;
  state.targetRotation.y = state.rotation.y;
  state.distance = 2.28;
  state.level = 'region';
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050806);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, state.distance);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
mount.append(renderer.domElement);

const root = new THREE.Group();
scene.add(root);

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 96),
  new THREE.MeshStandardMaterial({
    color: 0x1d6f73,
    roughness: 0.82,
    metalness: 0.02,
  }),
);
root.add(globe);

const wire = new THREE.Mesh(
  new THREE.SphereGeometry(1.006, 48, 24),
  new THREE.MeshBasicMaterial({
    color: 0xb9fff4,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  }),
);
root.add(wire);

const markerGroup = new THREE.Group();
root.add(markerGroup);

scene.add(new THREE.AmbientLight(0xffffff, 0.82));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 2, 4);
scene.add(sun);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

timeInput.value = toDateTimeLocal(new Date());
timeInput.addEventListener('change', () => loadMapForecast());
nowButton.addEventListener('click', () => {
  timeInput.value = toDateTimeLocal(new Date());
  loadMapForecast();
});

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', () => {
  state.dragging = false;
});
renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
renderer.domElement.addEventListener('click', onClick);
window.addEventListener('resize', onResize);

loadMapForecast();
animate();

async function loadMapForecast() {
  statusEl.textContent = `Loading ${state.level} consensus...`;
  const params = new URLSearchParams({
    level: state.level,
    time: new Date(timeInput.value).toISOString(),
  });

  try {
    const response = await fetch(`/api/map-forecast?${params.toString()}`);
    if (!response.ok) throw new Error(`Map forecast failed with ${response.status}`);
    const payload = await response.json();
    state.areas = payload.areas;
    levelLabel.textContent = labelForLevel(payload.level);
    statusEl.textContent = `${payload.areas.length} ${payload.level} forecast meshes for ${formatTime(payload.selectedTime)}`;
    drawMarkers(payload.areas);
    updateSelection(null);
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

function drawMarkers(areas) {
  markerGroup.clear();

  for (const area of areas) {
    const position = latLonToVector(area.latitude, area.longitude, 1.028);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(markerSizeForLevel(area.level), 24, 16),
      new THREE.MeshBasicMaterial({
        color: colorForTemperature(area.averageTemperature),
        transparent: true,
        opacity: area.averageTemperature === null ? 0.42 : 0.92,
      }),
    );
    marker.position.copy(position);
    marker.userData.area = area;
    markerGroup.add(marker);
  }
}

function animate() {
  state.rotation.x += (state.targetRotation.x - state.rotation.x) * 0.12;
  state.rotation.y += (state.targetRotation.y - state.rotation.y) * 0.12;
  root.rotation.x = state.rotation.x;
  root.rotation.y = state.rotation.y;
  camera.position.z += (state.distance - camera.position.z) * 0.12;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onPointerDown(event) {
  state.dragging = true;
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
}

function onPointerMove(event) {
  if (!state.dragging) return;
  const dx = event.clientX - state.pointer.x;
  const dy = event.clientY - state.pointer.y;
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  state.targetRotation.y += dx * 0.006;
  state.targetRotation.x += dy * 0.004;
  state.targetRotation.x = clamp(state.targetRotation.x, -1.2, 1.2);
}

function onWheel(event) {
  event.preventDefault();
  state.distance = clamp(state.distance + event.deltaY * 0.0014, 1.65, 4.2);
  const nextLevel = levelForDistance(state.distance);
  if (nextLevel !== state.level) {
    state.level = nextLevel;
    loadMapForecast();
  }
}

function onClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markerGroup.children);
  updateSelection(hits[0]?.object?.userData?.area ?? null);
}

function updateSelection(area) {
  state.selected = area;
  selectedLabel.textContent = area?.label ?? 'None';
  tempLabel.textContent = area?.averageTemperature === null || !area
    ? '--'
    : `${Math.round(area.averageTemperature)}°C`;
  sampleLabel.textContent = area
    ? `${area.validSampleCount}/${area.sampleCount} ${formatSamplingMethod(area)}`
    : '--';
  rangeLabel.textContent = area?.temperatureMin === null || !area
    ? '--'
    : `${Math.round(area.temperatureMin)}° to ${Math.round(area.temperatureMax)}°`;
}

function formatSamplingMethod(area) {
  if (area.samplingMethod === 'natural_earth_admin0_110m') return 'Natural Earth';
  if (area.samplingMethod === 'polygon_weighted_grid') return `polygon grid (${area.polygonCount})`;
  if (area.samplingMethod === 'weighted_grid') return 'weighted grid';
  return 'point';
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function levelForDistance(distance) {
  if (distance > 3.1) return 'country';
  if (distance > 2.15) return 'region';
  return 'locality';
}

function labelForLevel(level) {
  if (level === 'country') return 'Country';
  if (level === 'region') return 'Region';
  return 'Locality';
}

function markerSizeForLevel(level) {
  if (level === 'country') return 0.035;
  if (level === 'region') return 0.028;
  return 0.022;
}

function latLonToVector(latitude, longitude, radius) {
  const phi = (90 - latitude) * Math.PI / 180;
  const theta = (longitude + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function colorForTemperature(value) {
  if (!Number.isFinite(value)) return 0x8b95a1;
  if (value <= -10) return 0x69a7ff;
  if (value <= 0) return 0x76d7ff;
  if (value <= 10) return 0x4fd1c5;
  if (value <= 20) return 0xf6d365;
  if (value <= 30) return 0xf59e42;
  return 0xef4444;
}

function toDateTimeLocal(date) {
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  const offset = rounded.getTimezoneOffset();
  const local = new Date(rounded.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
