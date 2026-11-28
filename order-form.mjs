import { CLASS, MULTI, classSubjects, normalizeBuyerEmail, readProducts, validateProduct } from './order-contract.mjs';

const endpoint = 'https://mirsmzdkyeoudywujypy.supabase.co/functions/v1/submit-order';
const byId = id => document.getElementById(id);
const form = byId('orderForm');
const sections = [...form.querySelectorAll('section')];
const [year, level, subject, grade, grades, next, back, submit, status, coverage, catalogStatus, reload] =
  ['academic_year','level','subject','grade','gradeList','next','back','submitButton','summary',
    'coverage','catalogStatus','reloadCatalog'].map(byId);
const code = () => form.elements.package_code.value;
let products = [];
let step = 0;
let sending = false;
let locked = false;

function message(text, kind = 'error') {
  status.textContent = text;
  status.className = text ? 'status show ' + kind : 'status';
  if (text) status.focus();
}

function options(select, values) {
  const previous = select.value;
  select.replaceChildren(new Option('Pilih', ''), ...values.map(value => new Option(value, value)));
  if (values.map(String).includes(previous)) select.value = previous;
  else if (values.length === 1) select.value = values[0];
}

function productData() {
  return {
    package_code: code(), academic_year: year.value, level: level.value,
    subject: subject.value, grade: Number(grade.value),
    grades: [...grades.querySelectorAll('input:checked')].map(input => Number(input.value)),
  };
}

function drawProducts() {
  const selected = productData();
  const yearRows = products.filter(row => row.academic_year === year.value);
  const multi = code() === MULTI;
  const isClass = code() === CLASS;
  const unique = values => [...new Set(values)].sort();
  const candidates = yearRows.filter(row => {
    if (isClass) return row.level === 'SD' && classSubjects(row.grade).every(s =>
      yearRows.some(item => item.level === 'SD' && item.grade === row.grade && item.subject === s));
    if (multi) return new Set(yearRows.filter(item => item.level === row.level && item.subject === row.subject)
      .map(item => item.grade)).size >= 2;
    return true;
  });
  options(level, unique(candidates.map(row => row.level)));
  const levelRows = candidates.filter(row => row.level === level.value);
  options(subject, unique(levelRows.map(row => row.subject)));
  const classOptions = unique(levelRows.filter(row => isClass || row.subject === subject.value).map(row => row.grade))
    .sort((a, b) => a - b);
  options(grade, classOptions);
  byId('subjectField').hidden = subject.disabled = isClass;
  byId('gradeField').hidden = grade.disabled = multi;
  grades.hidden = grades.disabled = !multi;
  grades.firstElementChild.nextElementSibling.replaceChildren(...classOptions.map(value => {
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = selected.grades.includes(value);
    label.append(input, ' Kelas ' + value);
    return label;
  }));
  coverage.textContent = isClass
    ? (grade.value ? classSubjects(Number(grade.value)).join(', ') + '. ' : '') +
      'Paket standar tidak mencakup PAI, PJOK, Bahasa Inggris, atau Seni.'
    : multi ? 'Pilih satu mata pelajaran dan minimal dua kelas yang tersedia.' : 'Satu jenjang, satu kelas, satu mata pelajaran.';
  if (!candidates.length) coverage.textContent += ' Produk untuk pilihan ini belum tersedia.';
}

async function loadCatalog() {
  products = [];
  byId('productFields').disabled = next.disabled = submit.disabled = true;
  reload.hidden = true;
  catalogStatus.textContent = 'Memuat katalog produk…';
  try {
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error();
    products = readProducts((await response.json()).products);
    if (!products.length) throw new Error();
    options(year, [...new Set(products.map(row => row.academic_year))].sort().reverse());
    drawProducts();
    byId('productFields').disabled = next.disabled = submit.disabled = false;
    catalogStatus.textContent = '';
  } catch {
    products = [];
    catalogStatus.textContent = 'Katalog produk belum dapat dimuat. Periksa koneksi, lalu muat ulang katalog.';
    reload.hidden = false;
  }
}

function identity() {
  const data = Object.fromEntries(new FormData(form));
  for (const key of ['token', 'accuracy', 'package_code', 'academic_year']) delete data[key];
  return normalizeBuyerEmail(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim()])));
}

