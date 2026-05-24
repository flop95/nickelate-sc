import { readFileSync } from 'node:fs';
import { analyzePressureMode, PRESSURE_MODE_IDS } from '../src/utils/pressureModes.js';

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
}

const dataset = readJson('src/data/nickelate_dataset.json');
const drawers = readJson('src/data/palace/palace_drawers.json');
const failures = readJson('src/data/palace/palace_failures.json');
const predictions = readJson('src/data/predictions.json');

const errors = [];

function fail(code, path, detail) {
  errors.push({ code, path, detail });
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function firstSourceUrl(...values) {
  for (const value of values) {
    if (isHttpUrl(value)) return value;
  }
  return null;
}

function normalizeDoi(value) {
  if (typeof value !== 'string') return null;
  let doi = value.trim();
  if (!doi) return null;
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  doi = doi.replace(/^doi:\s*/i, '');
  doi = decodeURIComponent(doi);
  return doi.toLowerCase().replace(/[.)\]]+$/g, '');
}

function doiFromUrl(value) {
  if (!isHttpUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const path = decodeURIComponent(url.pathname);

  if (host === 'doi.org' || host === 'dx.doi.org') {
    return normalizeDoi(path.replace(/^\//, ''));
  }

  if (host.endsWith('oup.com')) {
    const [, doiTail] = path.split('/doi/');
    if (doiTail) {
      const parts = doiTail.split('/').filter(Boolean);
      if (parts.length > 2 && /^\d+$/.test(parts[parts.length - 1])) parts.pop();
      return normalizeDoi(parts.join('/'));
    }
  }

  const doiPath = path.match(/\/doi\/(?:full\/|abs\/)?(10\.[^?#]+)/i);
  if (doiPath) return normalizeDoi(doiPath[1]);

  const apsPath = path.match(/\/(?:abstract|pdf)\/(10\.1103\/[^?#]+)/i);
  if (apsPath) return normalizeDoi(apsPath[1]);

  if (host.endsWith('nature.com')) {
    const article = path.match(/\/articles\/([^/?#]+)/i);
    if (article) return normalizeDoi(`10.1038/${article[1].replace(/\.pdf$/i, '')}`);
  }

  return null;
}

function validateUrl(path, value) {
  if (!isHttpUrl(value)) {
    fail('missing_source_url', path, 'expected an http(s) source URL');
  }
}

function validateDoiUrl(path, doi, url) {
  const normalizedDoi = normalizeDoi(doi);
  if (!normalizedDoi) return;

  if (!isHttpUrl(url)) {
    fail('missing_source_url', path, `source_doi ${doi} has no source_url`);
    return;
  }

  const urlDoi = doiFromUrl(url);
  if (!urlDoi) {
    fail('doi_mismatch', path, `source_url does not encode source_doi ${doi}: ${url}`);
    return;
  }

  if (urlDoi !== normalizedDoi) {
    fail('doi_mismatch', path, `source_doi ${doi} does not match source_url DOI ${urlDoi}`);
  }
}

const measurements = dataset.measurements || [];
const measurementById = new Map(measurements.map(m => [m.id, m]));
const drawerById = new Map(drawers.map(d => [d.id, d]));

for (const measurement of measurements) {
  const path = `src/data/nickelate_dataset.json:measurements[${measurement.id}]`;
  validateUrl(`${path}.source_url`, measurement.source_url);
  validateDoiUrl(path, measurement.source_doi, measurement.source_url);

  const pressure = analyzePressureMode(measurement);
  if (!pressure.mode || pressure.errors.length > 0) {
    fail('pressure_class_ambiguity', path, pressure.errors.join('; ') || 'no pressure mode resolved');
  }
}

for (const drawer of drawers) {
  const path = `src/data/palace/palace_drawers.json:drawers[${drawer.id}]`;
  const sourceUrl = firstSourceUrl(
    drawer.evidence?.source_url,
    drawer.properties?.source_url,
    drawer.source,
    drawer.properties?.source
  );
  validateUrl(`${path}.source_url`, sourceUrl);
  validateDoiUrl(path, drawer.evidence?.source_doi, sourceUrl);

  const pressure = analyzePressureMode(drawer);
  if (!pressure.mode || pressure.errors.length > 0) {
    fail('pressure_class_ambiguity', path, pressure.errors.join('; ') || 'no pressure mode resolved');
  }

  const measurement = measurementById.get(drawer.id);
  if (measurement) {
    const measurementPressure = analyzePressureMode(measurement);
    if (pressure.mode && measurementPressure.mode && pressure.mode !== measurementPressure.mode) {
      fail('pressure_class_ambiguity', path, `drawer mode ${pressure.mode} disagrees with measurement mode ${measurementPressure.mode}`);
    }
    const measurementDoi = normalizeDoi(measurement.source_doi);
    const drawerDoi = normalizeDoi(drawer.evidence?.source_doi);
    if (measurementDoi && drawerDoi && measurementDoi !== drawerDoi) {
      fail('doi_mismatch', path, `drawer DOI ${drawerDoi} disagrees with measurement DOI ${measurementDoi}`);
    }
  }
}

for (const failure of failures) {
  const path = `src/data/palace/palace_failures.json:failures[${failure.id}]`;
  const sourceUrl = firstSourceUrl(failure.source_url, failure.source);
  validateUrl(`${path}.source_url`, sourceUrl);
  if (failure.drawer_id != null && !drawerById.has(failure.drawer_id)) {
    fail('unsourced_prediction_input', `${path}.drawer_id`, `unknown drawer_id ${failure.drawer_id}`);
  }
}

for (const prediction of predictions) {
  const path = `src/data/predictions.json:${prediction.id}`;
  if (!Array.isArray(prediction.related_entry_ids) || prediction.related_entry_ids.length === 0) {
    fail('unsourced_prediction_input', `${path}.related_entry_ids`, 'prediction must point to source measurements');
  }

  if (!Array.isArray(prediction.input_sources) || prediction.input_sources.length === 0) {
    fail('unsourced_prediction_input', `${path}.input_sources`, 'prediction must list sourced input assumptions');
    continue;
  }

  prediction.input_sources.forEach((source, index) => {
    const inputPath = `${path}.input_sources[${index}]`;
    if (!source.label) {
      fail('unsourced_prediction_input', `${inputPath}.label`, 'missing input label');
    }

    const ids = asArray(source.related_entry_ids);
    const urls = asArray(source.source_urls);
    if (ids.length === 0 && urls.length === 0) {
      fail('unsourced_prediction_input', inputPath, 'input needs related_entry_ids or source_urls');
    }

    ids.forEach(id => {
      const measurement = measurementById.get(id);
      if (!measurement) {
        fail('unsourced_prediction_input', `${inputPath}.related_entry_ids`, `unknown measurement id ${id}`);
        return;
      }
      if (!isHttpUrl(measurement.source_url)) {
        fail('unsourced_prediction_input', `${inputPath}.related_entry_ids`, `measurement ${id} has no source_url`);
      }
    });

    urls.forEach((url, urlIndex) => {
      validateUrl(`${inputPath}.source_urls[${urlIndex}]`, url);
    });

    asArray(source.source_dois).forEach((doi, doiIndex) => {
      const url = urls[doiIndex] || urls[0];
      validateDoiUrl(`${inputPath}.source_dois[${doiIndex}]`, doi, url);
    });
  });
}

const unknownModes = PRESSURE_MODE_IDS.filter(mode => !['ambient', 'film_pressure', 'bulk_pressure'].includes(mode));
if (unknownModes.length > 0) {
  fail('pressure_class_ambiguity', 'src/utils/pressureModes.js', `unexpected pressure modes: ${unknownModes.join(', ')}`);
}

if (errors.length > 0) {
  console.error(`validate:data failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) {
    console.error(`- [${error.code}] ${error.path}: ${error.detail}`);
  }
  process.exit(1);
}

console.log(`validate:data passed (${measurements.length} measurements, ${drawers.length} drawers, ${predictions.length} predictions)`);
