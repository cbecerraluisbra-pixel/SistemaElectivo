// Super SAC Integrated Local Web System logic
// Emulates a Relational Database using LocalStorage and memory arrays.

// --- 1. Database Initialization & Seed Data (TO-BE SQLite Spec Compliance) ---
const DEFAULT_DATABASE = {
  Usuario: [
    { id_usuario: 1, nombre: 'admin', rol: 'Administrador', contrasena: 'admin123' },
    { id_usuario: 2, nombre: 'cajero', rol: 'Cajero', contrasena: 'cajero123' }
  ],
  Producto: [
    { id_producto: 101, nombre: 'Gaseosa Inka Cola 1.5L', categoria: 'Bebidas', precio: 6.50, stock: 45 },
    { id_producto: 102, nombre: 'Galletas Soda Vicio Pack', categoria: 'Abarrotes', precio: 1.20, stock: 120 },
    { id_producto: 103, nombre: 'Leche Gloria Tarro Azul', categoria: 'Lácteos', precio: 4.20, stock: 80 },
    { id_producto: 104, nombre: 'Arroz Extra Costeño 1kg', categoria: 'Abarrotes', precio: 4.80, stock: 3 }, // Low stock
    { id_producto: 105, nombre: 'Aceite Primor Premium 1L', categoria: 'Abarrotes', precio: 9.50, stock: 35 },
    { id_producto: 106, nombre: 'Detergente Opal Ultra 800g', categoria: 'Limpieza', precio: 8.50, stock: 12 },
    { id_producto: 107, nombre: 'Fideos Don Vittorio 1kg', categoria: 'Abarrotes', precio: 3.90, stock: 55 },
    { id_producto: 108, nombre: 'Café Altomayo Clásico 200g', categoria: 'Abarrotes', precio: 14.50, stock: 4 } // Low stock
  ],
  Venta: [
    { id_venta: 1001, fecha: '2026-07-09', usuario: 'admin', total: 24.20, metodo_pago: 'Tarjeta' },
    { id_venta: 1002, fecha: '2026-07-10', usuario: 'cajero', total: 12.00, metodo_pago: 'Efectivo' },
    { id_venta: 1003, fecha: '2026-07-11', usuario: 'cajero', total: 45.90, metodo_pago: 'Yape/Plin' },
    { id_venta: 1004, fecha: '2026-07-12', usuario: 'admin', total: 32.50, metodo_pago: 'Tarjeta' },
    { id_venta: 1005, fecha: '2026-07-13', usuario: 'cajero', total: 78.40, metodo_pago: 'Yape/Plin' }
  ],
  Detalle_Venta: [
    { id_detalle: 1, id_venta: 1001, producto: 'Leche Gloria Tarro Azul', cantidad: 3, subtotal: 12.60 },
    { id_detalle: 2, id_venta: 1001, producto: 'Gaseosa Inka Cola 1.5L', cantidad: 1, subtotal: 6.50 },
    { id_detalle: 3, id_venta: 1001, producto: 'Aceite Primor Premium 1L', cantidad: 1, subtotal: 9.50 },
    { id_detalle: 4, id_venta: 1002, producto: 'Galletas Soda Vicio Pack', cantidad: 10, subtotal: 12.00 }
  ],
  Reclamo: [
    { id_reclamo: 501, cliente: 'Carlos Mendoza', descripcion: 'Producto vencido (Galleta Soda)', estado: 'Pendiente', fecha: '2026-07-13' },
    { id_reclamo: 502, cliente: 'Ana María Delgado', descripcion: 'Doble cobro en pasarela de pago', estado: 'Resuelto', fecha: '2026-07-12' }
  ]
};

let db = {};

