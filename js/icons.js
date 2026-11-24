/* Ardhi LIMS — inline SVG icon set (feather-style, 24x24, stroke) */
(function (global) {
  'use strict';

  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    land: '<path d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    plots: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9.5h18M3 15h18M9.5 3v18M15 3v18"/>',
    customers: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3.6"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16.5 3.5a3.6 3.6 0 0 1 0 7"/>',
    sales: '<path d="M20.6 12.6 12.9 20.3a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.4.6l6.6 6.6a2 2 0 0 1 0 2.8z"/><circle cx="7.6" cy="7.6" r="1.4"/>',
    installments: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 9.5h18"/><path d="M12 13v3.2l2.2 1.3"/>',
    payments: '<path d="M20 7H5a2 2 0 0 1 0-4h13.5v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H5"/><path d="M16.5 14.5h.01"/>',
    bell: '<path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
    reports: '<path d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21"/><path d="M7.5 15.5V12M12 15.5V7.5M16.5 15.5v-5M21 15.5V5"/>',
    users: '<path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/><path d="m9 11.8 2.2 2.2 4-4.4"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.22.63.81 1.05 1.48 1.05H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.95z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    print: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1.5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    eye: '<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9.2"/><path d="m8 12.3 2.7 2.7L16 9.5"/>',
    alert: '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17.3h.01"/>',
    clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 7v5.5l3.5 2"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 8.1 5.6a1.6 1.6 0 0 0 1.8 0L21 7"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.8A8.3 8.3 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4z"/>',
    phone: '<path d="M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6A2 2 0 0 1 3.8 2h2.6a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L7.5 9.8a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.9 2z"/>',
    file: '<path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5z"/><path d="M14 2.5v6h6"/><path d="M8 13h8M8 17h5"/>',
    folder: '<path d="M22 19.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2.5 3H20a2 2 0 0 1 2 2z"/>',
    'map-pin': '<path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.8"/>',
    filter: '<path d="M22 4H2l8 9.5V20l4-2v-4.5z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1.5A6.5 6.5 0 0 1 10.5 13h3A6.5 6.5 0 0 1 20 19.5V21"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/>',
    smartphone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18.5h2"/>',
    bank: '<path d="M3 10 12 3l9 7"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9M2.5 21h19"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5h.01M18 14.5h.01"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 9.5h18"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3.5V9h-5.5"/>',
    info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 16v-4.5M12 8h.01"/>',
    external: '<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M14.5 3H21v6.5M10 14 21 3"/>',
    'more-horizontal': '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    receipt: '<path d="M5 2.5h14v19l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    send: '<path d="M21.5 2.5 11 13"/><path d="M21.5 2.5 15 21l-4-8-8-4z"/>',
    layers: '<path d="m12 2.5 9.5 5.2L12 12.9 2.5 7.7z"/><path d="m2.5 12 9.5 5.2 9.5-5.2M2.5 16.3l9.5 5.2 9.5-5.2"/>',
    'chart-line': '<path d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21"/><path d="m7 15 3.5-4 3 2.5L20 7"/>',
    'shield-check': '<path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/><path d="m8.5 11.8 2.3 2.3 4.7-5"/>',
    'device': '<rect x="2.5" y="4" width="19" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8a7 7 0 0 1-7 7z"/><path d="M2 21c0-3 1.9-5.6 5-7"/>'
  };

  function get(name, cls) {
    const body = PATHS[name] || PATHS.info;
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  global.Icons = { get, has: (n) => !!PATHS[n] };
})(window);
