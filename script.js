// Títulos fixos da tabela
const headers = [
  "Cod", "Segmento", "Administradora", " Crédito ", " Entrada ", "Parcelas", " Valor das Parcelas ",
  "Juros Simples Anual", "Juros Simples Mensal", "Total Pago / Juros Composto", "PV / Juros Composto",
  "FV / Juros Composto", "N / Juros Composto", "i / Juros Composto", "PV / Dinheiro Novo / Juros Composto",
  "FV / Dinheiro Novo / Juros Composto", "N / Dinheiro Novo / Juros Composto", "i / Dinheiro Novo / Juros Composto",
  "Valor Parcela","Classificação", // coluna extra
  "Ação"           // coluna extra
];

let tableData = []; // dados atuais da tabela
let previewData = [];
let currentPage = 1;
const pageSize = 20;
let filtroCod = '';
let filtroSegmento = '';
let filtroAdministradora = '';
let filtroClassificacao = '';

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
  // Segmento
  const segmentoSelect = document.getElementById('filtroSegmento');
  const segmentoIdx = headers.indexOf('Segmento');
  const segmentos = getUniqueValues(segmentoIdx);
  segmentoSelect.innerHTML = '<option value="">Todos</option>' + segmentos.map(s => `<option value="${s}">${s}</option>`).join('');
  // Administradora
  const admSelect = document.getElementById('filtroAdministradora');
  const admIdx = headers.indexOf('Administradora');
  const adms = getUniqueValues(admIdx);
  admSelect.innerHTML = '<option value="">Todas</option>' + adms.map(a => `<option value="${a}">${a}</option>`).join('');
}

function getFilteredData() {
  return tableData.filter(row => {
    // Cod
    if (filtroCod && !String(row[0]).toLowerCase().includes(filtroCod.toLowerCase())) return false;
    // Segmento
    if (filtroSegmento && row[headers.indexOf('Segmento')] !== filtroSegmento) return false;
    // Administradora
    if (filtroAdministradora && row[headers.indexOf('Administradora')] !== filtroAdministradora) return false;
    // Classificação
    if (filtroClassificacao && !(row[headers.length - 2] || '').startsWith(filtroClassificacao)) return false;
    return true;
  });
}

function renderTable(headers, data) {
  preencherFiltrosDinamicos();
  // Determinar colunas não vazias
  const colunasFixas = [headers.length - 2, headers.length - 1]; // Classificação e Ação
  const colunasNaoVazias = headers.map((h, idx) => {
    if (colunasFixas.includes(idx)) return true;
    return data.some(row => row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '');
  });

  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';
  // Renderiza cabeçalhos
  headers.forEach((h, idx) => {
    if (!colunasNaoVazias[idx]) return;
    const th = document.createElement('th');
    th.className = "px-2 py-1 border border-gray-300 whitespace-nowrap";
    th.textContent = h;
    thead.appendChild(th);
  });
  // Usar dados filtrados
  const filteredData = getFilteredData();
  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filteredData.slice(start, end);
  if (pageData.length === 0) return;
  pageData.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    headers.forEach((h, idx) => {
      if (!colunasNaoVazias[idx]) return;
      if (idx === headers.length - 2) {
        // Coluna Classificação
        let classif = row[idx] || '';
        const tdClass = document.createElement('td');
        tdClass.textContent = classif;
        tdClass.className = "px-2 py-1 border border-gray-200 whitespace-nowrap text-center font-bold ";
        if (classif.startsWith('Excelente')) {
          tdClass.className += 'bg-green-100 text-green-700';
        } else if (classif.startsWith('Bom')) {
          tdClass.className += 'bg-blue-100 text-blue-700';
        } else if (classif.startsWith('Médio')) {
          tdClass.className += 'bg-yellow-100 text-yellow-800';
        } else if (classif.startsWith('Fraco')) {
          tdClass.className += 'bg-red-100 text-red-700';
        }
        tr.appendChild(tdClass);
      } else if (idx === headers.length - 1) {
        // Coluna Ação
        const tdAcao = document.createElement('td');
        tdAcao.className = "px-2 py-1 border border-gray-200 whitespace-nowrap text-center";
        tdAcao.innerHTML = '<button class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 ver-btn"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>Ver</button>';
        tdAcao.querySelector('button').onclick = () => abrirDetalheModal(row, start + rowIdx);
        tr.appendChild(tdAcao);
      } else {
        // Demais colunas
        const td = document.createElement('td');
        td.className = "px-2 py-1 border border-gray-200 whitespace-nowrap";
        td.textContent = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
        tr.appendChild(td);
      }
    });
    tbody.appendChild(tr);
  });
  renderPagination(total, totalPages);
  renderFiltrosAtivos();
}