function initDB() {
  const storedDB = localStorage.getItem('SuperSAC_DB');
  if (storedDB) {
    try {
      db = JSON.parse(storedDB);
    } catch (e) {
      db = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    }
  } else {
    db = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }

  // Asegurar que la tabla Usuario exista y sea un arreglo
  if (!db.Usuario || !Array.isArray(db.Usuario)) {
    db.Usuario = JSON.parse(JSON.stringify(DEFAULT_DATABASE.Usuario));
  }

  // Garantizar que las credenciales por defecto siempre existan y sean correctas
  const defaultUsers = DEFAULT_DATABASE.Usuario;
  defaultUsers.forEach(defUser => {
    let user = db.Usuario.find(u => u.nombre.toLowerCase() === defUser.nombre.toLowerCase());
    if (!user) {
      db.Usuario.push({ ...defUser });
    } else {
      // Forzar que la contraseña y el rol sean los correctos por defecto
      user.contrasena = defUser.contrasena;
      user.rol = defUser.rol;
      if (!user.id_usuario) {
        user.id_usuario = defUser.id_usuario;
      }
    }
  });

  saveDB();
}

function saveDB() {
  localStorage.setItem('SuperSAC_DB', JSON.stringify(db));
}

// --- Toast System ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-message">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Session Management ---
let currentUser = null;

function login(username, password) {
  const user = db.Usuario.find(u => u.nombre.toLowerCase() === username.toLowerCase() && u.contrasena === password);
  if (user) {
    currentUser = user;
    sessionStorage.setItem('SuperSAC_User', JSON.stringify(user));
    showToast(`¡Bienvenido de nuevo, ${user.nombre}!`, 'success');
    return { success: true, user };
  }
  return { success: false, message: 'Usuario o contraseña incorrectos' };
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('SuperSAC_User');
  showToast('Sesión cerrada correctamente');
  
  document.getElementById('app-layout').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
  
  showView('login-view');
}

function checkSession() {
  const storedUser = sessionStorage.getItem('SuperSAC_User');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    return true;
  }
  return false;
}

// --- Routing & Navigation ---
function toggleSidebar(open) {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    if (open) {
      sidebar.classList.add('open');
      overlay.classList.add('active');
    } else {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }
  }
}

function showView(viewId) {
  toggleSidebar(false);

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(viewId);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  const headerTitle = document.getElementById('view-title');
  if (headerTitle) {
    if (viewId === 'dashboard-view') headerTitle.innerText = 'Dashboard KPI & Gestión Operativa';
    if (viewId === 'ventas-view') headerTitle.innerText = 'Punto de Venta (Registrar Boleta)';
    if (viewId === 'inventario-view') headerTitle.innerText = 'Administración de Inventario';
    if (viewId === 'reclamos-view') headerTitle.innerText = 'Control de Incidencias y Reclamos';
    if (viewId === 'consola-view') headerTitle.innerText = 'Consola Relacional SQLite Integrada';
  }

  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
    const btn = item.querySelector('button');
    if (btn && btn.getAttribute('onclick').includes(viewId)) {
      item.classList.add('active');
    }
  });

  if (viewId === 'dashboard-view') {
    renderDashboard();
  } else if (viewId === 'ventas-view') {
    initVentasModule();
  } else if (viewId === 'inventario-view') {
    renderInventario();
  } else if (viewId === 'reclamos-view') {
    renderReclamos();
  } else if (viewId === 'consola-view') {
    initConsoleView();
  }
}

