import assert from 'node:assert/strict';
import test from 'node:test';

import { readTar } from './lib/fetch-sources.mjs';

/** Builds a single-entry ustar archive, optionally with a field corrupted. */
function tarEntry(name, contents, { size, checksum } = {}) {
  const payload = Buffer.from(contents);
  const header = Buffer.alloc(512);
  header.write(name, 0, 'ascii');
  header.write('000644 \0', 100, 'ascii');
  header.write((size ?? payload.length.toString(8)).padStart(11, '0') + ' ', 124, 'ascii');
  header.write('0', 156, 'ascii');
  header.write('ustar\0' + '00', 257, 'ascii');

  header.write(' '.repeat(8), 148, 'ascii');
  const sum = checksum ?? header.reduce((total, byte) => total + byte, 0);
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');

  const padding = Buffer.alloc((512 - (payload.length % 512)) % 512);
  return Buffer.concat([header, payload, padding, Buffer.alloc(1024)]);
}

test('a well-formed entry is read back verbatim', () => {
  const files = readTar(tarEntry('package/aura.css', ':root { --aura-base-size: 16; }'));
  assert.equal(new TextDecoder().decode(files.get('package/aura.css')), ':root { --aura-base-size: 16; }');
});

test('a corrupt size field fails loudly instead of reading an empty file', () => {
  assert.throws(
    () => readTar(tarEntry('package/aura.css', 'body {}', { size: 'xxxxxxxxxxx', checksum: undefined })),
    /Corrupt tar (header|size field)/,
  );
});

test('a truncated payload fails loudly instead of being silently short', () => {
  const archive = tarEntry('package/aura.css', 'body {}', { size: (8192).toString(8) });
  assert.throws(() => readTar(archive), /Corrupt tar header|Truncated tar/);
});

test('a header whose checksum does not match is rejected', () => {
  assert.throws(() => readTar(tarEntry('package/aura.css', 'body {}', { checksum: 1 })), /checksum/);
});

test('a header starting with NUL is not mistaken for end-of-archive', () => {
  const archive = tarEntry('package/aura.css', 'body {}');
  archive[0] = 0;
  assert.throws(() => readTar(archive), /Corrupt tar header/);
});

test('a checksum field with trailing garbage is rejected', () => {
  const archive = tarEntry('package/aura.css', 'body {}');
  archive.write('00123x\0 ', 148, 'ascii');
  assert.throws(() => readTar(archive), /Corrupt tar checksum field/);
});
