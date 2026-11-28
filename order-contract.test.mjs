import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASS, SINGLE, MULTI, readProducts, validateProduct, normalizeBuyerEmail } from './order-contract.mjs';

const academic_year = '2026/2027';
const rows = (level, subject, grades) => grades.map(grade => ({ level, subject, grade, academic_year }));
const raw = [
  ...['Bahasa Indonesia', 'Matematika', 'Pendidikan Pancasila', 'IPAS'].flatMap(subject => rows('SD', subject, [4])),
  ...rows('SMP', 'PJOK', [7, 8, 9]), ...rows('SMA', 'Biologi', [11, 12]),
  { ...rows('SMK', 'Biologi', [11])[0], dockerPath: '/private', sha256: 'private' },
];
const catalog = readProducts(raw);
const validate = data => validateProduct(catalog, { academic_year, ...data });

test('satuan Matematika SD 4', () => {
  const data = { package_code: SINGLE, level: 'SD', grade: 4, subject: 'Matematika' };
  assert.deepEqual(validate(data), { ...data, academic_year });
});

test('paket kelas SD 4 membutuhkan seluruh mapel standar', () => {
  const data = { package_code: CLASS, level: 'SD', grade: 4, academic_year };
  assert.deepEqual(validate(data), data);
  assert.throws(() => validateProduct(catalog.filter(row => row.subject !== 'IPAS'), data));
});

test('paket PJOK SMP dan Biologi SMA', () => {
  for (const [level, subject, grades] of [['SMP', 'PJOK', [7, 8, 9]], ['SMA', 'Biologi', [11, 12]]]) {
    const data = { package_code: MULTI, level, subject, grades };
    assert.deepEqual(validate({ ...data, grades: [...grades].reverse() }), { ...data, academic_year });
  }
});

test('produk, tahun, jenjang dan kelas yang tidak tersedia, serta duplikat ditolak', () => {
  assert.throws(() => validate({ package_code: SINGLE, level: 'SD', subject: 'Seni', grade: 4 }));
  const data = { package_code: MULTI, level: 'SMP', subject: 'PJOK', grades: [7, 8, 9] };
  for (const changes of [{ level: 'SMA' }, { grades: [7, 7] }, { grades: [7] }, { academic_year: '2027/2028' }]) {
    assert.throws(() => validate({ ...data, ...changes }));
  }
});

test('manifest menolak data rusak, menyaring SMK dan membatasi properti', () => {
  assert.throws(() => readProducts(null));
  assert.throws(() => readProducts(rows('SD', 'PJOK', [7])));
  assert.deepEqual(readProducts([{ ...raw[0], dockerPath: '/private', sha256: 'private' }]), [raw[0]]);
  assert.ok(catalog.every(row => row.level !== 'SMK'));
  assert.throws(() => validateProduct([], { package_code: SINGLE, ...raw[0] }));
});

test('email lama dinormalisasi ke semua alias dengan identitas utuh', () => {
  const email = 'Guru@example.com';
  assert.deepEqual(normalizeBuyerEmail({ buyer_email: ' ' + email, school_name: 'SD X' }),
    { buyer_email: email, customer_email: email, email, school_name: 'SD X' });
  assert.equal(normalizeBuyerEmail({ customer_email: email }).buyer_email, email);
  assert.throws(() => normalizeBuyerEmail({ buyer_email: 'invalid' }));
});
