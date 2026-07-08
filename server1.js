swagger





// Swagger Validation Module
const XSD_NS = 'http://www.w3.org/2001/XMLSchema';

function dov(e, id) { e.preventDefault(); document.getElementById(id).classList.add('drag'); }
function dlv(id) { document.getElementById(id).classList.remove('drag'); }
function dop(e, t) { e.preventDefault(); dlv(t + '-uz'); const f = e.dataTransfer?.files[0]; if (f) readSF(f, t); }
function fsel(inp, t) { if (inp.files[0]) readSF(inp.files[0], t); }

function readSF(f, t) {
  document.getElementById(t + '-fn').textContent = f.name;
  document.getElementById(t + '-fn').classList.add('on');
  const pf = document.getElementById(t + '-pf');
  pf.style.width = '0%';
  let p = 0;
  const iv = setInterval(() => { p += 14; pf.style.width = Math.min(p, 90) + '%'; if (p >= 90) clearInterval(iv); }, 55);
  const r = new FileReader();
  r.onload = e => {
    const ct = e.target.result;
    document.getElementById(t + '-ct').value = ct;
    if (t === 'xsd') ST.xsd = ct;
    else ST.yaml = ct;
    clearInterval(iv);
    pf.style.width = '100%';
    toast(f.name + ' loaded');
    setTimeout(() => pf.style.width = '0%', 700);
  };
  r.readAsText(f);
}

function swReset() {
  ['xsd', 'yaml'].forEach(t => {
    document.getElementById(t + '-ct').value = '';
    document.getElementById(t + '-fn').classList.remove('on');
    ST[t] = '';
    document.getElementById(t + '-pf').style.width = '0%';
  });
  document.getElementById('sw-report').innerHTML =
    `<div style="color:var(--t3);text-align:center;padding:32px;font-size:11.5px">
      <i class="fa-solid fa-file-shield" style="font-size:26px;display:block;margin-bottom:8px;opacity:.25"></i>
      Upload files and click Compare & Validate
    </div>`;
  document.getElementById('sw-out').innerHTML = '<span style="color:var(--t3)">Corrected YAML will appear here…</span>';
  document.getElementById('sw-sum').textContent = '';
  toast('Reset');
}

function parseXSD(xsd) {
  if (!xsd || !xsd.trim()) return [];
  let doc = null;
  try {
    doc = new DOMParser().parseFromString(xsd, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) doc = null;
  } catch (e) { doc = null; }

  if (doc) {
    const fields = [];
    const seen = new Set();
    const elements = doc.getElementsByTagNameNS(XSD_NS, 'element');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const name = el.getAttribute('name');
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const type = el.getAttribute('type') || 'xs:string';
      const min = el.hasAttribute('minOccurs') ? el.getAttribute('minOccurs') : '1';
      const maxRaw = el.hasAttribute('maxOccurs') ? el.getAttribute('maxOccurs') : '1';
      const max = maxRaw === 'unbounded' ? 'unbounded' : maxRaw;
      let description = '';
      const docEl = el.getElementsByTagNameNS(XSD_NS, 'documentation')[0];
      if (docEl) description = (docEl.textContent || '').trim();
      let length = '';
      const restr = el.getElementsByTagNameNS(XSD_NS, 'restriction')[0];
      if (restr) {
        const ml = restr.getElementsByTagNameNS(XSD_NS, 'maxLength')[0];
        if (ml) length = ml.getAttribute('value') || '';
      }
      fields.push({
        name,
        xsdType: type,
        oapiType: xsdToOapi(type),
        format: xsdFormat(type),
        required: min !== '0',
        minOccurs: min,
        maxOccurs: max,
        cardinality: `${min},${max}`,
        isArray: max === 'unbounded' || parseInt(max || '1', 10) > 1,
        description,
        length,
        direction: xsdDirectionOfNode(el)
      });
    }
    const attrs = doc.getElementsByTagNameNS(XSD_NS, 'attribute');
    for (let i = 0; i < attrs.length; i++) {
      const el = attrs[i];
      const name = el.getAttribute('name');
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const type = el.getAttribute('type') || 'xs:string';
      const use = el.getAttribute('use');
      const required = use === 'required';
      let length = '';
      const restr = el.getElementsByTagNameNS(XSD_NS, 'restriction')[0];
      if (restr) {
        const ml = restr.getElementsByTagNameNS(XSD_NS, 'maxLength')[0];
        if (ml) length = ml.getAttribute('value') || '';
      }
      fields.push({
        name,
        xsdType: type,
        oapiType: xsdToOapi(type),
        format: xsdFormat(type),
        required,
        minOccurs: required ? '1' : '0',
        maxOccurs: '1',
        cardinality: required ? '1,1' : '0,1',
        isArray: false,
        description: '',
        length,
        direction: xsdDirectionOfNode(el)
      });
    }
    if (fields.length) return fields;
  }
  return parseXSDTokenizer(xsd);
}