function updateReview() {
  const review = byId('review');
  const data = validateProduct(products, productData());
  const values = Object.fromEntries(new FormData(form));
  const chosen = form.querySelector('input[name=package_code]:checked').parentElement.textContent.trim();
  const classes = data.grades?.join(', ') ?? data.grade;
  const subjects = data.subject ?? classSubjects(data.grade).join(', ');
  const entries = [['Produk', [chosen, data.level, 'Kelas ' + classes, subjects, data.academic_year].join(' · ')]];
  for (const [name, value] of Object.entries(values)) {
    if (!value.trim() || ['token','accuracy','academic_year','package_code'].includes(name)) continue;
    entries.push([form.elements[name].labels[0].textContent.replace(/\s*\*$/, ''), value]);
  }
  review.replaceChildren(...entries.flatMap(([label, value]) => {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    return [term, description];
  }));
}

function showStep(index) {
  step = index;
  sections.forEach((section, i) => section.hidden = i !== index);
  form.querySelectorAll('.progress li').forEach((item, i) => {
    if (i === index) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  back.hidden = index === 0;
  next.hidden = index === sections.length - 1;
  submit.hidden = !next.hidden;
  if (index === 3) updateReview();
  message('');
  sections[index].querySelector('h2').focus();
}

function clearError(field) {
  field.removeAttribute('aria-invalid');
  const error = byId(field.id + '-error');
  if (error) {
    error.remove();
    const references = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== error.id);
    if (references.length) field.setAttribute('aria-describedby', references.join(' '));
    else field.removeAttribute('aria-describedby');
  }
}

function fieldError(field, text) {
  clearError(field);
  const error = document.createElement('span');
  error.className = 'field-error';
  error.id = field.id + '-error';
  error.textContent = text;
  field.closest('.field').append(error);
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
}

function validStep(index) {
  const fields = [...sections[index].querySelectorAll('input, select, textarea')].filter(field => field.willValidate);
  let firstInvalid;
  for (const field of fields) {
    clearError(field);
    const blank = field.required && field.type !== 'checkbox' && !field.value.trim();
    const tokenInvalid = field.id === 'token' && !/^AG-(?:[A-F0-9]{12}|[A-F0-9]{16}|[A-F0-9]{24})$/.test(field.value.trim().toUpperCase());
    if (!field.validity.valid || blank || tokenInvalid) {
      fieldError(field, blank ? 'Kolom ini wajib diisi.' : tokenInvalid ? 'Periksa format token pembelian.' : field.validationMessage);
      firstInvalid ??= field;
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return false;
  }
  if (index === 0) {
    try {
      validateProduct(products, productData());
    } catch (error) {
      message(error.message);
      return false;
    }
  }
  return true;
}

form.addEventListener('input', event => {
  if (event.target.id) clearError(event.target);
  if (step === 3 && !locked) updateReview();
});
byId('productFields').addEventListener('change', event => {
  if (event.target.closest('#gradeList')) return;
  if (event.target === year || event.target === level || event.target.name === 'package_code') subject.value = '';
  if (event.target !== grade) {
    grade.value = '';
    grades.querySelectorAll('input').forEach(input => input.checked = false);
  }
  drawProducts();
});
reload.addEventListener('click', loadCatalog);
next.addEventListener('click', () => { if (validStep(step)) showStep(step + 1); });
back.addEventListener('click', () => showStep(step - 1));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (step !== 3 || sending || locked || !products.length) return;
  for (const index of sections.keys()) {
    if (index !== step) showStep(index);
    if (!validStep(index)) return;
  }
  let form_data;
  try {
    form_data = { ...identity(), ...validateProduct(products, productData()) };
  } catch (error) {
    message(error.message);
    return;
  }
  const token = byId('token').value.trim().toUpperCase();
  sending = true;
  const controls = [...form.querySelectorAll('input, select, textarea, button')].filter(el => !el.disabled);
  controls.forEach(el => el.disabled = true);
  submit.textContent = 'Mengirim…';
  message('Sedang mengirim pesanan.', 'pending');
  try {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, form_data }), signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (response.ok && result.success === true && result.order_id) {
      locked = true;
      byId('token').value = '';
      message('Pesanan diterima. ID pesanan: ' + result.order_id, 'success');
    } else if (response.status >= 400 && response.status < 500 && response.status !== 409 &&
               response.status !== 408 && response.status !== 429) {
      message('Pesanan ditolak. Periksa token dan data pesanan, lalu coba lagi.');
    } else {
      throw new Error();
    }
  } catch {
    locked = true;
    message('Status pesanan belum dapat dikonfirmasi. Hubungi admin untuk memeriksa status sebelum mengirim ulang atau menggunakan token baru.');
  } finally {
    sending = false;
    if (!locked) controls.forEach(el => el.disabled = false);
    submit.textContent = 'Kirim Pesanan';
  }
});
form.querySelector('.progress li').setAttribute('aria-current', 'step');
loadCatalog();
