/* script.js — SAC sem coluna "Ação" + faixas robustas (<= e ordenação) */

// =========================
// Cabeçalhos fixos da tabela
// =========================
const headers = [
  "Cod",
  "Segmento",
  "Administradora",
  "Credito",
  "Entrada",
  "Parcelas",
  "Valor das Parcelas ",
  "Classificação"
];

let tableData = [];   // dados atuais da tabela
let previewData = []; // dados pré-visualização
let currentPage = 1;
const pageSize = 10;

// Filtros
let filtroCod = '';
let filtroSegmento = '';
let filtroAdministradora = '';
let filtroClassificacao = '';

// =========================
// Seleção de cartas
// =========================
/** Mapa de selecionadas por ID -> { row, id } */
const selecionadas = new Map();

/** Gera um ID estável para a linha (prefere "Cod"). */
function getRowId(row, fallbackIndex) {
  const cod = row[0]; // coluna Cod
  if (cod !== undefined && cod !== null && String(cod).trim() !== '') {
    return `COD::${String(cod).trim()}`;
  }
  // fallback: índice + hash simples (tamanho do conteúdo)
  return `IDX::${fallbackIndex}::${String(row.join('|')).length}`;
}

function isSelecionada(row, fallbackIndex) {
  return selecionadas.has(getRowId(row, fallbackIndex));
}

function toggleSelecionada(row, fallbackIndex) {
  const id = getRowId(row, fallbackIndex);
  if (selecionadas.has(id)) selecionadas.delete(id);
  else selecionadas.set(id, { id, row });
  atualizarPainelSelecionadas();
}

function limparSelecionadas() {
  selecionadas.clear();
  atualizarPainelSelecionadas();
  renderTable(headers, tableData); // atualiza checkboxes
}