function parseXSDTokenizer(xsd) {
  const tagRe = /<(\/?)([\w.\-]+(?::[\w.\-]+)?)((?:\s+[\w.\-]+(?::[\w.\-]+)?\s*=\s*"[^"]*")*)\s*(\/?)\s*>/g;
  const localName = t => t.includes(':') ? t.split(':').pop() : t;
  
  function attrsToObj(s) {
    const o = {};
    const ar = /([\w.\-]+(?::[\w.\-]+)?)\s*=\s*"([^"]*)"/g;
    let am;
    while ((am = ar.exec(s)) !== null) o[am[1].includes(':') ? am[1].split(':').pop() : am[1]] = am[2];
    return o;
  }

  const fields = [];
  const seen = new Set();
  const stack = [];

  function dirFromStack() {
    for (let i = stack.length - 1; i >= 0; i--) {
      const nm = stack[i].attrs.name;
      if (nm) {
        if (/request|req\b|_req$|\btx\b/i.test(nm)) return 'TX';
        if (/response|resp\b|_resp$|\brx\b/i.test(nm)) return 'RX';
      }
    }
    return 'TX';
  }

  function emit(local, attrs, innerText) {
    const name = attrs.name;
    if (!name || seen.has(name)) return;
    if (local === 'attribute') {
      seen.add(name);
      const type = attrs.type || 'xs:string';
      const required = attrs.use === 'required';
      fields.push({
        name,
        xsdType: type,
        oapiType: xsdToOapi(type),
        format: xsdFormat(type),
        required,
        minOccurs: required ? '1' : '0',
        maxOccurs: '1',
        cardinality: required ? '1,1' : '0,1',
        isArray: false,
        description: '',
        length: attrs.maxLength || '',
        direction: dirFromStack()
      });
      return;
    }
    seen.add(name);
    const type = attrs.type || 'xs:string';
    const min = attrs.minOccurs !== undefined ? attrs.minOccurs : '1';
    const maxRaw = attrs.maxOccurs !== undefined ? attrs.maxOccurs : '1';
    const max = maxRaw === 'unbounded' ? 'unbounded' : maxRaw;
    const docMatch = innerText && ((innerText.match(/<[\w.\-]*:?documentation[^>]*>([\s\S]*?)<\/[\w.\-]*:?documentation>/) || [])[1]);
    const maxLen = innerText && (((innerText.match(/maxLength[^>]*value="([^"]+)"/) || [])[1]) || attrs.maxLength || '');
    fields.push({
      name,
      xsdType: type,
      oapiType: xsdToOapi(type),
      format: xsdFormat(type),
      required: min !== '0',
      minOccurs: min,
      maxOccurs: max,
      cardinality: `${min},${max}`,
      isArray: max === 'unbounded' || parseInt(max || '1', 10) > 1,
      description: docMatch ? docMatch.trim() : '',
      length: maxLen,
      direction: dirFromStack()
    });
  }

  function markNearestElementAncestor(stack) {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].local === 'element') { stack[i].hasElementChild = true; return; }
    }
  }

  let m;
  while ((m = tagRe.exec(xsd)) !== null) {
    const closing = m[1] === '/';
    const tagName = m[2];
    const local = localName(tagName);
    const selfClose = m[4] === '/';
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tagName) {
          const node = stack.splice(i)[0];
          if ((local === 'element' || local === 'attribute') && !node.hasElementChild) {
            emit(local, node.attrs, xsd.slice(node.contentStart, m.index));
          }
          break;
        }
      }
      continue;
    }
    const attrs = attrsToObj(m[3]);
    if (selfClose) {
      if (local === 'element' || local === 'attribute') emit(local, attrs, '');
      if (local === 'element') markNearestElementAncestor(stack);
      continue;
    }
    if (local === 'element') markNearestElementAncestor(stack);
    stack.push({ tagName, local, attrs, hasElementChild: false, contentStart: tagRe.lastIndex });
  }
  return fields;
}

function xsdToOapi(t) {
  if (!t) return 'string';
  if (/int|integer|long|short|byte/.test(t)) return 'integer';
  if (/decimal|float|double/.test(t)) return 'number';
  if (/boolean/.test(t)) return 'boolean';
  return 'string';
}

function xsdFormat(t) {
  if (/dateTime/.test(t)) return 'date-time';
  if (/date$/.test(t)) return 'date';
  if (/time$/.test(t)) return 'time';
  if (/email/.test(t)) return 'email';
  if (/uri|url/.test(t)) return 'uri';
  return null;
}

