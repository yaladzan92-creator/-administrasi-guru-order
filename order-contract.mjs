export const SINGLE = 'ADM-SINGLE';
export const CLASS = 'ADM-SD-CLASS';
export const MULTI = 'ADM-SUBJECT-MULTI';

export function readProducts(products) {
  const ranges = { SD: [1, 6], SMP: [7, 9], SMA: [10, 12] };
  if (!Array.isArray(products)) throw new Error('Katalog tidak valid.');
  return products.flatMap(({ level, grade, subject, academic_year }) => {
    if (!Object.hasOwn(ranges, level)) return [];
    const [min, max] = ranges[level];
    const year = /^([0-9]{4})\/([0-9]{4})$/.exec(academic_year);
    if (!Number.isInteger(grade) || grade < min || grade > max ||
        typeof subject !== 'string' || !subject.trim() || !year || +year[2] !== +year[1] + 1) {
      throw new Error('Katalog tidak valid.');
    }
    return [{ level, grade, subject, academic_year }];
  });
}

export function classSubjects(grade) {
  const subjects = ['Bahasa Indonesia', 'Matematika', 'Pendidikan Pancasila'];
  if (grade >= 3) subjects.push('IPAS');
  return subjects;
}

export function validateProduct(products, data) {
  const { package_code, level, grade, grades, subject, academic_year } = data;
  const exists = (g, s) => products.some(row =>
    row.level === level && row.grade === g && row.subject === s && row.academic_year === academic_year);
  const base = { package_code, level, academic_year };
  if (package_code === SINGLE && exists(grade, subject)) return { ...base, grade, subject };
  if (package_code === CLASS && level === 'SD' && classSubjects(grade).every(s => exists(grade, s))) {
    return { ...base, grade };
  }
  if (package_code === MULTI && Array.isArray(grades) && grades.length >= 2 &&
      new Set(grades).size === grades.length && grades.every(g => exists(g, subject))) {
    return { ...base, subject, grades: [...grades].sort((a, b) => a - b) };
  }
  throw new Error('Pilihan produk tidak tersedia dalam katalog.');
}

export function normalizeBuyerEmail(data) {
  const email = String(data.buyer_email ?? data.email ?? data.customer_email ?? '').trim();
  if (email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Masukkan email pemesan yang valid.');
  }
  return { ...data, buyer_email: email, email, customer_email: email };
}