function renderPagination(total, totalPages) {
  const pag = document.getElementById('pagination');
  pag.innerHTML = '';
  if (total <= pageSize) return; // Não mostrar paginação se não precisa
  // Botão anterior
  const prev = document.createElement('button');
  prev.textContent = 'Anterior';
  prev.className = 'px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold shadow hover:bg-blue-200 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400';
  prev.disabled = currentPage === 1;
  prev.onclick = () => { currentPage--; renderTable(headers, tableData); };
  pag.appendChild(prev);
  // Números de página (máximo 5 visíveis)
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
  // Botão próxima
  const next = document.createElement('button');
  next.textContent = 'Próxima';
  next.className = 'px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold shadow hover:bg-blue-200 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400';
  next.disabled = currentPage === totalPages;
  next.onclick = () => { currentPage++; renderTable(headers, tableData); };
  pag.appendChild(next);
}

function renderPreviewTable(headers, data) {
  const thead = document.getElementById('previewTableHeader');
  const tbody = document.getElementById('previewTableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';
  headers.forEach(h => {
    const th = document.createElement('th');
    th.className = "px-2 py-1 border border-gray-300 whitespace-nowrap";
    th.textContent = h;
    thead.appendChild(th);
  });
  data.forEach(row => {
    const tr = document.createElement('tr');
    for (let i = 0; i < headers.length - 2; i++) {
      const td = document.createElement('td');
      td.className = "px-2 py-1 border border-gray-200 whitespace-nowrap";
      td.textContent = row[i] !== undefined && row[i] !== null ? row[i] : '';
      tr.appendChild(td);
    }
    // Coluna Classificação (vazia)
    const tdClass = document.createElement('td');
    tdClass.className = "px-2 py-1 border border-gray-200 whitespace-nowrap text-center";
    tdClass.textContent = '';
    tr.appendChild(tdClass);
    // Coluna Ação (botão Editar)
    const tdAcao = document.createElement('td');
    tdAcao.className = "px-2 py-1 border border-gray-200 whitespace-nowrap text-center";
    tdAcao.innerHTML = '<button class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Editar</button>';
    tr.appendChild(tdAcao);
    tbody.appendChild(tr);
  });
}

function showPreviewSection(show) {
  document.getElementById('previewSection').classList.toggle('hidden', !show);
}

// Renderiza interface de critérios (mock)
function renderCriterios() {
  const container = document.getElementById('criteriosContainer');
  container.innerHTML = '';
  const ignorar = ["Cod", "Segmento", "Administradora", "Classificação", "Ação"];
  const grupos = [
    {
      nome: 'Juros Simples',
      colunas: ['Juros Simples Anual', 'Juros Simples Mensal']
    },
    {
      nome: 'Total Pago / Juros Composto',
      colunas: [
        'Total Pago / Juros Composto',
        'PV / Juros Composto',
        'FV / Juros Composto',
        'N / Juros Composto',
        'i / Juros Composto'
      ]
    },
    {
      nome: 'Dinheiro Novo / Juros Composto',
      colunas: [
        'PV / Dinheiro Novo / Juros Composto',
        'FV / Dinheiro Novo / Juros Composto',
        'N / Dinheiro Novo / Juros Composto',
        'i / Dinheiro Novo / Juros Composto'
      ]
    }
  ];
  const faixas = [
    { cond: 'Menor que', valor: '0,8', classif: 'Excelente', nota: 4, cor: '#22c55e' },
    { cond: 'Entre', valor: '0,8-1,0', classif: 'Bom', nota: 3, cor: '#3b82f6' },
    { cond: 'Entre', valor: '1,0-1,3', classif: 'Médio', nota: 2, cor: '#facc15' },
    { cond: 'Maior que', valor: '1,3', classif: 'Fraco', nota: 1, cor: '#ef4444' }
  ];
  // Renderizar grupos
  let colunasAgrupadas = [];
  grupos.forEach(grupo => {
    // Título do grupo (linha separada)
    const titulo = document.createElement('div');
    titulo.className = 'col-span-full text-lg font-bold text-blue-800 mt-8 mb-2 border-b border-blue-200 pb-1';
    titulo.textContent = grupo.nome;
    container.appendChild(titulo);
    grupo.colunas.forEach(col => {
      colunasAgrupadas.push(col);
      if (ignorar.includes(col)) return;
      const div = document.createElement('div');
      div.className = "mb-2 p-2 border rounded bg-gray-50";
      let faixasHtml = '';
      faixas.forEach(faixa => {
        faixasHtml += `
          <div class=\"flex flex-wrap gap-2 items-center mb-1\">
            <select class=\"border rounded px-2 py-1\">
              <option${faixa.cond === 'Menor que' ? ' selected' : ''}>Menor que</option>
              <option${faixa.cond === 'Maior que' ? ' selected' : ''}>Maior que</option>
              <option${faixa.cond === 'Entre' ? ' selected' : ''}>Entre</option>
            </select>
            <div class=\"relative flex items-center\">
              <input type=\"text\" value=\"${faixa.valor}\" class=\"border rounded px-2 py-1 w-24 pr-6\" />
              <span class=\"absolute right-2 text-gray-500\">%</span>
            </div>
            <input type=\"text\" value=\"${faixa.classif}\" class=\"border rounded px-2 py-1 w-24 bg-gray-100 font-semibold\" readonly />
            <input type=\"number\" value=\"${faixa.nota}\" class=\"border rounded px-2 py-1 w-16 bg-gray-100 font-semibold text-center\" readonly />
            <input type=\"color\" value=\"${faixa.cor}\" class=\"w-8 h-8 border rounded\" />
          </div>
        `;
      });
      div.innerHTML = `
        <div class=\"font-semibold mb-1\">${col}</div>
        ${faixasHtml}
      `;
      container.appendChild(div);
    });
  });
  // Renderizar critérios não agrupados
  headers.slice(0, -2).forEach(col => {
    if (ignorar.includes(col)) return;
    if (colunasAgrupadas.includes(col)) return;
    const div = document.createElement('div');
    div.className = "mb-2 p-2 border rounded bg-gray-50";
    let faixasHtml = '';
    faixas.forEach(faixa => {
      faixasHtml += `
        <div class=\"flex flex-wrap gap-2 items-center mb-1\">
          <select class=\"border rounded px-2 py-1\">
            <option${faixa.cond === 'Menor que' ? ' selected' : ''}>Menor que</option>
            <option${faixa.cond === 'Maior que' ? ' selected' : ''}>Maior que</option>
            <option${faixa.cond === 'Entre' ? ' selected' : ''}>Entre</option>
          </select>
          <div class=\"relative flex items-center\">
            <input type=\"text\" value=\"${faixa.valor}\" class=\"border rounded px-2 py-1 w-24 pr-6\" />
            <span class=\"absolute right-2 text-gray-500\">%</span>
          </div>
          <input type=\"text\" value=\"${faixa.classif}\" class=\"border rounded px-2 py-1 w-24 bg-gray-100 font-semibold\" readonly />
          <input type=\"number\" value=\"${faixa.nota}\" class=\"border rounded px-2 py-1 w-16 bg-gray-100 font-semibold text-center\" readonly />
          <input type=\"color\" value=\"${faixa.cor}\" class=\"w-8 h-8 border rounded\" />
        </div>
      `;
    });
    div.innerHTML = `
      <div class=\"font-semibold mb-1\">${col}</div>
      ${faixasHtml}
    `;
    container.appendChild(div);
  });
}

function getCriteriosFromUI() {
  // Retorna um objeto: { coluna: [ {cond, valor, classif, nota, cor}, ... ] }
  const criterios = {};
  const ignorar = ["Cod", "Segmento", "Administradora", "Classificação", "Ação"];
  const critDivs = document.querySelectorAll('#criteriosContainer > div');
  let colIndex = 0;
  headers.slice(0, -2).forEach(col => {
    if (ignorar.includes(col)) return;
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

function aplicarCriterios() {
  const criterios = getCriteriosFromUI();
  tableData.forEach((row, idx) => {
    let notaTotal = 0;
    let criteriosAplicados = 0;
    let notas = [];
    headers.slice(0, -2).forEach((col, i) => {
      if (!criterios[col]) return;
      let valorCelula = row[i];
      if (typeof valorCelula === 'string') {
        valorCelula = valorCelula.replace('%','').replace(',','.').replace(' ','');
      }
      valorCelula = parseFloat(valorCelula);
      let faixaAplicada = null;
      for (const faixa of criterios[col]) {
        if (faixa.cond === 'Menor que' && valorCelula < parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
        if (faixa.cond === 'Maior que' && valorCelula > parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
        if (faixa.cond === 'Igual a' && valorCelula === parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
        if (faixa.cond === 'Diferente de' && valorCelula !== parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
        if (faixa.cond === 'Entre') {
          const [min, max] = faixa.valor.split('-').map(v => parseFloat(v));
          if (valorCelula >= min && valorCelula <= max) { faixaAplicada = faixa; break; }
        }
      }
      if (faixaAplicada) {
        notaTotal += faixaAplicada.nota;
        criteriosAplicados++;
        notas.push(faixaAplicada.nota);
      }
    });
    // Nova lógica baseada em notas individuais
    let notaStr = '';
    if (notas.length > 0 && notas.every(n => n === 4)) {
      notaStr = 'Excelente';
    } else if (notas.length > 0 && notas.every(n => n >= 3) && notas.filter(n => n === 3).length <= 1) {
      notaStr = 'Bom';
    } else if (notas.length > 0 && notas.every(n => n >= 2) && notas.filter(n => n === 2).length <= 1) {
      notaStr = 'Médio';
    } else {
      notaStr = 'Fraco';
    }
    row[headers.length - 2] = `${notaStr} (${notaTotal})`;
  });
  renderTable(headers, tableData);
  showToastFeedback('Critérios aplicados com sucesso!');
}

function abrirDetalheModal(row, rowIndex) {
  // Monta tabela de detalhes da carta
  let html = '<table class="min-w-full text-xs mb-4"><tbody>';
  headers.slice(0, -2).forEach((col, i) => {
    html += `<tr><td class='font-semibold pr-2 py-1 text-blue-700'>${col}</td><td class='py-1'>${row[i] !== undefined && row[i] !== null ? row[i] : ''}</td></tr>`;
  });
  html += '</tbody></table>';
  // Monta tabela de critérios aplicados
  const criterios = getCriteriosFromUI();
  html += '<div class="font-bold text-blue-700 mb-1">Pontuação por Critério</div>';
  html += '<table class="min-w-full text-xs border mb-2"><thead class="bg-blue-100"><tr><th class="px-2 py-1">Coluna</th><th class="px-2 py-1">Valor</th><th class="px-2 py-1">Faixa</th><th class="px-2 py-1">Nota</th><th class="px-2 py-1">Cor</th></tr></thead><tbody>';
  headers.slice(0, -2).forEach((col, i) => {
    if (!criterios[col]) return;
    let valorCelula = row[i];
    if (typeof valorCelula === 'string') {
      valorCelula = valorCelula.replace('%','').replace(',','.').replace(' ','');
    }
    valorCelula = parseFloat(valorCelula);
    let faixaAplicada = null;
    for (const faixa of criterios[col]) {
      if (faixa.cond === 'Menor que' && valorCelula < parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
      if (faixa.cond === 'Maior que' && valorCelula > parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
      if (faixa.cond === 'Igual a' && valorCelula === parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
      if (faixa.cond === 'Diferente de' && valorCelula !== parseFloat(faixa.valor)) { faixaAplicada = faixa; break; }
      if (faixa.cond === 'Entre') {
        const [min, max] = faixa.valor.split('-').map(v => parseFloat(v));
        if (valorCelula >= min && valorCelula <= max) { faixaAplicada = faixa; break; }
      }
    }
    if (faixaAplicada) {
      html += `<tr><td class="px-2 py-1">${col}</td><td class="px-2 py-1">${row[i]}</td><td class="px-2 py-1">${faixaAplicada.classif}</td><td class="px-2 py-1 text-center">${faixaAplicada.nota}</td><td class="px-2 py-1"><span class="inline-block w-4 h-4 rounded-full" style="background:${faixaAplicada.cor}"></span></td></tr>`;
    } else {
      html += `<tr><td class="px-2 py-1">${col}</td><td class="px-2 py-1">${row[i]}</td><td class="px-2 py-1 text-gray-400 italic">N/A</td><td class="px-2 py-1 text-center text-gray-400">-</td><td class="px-2 py-1"></td></tr>`;
    }
  });
  html += '</tbody></table>';
  document.getElementById('detalheConteudo').innerHTML = html;
  document.getElementById('detalheModal').classList.remove('hidden');
}

document.getElementById('fecharModalBtn').onclick = function() {
  document.getElementById('detalheModal').classList.add('hidden');
};

// Inicialização
function init() {
  renderTable(headers, tableData);
  renderCriterios();

  document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: null});
      const fileData = json.slice(1);
      previewData = fileData.map(row => {
        const newRow = [];
        for (let i = 0; i < headers.length - 2; i++) {
          newRow[i] = row[i] !== undefined && row[i] !== null ? row[i] : '';
        }
        newRow[headers.length - 2] = '';
        newRow[headers.length - 1] = '';
        return newRow;
      });
      renderPreviewTable(headers, previewData.slice(0, 5));
      showPreviewSection(true);
      tableData = [];
      currentPage = 1;
      renderTable(headers, tableData);
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById('importAllBtn').addEventListener('click', function() {
    tableData = [...previewData];
    currentPage = 1;
    renderTable(headers, tableData);
    showPreviewSection(false);
  });

  document.getElementById('addCriterioBtn').addEventListener('click', () => {
    alert('Funcionalidade de adicionar múltiplos critérios por coluna será implementada futuramente.');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  init();
  document.getElementById('aplicarCriteriosBtn').addEventListener('click', aplicarCriterios);
  document.getElementById('fecharModalBtn').onclick = function() {
    document.getElementById('detalheModal').classList.add('hidden');
  };
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
});

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