// =========================
/* Utilitários de moeda/num */
// =========================
function formatarReal(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = Number(String(valor).toString()
    .replace(/\s+/g,'')
    .replace(/R\$\s?/gi,'')
    .replace(/[^\d.,-]/g,'')
    .replace(/\.(?=.*\.)/g,'')
    .replace(',', '.'));
  if (isNaN(num)) return String(valor);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseNumber(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const num = Number(String(valor).toString()
    .replace(/\s+/g,'')
    .replace(/R\$\s?/gi,'')
    .replace(/[^\d.,-]/g,'')
    .replace(/\.(?=.*\.)/g,'')
    .replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

// =========================
// Helper: encontrar faixa aplicada (robusta)
// - Ordena "Menor que" por valor
// - Usa <= para "Menor que" (inclusivo)
// - "Entre" trata ordem invertida e é inclusivo [min,max]
// =========================
function encontrarFaixaAplicada(faixas, valorCelula) {
  if (!faixas || faixas.length === 0) return null;

  // Cópia defensiva
  let lista = [...faixas];

  // Se todas são "Menor que", ordena por valor crescente
  const todasMenorQue = lista.every(f => f && f.cond === 'Menor que' && !isNaN(parseFloat(String(f.valor).replace(',', '.'))));
  if (todasMenorQue) {
    lista.sort((a, b) => parseFloat(String(a.valor).replace(',', '.')) - parseFloat(String(b.valor).replace(',', '.')));
  }

  // Varre e aplica condição
  for (const faixa of lista) {
    const raw = String(faixa.valor ?? '');
    const alvo = parseFloat(raw.replace(',', '.'));

    if (faixa.cond === 'Menor que' && !isNaN(alvo)) {
      if (valorCelula <= alvo) return faixa; // inclusivo
    }

    if (faixa.cond === 'Maior que' && !isNaN(alvo)) {
      if (valorCelula > alvo) return faixa;
    }

    if (faixa.cond === 'Igual a' && !isNaN(alvo)) {
      if (valorCelula === alvo) return faixa;
    }

    if (faixa.cond === 'Diferente de' && !isNaN(alvo)) {
      if (valorCelula !== alvo) return faixa;
    }

    if (faixa.cond === 'Entre') {
      // aceita formatos "30-40" ou "30 - 40" e trata inversão
      const [v1, v2] = raw.split('-').map(v => parseFloat(String(v).trim().replace(',', '.')));
      if (!isNaN(v1) && !isNaN(v2)) {
        const min = Math.min(v1, v2);
        const max = Math.max(v1, v2);
        if (valorCelula >= min && valorCelula <= max) return faixa; // inclusivo
      }
    }
  }

  return null;
}

// =========================
// Painel flutuante
// =========================
function atualizarPainelSelecionadas() {
  const panel = document.getElementById('selecionadasPanel');
  const btnAbrir = document.getElementById('abrirSelecionadasBtn');
  const badge = document.getElementById('badgeSelCount');
  const countEl = document.getElementById('selCount');
  const creditoEl = document.getElementById('selCredito');
  const parcelaEl = document.getElementById('selParcela');
  const listEl = document.getElementById('selList');

  const qtd = selecionadas.size;
  const somaCredito = Array.from(selecionadas.values())
    .reduce((acc, it) => acc + parseNumber(it.row[headers.indexOf('Credito')]), 0);
  const somaParcelas = Array.from(selecionadas.values())
    .reduce((acc, it) => acc + parseNumber(it.row[headers.indexOf('Valor das Parcelas ')]), 0);

  if (badge)      badge.textContent = String(qtd);
  if (countEl)    countEl.textContent = String(qtd);
  if (creditoEl)  creditoEl.textContent = formatarReal(somaCredito);
  if (parcelaEl)  parcelaEl.textContent = formatarReal(somaParcelas);

  if (listEl) {
    listEl.innerHTML = '';
    for (const { id, row } of selecionadas.values()) {
      const li = document.createElement('li');
      li.className = 'py-2 flex items-center justify-between gap-2';
      const cod = row[0] ?? '(sem código)';
      const seg = row[headers.indexOf('Segmento')] ?? '';
      const adm = row[headers.indexOf('Administradora')] ?? '';
      const cred = row[headers.indexOf('Credito')];

      li.innerHTML = `
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-800 truncate">${cod}</div>
          <div class="text-xs text-gray-500 truncate">${seg} • ${adm}</div>
          <div class="text-xs text-blue-700 font-semibold">${formatarReal(cred)}</div>
        </div>
        <button class="shrink-0 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100" title="Remover">Remover</button>
      `;
      li.querySelector('button').onclick = () => {
        selecionadas.delete(id);
        atualizarPainelSelecionadas();
        renderTable(headers, tableData);
      };
      listEl.appendChild(li);
    }
  }

  if (btnAbrir) {
    btnAbrir.classList.toggle('hidden', qtd === 0 && panel.classList.contains('hidden'));
  }
}

// =========================
// Filtros dinâmicos
// =========================
function getUniqueValues(colIndex) {
  const values = new Set();
  tableData.forEach(row => {
    if (row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '') {
      values.add(row[colIndex]);
    }
  });
  return Array.from(values).sort();
}

function preencherFiltrosDinamicos() {
  const segmentoSelect = document.getElementById('filtroSegmento');
  const segmentoIdx = headers.indexOf('Segmento');
  const segmentos = getUniqueValues(segmentoIdx);
  segmentoSelect.innerHTML = '<option value="">Todos</option>' + segmentos.map(s => `<option value="${s}">${s}</option>`).join('');

  const admSelect = document.getElementById('filtroAdministradora');
  const admIdx = headers.indexOf('Administradora');
  const adms = getUniqueValues(admIdx);
  admSelect.innerHTML = '<option value="">Todas</option>' + adms.map(a => `<option value="${a}">${a}</option>`).join('');
}

function getFilteredData() {
  return tableData.filter(row => {
    if (filtroCod && !String(row[0]).toLowerCase().includes(filtroCod.toLowerCase())) return false;
    if (filtroSegmento && row[headers.indexOf('Segmento')] !== filtroSegmento) return false;
    if (filtroAdministradora && row[headers.indexOf('Administradora')] !== filtroAdministradora) return false;
    if (filtroClassificacao && !(row[headers.length - 1] || '').startsWith(filtroClassificacao)) return false;
    return true;
  });
}

// =========================
/* Render da Tabela */
// =========================
function renderTable(headers, data) {
  preencherFiltrosDinamicos();

  const colunasDesejadas = headers; // sem "Ação"
  const colunasNaoVazias = headers.map((h) => colunasDesejadas.includes(h));

  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // Cabeçalho "Sel"
  const thSel = document.createElement('th');
  thSel.className = "px-2 py-1 border border-gray-300 whitespace-nowrap text-center";
  thSel.textContent = 'Sel';
  thead.appendChild(thSel);

  // Demais cabeçalhos
  headers.forEach((h, idx) => {
    if (!colunasNaoVazias[idx]) return;
    const th = document.createElement('th');
    th.className = "px-2 py-1 border border-gray-300 whitespace-nowrap";
    th.textContent = h;
    thead.appendChild(th);
  });

  // Dados filtrados / paginação
  const filteredData = getFilteredData();
  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filteredData.slice(start, end);

  if (pageData.length === 0) {
    renderPagination(total, totalPages);
    renderFiltrosAtivos();
    return;
  }

  pageData.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');

    // Checkbox de seleção por linha
    const tdCheck = document.createElement('td');
    tdCheck.className = "px-2 py-1 border border-gray-200 text-center";
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'w-4 h-4 accent-blue-600 cursor-pointer';
    const fallbackIndex = start + rowIdx;
    checkbox.checked = isSelecionada(row, fallbackIndex);
    checkbox.onchange = () => toggleSelecionada(row, fallbackIndex);
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    // Demais colunas
    headers.forEach((h, idx) => {
      if (!colunasNaoVazias[idx]) return;

      if (idx === headers.length - 1) {
        // Classificação (agora é a última coluna)
        let classif = row[idx] || '';
        const tdClass = document.createElement('td');
        tdClass.textContent = classif;
        tdClass.className = "px-2 py-1 border border-gray-200 whitespace-nowrap text-center font-bold ";
        if (classif.startsWith('Excelente')) tdClass.className += 'bg-green-100 text-green-700';
        else if (classif.startsWith('Bom')) tdClass.className += 'bg-blue-100 text-blue-700';
        else if (classif.startsWith('Médio')) tdClass.className += 'bg-yellow-100 text-yellow-800';
        else if (classif.startsWith('Fraco')) tdClass.className += 'bg-red-100 text-red-700';
        tr.appendChild(tdClass);
      } else {
        // Outras colunas (formata R$ para Credito, Entrada e Valor das Parcelas)
        const td = document.createElement('td');
        td.className = "px-2 py-1 border border-gray-200 whitespace-nowrap";
        if (headers[idx] === 'Credito' || headers[idx] === 'Valor das Parcelas ' || headers[idx] === 'Entrada') {
          td.textContent = formatarReal(row[idx]);
        } else {
          td.textContent = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
        }
        tr.appendChild(td);
      }
    });

    tbody.appendChild(tr);
  });

  renderPagination(total, totalPages);
  renderFiltrosAtivos();
}

// =========================
/* Paginação */
// =========================
function renderPagination(total, totalPages) {
  const pag = document.getElementById('pagination');
  pag.innerHTML = '';
  if (total <= pageSize) return;

  const prev = document.createElement('button');
  prev.textContent = 'Anterior';
  prev.className = 'px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold shadow hover:bg-blue-200 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400';
  prev.disabled = currentPage === 1;
  prev.onclick = () => { currentPage--; renderTable(headers, tableData); };
  pag.appendChild(prev);

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'px-3 py-1 rounded-lg mx-1 ' + (i === currentPage ? 'bg-blue-600 text-white font-bold shadow' : 'bg-blue-50 text-blue-700 hover:bg-blue-200 shadow') + ' font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400';
    btn.onclick = () => { currentPage = i; renderTable(headers, tableData); };
    pag.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = 'Próxima';
  next.className = 'px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold shadow hover:bg-blue-200 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400';
  next.disabled = currentPage === totalPages;
  next.onclick = () => { currentPage++; renderTable(headers, tableData); };
  pag.appendChild(next);
}

// =========================
/* Pré-visualização */
// =========================
function renderPreviewTable(headers, data) {
  const thead = document.getElementById('previewTableHeader');
  const tbody = document.getElementById('previewTableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  // cabeçalhos exatamente como em headers (sem "Ação")
  headers.forEach(h => {
    const th = document.createElement('th');
    th.className = "px-2 py-1 border border-gray-300 whitespace-nowrap";
    th.textContent = h;
    thead.appendChild(th);
  });

  // linhas
  data.forEach(row => {
    const tr = document.createElement('tr');

    headers.forEach((h, i) => {
      const td = document.createElement('td');
      td.className = "px-2 py-1 border border-gray-200 whitespace-nowrap";

      if (h === 'Credito' || h === 'Valor das Parcelas ' || h === 'Entrada') {
        td.textContent = formatarReal(row[i]);
      } else {
        td.textContent = row[i] ?? '';
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function showPreviewSection(show) {
  document.getElementById('previewSection').classList.toggle('hidden', !show);
}

// =========================
/* Critérios (base original) */
// =========================
function renderCriterios() {
  const container = document.getElementById('criteriosContainer');
  container.innerHTML = '';

  const ignorar = ["Cod", "Segmento", "Administradora", "Credito", "Classificação"]; // sem "Ação"
  const criteriosPorColuna = {
    "Entrada": [
      { cond: 'Menor que', valor: '30', classif: 'Excelente', nota: 4, cor: '#22c55e' },
      { cond: 'Menor que', valor: '40', classif: 'Bom', nota: 3, cor: '#3b82f6' },
      { cond: 'Menor que', valor: '45', classif: 'Médio', nota: 2, cor: '#facc15' },
      { cond: 'Menor que', valor: '50', classif: 'Fraco', nota: 1, cor: '#ef4444' }
    ],
    "Parcelas": [
      { cond: 'Menor que', valor: '10', classif: 'Excelente', nota: 4, cor: '#22c55e' },
      { cond: 'Menor que', valor: '11', classif: 'Bom', nota: 3, cor: '#3b82f6' },
      { cond: 'Menor que', valor: '12', classif: 'Médio', nota: 2, cor: '#facc15' },
      { cond: 'Menor que', valor: '13', classif: 'Fraco', nota: 1, cor: '#ef4444' }
    ],
    "Valor das Parcelas ": [
      { cond: 'Menor que', valor: '0,5', classif: 'Excelente', nota: 4, cor: '#22c55e' },
      { cond: 'Menor que', valor: '0,7', classif: 'Bom', nota: 3, cor: '#3b82f6' },
      { cond: 'Menor que', valor: '0,9', classif: 'Médio', nota: 2, cor: '#facc15' },
      { cond: 'Menor que', valor: '1', classif: 'Fraco', nota: 1, cor: '#ef4444' }
    ]
  };

  if (!window.criteriosAtivos) {
    window.criteriosAtivos = {};
    headers.slice(0, -1).forEach(col => {
      if (!ignorar.includes(col)) window.criteriosAtivos[col] = true;
    });
  }

  headers.slice(0, -1).forEach(col => {
    if (ignorar.includes(col)) return;

    const faixas = criteriosPorColuna[col] || [
      { cond: 'Menor que', valor: '0,8', classif: 'Excelente', nota: 4, cor: '#22c55e' },
      { cond: 'Menor que', valor: '1,0', classif: 'Bom', nota: 3, cor: '#3b82f6' },
      { cond: 'Menor que', valor: '1,3', classif: 'Médio', nota: 2, cor: '#facc15' },
      { cond: 'Menor que', valor: '99999', classif: 'Fraco', nota: 1, cor: '#ef4444' }
    ];

    let faixasHtml = '';
    faixas.forEach(faixa => {
      faixasHtml += `
        <div class="flex flex-wrap gap-2 items-center mb-1">
          <select class="border rounded px-2 py-1">
            <option selected>Menor que</option>
            <option>Maior que</option>
            <option>Igual a</option>
            <option>Diferente de</option>
            <option>Entre</option>
          </select>
          <div class="relative flex items-center">
            <input type="text" value="${faixa.valor}" class="border rounded px-2 py-1 w-24 pr-6" />
            <span class="absolute right-2 text-gray-500">%</span>
          </div>
          <input type="text" value="${faixa.classif}" class="border rounded px-2 py-1 w-24 bg-gray-100 font-semibold" readonly />
          <input type="number" value="${faixa.nota}" class="border rounded px-2 py-1 w-16 bg-gray-100 font-semibold text-center" readonly />
          <input type="color" value="${faixa.cor}" class="w-8 h-8 border rounded" />
        </div>
      `;
    });

    const ativo = window.criteriosAtivos[col];
    const btnClass = ativo ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-400 border-gray-300";
    const btnLabel = ativo ? "Ativo" : "Desativado";

    const div = document.createElement('div');
    div.className = "mb-2 p-2 border rounded bg-gray-50";
    div.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold">${col}</span>
        <button type="button" class="toggle-criterio px-3 py-1 border rounded-full text-xs font-bold transition ${btnClass}" data-col="${col}">
          ${btnLabel}
        </button>
      </div>
      ${faixasHtml}
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.toggle-criterio').forEach(btn => {
    btn.onclick = function() {
      const col = btn.getAttribute('data-col');
      window.criteriosAtivos[col] = !window.criteriosAtivos[col];
      renderCriterios();
    };
  });
}

function getCriteriosFromUI() {
  const criterios = {};
  const ignorar = ["Cod", "Segmento", "Administradora", "Credito", "Classificação"];
  const critDivs = document.querySelectorAll('#criteriosContainer > div');
  let colIndex = 0;

  headers.slice(0, -1).forEach(col => {
    if (ignorar.includes(col)) return;

    if (window.criteriosAtivos && !window.criteriosAtivos[col]) {
      colIndex++;
      return;
    }

    const div = critDivs[colIndex];
    criterios[col] = [];
    const faixaDivs = div.querySelectorAll('.flex.flex-wrap');
    faixaDivs.forEach(faixaDiv => {
      const cond = faixaDiv.querySelector('select').value;
      const valor = faixaDiv.querySelector('input[type="text"]').value.replace(',', '.');
      const classif = faixaDiv.querySelector('input[type="text"][readonly]').value;
      const nota = parseInt(faixaDiv.querySelector('input[type="number"]').value);
      const cor = faixaDiv.querySelector('input[type="color"]').value;
      criterios[col].push({ cond, valor, classif, nota, cor });
    });
    colIndex++;
  });
  return criterios;
}

// =========================
/* Toast */
// =========================
function showToastFeedback(msg) {
  const toast = document.getElementById('toastFeedback');
  const msgSpan = document.getElementById('toastFeedbackMsg');
  msgSpan.textContent = msg;
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none');
    toast.classList.remove('opacity-100');
  }, 2500);
}

// =========================
/* Aplicar critérios (usa encontrarFaixaAplicada) */
// =========================
function aplicarCriterios() {
  const criterios = getCriteriosFromUI();
  const criteriosAtivos = Object.keys(criterios);
  const totalCriterios = criteriosAtivos.length;

  tableData.forEach((row) => {
    let notaTotal = 0;

    const idxCredito = headers.findIndex(h => h.trim().toLowerCase() === 'crédito' || h.trim().toLowerCase() === 'credito');
    const valorCredito = parseNumber(row[idxCredito] || '0');

    headers.slice(0, -1).forEach((col, i) => {
      if (!criterios[col]) return;

      let valorCelula;
      if (col.trim().toLowerCase() === 'entrada') {
        valorCelula = valorCredito ? (parseNumber(row[i]) / valorCredito) * 100 : 0;
      } else if (col.trim().toLowerCase().includes('valor') && col.trim().toLowerCase().includes('parcela')) {
        valorCelula = valorCredito ? (parseNumber(row[i]) / valorCredito) * 100 : 0;
      } else {
        valorCelula = parseNumber(row[i]);
      }

      const faixaAplicada = encontrarFaixaAplicada(criterios[col], valorCelula);
      if (faixaAplicada) notaTotal += faixaAplicada.nota;
    });

    let notaStr = '';
    if (totalCriterios === 3) {
      if (notaTotal >= 10) notaStr = 'Excelente';
      else if (notaTotal >= 7) notaStr = 'Bom';
      else if (notaTotal >= 4) notaStr = 'Médio';
      else if (notaTotal >= 1) notaStr = 'Fraco';
      else notaStr = 'N/A';
    } else if (totalCriterios === 2) {
      if (notaTotal >= 7) notaStr = 'Excelente';
      else if (notaTotal >= 5) notaStr = 'Bom';
      else if (notaTotal >= 3) notaStr = 'Médio';
      else if (notaTotal >= 1) notaStr = 'Fraco';
      else notaStr = 'N/A';
    } else if (totalCriterios === 1) {
      if (notaTotal === 4) notaStr = 'Excelente';
      else if (notaTotal === 3) notaStr = 'Bom';
      else if (notaTotal === 2) notaStr = 'Médio';
      else if (notaTotal === 1) notaStr = 'Fraco';
      else notaStr = 'N/A';
    } else {
      notaStr = 'N/A';
    }

    row[headers.length - 1] = `${notaStr} (${notaTotal})`;
  });

  renderTable(headers, tableData);
  showToastFeedback('Critérios aplicados com sucesso!');
}

// =========================
/* Modal de detalhes (usa encontrarFaixaAplicada) */
// =========================
function abrirDetalheModal(row) {
  const criterios = getCriteriosFromUI();

  const idxCredito = headers.findIndex(h => h.trim().toLowerCase() === 'crédito' || h.trim().toLowerCase() === 'credito');
  const valorCredito = parseNumber(row[idxCredito] || '0');

  const linhasNotas = headers.slice(0, -1).map((col, i) => {
    if (!criterios[col]) return '';

    const lower = col.trim().toLowerCase();
    let valorCelula;
    if (lower === 'entrada') {
      valorCelula = valorCredito ? (parseNumber(row[i]) / valorCredito) * 100 : 0;
    } else if (lower.includes('valor') && lower.includes('parcela')) {
      valorCelula = valorCredito ? (parseNumber(row[i]) / valorCredito) * 100 : 0;
    } else {
      valorCelula = parseNumber(row[i]);
    }

    const faixaAplicada = encontrarFaixaAplicada(criterios[col], valorCelula);

    if (faixaAplicada) {
      return `
        <tr class="odd:bg-white even:bg-blue-50">
          <td class="px-3 py-2 font-semibold text-gray-700">${col}</td>
          <td class="px-3 py-2">${(col==='Credito'||col==='Valor das Parcelas '||col==='Entrada') ? formatarReal(row[i]) : (row[i] ?? '')}</td>
          <td class="px-3 py-2">
            <span class="inline-flex items-center gap-2 font-semibold">
              ${faixaAplicada.classif}
              <span class="inline-block w-3 h-3 rounded-full border" style="background:${faixaAplicada.cor}"></span>
            </span>
          </td>
          <td class="px-3 py-2 text-center">
            <span class="inline-flex items-center justify-center px-2 py-1 rounded-lg border text-sm font-bold"
                  style="border-color:${faixaAplicada.cor}; color:${faixaAplicada.cor}">
              ${faixaAplicada.nota}
            </span>
          </td>
          <td class="px-3 py-2 text-right text-xs text-gray-500">
            valor usado: ${valorCelula.toLocaleString('pt-BR', {maximumFractionDigits: 2})}${(lower==='entrada'||(lower.includes('valor')&&lower.includes('parcela'))) ? '%' : ''}
          </td>
        </tr>
      `;
    } else {
      return `
        <tr class="odd:bg-white even:bg-blue-50">
          <td class="px-3 py-2 font-semibold text-gray-700">${col}</td>
          <td class="px-3 py-2">${(col==='Credito'||col==='Valor das Parcelas '||col==='Entrada') ? formatarReal(row[i]) : (row[i] ?? '')}</td>
          <td class="px-3 py-2 text-gray-400 italic">N/A</td>
          <td class="px-3 py-2 text-center text-gray-400">-</td>
          <td class="px-3 py-2 text-right text-xs text-gray-400">—</td>
        </tr>
      `;
    }
  }).join('');

  const html = `
    <div class="mb-6">
      <table class="min-w-full text-sm">
        <tbody>
          ${headers.slice(0, -1).map((col, i) => `
            <tr class="border-b last:border-0">
              <td class="font-semibold pr-3 py-1 text-blue-700">${col}</td>
              <td class="py-1">
                ${row[i] !== undefined && row[i] !== null
                  ? ((col === 'Credito' || col === 'Valor das Parcelas ' || col === 'Entrada')
                      ? formatarReal(row[i])
                      : row[i])
                  : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mb-3">
      <div class="font-extrabold text-blue-700 text-lg">Notas por Critério (exatas)</div>
      <div class="text-xs text-gray-500">Entrada e Valor das Parcelas avaliados como % do Crédito</div>
    </div>

    <div class="rounded-xl border border-blue-200 overflow-hidden">
      <table class="min-w-full text-xs">
        <thead class="bg-blue-100">
          <tr>
            <th class="px-3 py-2 text-left">Coluna</th>
            <th class="px-3 py-2 text-left">Valor</th>
            <th class="px-3 py-2 text-left">Faixa</th>
            <th class="px-3 py-2 text-center">Nota</th>
            <th class="px-3 py-2 text-right">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          ${linhasNotas}
        </tbody>
      </table>
    </div>
  `;

  const conteudo = document.getElementById('detalheConteudo');
  conteudo.innerHTML = html;

  const modal = document.getElementById('detalheModal');
  modal.classList.remove('hidden');

  // UX: fechar com ESC e clique fora
  function onKey(e){ if(e.key==='Escape') fechar(); }
  function onClickFora(e){ if(e.target===modal) fechar(); }
  function fechar(){
    modal.classList.add('hidden');
    document.removeEventListener('keydown', onKey);
    modal.removeEventListener('click', onClickFora);
  }
  document.addEventListener('keydown', onKey);
  modal.addEventListener('click', onClickFora);
  const btn = document.getElementById('fecharModalBtn');
  if (btn) btn.onclick = () => fechar();
}

// =========================
/* Filtros ativos (chips) */
// =========================
function renderFiltrosAtivos() {
  const container = document.getElementById('filtrosAtivos');
  container.innerHTML = '';
  const filtros = [];

  if (filtroCod) filtros.push({ label: 'Cod', value: filtroCod, id: 'filtroCod' });
  if (filtroSegmento) filtros.push({ label: 'Segmento', value: filtroSegmento, id: 'filtroSegmento' });
  if (filtroAdministradora) filtros.push({ label: 'Administradora', value: filtroAdministradora, id: 'filtroAdministradora' });
  if (filtroClassificacao) filtros.push({ label: 'Classificação', value: filtroClassificacao, id: 'filtroClassificacao' });

  if (filtros.length === 0) return;

  filtros.forEach(filtro => {
    const chip = document.createElement('span');
    chip.className = 'flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs font-semibold shadow';
    chip.innerHTML = `${filtro.label}: <span class='ml-1 font-bold'>${filtro.value}</span> <button class='ml-2 text-blue-500 hover:text-red-600 font-bold focus:outline-none' title='Remover'>&times;</button>`;

    chip.querySelector('button').onclick = () => {
      if (filtro.id === 'filtroCod') { filtroCod = ''; document.getElementById('filtroCod').value = ''; }
      if (filtro.id === 'filtroSegmento') { filtroSegmento = ''; document.getElementById('filtroSegmento').value = ''; }
      if (filtro.id === 'filtroAdministradora') { filtroAdministradora = ''; document.getElementById('filtroAdministradora').value = ''; }
      if (filtro.id === 'filtroClassificacao') { filtroClassificacao = ''; document.getElementById('filtroClassificacao').value = ''; }
      currentPage = 1;
      renderTable(headers, tableData);
      renderFiltrosAtivos();
    };
    container.appendChild(chip);
  });
}

// =========================
/* Importação XLSX + Init */
// =========================
function init() {
  renderTable(headers, tableData);
  renderCriterios();
  atualizarPainelSelecionadas();

  document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        const range = XLSX.utils.decode_range(firstSheet['!ref']);
        range.s.r = 1; // começa na linha 2 (índice 1)
        range.s.c = 0; // coluna A
        range.e.c = 7; // até coluna H (A-H)

        const newRange = XLSX.utils.encode_range(range);
        const json = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: null,
          range: newRange
        });

        const fileData = json.slice(1); // pula linha de headers da planilha

        // Mapeia as colunas para o nosso formato sem "Ação"
        previewData = fileData.map(row => {
          const newRow = [];
          newRow[0] = row[0] ?? ''; // Cod (A)
          newRow[1] = row[1] ?? ''; // Segmento (B)
          newRow[2] = row[2] ?? ''; // Administradora (C)
          newRow[3] = row[3] ?? ''; // Credito (D)
          newRow[4] = row[4] ?? ''; // Entrada (E)
          newRow[5] = row[6] ?? ''; // Parcelas (G)
          newRow[6] = row[7] ?? ''; // Valor das Parcelas (H)
          newRow[7] = '';           // Classificação
          return newRow;
        });

        renderPreviewTable(headers, previewData.slice(0, 5));
        showPreviewSection(true);
        tableData = [];
        currentPage = 1;
        renderTable(headers, tableData);
        atualizarPainelSelecionadas();
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        showToastFeedback('Erro ao processar arquivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById('importAllBtn').addEventListener('click', function() {
    tableData = [...previewData];
    currentPage = 1;
    renderTable(headers, tableData);
    showPreviewSection(false);
    atualizarPainelSelecionadas();
  });

  document.getElementById('addCriterioBtn').addEventListener('click', () => {
    alert('Funcionalidade de adicionar múltiplos critérios por coluna será implementada futuramente.');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  init();

  document.getElementById('aplicarCriteriosBtn').addEventListener('click', aplicarCriterios);

  const fecharModalBtn = document.getElementById('fecharModalBtn');
  if (fecharModalBtn) {
    fecharModalBtn.onclick = function() {
      document.getElementById('detalheModal').classList.add('hidden');
    };
  }

  // Filtros
  document.getElementById('filtroCod').addEventListener('input', function(e) {
    filtroCod = e.target.value;
    currentPage = 1;
    renderTable(headers, tableData);
  });
  document.getElementById('filtroSegmento').addEventListener('change', function(e) {
    filtroSegmento = e.target.value;
    currentPage = 1;
    renderTable(headers, tableData);
  });
  document.getElementById('filtroAdministradora').addEventListener('change', function(e) {
    filtroAdministradora = e.target.value;
    currentPage = 1;
    renderTable(headers, tableData);
  });
  document.getElementById('filtroClassificacao').addEventListener('change', function(e) {
    filtroClassificacao = e.target.value;
    currentPage = 1;
    renderTable(headers, tableData);
  });

  renderFiltrosAtivos();

  // Painel Selecionadas: botões
  const btnAbrir = document.getElementById('abrirSelecionadasBtn');
  const panel = document.getElementById('selecionadasPanel');
  const btnFechar = document.getElementById('fecharSelecionadasBtn');
  const btnOcultar = document.getElementById('btnOcultarSelecionadas');
  const btnLimpar = document.getElementById('btnLimparSelecionadas');

  if (btnAbrir) btnAbrir.onclick = () => { panel.classList.remove('hidden'); btnAbrir.classList.add('hidden'); };
  if (btnFechar) btnFechar.onclick = () => { panel.classList.add('hidden'); atualizarPainelSelecionadas(); };
  if (btnOcultar) btnOcultar.onclick = () => { panel.classList.add('hidden'); atualizarPainelSelecionadas(); };
  if (btnLimpar) btnLimpar.onclick = () => { limparSelecionadas(); };

});
