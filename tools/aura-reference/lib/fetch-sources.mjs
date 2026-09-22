import { gunzipSync } from 'node:zlib';

/**
 * Minimal reader for the ustar archives npm publishes. Only what a package
 * tarball actually contains: regular files and directories, short names, no
 * sparse entries. Anything else throws — a generator that trusts this data to
 * state Aura's defaults must not read a corrupt archive as an empty one.
 */
export function readTar(buffer) {
  const files = new Map();
  const decoder = new TextDecoder();
  const BLOCK = 512;

  const readString = (offset, length) => {
    const raw = buffer.subarray(offset, offset + length);
    const end = raw.indexOf(0);
    return decoder.decode(end === -1 ? raw : raw.subarray(0, end));
  };

  for (let offset = 0; offset + BLOCK <= buffer.length; ) {
    const header = buffer.subarray(offset, offset + BLOCK);
    const name = readString(offset, 100);
    if (name === '') {
      // End-of-archive is a zero-filled block. A header that merely starts with
      // a NUL is a corrupt entry, not the end of the data.
      if (header.some((byte) => byte !== 0)) throw new Error('Corrupt tar header: expected end-of-archive padding');
      break;
    }

    verifyChecksum(header, name);

    const sizeField = readString(offset + 124, 12).trim();
    const size = sizeField === '' ? 0 : parseInt(sizeField, 8);
    if (!Number.isSafeInteger(size) || size < 0 || !/^[0-7]*$/.test(sizeField)) {
      throw new Error(`Corrupt tar size field '${sizeField}' for ${name}`);
    }

    const typeFlag = readString(offset + 156, 1);
    const prefix = readString(offset + 345, 155);
    const path = prefix ? `${prefix}/${name}` : name;

    offset += BLOCK;
    if (offset + size > buffer.length) {
      throw new Error(`Truncated tar: ${path} declares ${size} bytes but the archive ends sooner`);
    }

    if (typeFlag === '0' || typeFlag === '') {
      files.set(path, buffer.subarray(offset, offset + size));
    } else if (typeFlag !== '5') {
      throw new Error(`Unsupported tar entry type '${typeFlag}' for ${path}`);
    }
    offset += Math.ceil(size / BLOCK) * BLOCK;
  }

  return files;
}

/** The ustar header checksum: every other malformed field shows up here first. */
function verifyChecksum(header, name) {
  const field = new TextDecoder().decode(header.subarray(148, 156)).replace(/\0.*$/, '').trim();
  if (!/^[0-7]+$/.test(field)) throw new Error(`Corrupt tar checksum field '${field}' for ${name}`);
  const declared = parseInt(field, 8);
  let signed = 0;
  let unsigned = 0;
  for (let i = 0; i < 512; i++) {
    const byte = i >= 148 && i < 156 ? 32 : header[i];
    unsigned += byte;
    signed += byte > 127 ? byte - 256 : byte;
  }
  if (declared !== unsigned && declared !== signed) {
    throw new Error(`Corrupt tar header for ${name}: checksum ${declared} does not match ${unsigned}`);
  }
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  return response;
}

/**
 * Downloads @vaadin/aura at the pinned version and returns its `src/*.css`
 * files, keyed by their path relative to the package root.
 */
export async function fetchAuraStylesheets(version) {
  const url = `https://registry.npmjs.org/@vaadin/aura/-/aura-${version}.tgz`;
  const response = await download(url);
  const tarball = gunzipSync(Buffer.from(await response.arrayBuffer()));
  const entries = readTar(tarball);

  const stylesheets = new Map();
  const decoder = new TextDecoder();
  for (const [path, contents] of entries) {
    if (!path.startsWith('package/') || !path.endsWith('.css')) continue;
    stylesheets.set(path.slice('package/'.length), decoder.decode(contents));
  }

  if (!stylesheets.has('aura.css')) {
    throw new Error(`${url} does not contain aura.css`);
  }
  return { url, stylesheets };
}

/**
 * Resolves a vaadin/docs branch to the commit it currently points at, so the
 * artifact records exactly which revision the classification came from.
 */
export async function resolveDocsCommit(ref) {
  const url = `https://api.github.com/repos/vaadin/docs/commits/${encodeURIComponent(ref)}`;
  const response = await download(url);
  const { sha } = await response.json();
  if (typeof sha !== 'string') throw new Error(`No commit sha in response from ${url}`);
  return sha;
}

/** Downloads the Aura reference pages from vaadin/docs at a fixed commit. */
export async function fetchAuraDocs(commit, pages) {
  const documents = new Map();
  for (const page of pages) {
    const url = `https://raw.githubusercontent.com/vaadin/docs/${commit}/articles/styling/themes/aura/${page}.adoc`;
    documents.set(page, await (await download(url)).text());
  }
  return documents;
}