function xsdDirectionOfNode(el) {
  let node = el;
  while (node && node.getAttribute) {
    const name = node.getAttribute('name');
    if (name) {
      if (/request|req\b|_req$|\btx\b/i.test(name)) return 'TX';
      if (/response|resp\b|_resp$|\brx\b/i.test(name)) return 'RX';
    }
    node = node.parentElement;
  }
  return 'TX';
}

function parseYAML(raw) {
  if (!raw || !raw.trim()) return { fields: [], paths: [], fieldDirs: {}, spec: null, parseError: null };
  let spec = null,
    parseError = null;
  const trimmed = raw.trim();
  try {
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      spec = JSON.parse(raw);
    } else if (typeof jsyaml !== 'undefined') {
      spec = jsyaml.load(raw);
    } else {
      spec = JSON.parse(raw);
    }
  } catch (err) {
    parseError = err.message;
  }

  const fields = new Set();
  const fieldDirs = {};
  const paths = [];

  function mark(name, dir) {
    fields.add(name);
    const lc = name.toLowerCase();
    if (!fieldDirs[lc]) fieldDirs[lc] = dir;
    else if (fieldDirs[lc] !== dir) fieldDirs[lc] = 'BOTH';
  }

  function walk(node, dir) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, dir)); return; }
    Object.entries(node).forEach(([key, val]) => {
      let nextDir = dir;
      if (/^requestbody$/i.test(key)) nextDir = 'TX';
      else if (/^responses$/i.test(key)) nextDir = 'RX';
      if (key === 'properties' && val && typeof val === 'object') {
        Object.keys(val).forEach(fname => mark(fname, dir || 'TX'));
      }
      walk(val, nextDir);
    });
  }

  if (spec && !parseError) {
    if (spec.paths && typeof spec.paths === 'object') paths.push(...Object.keys(spec.paths));
    walk(spec, null);
  } else {
    // Fallback: parse YAML with regex
    const pr = /^\s{2,4}(\/[\w\/{}_\-.*]+):/gm;
    let m;
    while ((m = pr.exec(raw)) !== null) paths.push(m[1]);
    const pr2 = /^[ \t]*(["']?)([\w][\w_\-]*)\1\s*:\s*\n[ \t]+(?:type|\$ref)\s*:/gm;
    while ((m = pr2.exec(raw)) !== null) mark(m[2], 'TX');
  }

  return { fields: [...fields], paths: [...new Set(paths)], fieldDirs, spec, parseError };
}

async function runSw() {
  const xsdRaw = document.getElementById('xsd-ct').value.trim() || ST.xsd;
  const yamlRaw = document.getElementById('yaml-ct').value.trim() || ST.yaml;
  if (!xsdRaw && !yamlRaw) { toast('Upload or paste at least one file', 'warn'); return; }

  const btn = document.getElementById('sw-btn');
  btn.disabled = true;
  btn.innerHTML = `<div class="ld" style="color:#0d0720"><div class="ldd"></div><div class="ldd"></div><div class="ldd"></div></div>`;

  const steps = ['sw-s1', 'sw-s2', 'sw-s3', 'sw-s4'];
  steps.forEach((id, i) => setTimeout(() => {
    document.querySelectorAll('#psw .sb-it').forEach(e => e.classList.remove('on'));
    document.getElementById(id)?.classList.add('on');
  }, i * 580));
  await new Promise(r => setTimeout(r, 2500));

  const xsdFields = parseXSD(xsdRaw);
  ST.xsdFields = xsdFields;
  ST.xsdFieldMap = {};
  xsdFields.forEach(f => ST.xsdFieldMap[f.name] = f);
  ST.swFieldEdits = ST.swFieldEdits || {};

  const yamlData = parseYAML(yamlRaw);
  const issues = crossValidate(xsdFields, yamlData, xsdRaw, yamlRaw);
  renderReport(issues);

  const correctedYaml = generateCorrectedYaml(xsdFields, yamlData, yamlRaw, xsdRaw);
  document.getElementById('sw-out').innerHTML =
    `<button class="cbtn" onclick="navigator.clipboard.writeText(document.getElementById('sw-out').innerText.replace('Copy',''));toast('YAML copied')">Copy</button>${ehml(correctedYaml)}`;

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-play"></i> Compare & Validate';
  const e = issues.filter(i => i.t === 'err').length;
  const w = issues.filter(i => i.t === 'warn').length;
  toast(`Done — ${e} errors, ${w} warnings`);
}

// [Continue with crossValidate, renderReport, generateCorrectedYaml, fieldChipHtml, openFieldEditor, saveFieldEdit, dlYaml functions...]
// (These functions are in the original code and should be included here)