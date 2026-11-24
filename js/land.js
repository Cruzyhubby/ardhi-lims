/* Ardhi LIMS — Land Management (projects, plots, physical maps) */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = {
    tab: 'projects',
    project: 'all',
    status: 'all',
    use: 'all',
    loc: 'all',
    q: '',
    mapProject: null
  };
  const mapUploads = {}; // session-only previews

  const PLOT_STATUS_COLORS = {
    Available: { fill: '#FFFFFF', stroke: '#B9C4B7', text: '#3E4A3F' },
    Reserved: { fill: '#FEF3C7', stroke: '#D97706', text: '#92400E' },
    Installment: { fill: '#DBEAFE', stroke: '#2563EB', text: '#1E40AF' },
    Sold: { fill: '#DCFCE7', stroke: '#16A34A', text: '#14532D' }
  };

  function statusBadge(s) { return UI.badge(s); }

  function plotRow(p) {
    const prj = Store.project(p.projectId);
    return '<tr class="clickable" data-plot="' + p.id + '" data-project="' + p.projectId + '" data-status="' + p.status + '" data-use="' + UI.esc(p.use) + '" data-loc="' + p.locationClass + '" data-search="' + UI.esc((p.plotNo + ' ' + (prj ? prj.name : '') + ' ' + p.use + ' ' + p.locationClass + ' ' + p.status).toLowerCase()) + '">' +
      '<td><span class="t-main">' + UI.esc(p.plotNo) + '</span><div class="t-sub">' + p.size + ' sqm</div></td>' +
      '<td><div class="t-main">' + UI.esc(prj ? prj.name : '—') + '</div><div class="t-sub">' + UI.esc(prj ? prj.region : '') + '</div></td>' +
      '<td class="num">' + p.size + ' <span class="muted small">sqm</span></td>' +
      '<td class="num strong">' + UI.money(p.price) + '</td>' +
      '<td>' + UI.esc(p.use) + '</td>' +
      '<td><span class="chip no-dot" style="height:24px;font-size:11.5px">' + UI.esc(p.locationClass) + '</span></td>' +
      '<td>' + statusBadge(p.status) + '</td>' +
      '<td><div class="actions"><button class="icon-btn" style="width:30px;height:30px" data-view-plot="' + p.id + '" title="View plot" aria-label="View plot">' + Icons.get('eye') + '</button></div></td>' +
    '</tr>';
  }

  function illustrativeSVG(pr) {
    const plots = Store.plotsForProject(pr.id);
    const cols = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(plots.length))));
    const cellW = 118, cellH = 78, gap = 16, padX = 34, padY = 42;
    const rows = Math.ceil(plots.length / cols);
    const W = cols * cellW + (cols - 1) * gap + padX * 2;
    const H = rows * cellH + (rows - 1) * gap + padY * 2;
    let cells = '';
    plots.forEach((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = padX + c * (cellW + gap), y = padY + r * (cellH + gap);
      const col = PLOT_STATUS_COLORS[p.status] || PLOT_STATUS_COLORS.Available;
      cells += '<g><rect x="' + x + '" y="' + y + '" width="' + cellW + '" height="' + cellH + '" rx="7" fill="' + col.fill + '" stroke="' + col.stroke + '" stroke-width="1.6"/>' +
        '<text x="' + (x + cellW / 2) + '" y="' + (y + 31) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + col.text + '">' + UI.esc(p.plotNo) + '</text>' +
        '<text x="' + (x + cellW / 2) + '" y="' + (y + 48) + '" text-anchor="middle" font-size="9.5" fill="#6B7280">' + p.size + ' sqm</text>' +
        '<text x="' + (x + cellW / 2) + '" y="' + (y + 64) + '" text-anchor="middle" font-size="8.5" fill="' + col.text + '" opacity=".85">' + UI.esc(p.status) + '</text></g>';
    });
    return '<svg class="map-illustration" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Illustrative plot layout for ' + UI.esc(pr.name) + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#F7F9F6"/>' +
      '<path d="M0 ' + (padY / 2) + ' H' + W + '" stroke="#CBD6C9" stroke-width="12" opacity=".65"/>' +
      '<path d="M0 ' + (H - padY / 2) + ' H' + W + '" stroke="#CBD6C9" stroke-width="8" opacity=".5"/>' +
      '<path d="M' + (padX / 2.4) + ' 0 V' + H + '" stroke="#D5DED3" stroke-width="6" opacity=".5"/>' +
      cells +
      '<text x="' + (padX) + '" y="' + (padY - 14) + '" font-size="10" fill="#7C877D" letter-spacing="1">ILLUSTRATIVE LAYOUT — NOT TO SCALE</text>' +
      '</svg>';
  }

  function projectCard(pr) {
    const plots = Store.plotsForProject(pr.id);
    const sold = plots.filter(p => p.status === 'Sold').length;
    const inst = plots.filter(p => p.status === 'Installment').length;
    const avail = plots.filter(p => p.status === 'Available').length;
    const pct = plots.length ? Math.round((sold + inst) / plots.length * 100) : 0;
    return '<div class="project-card">' +
      '<div class="project-cover">' +
        '<span class="code-badge">' + UI.esc(pr.code) + '</span>' +
        (pr.map ? '<span class="map-ind">' + Icons.get('file') + 'Physical map</span>' : '') +
        '<span class="loc">' + Icons.get('map-pin') + UI.esc(pr.district + ', ' + pr.region) + '</span>' +
      '</div>' +
      '<div class="project-body">' +
        '<div><h3>' + UI.esc(pr.name) + '</h3><div class="desc" style="margin-top:4px">' + UI.esc(pr.description) + '</div></div>' +
        '<div class="project-stats">' +
          '<div class="ps"><div class="k">Plots</div><div class="v">' + plots.length + '</div></div>' +
          '<div class="ps"><div class="k">Available</div><div class="v">' + avail + '</div></div>' +
          '<div class="ps"><div class="k">Sold / inst.</div><div class="v">' + (sold + inst) + '</div></div>' +
        '</div>' +
        '<div class="takeup-row"><span class="takeup-label">Take-up</span>' + UI.donut(pct, '', 46) + '</div>' +
      '</div>' +
      '<div class="project-foot">' +
        '<button class="btn btn-sm btn-outline" data-view-project="' + pr.id + '">' + Icons.get('eye') + 'Open</button>' +
        (App.can('landWrite') ? '<button class="btn btn-sm btn-ghost" data-edit-project="' + pr.id + '">' + Icons.get('edit') + 'Edit</button>' : '') +
        '<span class="meta">' + UI.esc(pr.locationClass) + '</span>' +
      '</div>' +
    '</div>';
  }

  function tabsHTML() {
    const tabs = [
      ['projects', 'Projects', Store.db.projects.length],
      ['plots', 'Plots', Store.db.plots.length],
      ['map', 'Physical maps', Store.db.projects.filter(p => p.map).length]
    ];
    return '<div class="tabs standalone" style="margin-bottom:16px">' + tabs.map(t =>
      '<button class="tab ' + (state.tab === t[0] ? 'active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '<span class="count">' + t[2] + '</span></button>').join('') + '</div>';
  }

  function projectsHTML() {
    return '<div class="page-head-row" style="margin-bottom:14px"><div><div class="muted small">' + Store.db.projects.length + ' land projects · ' + Store.db.plots.length + ' registered plots</div></div>' +
      (App.can('landWrite') ? '<button class="btn btn-primary" data-act="add-project">' + Icons.get('plus') + 'New project</button>' : '<span class="chip">' + Icons.get('lock') + 'Read-only access</span>') +
      '</div>' +
      '<div class="project-grid">' + Store.db.projects.map(projectCard).join('') + '</div>';
  }

  function plotsHTML() {
    const projects = Store.db.projects;
    return '<div class="card">' +
      '<div class="filter-bar">' +
        '<div class="field-inline" style="width:250px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="plotSearch" placeholder="Search plot or project…" value="' + UI.esc(state.q) + '" /></div>' +
        '<select class="select" id="plotProject" style="min-width:180px">' + UI.options([{ value: 'all', label: 'All projects' }].concat(projects.map(p => ({ value: p.id, label: p.name }))), state.project) + '</select>' +
        '<select class="select" id="plotStatus">' + UI.options([{ value: 'all', label: 'All statuses' }, { value: 'Available', label: 'Available' }, { value: 'Reserved', label: 'Reserved' }, { value: 'Installment', label: 'Installment' }, { value: 'Sold', label: 'Sold' }], state.status) + '</select>' +
        '<select class="select" id="plotUse">' + UI.options([{ value: 'all', label: 'All intended use' }, { value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }, { value: 'Industrial', label: 'Industrial' }, { value: 'Institutional', label: 'Institutional / Special-use' }], state.use) + '</select>' +
        '<select class="select" id="plotLoc">' + UI.options([{ value: 'all', label: 'Urban & rural' }, { value: 'Urban', label: 'Urban' }, { value: 'Rural', label: 'Rural' }], state.loc) + '</select>' +
        '<div class="spacer"></div>' +
        '<span class="filter-count" id="plotCount"></span>' +
        (App.can('landWrite') ? '<button class="btn btn-primary btn-sm" data-act="add-plot">' + Icons.get('plus') + 'New plot</button>' : '') +
      '</div>' +
      '<div class="table-wrap"><table class="data" id="plotTable"><thead><tr>' +
        '<th>Plot</th><th>Project</th><th class="num">Size</th><th class="num">Selling price</th><th>Intended use</th><th>Location</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + Store.db.plots.map(plotRow).join('') + '</tbody></table></div>' +
      '<div class="table-foot"><span id="plotFoot"></span><span class="muted small">Classification by intended use and location are independent.</span></div>' +
    '</div>';
  }

  function mapHTML() {
    const prj = Store.project(state.mapProject) || Store.db.projects[0];
    if (!state.mapProject) state.mapProject = prj.id;
    const plots = Store.plotsForProject(prj.id);
    const upload = mapUploads[prj.id];
    const mapFile = prj.map;
    const statusCount = (s) => plots.filter(p => p.status === s).length;
    return '<div class="page-head-row" style="margin-bottom:14px">' +
      '<div><div class="muted small">Attach scanned copies of the company physical maps. Interactive digital mapping has not been confirmed.</div></div>' +
      '<select class="select" id="mapProjectSelect" style="min-width:230px">' + UI.options(Store.db.projects.map(p => ({ value: p.id, label: p.name })), prj.id) + '</select>' +
    '</div>' +
    '<div class="map-layout">' +
      '<div class="map-card">' +
        '<div class="map-card-head"><div><h3>' + UI.esc(prj.name) + '</h3><div class="sub">' + UI.esc(prj.district) + ', ' + UI.esc(prj.region) + ' · ' + plots.length + ' plots</div></div>' +
          '<div class="right">' + UI.badge(prj.locationClass === 'Rural' ? 'Rural' : 'Urban', 'grey', { noDot: true }) + '</div></div>' +
        '<div class="map-canvas" id="mapCanvas">' +
          '<span class="proto-tag">' + Icons.get('info') + 'Prototype visualisation</span>' +
          (upload && upload.dataUrl && upload.type === 'image' ?
            '<img src="' + upload.dataUrl + '" alt="Uploaded map preview" style="max-width:100%;max-height:520px;border-radius:8px;border:1px solid var(--line)" />' :
            (mapFile ? illustrativeSVG(prj) : '<div class="map-empty">' + Icons.get('file') + '<h4>No map file attached</h4><p>Upload a scanned physical map for this project. Plot boundaries are not digitised in this prototype.</p></div>')) +
          '<span class="map-watermark">Illustrative layout — not the surveyed map</span>' +
        '</div>' +
        '<div class="map-legend">' +
          [['Available', '#FFFFFF', '#B9C4B7'], ['Reserved', '#FEF3C7', '#D97706'], ['Installment', '#DBEAFE', '#2563EB'], ['Sold', '#DCFCE7', '#16A34A']].map(x =>
            '<span><i style="background:' + x[1] + ';border:1px solid ' + x[2] + '"></i>' + x[0] + ' (' + statusCount(x[0]) + ')</span>').join('') +
          '<span style="margin-left:auto;color:var(--green-700)">' + Icons.get('info') + ' Layout generated from plot records for demonstration only</span>' +
        '</div>' +
      '</div>' +
      '<div class="map-side">' +
        '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Pending clarification.</strong> The company currently holds physical maps only. Interactive digital plot mapping depends on inspecting the actual maps and confirming that plot boundaries can be matched to records.</div></div>' +
        (mapFile ? '<div class="card"><div class="card-head"><div><h3>Map record</h3></div></div><div class="card-body">' +
          '<div class="map-file"><div class="ficon">' + Icons.get('file') + '</div><div><div class="fname">' + UI.esc(mapFile.name) + '</div><div class="fmeta">' + UI.esc(mapFile.size) + ' · ' + UI.esc(mapFile.type) + '</div><div class="fmeta">Uploaded ' + UI.date(mapFile.uploadedAt) + ' by ' + UI.esc(mapFile.uploadedBy || '—') + '</div></div></div>' +
          (upload ? '<div class="notice green" style="margin-top:12px">' + Icons.get('check-circle') + '<div>Preview loaded for this session: <strong>' + UI.esc(upload.name) + '</strong>. Files are not uploaded to a server in this prototype.</div></div>' : '') +
          (App.can('landWrite') ? '<button class="btn btn-outline btn-block" style="margin-top:12px" data-act="upload-map">' + Icons.get('upload') + 'Replace map file</button>' : '') +
        '</div></div>' : '') +
        '<div class="card"><div class="card-head"><div><h3>Project information</h3></div></div><div class="card-body">' +
          '<dl class="kv">' +
            '<dt>Project code</dt><dd>' + UI.esc(prj.code) + '</dd>' +
            '<dt>District</dt><dd>' + UI.esc(prj.district) + '</dd>' +
            '<dt>Region</dt><dd>' + UI.esc(prj.region) + '</dd>' +
            '<dt>Location class</dt><dd>' + UI.esc(prj.locationClass) + '</dd>' +
            '<dt>Registered plots</dt><dd>' + plots.length + '</dd>' +
            '<dt>Available</dt><dd>' + statusCount('Available') + '</dd>' +
            '<dt>Created</dt><dd>' + UI.date(prj.createdAt) + '</dd>' +
          '</dl>' +
          (App.can('landWrite') ? '<div class="upload-drop" style="margin-top:16px" id="uploadDrop">' + Icons.get('upload') + '<div class="t">Upload a physical map scan</div><div class="s">JPG, PNG or PDF · stored as a record in the demo</div></div><input type="file" id="mapFileInput" accept="image/*,.pdf" class="hidden" />' : '') +
        '</div></div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- modals ---------------- */
  function projectFormModal(existing) {
    const prj = existing || { code: '', name: '', district: '', region: '', locationClass: 'Urban', description: '' };
    const m = UI.modal({
      title: existing ? 'Edit project' : 'New land project',
      subtitle: existing ? prj.name : 'Register a land project and its location',
      size: 'md',
      body: '<form id="projectForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field" data-field="name"><label>Project name <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(prj.name) + '" placeholder="e.g. Kigamboni Green Estate" /><span class="error-msg">Project name is required.</span></div>' +
          '<div class="field" data-field="code"><label>Project code <span class="req">*</span></label><input class="input" name="code" maxlength="6" value="' + UI.esc(prj.code) + '" placeholder="e.g. KG" /><span class="error-msg">Enter a short project code.</span></div>' +
          '<div class="field" data-field="region"><label>Region <span class="req">*</span></label><input class="input" name="region" value="' + UI.esc(prj.region) + '" placeholder="e.g. Dar es Salaam" /><span class="error-msg">Region is required.</span></div>' +
          '<div class="field" data-field="district"><label>District / ward <span class="req">*</span></label><input class="input" name="district" value="' + UI.esc(prj.district) + '" placeholder="e.g. Kigamboni" /><span class="error-msg">District is required.</span></div>' +
          '<div class="field full"><label>Location classification <span class="req">*</span></label><select class="select" name="locationClass">' + UI.options([{ value: 'Urban', label: 'Urban' }, { value: 'Rural', label: 'Rural' }], prj.locationClass) + '</select><span class="hint">Location is classified separately from intended use.</span></div>' +
          '<div class="field full"><label>Description</label><textarea class="textarea" name="description" placeholder="Access roads, survey status, utilities…">' + UI.esc(prj.description) + '</textarea></div>' +
        '</div></form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="projectForm">' + (existing ? 'Save changes' : 'Create project') + '</button>'
    });
    $('[data-x="cancel"]', m.el).addEventListener('click', m.close);
    $('#projectForm', m.el).addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      if (!UI.validate(form, [
        { name: 'name', required: true, msg: 'Project name is required.' },
        { name: 'code', required: true, msg: 'Project code is required.' },
        { name: 'region', required: true, msg: 'Region is required.' },
        { name: 'district', required: true, msg: 'District is required.' }
      ])) return;
      const data = UI.readForm(form);
      if (existing) Store.updateProject(existing.id, data);
      else Store.addProject(data);
      m.close();
      UI.toast(existing ? 'Project updated.' : 'Project created. Add plots to make it available for sale.');
      App.refresh();
    });
  }

  function plotFormModal(projectId) {
    const projects = Store.db.projects;
    const activeProject = Store.project(projectId) || projects[0];
    const m = UI.modal({
      title: 'Register plot',
      subtitle: 'Plot numbers must be unique within the project',
      size: 'md',
      body: '<form id="plotForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field"><label>Land project <span class="req">*</span></label><select class="select" name="projectId">' + UI.options(projects.map(p => ({ value: p.id, label: p.name })), activeProject ? activeProject.id : '') + '</select></div>' +
          '<div class="field" data-field="plotNo"><label>Plot number <span class="req">*</span></label><input class="input" name="plotNo" placeholder="e.g. KG-13" /><span class="error-msg">Plot number is required and must be unique.</span></div>' +
          '<div class="field" data-field="size"><label>Plot size (sqm) <span class="req">*</span></label><input class="input" name="size" type="number" min="50" step="50" placeholder="e.g. 600" /><span class="error-msg">Enter a size of at least 50 sqm.</span></div>' +
          '<div class="field" data-field="price"><label>Selling price (TZS) <span class="req">*</span></label><input class="input" name="price" type="number" min="100000" step="50000" placeholder="e.g. 24000000" /><span class="error-msg">Enter a valid selling price.</span></div>' +
          '<div class="field"><label>Intended use <span class="req">*</span></label><select class="select" name="use">' + UI.options([{ value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }, { value: 'Industrial', label: 'Industrial' }, { value: 'Institutional', label: 'Institutional / Special-use' }], 'Residential') + '</select></div>' +
          '<div class="field"><label>Location classification <span class="req">*</span></label><select class="select" name="locationClass">' + UI.options([{ value: 'Urban', label: 'Urban' }, { value: 'Rural', label: 'Rural' }], activeProject ? activeProject.locationClass : 'Urban') + '</select></div>' +
          '<div class="field full"><label>Initial status</label><select class="select" name="status">' + UI.options([{ value: 'Available', label: 'Available' }, { value: 'Reserved', label: 'Reserved' }], 'Available') + '</select><span class="hint">Installment and Sold statuses are set automatically when a sale is recorded.</span></div>' +
          '<div class="field full"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Survey notes, corner beacons, access remarks…"></textarea></div>' +
        '</div></form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="plotForm">Register plot</button>'
    });
    $('[data-x="cancel"]', m.el).addEventListener('click', m.close);
    $('#plotForm', m.el).addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      if (!UI.validate(form, [
        { name: 'plotNo', required: true, msg: 'Plot number is required.' },
        { name: 'size', required: true, test: v => Number(v) >= 50, msg: 'Enter a valid plot size.' },
        { name: 'price', required: true, test: v => Number(v) >= 100000, msg: 'Enter a valid selling price.' }
      ])) return;
      const data = UI.readForm(form);
      const dup = Store.db.plots.some(p => p.projectId === data.projectId && p.plotNo.toLowerCase() === data.plotNo.trim().toLowerCase());
      if (dup) { UI.fieldError(form.elements.plotNo, 'This plot number already exists in the selected project.'); return; }
      Store.addPlot(data);
      m.close();
      UI.toast('Plot ' + data.plotNo + ' registered.');
      App.refresh();
    });
  }

  function projectModal(pr) {
    const plots = Store.plotsForProject(pr.id);
    const sales = Store.db.sales.filter(s => s.projectId === pr.id);
    const value = sales.reduce((s, x) => s + x.price, 0);
    const collected = Store.db.payments.filter(p => p.projectId === pr.id).reduce((s, p) => s + p.amount, 0);
    const m = UI.modal({
      title: pr.name,
      subtitle: pr.code + ' · ' + pr.district + ', ' + pr.region,
      size: 'xl',
      body: '<div style="display:grid;gap:18px">' +
        '<div class="kv-cards">' +
          '<div class="item"><div class="k">Plots</div><div class="v">' + plots.length + '</div></div>' +
          '<div class="item"><div class="k">Available</div><div class="v">' + plots.filter(p => p.status === 'Available').length + '</div></div>' +
          '<div class="item"><div class="k">Sales value</div><div class="v">' + UI.moneyShort(value) + '</div></div>' +
          '<div class="item"><div class="k">Collected</div><div class="v">' + UI.moneyShort(collected) + '</div></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:18px" class="proj-detail-grid">' +
          '<div><div class="panel-title">About this project</div><p class="small muted" style="line-height:1.65">' + UI.esc(pr.description) + '</p>' +
            '<dl class="kv" style="margin-top:16px"><dt>Location class</dt><dd>' + UI.esc(pr.locationClass) + '</dd><dt>Registered</dt><dd>' + UI.date(pr.createdAt) + '</dd><dt>Map file</dt><dd>' + (pr.map ? UI.esc(pr.map.name) : 'Not attached') + '</dd></dl>' +
            '<div class="notice warn" style="margin-top:14px">' + Icons.get('info') + '<div>Interactive plot mapping is not confirmed. The layout below is an illustrative prototype visualisation, not the surveyed map.</div></div></div>' +
          '<div><div class="panel-title">Illustrative plot layout</div><div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#F7F9F6;padding:8px">' + illustrativeSVG(pr) + '</div></div>' +
        '</div>' +
        '<div><div class="panel-title" style="margin-bottom:8px">Plots in this project</div>' +
          '<div class="table-wrap" style="border:1px solid var(--line);border-radius:12px;max-height:300px;overflow:auto"><table class="data"><thead><tr><th>Plot</th><th class="num">Size</th><th class="num">Price</th><th>Use</th><th>Status</th></tr></thead><tbody>' +
            plots.map(p => '<tr class="clickable" data-plot="' + p.id + '"><td class="t-main">' + UI.esc(p.plotNo) + '</td><td class="num">' + p.size + ' sqm</td><td class="num">' + UI.money(p.price) + '</td><td>' + UI.esc(p.use) + '</td><td>' + UI.badge(p.status) + '</td></tr>').join('') +
          '</tbody></table></div>' +
        '</div></div>',
      footer: '<button class="btn btn-outline" data-x="close">Close</button>' +
        '<button class="btn btn-outline" data-x="map">' + Icons.get('file') + 'View map</button>' +
        (App.can('landWrite') ? '<button class="btn btn-primary" data-x="plot">' + Icons.get('plus') + 'Add plot</button>' : '')
    });
    $('[data-x="close"]', m.el).addEventListener('click', m.close);
    $('[data-x="map"]', m.el).addEventListener('click', () => { m.close(); state.tab = 'map'; state.mapProject = pr.id; App.refresh(); });
    const addBtn = $('[data-x="plot"]', m.el);
    if (addBtn) addBtn.addEventListener('click', () => { m.close(); plotFormModal(pr.id); });
    $$('tr[data-plot]', m.el).forEach(tr => tr.addEventListener('click', () => { m.close(); plotModal(Store.plot(tr.getAttribute('data-plot'))); }));
  }

  function plotModal(p) {
    if (!p) return;
    const prj = Store.project(p.projectId);
    const s = p.saleId ? Store.sale(p.saleId) : null;
    const cust = s ? Store.customer(s.customerId) : null;
    const m = UI.modal({
      title: 'Plot ' + p.plotNo,
      subtitle: (prj ? prj.name : '') + ' · ' + p.size + ' sqm',
      size: 'md',
      body: '<div class="kv-cards" style="margin-bottom:18px">' +
          '<div class="item"><div class="k">Selling price</div><div class="v">' + UI.money(p.price) + '</div></div>' +
          '<div class="item"><div class="k">Status</div><div class="v">' + UI.badge(p.status) + '</div></div>' +
          '<div class="item"><div class="k">Intended use</div><div class="v" style="font-size:13px">' + UI.esc(p.use) + '</div></div>' +
        '</div>' +
        '<dl class="kv">' +
          '<dt>Plot number</dt><dd>' + UI.esc(p.plotNo) + '</dd>' +
          '<dt>Project</dt><dd>' + UI.esc(prj ? prj.name : '—') + '</dd>' +
          '<dt>Location</dt><dd>' + UI.esc(prj ? prj.district + ', ' + prj.region : '—') + ' · ' + UI.esc(p.locationClass) + ' classification</dd>' +
          '<dt>Registered</dt><dd>' + UI.date(p.createdAt) + '</dd>' +
          (p.notes ? '<dt>Notes</dt><dd>' + UI.esc(p.notes) + '</dd>' : '') +
        '</dl>' +
        (s ? '<div class="divider"></div><div class="panel-title">Current sale</div><dl class="kv">' +
          '<dt>Agreement</dt><dd>' + UI.esc(s.ref) + ' · ' + UI.esc(s.id) + '</dd>' +
          '<dt>Customer</dt><dd>' + UI.esc(cust ? cust.name : '—') + '</dd>' +
          '<dt>Purchase date</dt><dd>' + UI.date(s.saleDate) + '</dd>' +
          '<dt>Outstanding</dt><dd>' + UI.money(Store.saleBalance(s.id)) + '</dd>' +
        '</dl>' : '<div class="notice" style="margin-top:16px">' + Icons.get('info') + '<div>This plot is not linked to a sale record.</div></div>') +
        (p.status === 'Reserved' ? '<div class="notice warn" style="margin-top:14px">' + Icons.get('info') + '<div>This plot is reserved. Reservation approval logic is not part of the confirmed PRD requirements.</div></div>' : ''),
      footer: '<button class="btn btn-outline" data-x="close">Close</button>' +
        (s ? '<button class="btn btn-primary" data-x="plan">' + Icons.get('installments') + 'Open installment</button>' : '')
    });
    $('[data-x="close"]', m.el).addEventListener('click', m.close);
    const planBtn = $('[data-x="plan"]', m.el);
    if (planBtn) planBtn.addEventListener('click', () => {
      const plan = Store.planBySale(s.id);
      m.close();
      if (plan) App.go('/installments/' + plan.id);
      else App.go('/sales', () => global.SalesView && global.SalesView.openSale(s.id));
    });
  }

  /* ---------------- view ---------------- */
  V.land = {
    render() {
      const allowed = App.can('landWrite');
      let body;
      if (state.tab === 'plots') body = plotsHTML();
      else if (state.tab === 'map') body = mapHTML();
      else body = projectsHTML();
      return '<div class="page">' +
        tabsHTML() + body +
        '</div>';
    },

    mount(el) {
      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { state.tab = b.getAttribute('data-tab'); App.refresh(); }));

      /* project actions */
      el.addEventListener('click', (e) => {
        const addP = e.target.closest('[data-act="add-project"]');
        if (addP) { projectFormModal(null); return; }
        const addPlot = e.target.closest('[data-act="add-plot"]');
        if (addPlot) { plotFormModal(state.project !== 'all' ? state.project : null); return; }
        const upload = e.target.closest('[data-act="upload-map"]');
        if (upload) { const inp = $('#mapFileInput', el); if (inp) inp.click(); return; }
        const vp = e.target.closest('[data-view-project]');
        if (vp) { projectModal(Store.project(vp.getAttribute('data-view-project'))); return; }
        const ep = e.target.closest('[data-edit-project]');
        if (ep) { projectFormModal(Store.project(ep.getAttribute('data-edit-project'))); return; }
        const vplot = e.target.closest('[data-view-plot]');
        if (vplot) { e.stopPropagation(); plotModal(Store.plot(vplot.getAttribute('data-view-plot'))); return; }
        const row = e.target.closest('tr[data-plot]');
        if (row) { plotModal(Store.plot(row.getAttribute('data-plot'))); return; }
        const drop = e.target.closest('#uploadDrop');
        if (drop) { const inp = $('#mapFileInput', el); if (inp) inp.click(); }
      });

      /* plot filters */
      const search = $('#plotSearch', el);
      if (search) {
        const apply = () => {
          state.q = search.value;
          state.project = $('#plotProject', el).value;
          state.status = $('#plotStatus', el).value;
          state.use = $('#plotUse', el).value;
          state.loc = $('#plotLoc', el).value;
          const rows = $$('#plotTable tbody tr', el);
          let visible = 0;
          rows.forEach(r => {
            let show = true;
            if (state.project !== 'all' && r.getAttribute('data-project') !== state.project) show = false;
            if (state.status !== 'all' && r.getAttribute('data-status') !== state.status) show = false;
            if (state.use !== 'all' && r.getAttribute('data-use') !== state.use) show = false;
            if (state.loc !== 'all' && r.getAttribute('data-loc') !== state.loc) show = false;
            const q = state.q.toLowerCase().trim();
            if (q && !(r.getAttribute('data-search') || '').includes(q)) show = false;
            r.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          $('#plotCount', el).textContent = visible + ' of ' + rows.length + ' plots';
          $('#plotFoot', el).textContent = 'Showing ' + visible + ' plot' + (visible === 1 ? '' : 's');
        };
        search.addEventListener('input', UI.debounce(apply, 140));
        ['#plotProject', '#plotStatus', '#plotUse', '#plotLoc'].forEach(sel => $(sel, el).addEventListener('change', apply));
        apply();
      }

      /* map */
      const mapSelect = $('#mapProjectSelect', el);
      if (mapSelect) mapSelect.addEventListener('change', () => { state.mapProject = mapSelect.value; App.refresh(); });
      const fileInput = $('#mapFileInput', el);
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          const f = fileInput.files && fileInput.files[0];
          if (!f) return;
          const pid = state.mapProject;
          const rec = { name: f.name, size: (f.size / 1048576).toFixed(1) + ' MB', type: f.type === 'application/pdf' ? 'pdf' : 'image' };
          if (rec.type === 'image') {
            const reader = new FileReader();
            reader.onload = () => {
              mapUploads[pid] = Object.assign({ dataUrl: reader.result }, rec);
              Store.setProjectMap(pid, { name: f.name, size: rec.size });
              UI.toast('Map file attached to the project record (preview only in this session).');
              App.refresh();
            };
            reader.readAsDataURL(f);
          } else {
            mapUploads[pid] = rec;
            Store.setProjectMap(pid, { name: f.name, size: rec.size });
            UI.toast('PDF map attached. PDF preview is illustrated with the prototype layout.');
            App.refresh();
          }
        });
      }
    },

    openProject(id) {
      const pr = Store.project(id);
      if (pr) projectModal(pr);
    },
    openPlot(id) {
      const p = Store.plot(id);
      if (p) plotModal(p);
    },
    state
  };
})(window);