// --- Dashboard KPIs (Strict PAF Metric Layout) ---
function renderDashboard() {
  // 1. Producción
  const totalVentasRealizadas = db.Venta.length;
  document.getElementById('kpi-ventas-realizadas').innerText = totalVentasRealizadas;
  document.getElementById('kpi-clientes-atendidos').innerText = totalVentasRealizadas;

  // 2. Productividad
  const ventasCajero = db.Venta.filter(v => v.usuario === 'cajero').length;
  const ventasAdmin = db.Venta.filter(v => v.usuario === 'admin').length;
  document.getElementById('kpi-ventas-cajero').innerText = `Cajero: ${ventasCajero} / Admin: ${ventasAdmin}`;
  document.getElementById('kpi-productos-registrados').innerText = db.Producto.length;

  // 3. Eficacia
  document.getElementById('kpi-ventas-sin-errores').innerText = '100%';
  const reclamosResueltos = db.Reclamo.filter(r => r.estado === 'Resuelto').length;
  const totalReclamos = db.Reclamo.length;
  document.getElementById('kpi-reclamos-solucionados').innerText = `${reclamosResueltos} de ${totalReclamos}`;

  // 4. Eficiencia
  document.getElementById('kpi-tiempo-atencion').innerText = '2.1 min';
  document.getElementById('kpi-errores-cobro').innerText = '0';

  // Build Recent Sales Table
  const tbodySales = document.getElementById('recent-sales-tbody');
  tbodySales.innerHTML = '';
  const recentVentas = [...db.Venta].reverse().slice(0, 5);
  recentVentas.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>B001-${v.id_venta}</strong></td>
      <td>${v.fecha}</td>
      <td><strong>S/. ${parseFloat(v.total).toFixed(2)}</strong></td>
      <td><span class="badge badge-info">${v.metodo_pago}</span></td>
    `;
    tbodySales.appendChild(tr);
  });

  // Build Low Stock Table
  const tbodyStock = document.getElementById('low-stock-tbody');
  tbodyStock.innerHTML = '';
  const lowStockProducts = db.Producto.filter(p => p.stock <= 5);
  if (lowStockProducts.length === 0) {
    tbodyStock.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">No hay alertas de stock.</td></tr>`;
  } else {
    lowStockProducts.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.nombre}</strong></td>
        <td><strong style="color: var(--danger);">${p.stock} uds</strong></td>
        <td><span class="badge badge-danger">Bajo Stock</span></td>
      `;
      tbodyStock.appendChild(tr);
    });
  }

  drawSalesChart();
}

function drawSalesChart() {
  const chartWrapper = document.getElementById('sales-chart-wrapper');
  if (!chartWrapper) return;

  const width = 500;
  const height = 150;
  const padding = 20;

  const sales = db.Venta.slice(-6);
  if (sales.length === 0) return;

  const maxVal = Math.max(...sales.map(s => s.total)) * 1.2;
  const points = sales.map((s, index) => {
    const x = padding + (index * (width - 2 * padding) / (sales.length - 1));
    const y = height - padding - (s.total * (height - 2 * padding) / maxVal);
    return { x, y, val: s.total, label: s.fecha.substring(5) };
  });

  let svgPath = `M ${points[0].x} ${points[0].y}`;
  let fillPath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    svgPath += ` L ${points[i].x} ${points[i].y}`;
  }
  fillPath = svgPath + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  let svgElements = `
    <svg viewBox="0 0 ${width} ${height}" class="svg-chart">
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#f1f5f9" stroke-width="1.5" />
      <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
      <path d="${fillPath}" fill="url(#chart-grad)" />
      <path d="${svgPath}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" />
  `;

  points.forEach(p => {
    svgElements += `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" stroke="#4f46e5" stroke-width="2.5" />
      <text x="${p.x}" y="${p.y - 10}" font-family="Plus Jakarta Sans" font-size="10" font-weight="700" fill="#4f46e5" text-anchor="middle">S/. ${p.val.toFixed(1)}</text>
      <text x="${p.x}" y="${height - 4}" font-family="Plus Jakarta Sans" font-size="10" font-weight="500" fill="#94a3b8" text-anchor="middle">${p.label}</text>
    `;
  });

  svgElements += `</svg>`;
  chartWrapper.innerHTML = svgElements;
}

// --- POS Sales Module ---
let cart = [];

function initVentasModule() {
  cart = [];
  renderCart();
  renderCatalog();
}

function renderCatalog(filter = '') {
  const container = document.getElementById('product-catalog');
  container.innerHTML = '';

  const filtered = db.Producto.filter(p =>
    p.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    p.id_producto.toString().includes(filter)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 24px; font-weight: 600;">No se encontraron productos</div>`;
    return;
  }

  filtered.forEach(p => {
    const isLow = p.stock <= 5;
    const item = document.createElement('div');
    item.className = 'product-item';
    item.onclick = () => addToCart(p.id_producto);
    item.innerHTML = `
      <div class="product-item-name">${p.nombre}</div>
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Categoría: ${p.categoria}</div>
      <div class="product-item-meta">
        <div class="product-item-price">S/. ${p.precio.toFixed(2)}</div>
        <div class="product-item-stock" style="color: ${isLow ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
          Stock: ${p.stock}
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function addToCart(productId) {
  const prod = db.Producto.find(p => p.id_producto === productId);
  if (!prod) return;

  if (prod.stock <= 0) {
    showToast(`El producto ${prod.nombre} está agotado.`, 'danger');
    return;
  }

  const existing = cart.find(item => item.id_producto === productId);
  if (existing) {
    if (existing.qty + 1 > prod.stock) {
      showToast(`Cantidad supera stock disponible.`, 'warning');
      return;
    }
    existing.qty++;
  } else {
    cart.push({ ...prod, qty: 1 });
  }
  showToast(`Agregado: ${prod.nombre}`);
  renderCart();
}

function updateCartQty(productId, amount) {
  const item = cart.find(i => i.id_producto === productId);
  if (!item) return;

  const prod = db.Producto.find(p => p.id_producto === productId);

  item.qty += amount;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id_producto !== productId);
    showToast(`Eliminado del carrito`);
  } else if (item.qty > prod.stock) {
    showToast(`Stock máximo alcanzado`, 'warning');
    item.qty = prod.stock;
  }
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cart-items-list');
  list.innerHTML = '';

  if (cart.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px; font-weight:600;">El carrito está vacío</div>`;
    document.getElementById('cart-subtotal').innerText = 'S/. 0.00';
    document.getElementById('cart-igv').innerText = 'S/. 0.00';
    document.getElementById('cart-total').innerText = 'S/. 0.00';
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    const itemTotal = item.precio * item.qty;
    subtotal += itemTotal;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-name">${item.nombre}</div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="updateCartQty(${item.id_producto}, -1)">-</button>
        <span style="font-weight:700;">${item.qty}</span>
        <button class="qty-btn" onclick="updateCartQty(${item.id_producto}, 1)">+</button>
      </div>
      <div class="cart-item-price">S/. ${itemTotal.toFixed(2)}</div>
    `;
    list.appendChild(div);
  });

  const igv = subtotal * 0.18;

  document.getElementById('cart-subtotal').innerText = `S/. ${(subtotal - igv).toFixed(2)}`;
  document.getElementById('cart-igv').innerText = `S/. ${igv.toFixed(2)}`;
  document.getElementById('cart-total').innerText = `S/. ${subtotal.toFixed(2)}`;
}

function processSale() {
  if (cart.length === 0) {
    showToast('El carrito está vacío', 'warning');
    return;
  }

  const newVentaId = db.Venta.length > 0 ? Math.max(...db.Venta.map(v => v.id_venta)) + 1 : 1001;
  const totalAmount = cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
  const today = new Date().toISOString().split('T')[0];
  const paymentMethod = document.getElementById('cart-payment-method').value;

  const newVenta = {
    id_venta: newVentaId,
    fecha: today,
    usuario: currentUser ? currentUser.nombre : 'cajero',
    total: parseFloat(totalAmount.toFixed(2)),
    metodo_pago: paymentMethod
  };

  let newDetailId = db.Detalle_Venta.length > 0 ? Math.max(...db.Detalle_Venta.map(d => d.id_detalle)) + 1 : 1;

  cart.forEach(item => {
    db.Detalle_Venta.push({
      id_detalle: newDetailId++,
      id_venta: newVentaId,
      producto: item.nombre,
      cantidad: item.qty,
      subtotal: parseFloat((item.precio * item.qty).toFixed(2))
    });

    const originalProd = db.Producto.find(p => p.id_producto === item.id_producto);
    if (originalProd) {
      originalProd.stock -= item.qty;
    }
  });

  db.Venta.push(newVenta);
  saveDB();

  showToast('¡Venta realizada con éxito!', 'success');
  showTicketModal(newVenta, cart);
  initVentasModule();
}

function showTicketModal(venta, items) {
  const modal = document.getElementById('ticket-modal');
  const ticketContent = document.getElementById('ticket-content');

  const itemsHtml = items.map(item => `
    <div class="ticket-row">
      <span>${item.qty} x ${item.nombre.substring(0, 16)}</span>
      <span>S/. ${(item.precio * item.qty).toFixed(2)}</span>
    </div>
  `).join('');

  ticketContent.innerHTML = `
    <div class="ticket-header">
      <h3>SUPER SAC</h3>
      <p style="font-size: 11px;">R.U.C. 20789456123</p>
      <p style="font-size: 11px;">Av. Universitaria 1250, San Miguel</p>
      <p style="margin-top: 8px; font-weight: bold; text-transform: uppercase;">Boleta Electrónica</p>
      <p><strong>N°: B001-${venta.id_venta}</strong></p>
    </div>
    <div class="ticket-body">
      <p>Fecha: ${venta.fecha} ${new Date().toLocaleTimeString()}</p>
      <p>Cajero: ${venta.usuario}</p>
      <p>Método de Pago: ${venta.metodo_pago}</p>
      <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
      ${itemsHtml}
    </div>
    <div class="ticket-footer">
      <div class="ticket-row" style="font-weight: bold; font-size: 14px;">
        <span>TOTAL A PAGAR</span>
        <span>S/. ${venta.total.toFixed(2)}</span>
      </div>
      <p style="text-align: center; margin-top: 14px; font-size: 10px; color:#555;">¡Gracias por su preferencia!</p>
    </div>
  `;

  modal.classList.add('active');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').classList.remove('active');
}

// --- Inventory Module ---
function renderInventario() {
  const tbody = document.getElementById('inventory-tbody');
  tbody.innerHTML = '';

  db.Producto.forEach(p => {
    const isLow = p.stock <= 5;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${p.id_producto}</strong></td>
      <td><strong>${p.nombre}</strong><br><span style="font-size:11px;color:var(--text-muted);">Categoría: ${p.categoria}</span></td>
      <td><strong>S/. ${p.precio.toFixed(2)}</strong></td>
      <td>
        <span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">
          ${p.stock} unidades
        </span>
      </td>
      <td>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px; width: auto;" onclick="openEditStockModal(${p.id_producto})">
          Ajustar Stock
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

let selectedProductId = null;
function openEditStockModal(productId) {
  const prod = db.Producto.find(p => p.id_producto === productId);
  if (!prod) return;

  selectedProductId = productId;
  document.getElementById('edit-stock-product-name').innerText = prod.nombre;
  document.getElementById('edit-stock-input').value = prod.stock;
  document.getElementById('inventory-modal').classList.add('active');
}

function closeInventoryModal() {
  document.getElementById('inventory-modal').classList.remove('active');
}

function saveStockAdjustment() {
  const newStock = parseInt(document.getElementById('edit-stock-input').value);
  if (isNaN(newStock) || newStock < 0) {
    showToast('Stock inválido', 'danger');
    return;
  }

  const prod = db.Producto.find(p => p.id_producto === selectedProductId);
  if (prod) {
    prod.stock = newStock;
    saveDB();
    closeInventoryModal();
    renderInventario();
    showToast(`Stock de ${prod.nombre} actualizado a ${newStock}`, 'success');
  }
}

function openAddProductModal() {
  document.getElementById('new-product-name').value = '';
  document.getElementById('new-product-category').value = 'Abarrotes';
  document.getElementById('new-product-price').value = '';
  document.getElementById('new-product-stock').value = '';
  document.getElementById('add-product-modal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('add-product-modal').classList.remove('active');
}

function saveNewProduct() {
  const name = document.getElementById('new-product-name').value.trim();
  const category = document.getElementById('new-product-category').value;
  const price = parseFloat(document.getElementById('new-product-price').value);
  const stock = parseInt(document.getElementById('new-product-stock').value);

  if (!name || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
    showToast('Datos del producto incompletos', 'warning');
    return;
  }

  const nextId = db.Producto.length > 0 ? Math.max(...db.Producto.map(p => p.id_producto)) + 1 : 101;
  db.Producto.push({
    id_producto: nextId,
    nombre: name,
    categoria: category,
    precio: price,
    stock: stock
  });

  saveDB();
  closeAddProductModal();
  renderInventario();
  showToast(`Producto '${name}' creado correctamente.`, 'success');
}

// --- Claims Management ---
function renderReclamos() {
  const tbody = document.getElementById('reclaims-tbody');
  tbody.innerHTML = '';

  const isAdmin = currentUser && currentUser.rol === 'Administrador';

  db.Reclamo.forEach(r => {
    const isResolved = r.estado === 'Resuelto';
    const tr = document.createElement('tr');
    
    let actionHtml = '';
    if (isResolved) {
      actionHtml = `<span style="font-size: 13px; color: var(--text-muted); font-weight:600;">Resuelto (${r.fecha})</span>`;
    } else if (isAdmin) {
      actionHtml = `
        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px; width: auto;" onclick="resolveReclaim(${r.id_reclamo})">
          Marcar Resuelto
        </button>
      `;
    } else {
      actionHtml = `<span style="font-size: 13px; color: var(--text-muted); font-weight:600;">Pendiente de revisión</span>`;
    }

    tr.innerHTML = `
      <td><strong>#${r.id_reclamo}</strong></td>
      <td>${r.cliente}</td>
      <td>${r.descripcion}</td>
      <td>
        <span class="badge ${isResolved ? 'badge-success' : 'badge-warning'}">
          ${r.estado}
        </span>
      </td>
      <td>
        ${actionHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function resolveReclaim(id) {
  const reclaim = db.Reclamo.find(r => r.id_reclamo === id);
  if (reclaim) {
    reclaim.estado = 'Resuelto';
    reclaim.fecha = new Date().toISOString().split('T')[0];
    saveDB();
    renderReclamos();
    showToast(`Reclamo #${id} marcado como Resuelto`, 'success');
  }
}

function openAddReclaimModal() {
  document.getElementById('reclaim-client').value = '';
  document.getElementById('reclaim-desc').value = '';
  document.getElementById('reclaim-modal').classList.add('active');
}

function closeReclaimModal() {
  document.getElementById('reclaim-modal').classList.remove('active');
}

function saveNewReclaim() {
  const client = document.getElementById('reclaim-client').value.trim();
  const desc = document.getElementById('reclaim-desc').value.trim();

  if (!client || !desc) {
    showToast('Llene todos los datos del reclamo.', 'warning');
    return;
  }

  const nextId = db.Reclamo.length > 0 ? Math.max(...db.Reclamo.map(r => r.id_reclamo)) + 1 : 501;
  db.Reclamo.push({
    id_reclamo: nextId,
    cliente: client,
    descripcion: desc,
    estado: 'Pendiente',
    fecha: new Date().toISOString().split('T')[0]
  });

  saveDB();
  closeReclaimModal();
  renderReclamos();
  showToast('Reclamo registrado satisfactoriamente', 'success');
}

// --- Interactive SQLite Console & Visual Database Inspector ---
function initConsoleView() {
  const consoleBody = document.getElementById('console-body');
  consoleBody.innerHTML = `
<div class="console-output-line" style="color: #94a3b8;">SQLite database engine v3.42.0 emulation initialized.</div>
<div class="console-output-line" style="color: #6366f1;">BaseDatos/SuperSAC.db connected successfully.</div>
<div class="console-output-line">Type SQL query and press Enter. Available tables: [Usuario, Producto, Venta, Detalle_Venta, Reclamo]</div>
  `;
  renderDBTableViewer('Producto');
}

function renderDBTableViewer(tableName) {
  document.querySelectorAll('.db-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.innerText === tableName) btn.classList.add('active');
  });

  const headersDiv = document.getElementById('db-table-headers');
  const bodyDiv = document.getElementById('db-table-body');

  headersDiv.innerHTML = '';
  bodyDiv.innerHTML = '';

  const records = db[tableName];
  if (!records || records.length === 0) {
    headersDiv.innerHTML = '<th>No hay registros</th>';
    return;
  }

  const keys = Object.keys(records[0]);
  keys.forEach(k => {
    const th = document.createElement('th');
    th.innerText = k;
    headersDiv.appendChild(th);
  });

  records.forEach(row => {
    const tr = document.createElement('tr');
    keys.forEach(k => {
      const td = document.createElement('td');
      td.innerText = row[k];
      tr.appendChild(td);
    });
    bodyDiv.appendChild(tr);
  });
}

function handleConsoleKey(event) {
  if (event.key === 'Enter') {
    const input = document.getElementById('console-input');
    const query = input.value.trim();
    if (!query) return;

    executeSQLQuery(query);
    input.value = '';
  }
}

function runQuickQuery(query) {
  executeSQLQuery(query);
}

function executeSQLQuery(sql) {
  const consoleBody = document.getElementById('console-body');

  const queryLine = document.createElement('div');
  queryLine.className = 'console-output-line';
  queryLine.innerHTML = `<span class="console-prompt">sqlite&gt;</span> ${sql}`;
  consoleBody.appendChild(queryLine);

  let outputText = '';
  try {
    const cleanSql = sql.replace(/;$/, '').trim();
    const tokens = cleanSql.split(/\s+/);
    const command = tokens[0].toUpperCase();

    if (command === 'SELECT') {
      const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
      if (fromIndex === -1) throw new Error('Sintaxis incorrecta. Falta palabra clave FROM');

      const tableName = tokens[fromIndex + 1];
      const cleanTableName = tableName.replace(/[^a-zA-Z_]/g, '');

      if (!db[cleanTableName]) {
        throw new Error(`Tabla no encontrada: '${cleanTableName}'`);
      }

      let data = db[cleanTableName];

      const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
      if (whereIndex !== -1) {
        const col = tokens[whereIndex + 1];
        const val = tokens.slice(whereIndex + 3).join(' ').replace(/['"]/g, '');

        data = data.filter(row => {
          return row[col] !== undefined && row[col].toString().toLowerCase() === val.toLowerCase();
        });
      }

      if (data.length === 0) {
        outputText = '--- 0 filas retornadas ---';
      } else {
        const keys = Object.keys(data[0]);
        let tableHeader = keys.join(' | ');
        let separator = keys.map(k => '-'.repeat(k.length)).join('-+-');
        let rowsText = data.map(row => keys.map(k => row[k]).join(' | ')).join('\n');

        outputText = `${tableHeader}\n${separator}\n${rowsText}\n\n(${data.length} filas seleccionadas)`;
      }
    } else if (command === 'UPDATE') {
      const tableName = tokens[1];
      if (!db[tableName]) throw new Error(`Tabla no encontrada: '${tableName}'`);

      const setIndex = tokens.findIndex(t => t.toUpperCase() === 'SET');
      const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');

      if (setIndex === -1 || whereIndex === -1) {
        throw new Error('Sintaxis UPDATE recomendada: UPDATE Tabla SET columna = valor WHERE columna = valor');
      }

      const setCol = tokens[setIndex + 1];
      const setVal = tokens[setIndex + 3].replace(/['"]/g, '');

      const whereCol = tokens[whereIndex + 1];
      const whereVal = tokens[whereIndex + 3].replace(/['"]/g, '');

      let updatedCount = 0;
      db[tableName].forEach(row => {
        if (row[whereCol] !== undefined && row[whereCol].toString() === whereVal) {
          if (!isNaN(setVal)) {
            row[setCol] = Number(setVal);
          } else {
            row[setCol] = setVal;
          }
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        saveDB();
        renderDBTableViewer(tableName);
        showToast('Base de datos modificada por SQL');
        outputText = `Consulta OK, ${updatedCount} fila(s) afectada(s).`;
      } else {
        outputText = `Consulta OK, 0 filas afectadas.`;
      }
    } else {
      outputText = `Error: Comando '${command}' no implementado en el emulador local. Use SELECT o UPDATE.`;
    }
  } catch (e) {
    outputText = `Error SQL: ${e.message}`;
  }

  const resultLine = document.createElement('pre');
  resultLine.className = 'console-output-line';
  resultLine.style.color = '#34d399';
  resultLine.innerText = outputText;
  consoleBody.appendChild(resultLine);

  consoleBody.scrollTop = consoleBody.scrollHeight;
}
