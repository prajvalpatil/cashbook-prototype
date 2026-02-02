/**
 * app.js
 * Core application logic: Routing, UI Updates, Event Listeners
 */

const App = {
    currentUser: null,
    currentProjectId: null,
    editingEntryId: null,
    editingFormKind: null, // 'cash_in' | 'material' | 'labor' | 'service'
    editingExistingAttachment: null,

    init: function() {
        this.currentUser = Storage.getCurrentUser();
        if (this.currentUser) {
            this.showApp();
        } else {
            this.showLogin();
        }
        this.bindEvents();
    },

    bindEvents: function() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const role = document.getElementById('login-role').value;
            
            const user = Storage.login(username, password, role);
            if (user) {
                this.currentUser = user;
                this.showApp();
            } else {
                alert('Invalid credentials or role!');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            Storage.logout();
            this.currentUser = null;
            this.showLogin();
        });

        // Mobile Sidebar Toggle
        const navToggler = document.querySelector('.navbar-toggler');
        if (navToggler) {
            navToggler.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(sidebar, { toggle: false });
                    bsCollapse.toggle();
                }
            });
        }

        // Navigation
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Remove active class from all
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                // Add active to current
                e.currentTarget.classList.add('active');
                
                const page = e.currentTarget.dataset.page;
                this.navigate(page);

                // Mobile: Close sidebar after selection
                if (window.innerWidth < 768) {
                    const sidebar = document.getElementById('sidebar');
                    const navbarNav = document.getElementById('navbarNav');
                    
                    if (sidebar && sidebar.classList.contains('show')) {
                        const bsCollapse = bootstrap.Collapse.getInstance(sidebar) || new bootstrap.Collapse(sidebar, { toggle: false });
                        bsCollapse.hide();
                    }
                    if (navbarNav && navbarNav.classList.contains('show')) {
                         const bsCollapseNav = bootstrap.Collapse.getInstance(navbarNav) || new bootstrap.Collapse(navbarNav, { toggle: false });
                         bsCollapseNav.hide();
                    }
                }
            });
        });

        // Project Selection
        document.getElementById('global-project-select').addEventListener('change', (e) => {
            this.currentProjectId = e.target.value;
            this.refreshCurrentView();
        });

        // Add Project
        document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const project = {
                name: formData.get('name'),
                owner: formData.get('owner'),
                location: formData.get('location'),
                startDate: formData.get('startDate'),
                createdBy: this.currentUser.username
            };
            Storage.addProject(project);
            bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
            e.target.reset();
            this.loadProjects(); // Reload dropdown
            this.refreshCurrentView(); // If on projects page, reload
            alert('Project created successfully!');
        });

        // Add / Edit Cash In
        document.getElementById('cash-in-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashInModal', 'cash_in');
        });

        // Add / Edit Cash Out (Material, Labor, Service)
        document.getElementById('material-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashOutModal', 'material');
        });
        document.getElementById('labor-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashOutModal', 'labor');
        });
        document.getElementById('service-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashOutModal', 'service');
        });

        // Add Payment
        document.getElementById('payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePaymentSubmit(e.target);
        });

        // Auto-calculation logic for forms
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('calc-trigger')) {
                const form = e.target.closest('form');
                if (form) this.calculateFormTotals(form);
            }
        });

        // Reset Cash Out Modal Tabs on Open
        const cashOutModal = document.getElementById('addCashOutModal');
        if (cashOutModal) {
            cashOutModal.addEventListener('show.bs.modal', () => {
                // Manually reset all tab states to avoid "appending" issues
                document.querySelectorAll('#pills-tab .nav-link').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('#pills-tabContent .tab-pane').forEach(el => el.classList.remove('show', 'active'));

                // Activate the first tab (Material)
                const triggerEl = document.querySelector('#pills-tab button[data-bs-target="#pill-material"]');
                if (triggerEl) {
                    // Pre-set classes for visual consistency
                    triggerEl.classList.add('active');
                    const targetPane = document.querySelector(triggerEl.dataset.bsTarget);
                    if (targetPane) targetPane.classList.add('show', 'active');

                    const tab = bootstrap.Tab.getInstance(triggerEl) || new bootstrap.Tab(triggerEl);
                    tab.show();
                }
                
                // Reset forms
                document.getElementById('material-form').reset();
                document.getElementById('labor-form').reset();
                document.getElementById('service-form').reset();
                
                // Reset Steel Table visibility
                const materialForm = document.getElementById('material-form');
                if (materialForm) {
                    materialForm.querySelector('#default-material-inputs').classList.remove('d-none');
                    materialForm.querySelector('#steel-material-inputs').classList.add('d-none');
                    materialForm.querySelector('#steel-input-tbody').innerHTML = ''; // Clear table
                }

                // Populate Dropdowns
                this.updatePartyDropdowns();
                this.updateMaterialDropdowns();
            });

            // Clear edit state on close
            cashOutModal.addEventListener('hidden.bs.modal', () => {
                this.clearEditState();
            });
        }

        // Clear edit state on cash-in modal close
        const cashInModal = document.getElementById('addCashInModal');
        if (cashInModal) {
            cashInModal.addEventListener('hidden.bs.modal', () => {
                this.clearEditState();
            });
        }

        // File Upload
        document.getElementById('upload-file-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFileUpload(e.target);
        });

        // File Filtering
        document.querySelectorAll('#fileFilters .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#fileFilters .nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
                this.renderFiles(e.target.dataset.filter);
            });
        });

        // Add Party Button Handler
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.add-party-btn')) {
                const btn = e.target.closest('.add-party-btn');
                const type = btn.dataset.type;
                const typeLabel = type === 'supplier' ? 'Supplier' : 'Labor';
                
                const name = prompt(`Enter new ${typeLabel} name:`);
                if (name && name.trim()) {
                    const newParty = Storage.addParty({
                        name: name.trim(),
                        type: type
                    });
                    
                    if (newParty) {
                        this.updatePartyDropdowns();
                        // Select the new party in the specific dropdown associated with the button
                        const select = btn.previousElementSibling;
                        if (select) {
                            select.value = newParty.name;
                        }
                    }
                }
            } else if (e.target.closest('.add-material-btn')) {
                const btn = e.target.closest('.add-material-btn');
                const name = prompt('Enter new Material name:');
                if (name && name.trim()) {
                    const newMat = Storage.addMaterial(name.trim());
                    if (newMat) {
                        this.updateMaterialDropdowns();
                        const select = btn.previousElementSibling;
                        if (select) {
                            select.value = newMat; // Fixed: newMat is a string
                            select.dispatchEvent(new Event('change'));
                        }
                    }
                }
            }
        });

        // Material Select Change Handler
        document.body.addEventListener('change', (e) => {
            if (e.target.classList.contains('material-select')) {
                const materialName = e.target.value;
                const form = e.target.closest('form');
                const defaultInputs = form.querySelector('#default-material-inputs');
                const steelInputs = form.querySelector('#steel-material-inputs');
                const tilesInputs = form.querySelector('#tiles-material-inputs');
                const graniteInputs = form.querySelector('#granite-material-inputs');
                
                // Hide all first
                defaultInputs.classList.add('d-none');
                steelInputs.classList.add('d-none');
                if (tilesInputs) tilesInputs.classList.add('d-none');
                if (graniteInputs) graniteInputs.classList.add('d-none');

                // Remove required from default inputs
                defaultInputs.querySelectorAll('input').forEach(i => i.removeAttribute('required'));

                if (materialName.toLowerCase() === 'steel') {
                    steelInputs.classList.remove('d-none');
                    this.renderSteelTable(form);
                } else if (materialName.toLowerCase() === 'tiles') {
                    if (tilesInputs) {
                        tilesInputs.classList.remove('d-none');
                        this.renderTilesTable(form);
                    }
                } else if (materialName.toLowerCase() === 'granite') {
                    if (graniteInputs) {
                        graniteInputs.classList.remove('d-none');
                        this.renderGraniteTable(form);
                    }
                } else {
                    defaultInputs.classList.remove('d-none');
                    // Add required back to default inputs (quantity and rate)
                    form.querySelector('[name="quantity"]').setAttribute('required', 'true');
                    form.querySelector('[name="rate"]').setAttribute('required', 'true');
                }
                // Clear amounts
                const amountInput = form.querySelector('[name="amount"]');
                if (amountInput) amountInput.value = '';
            }
        });

        // Tiles Add Row Button
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#add-tiles-row-btn')) {
                const form = e.target.closest('form');
                this.addTilesRow(form);
            }
            // Remove Tiles Row
            if (e.target.closest('.remove-tiles-row')) {
                const row = e.target.closest('tr');
                row.remove();
                // Re-index Sr.No
                const tbody = document.getElementById('tiles-input-tbody');
                Array.from(tbody.children).forEach((tr, index) => {
                    tr.querySelector('.sr-no').textContent = index + 1;
                });
                // Recalculate
                const form = tbody.closest('form');
                this.calculateFormTotals(form);
            }
        });

        // Granite Add Row Button
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#add-granite-row-btn')) {
                const form = e.target.closest('form');
                this.addGraniteRow(form);
            }
            if (e.target.closest('.remove-granite-row')) {
                const row = e.target.closest('tr');
                row.remove();
                const tbody = document.getElementById('granite-input-tbody');
                Array.from(tbody.children).forEach((tr, index) => {
                    tr.querySelector('.sr-no').textContent = index + 1;
                });
                const form = tbody.closest('form');
                this.calculateFormTotals(form);
            }
        });

        // Auto-calculate for Tiles inputs
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('tiles-calc-trigger')) {
                const row = e.target.closest('tr');
                if (row) {
                    const w = parseFloat(row.querySelector('.tiles-w').value || 0);
                    const h = parseFloat(row.querySelector('.tiles-h').value || 0);
                    const boxes = parseFloat(row.querySelector('.tiles-boxes').value || 0);
                    const rate = parseFloat(row.querySelector('.tiles-rate').value || 0);
                    
                    // Auto populate total sq.ft (size W×H)
                    const totalSqFt = w * h;
                    row.querySelector('.tiles-sqft').value = totalSqFt > 0 ? totalSqFt.toFixed(2) : '';
                    
                    // Total = Rate * No. of Box * Total Sq.ft (like Granite)
                    const totalArea = totalSqFt * boxes;
                    const total = totalArea * rate;
                    row.querySelector('.tiles-total').value = total > 0 ? total.toFixed(2) : '';
                    
                    const form = row.closest('form');
                    this.calculateFormTotals(form);
                }
            }
        });

        // Auto-calculate for Granite inputs
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('granite-calc-trigger')) {
                const row = e.target.closest('tr');
                if (row) {
                    const w = parseFloat(row.querySelector('.granite-w').value || 0);
                    const h = parseFloat(row.querySelector('.granite-h').value || 0);
                    const nos = parseFloat(row.querySelector('.granite-nos').value || 0);
                    const rate = parseFloat(row.querySelector('.granite-rate').value || 0);

                    // Total Size (W×H) -> reflected in Total Sq.ft (per piece)
                    const sizeSqFt = w * h;
                    row.querySelector('.granite-sqft').value = sizeSqFt > 0 ? sizeSqFt.toFixed(2) : '';

                    // Monetary total still considers number of pieces
                    const totalArea = sizeSqFt * nos;
                    const total = totalArea * rate;
                    row.querySelector('.granite-total').value = total > 0 ? total.toFixed(2) : '';

                    const form = row.closest('form');
                    this.calculateFormTotals(form);
                }
            }
        });
    },

    updatePartyDropdowns: function() {
        const parties = Storage.getParties();
        
        document.querySelectorAll('.party-select').forEach(select => {
            const type = select.dataset.type;
            const currentVal = select.value;
            
            // Clear except first
            select.innerHTML = '<option value="">Select ' + (type === 'supplier' ? 'Supplier' : 'Worker') + '</option>';
            
            parties.filter(p => p.type === type).forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                option.textContent = p.name;
                select.appendChild(option);
            });
            
            if (currentVal) {
                select.value = currentVal;
            }
        });
    },

    updateMaterialDropdowns: function() {
        const materials = Storage.getMaterials();
        document.querySelectorAll('.material-select').forEach(select => {
            const currentVal = select.value;
            select.innerHTML = '<option value="">Select Material</option>';
            materials.forEach(m => {
                const option = document.createElement('option');
                option.value = m;
                option.textContent = m;
                select.appendChild(option);
            });
            if (currentVal) select.value = currentVal;
        });
    },

    renderSteelTable: function(form) {
        const tbody = form.querySelector('#steel-input-tbody');
        if (!tbody) return;
        
        if (tbody.children.length === 0) {
            const standardDias = [6, 8, 10, 12, 16, 20, 25, 32, 40];
            standardDias.forEach(dia => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dia}mm</td>
                    <td><input type="number" class="form-control form-control-sm steel-nos calc-trigger" data-dia="${dia}" placeholder="No's"></td>
                    <td><input type="number" step="0.01" class="form-control form-control-sm steel-kg calc-trigger" placeholder="Kg"></td>
                    <td><input type="number" step="0.01" class="form-control form-control-sm steel-rate calc-trigger" placeholder="Rate"></td>
                    <td><input type="text" class="form-control form-control-sm steel-total" readonly></td>
                `;
                tbody.appendChild(tr);
            });
        }
    },

    renderTilesTable: function(form) {
        const tbody = form.querySelector('#tiles-input-tbody');
        if (!tbody) return;
        
        if (tbody.children.length === 0) {
            this.addTilesRow(form);
        }
    },

    addTilesRow: function(form) {
        const tbody = form.querySelector('#tiles-input-tbody');
        if (!tbody) return;

        const rowCount = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center sr-no">${rowCount}</td>
            <td><input type="text" class="form-control form-control-sm tiles-room" placeholder="Room"></td>
            <td><input type="number" class="form-control form-control-sm tiles-boxes tiles-calc-trigger" placeholder="Box"></td>
            <td><input type="text" class="form-control form-control-sm tiles-name" placeholder="Name"></td>
            <td>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control tiles-w tiles-calc-trigger" min=0>
                    <span class="input-group-text">x</span>
                    <input type="number" class="form-control tiles-h tiles-calc-trigger" min=0>
                </div>
            </td>
            <td><input type="text" class="form-control form-control-sm tiles-sqft" readonly></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm tiles-rate tiles-calc-trigger" placeholder="Rate"></td>
            <td><input type="text" class="form-control form-control-sm tiles-total" readonly></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger remove-tiles-row">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },
    
    renderGraniteTable: function(form) {
        const tbody = form.querySelector('#granite-input-tbody');
        if (!tbody) return;
        if (tbody.children.length === 0) {
            this.addGraniteRow(form);
        }
    },
    
    addGraniteRow: function(form) {
        const tbody = form.querySelector('#granite-input-tbody');
        if (!tbody) return;
        const rowCount = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center sr-no">${rowCount}</td>
            <td><input type="text" class="form-control form-control-sm granite-name" placeholder="Name"></td>
            <td><input type="number" class="form-control form-control-sm granite-nos granite-calc-trigger" placeholder="Nos"></td>
            <td>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control granite-w granite-calc-trigger">
                    <span class="input-group-text">x</span>
                    <input type="number" class="form-control granite-h granite-calc-trigger">
                </div>
            </td>
            <td><input type="text" class="form-control form-control-sm granite-sqft" readonly></td>
            <td><input type="number" step="0.01" class="form-control form-control-sm granite-rate granite-calc-trigger" placeholder="Rate"></td>
            <td><input type="text" class="form-control form-control-sm granite-total" readonly></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger remove-granite-row">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    showLogin: function() {
        document.getElementById('login-section').classList.remove('d-none');
        document.getElementById('app-container').classList.add('d-none');
    },

    showApp: function() {
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('app-container').classList.remove('d-none');
        
        document.getElementById('user-display').textContent = `Welcome, ${this.currentUser.name} (${this.currentUser.role})`;
        
        // Role-based UI Control
        if (this.currentUser.role === 'member') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
        }

        this.loadProjects();
        // Default to dashboard
        this.navigate('dashboard');
    },

    loadProjects: function() {
        const projects = Storage.getProjects();
        const select = document.getElementById('global-project-select');
        const currentVal = this.currentProjectId || select.value;
        
        select.innerHTML = '<option value="">Select Project...</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            select.appendChild(option);
        });

        if (currentVal && projects.find(p => p.id === currentVal)) {
            select.value = currentVal;
            this.currentProjectId = currentVal;
        } else if (projects.length > 0) {
            // Auto-select first project if none selected
            select.value = projects[0].id;
            this.currentProjectId = projects[0].id;
        }
    },

    navigate: function(page) {
        // Hide all views
        document.querySelectorAll('.content-view').forEach(el => el.classList.add('d-none'));
        // Show target view
        document.getElementById(`view-${page}`).classList.remove('d-none');
        
        // Update Title
        document.getElementById('page-title').textContent = page.charAt(0).toUpperCase() + page.slice(1);
        
        // Refresh data for the view
        this.refreshCurrentView(page);
    },

    refreshCurrentView: function(specificPage = null) {
        // Determine active page if not provided
        if (!specificPage) {
            const activeLink = document.querySelector('.nav-link.active');
            if (activeLink) {
                specificPage = activeLink.dataset.page;
            } else {
                return;
            }
        }

        if (specificPage === 'dashboard') this.renderDashboard();
        if (specificPage === 'projects') this.renderProjectsList();
        if (specificPage === 'cashbook') this.renderCashbook();
        if (specificPage === 'ledgers') this.renderLedgers();
        if (specificPage === 'files') this.renderFiles();
        if (specificPage === 'stocks') this.renderStocks();
        // Reports are generated on demand
    },

    // --- Render Functions ---

    renderStocks: function() {
        if (!this.currentProjectId) return;
        
        const entries = Storage.getEntriesByProject(this.currentProjectId);
        
        // Steel Stock Aggregation
        const steelStock = {}; // Key: diameter, Value: { nos, kg, totalValue }
        // Initialize for standard diameters
        const standardDias = [6, 8, 10, 12, 16, 20, 25, 32, 40];
        standardDias.forEach(d => {
            steelStock[d] = { nos: 0, kg: 0, totalValue: 0 };
        });

        // Tiles Stock List
        const tilesStockList = [];
        // Granite Stock List
        const graniteStockList = [];

        // Other Stock Aggregation
        const otherStock = {}; // Key: materialName, Value: { quantity, unit, totalValue }

        entries.forEach(e => {
            if (e.type === 'cash_out' && e.category === 'material') {
                const materialName = e.item_name;
                
                if (materialName && materialName.toLowerCase() === 'steel' && e.stockDetails) {
                    e.stockDetails.forEach(detail => {
                        const dia = parseInt(detail.diameter);
                        if (steelStock[dia]) {
                            steelStock[dia].nos += parseFloat(detail.nos || 0);
                            steelStock[dia].kg += parseFloat(detail.kg || 0);
                            steelStock[dia].totalValue += (parseFloat(detail.kg || 0) * parseFloat(detail.rate || 0));
                        }
                    });
                } else if (materialName && materialName.toLowerCase() === 'tiles' && e.tilesDetails) {
                    e.tilesDetails.forEach(detail => {
                        tilesStockList.push({
                            date: e.date,
                            supplier: e.party_name,
                            ...detail
                        });
                    });
                } else if (materialName && materialName.toLowerCase() === 'granite' && e.graniteDetails) {
                    e.graniteDetails.forEach(detail => {
                        graniteStockList.push({
                            date: e.date,
                            supplier: e.party_name,
                            ...detail
                        });
                    });
                } else if (materialName && materialName.toLowerCase() !== 'steel' && materialName.toLowerCase() !== 'tiles' && materialName.toLowerCase() !== 'granite') {
                    if (!otherStock[materialName]) {
                        otherStock[materialName] = { quantity: 0, unit: e.unit || '', totalValue: 0 };
                    }
                    otherStock[materialName].quantity += parseFloat(e.quantity || 0);
                    otherStock[materialName].totalValue += parseFloat(e.amount || 0); // amount is total cost
                    // Update unit if missing
                    if (!otherStock[materialName].unit && e.unit) {
                        otherStock[materialName].unit = e.unit;
                    }
                }
            }
        });

        // Render Steel Table
        const steelTbody = document.querySelector('#steel-stock-table tbody');
        steelTbody.innerHTML = '';
        standardDias.forEach(dia => {
            const data = steelStock[dia];
            const avgRate = data.kg > 0 ? (data.totalValue / data.kg).toFixed(2) : '0.00';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dia}mm</td>
                <td>${data.nos.toLocaleString()}</td>
                <td>${data.kg.toFixed(2)}</td>
                <td>₹${avgRate}</td>
                <td>₹${data.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            `;
            steelTbody.appendChild(tr);
        });

        // Render Tiles Table
        const tilesTbody = document.querySelector('#tiles-stock-table tbody');
        if (tilesTbody) {
            tilesTbody.innerHTML = '';
            // Sort by date desc
            tilesStockList.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            tilesStockList.forEach(item => {
                const totalSqFt = (item.w * item.h).toFixed(2);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.date}</td>
                    <td>${item.supplier}</td>
                    <td>${item.room || '-'}</td>
                    <td>${item.boxes || 0}</td>
                    <td>${item.name || '-'}</td>
                    <td>${item.w} x ${item.h}</td>
                    <td>${totalSqFt}</td>
                    <td>₹${parseFloat(item.rate || 0).toFixed(2)}</td>
                    <td>₹${parseFloat(item.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                `;
                tilesTbody.appendChild(tr);
            });
        }
        
        // Render Granite Table
        const graniteTbody = document.querySelector('#granite-stock-table tbody');
        if (graniteTbody) {
            graniteTbody.innerHTML = '';
            graniteStockList.sort((a, b) => new Date(b.date) - new Date(a.date));
            graniteStockList.forEach(item => {
                const sqftVal = parseFloat(item.sqft || (item.w * item.h) || 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.date}</td>
                    <td>${item.supplier}</td>
                    <td>${item.name || '-'}</td>
                    <td>${item.nos || 0}</td>
                    <td>${item.w} x ${item.h}</td>
                    <td>${sqftVal.toFixed(2)}</td>
                    <td>₹${parseFloat(item.rate || 0).toFixed(2)}</td>
                    <td>₹${parseFloat(item.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                `;
                graniteTbody.appendChild(tr);
            });
        }

        // Render Other Materials Table
        const otherTbody = document.querySelector('#other-stock-table tbody');
        otherTbody.innerHTML = '';
        Object.keys(otherStock).forEach(name => {
            const data = otherStock[name];
            const avgRate = data.quantity > 0 ? (data.totalValue / data.quantity).toFixed(2) : '0.00';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td>${data.quantity.toLocaleString()}</td>
                <td>${data.unit}</td>
                <td>₹${avgRate}</td>
                <td>₹${data.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            `;
            otherTbody.appendChild(tr);
        });
    },

    renderDashboard: function() {
        if (!this.currentProjectId) return;
        
        const entries = Storage.getEntriesByProject(this.currentProjectId);
        
        let cashIn = 0;
        let cashOut = 0;
        let dues = 0;
        
        entries.forEach(e => {
            if (e.type === 'cash_in') {
                cashIn += parseFloat(e.amount || 0);
            } else {
                cashOut += parseFloat(e.paid || 0); // Cash out is what we paid
                dues += parseFloat(e.due || 0);
            }
        });
        
        const balance = cashIn - cashOut;
        
        document.getElementById('dash-cash-in').textContent = '₹' + cashIn.toLocaleString();
        document.getElementById('dash-cash-out').textContent = '₹' + cashOut.toLocaleString();
        document.getElementById('dash-balance').textContent = '₹' + balance.toLocaleString();
        document.getElementById('dash-dues').textContent = '₹' + dues.toLocaleString();

        // Recent Activity (Last 5)
        const recent = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        const tbody = document.querySelector('#dash-recent-table tbody');
        tbody.innerHTML = '';
        
        recent.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.date}</td>
                <td><span class="badge bg-${e.type === 'cash_in' ? 'success' : 'danger'}">${e.type === 'cash_in' ? 'In' : 'Out'}</span></td>
                <td>${e.party_name} - ${e.item_name || 'Payment'}</td>
                <td>₹${e.amount}</td>
                <td>${e.due > 0 ? '<span class="badge bg-warning text-dark">Due</span>' : '<span class="badge bg-secondary">Paid</span>'}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderProjectsList: function() {
        const projects = Storage.getProjects();
        const container = document.getElementById('projects-list');
        container.innerHTML = '';
        
        projects.forEach(p => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${p.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${p.owner}</h6>
                        <p class="card-text">
                            <i class="bi bi-geo-alt"></i> ${p.location}<br>
                            <i class="bi bi-calendar"></i> Started: ${p.startDate}
                        </p>
                        ${this.currentUser.role === 'admin' ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="App.deleteProject('${p.id}')">Delete</button>
                        ` : ''}
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    },

    renderCashbook: function() {
        if (!this.currentProjectId) return;
        const entries = Storage.getEntriesByProject(this.currentProjectId);
        // Sort by date desc
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = document.querySelector('#cashbook-table tbody');
        tbody.innerHTML = '';
        
        entries.forEach(e => {
            const tr = document.createElement('tr');
            const isCashIn = e.type === 'cash_in';
            const details = e.item_name 
                ? `${e.item_name} (${e.quantity || ''} ${e.unit || ''} @ ${e.rate || ''})`
                : (e.notes || '-');

            tr.innerHTML = `
                <td>${e.date}</td>
                <td><span class="badge bg-${isCashIn ? 'success' : 'danger'}">${isCashIn ? 'In' : 'Out'}</span></td>
                <td>${e.category || 'General'}</td>
                <td>
                    <strong>${e.party_name}</strong><br>
                    <small>${details}</small>
                </td>
                <td>₹${parseFloat(e.amount).toLocaleString()}</td>
                <td>
                    ₹${parseFloat(e.paid).toLocaleString()}
                    ${this.renderPaymentHistory(e)}
                </td>
                <td class="${e.due > 0 ? 'text-danger fw-bold' : ''}">${e.due ? '₹'+parseFloat(e.due).toLocaleString() : '-'}</td>
                <td>
                    ${e.due > 0 && !isCashIn ? `<button class="btn btn-sm btn-success me-1" onclick="App.openPaymentModal('${e.id}')">Pay</button>` : ''}
                    ${e.attachment ? `<button class="btn btn-sm btn-info me-1" onclick="App.viewAttachment('${e.id}')"><i class="bi bi-paperclip"></i></button>` : ''}
                    ${this.currentUser.role === 'admin' ? `
                        <button class="btn btn-sm btn-warning me-1" onclick="App.editEntry('${e.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="App.deleteEntry('${e.id}')"><i class="bi bi-trash"></i></button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderLedgers: function() {
        if (!this.currentProjectId) return;

        // Force UI State Synchronization for Tabs
        const activeTab = document.querySelector('#ledgerTabs .nav-link.active');
        if (!activeTab) {
             // No active tab? Default to Supplier
             const triggerEl = document.querySelector('#ledgerTabs button[data-bs-target="#supplier-ledger"]');
             if (triggerEl) {
                const tab = new bootstrap.Tab(triggerEl);
                tab.show();
             }
        } else {
            // Re-activate current tab to ensure pane visibility is synced
            const tab = new bootstrap.Tab(activeTab);
            tab.show();
        }
        
        const entries = Storage.getEntriesByProject(this.currentProjectId);
        
        // Supplier Ledger (Material & Service)
        const supplierMap = {};
        // Labor Ledger
        const laborMap = {};

        entries.forEach(e => {
            if (e.type === 'cash_out') {
                const map = e.category === 'labor' ? laborMap : supplierMap;
                
                if (!map[e.party_name]) {
                    map[e.party_name] = { billed: 0, paid: 0, due: 0 };
                }
                map[e.party_name].billed += parseFloat(e.amount || 0);
                map[e.party_name].paid += parseFloat(e.paid || 0);
                map[e.party_name].due += parseFloat(e.due || 0);
            }
        });

        // Render Suppliers
        const supplierTbody = document.querySelector('#supplier-table tbody');
        supplierTbody.innerHTML = '';
        Object.keys(supplierMap).forEach(name => {
            const data = supplierMap[name];
            supplierTbody.innerHTML += `
                <tr>
                    <td>${name}</td>
                    <td>₹${data.billed.toLocaleString()}</td>
                    <td>₹${data.paid.toLocaleString()}</td>
                    <td class="text-danger">₹${data.due.toLocaleString()}</td>
                </tr>
            `;
        });

        // Render Labor
        const laborTbody = document.querySelector('#labor-table tbody');
        laborTbody.innerHTML = '';
        Object.keys(laborMap).forEach(name => {
            const data = laborMap[name];
            laborTbody.innerHTML += `
                <tr>
                    <td>${name}</td>
                    <td>₹${data.billed.toLocaleString()}</td>
                    <td>₹${data.paid.toLocaleString()}</td>
                    <td class="text-danger">₹${data.due.toLocaleString()}</td>
                </tr>
            `;
        });
    },

    renderFiles: function(filter = 'all') {
        if (!this.currentProjectId) return;
        
        let files = Storage.getFilesByProject(this.currentProjectId);
        
        if (filter !== 'all') {
            files = files.filter(f => f.category === filter);
        }

        // Sort by newest first
        files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        const container = document.getElementById('files-list');
        container.innerHTML = '';

        if (files.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">No files found.</div>';
            return;
        }

        files.forEach(f => {
            let iconClass = 'bi-file-earmark-text';
            let colorClass = 'bg-secondary';
            
            if (f.category === 'cad') { iconClass = 'bi-bounding-box-circles'; colorClass = 'bg-info'; }
            if (f.category === 'image') { iconClass = 'bi-card-image'; colorClass = 'bg-warning'; }
            if (f.category === 'document') { iconClass = 'bi-file-earmark-pdf'; colorClass = 'bg-danger'; }

            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-6';
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body text-center">
                        <div class="mb-3">
                            <i class="bi ${iconClass} fs-1 text-secondary"></i>
                        </div>
                        <h6 class="card-title text-truncate" title="${f.name}">${f.name}</h6>
                        <span class="badge ${colorClass} mb-2">${f.category.toUpperCase()}</span>
                        <p class="card-text small text-muted">
                            ${new Date(f.uploadDate).toLocaleDateString()}
                        </p>
                        <div class="d-grid gap-2">
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary" onclick="App.previewFile('${f.id}')" ${!(f.category === 'image' || f.type === 'application/pdf') ? 'disabled title="Preview available for Images and PDFs only"' : ''}>
                                    <i class="bi bi-eye"></i> Preview
                                </button>
                                <button class="btn btn-sm btn-outline-success" onclick="App.downloadFile('${f.id}')">
                                    <i class="bi bi-download"></i> Download
                                </button>
                            </div>
                            ${this.currentUser.role === 'admin' ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="App.deleteFile('${f.id}')">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    },

    renderPaymentHistory: function(entry) {
        if (!entry.payments || entry.payments.length === 0) return '';
        
        let html = '<div class="mt-1" style="font-size: 0.75rem; color: #666;">';
        entry.payments.forEach(p => {
            html += `<div>${p.date}: ₹${p.amount.toLocaleString()}</div>`;
        });
        html += '</div>';
        return html;
    },

    clearEditState: function() {
        this.editingEntryId = null;
        this.editingFormKind = null;
        this.editingExistingAttachment = null;
        // Re-enable paid fields (they may be disabled during edit when payments exist)
        ['material-form', 'labor-form', 'service-form'].forEach(id => {
            const f = document.getElementById(id);
            if (!f) return;
            const paid = f.querySelector('[name="paid"]');
            if (paid) paid.disabled = false;
        });
    },

    editEntry: function(entryId) {
        const entry = Storage.getEntries().find(e => e.id === entryId);
        if (!entry) return;

        this.editingEntryId = entryId;
        this.editingExistingAttachment = entry.attachment || null;

        if (entry.type === 'cash_in') {
            this.editingFormKind = 'cash_in';

            const modalEl = document.getElementById('addCashInModal');
            const form = document.getElementById('cash-in-form');
            if (!modalEl || !form) return;

            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();

            modalEl.addEventListener('shown.bs.modal', () => {
                form.reset();
                form.querySelector('[name="date"]').value = entry.date || '';
                form.querySelector('[name="amount"]').value = entry.amount ?? '';
                form.querySelector('[name="party_name"]').value = entry.party_name || '';
                if (form.querySelector('[name="payment_mode"]')) form.querySelector('[name="payment_mode"]').value = entry.payment_mode || 'Cash';
                if (form.querySelector('[name="notes"]')) form.querySelector('[name="notes"]').value = entry.notes || '';
            }, { once: true });

            return;
        }

        // cash_out
        const modalEl = document.getElementById('addCashOutModal');
        if (!modalEl) return;
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);

        // Determine which tab/form to edit
        const kind = entry.category === 'labor' ? 'labor' : (entry.category === 'service' ? 'service' : 'material');
        this.editingFormKind = kind;

        modal.show();

        modalEl.addEventListener('shown.bs.modal', () => {
            // Activate correct tab
            const tabBtn = document.querySelector(`#pills-tab button[data-bs-target="#pill-${kind}"]`);
            if (tabBtn) {
                const tab = bootstrap.Tab.getInstance(tabBtn) || new bootstrap.Tab(tabBtn);
                tab.show();
            }

            const form = document.getElementById(`${kind}-form`);
            if (!form) return;

            // Ensure dropdowns are populated
            this.updatePartyDropdowns();
            this.updateMaterialDropdowns();

            // Fill shared fields
            form.querySelector('[name="date"]').value = entry.date || '';
            if (form.querySelector('[name="party_name"]')) form.querySelector('[name="party_name"]').value = entry.party_name || '';

            // Payment handling: if payment history exists, keep paid locked to preserve history
            const hasPayments = Array.isArray(entry.payments) && entry.payments.length > 0;
            const paidEl = form.querySelector('[name="paid"]');
            if (paidEl) {
                paidEl.value = entry.paid ?? 0;
                paidEl.disabled = hasPayments;
            }
            if (form.querySelector('[name="payment_mode"]')) form.querySelector('[name="payment_mode"]').value = entry.payment_mode || 'Cash';

            if (kind === 'material') {
                const materialSelect = form.querySelector('.material-select');
                const matName = (entry.item_name || '').toLowerCase();
                const defaultInputs = form.querySelector('#default-material-inputs');
                const steelInputs = form.querySelector('#steel-material-inputs');
                const tilesInputs = form.querySelector('#tiles-material-inputs');
                const graniteInputs = form.querySelector('#granite-material-inputs');

                // Defer so Material tab pane is visible after tab.show()
                const runMaterialEdit = () => {
                // Set material select to the option that matches (case-insensitive)
                if (materialSelect && entry.item_name) {
                    const opt = Array.from(materialSelect.options).find(o => (o.value || '').toLowerCase() === matName);
                    if (opt) materialSelect.value = opt.value;
                }

                // Show the correct material input table immediately (don't rely on change event timing)
                if (defaultInputs) defaultInputs.classList.add('d-none');
                if (steelInputs) steelInputs.classList.add('d-none');
                if (tilesInputs) tilesInputs.classList.add('d-none');
                if (graniteInputs) graniteInputs.classList.add('d-none');
                if (defaultInputs) defaultInputs.querySelectorAll('input').forEach(i => i.removeAttribute('required'));

                if (matName === 'steel' && steelInputs) {
                    steelInputs.classList.remove('d-none');
                    this.renderSteelTable(form);
                    const tbody = form.querySelector('#steel-input-tbody');
                    if (tbody) {
                        tbody.querySelectorAll('tr').forEach(tr => {
                            tr.querySelector('.steel-nos').value = '';
                            tr.querySelector('.steel-kg').value = '';
                            tr.querySelector('.steel-rate').value = '';
                        });
                        (entry.stockDetails || []).forEach(d => {
                            const dia = String(parseInt(d.diameter));
                            const row = tbody.querySelector(`.steel-nos[data-dia="${dia}"]`)?.closest('tr');
                            if (!row) return;
                            row.querySelector('.steel-nos').value = d.nos ?? '';
                            row.querySelector('.steel-kg').value = d.kg ?? '';
                            row.querySelector('.steel-rate').value = d.rate ?? '';
                        });
                    }
                } else if (matName === 'tiles' && tilesInputs) {
                    tilesInputs.classList.remove('d-none');
                    const tbody = form.querySelector('#tiles-input-tbody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        (entry.tilesDetails || []).forEach((d, idx) => {
                            this.addTilesRow(form);
                            const row = tbody.children[idx];
                            if (!row) return;
                            row.querySelector('.tiles-room').value = d.room || '';
                            row.querySelector('.tiles-boxes').value = d.boxes ?? '';
                            row.querySelector('.tiles-name').value = d.name || '';
                            row.querySelector('.tiles-w').value = d.w ?? '';
                            row.querySelector('.tiles-h').value = d.h ?? '';
                            row.querySelector('.tiles-rate').value = d.rate ?? '';
                            const sqft = (parseFloat(d.w || 0) * parseFloat(d.h || 0)) || 0;
                            row.querySelector('.tiles-sqft').value = sqft ? sqft.toFixed(2) : '';
                            const total = sqft * (parseFloat(d.boxes || 0) || 0) * (parseFloat(d.rate || 0) || 0);
                            row.querySelector('.tiles-total').value = total ? total.toFixed(2) : '';
                        });
                        if (tbody.children.length === 0) this.addTilesRow(form);
                    }
                } else if (matName === 'granite' && graniteInputs) {
                    graniteInputs.classList.remove('d-none');
                    const tbody = form.querySelector('#granite-input-tbody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        (entry.graniteDetails || []).forEach((d, idx) => {
                            this.addGraniteRow(form);
                            const row = tbody.children[idx];
                            if (!row) return;
                            row.querySelector('.granite-name').value = d.name || '';
                            row.querySelector('.granite-nos').value = d.nos ?? '';
                            row.querySelector('.granite-w').value = d.w ?? '';
                            row.querySelector('.granite-h').value = d.h ?? '';
                            row.querySelector('.granite-rate').value = d.rate ?? '';
                            const sqft = (parseFloat(d.w || 0) * parseFloat(d.h || 0)) || 0;
                            row.querySelector('.granite-sqft').value = sqft ? sqft.toFixed(2) : '';
                            const total = sqft * (parseFloat(d.nos || 0) || 0) * (parseFloat(d.rate || 0) || 0);
                            row.querySelector('.granite-total').value = total ? total.toFixed(2) : '';
                        });
                        if (tbody.children.length === 0) this.addGraniteRow(form);
                    }
                } else {
                    defaultInputs.classList.remove('d-none');
                    if (form.querySelector('[name="quantity"]')) form.querySelector('[name="quantity"]').setAttribute('required', 'true');
                    if (form.querySelector('[name="rate"]')) form.querySelector('[name="rate"]').setAttribute('required', 'true');
                    if (form.querySelector('[name="unit"]')) form.querySelector('[name="unit"]').value = entry.unit || '';
                    if (form.querySelector('[name="quantity"]')) form.querySelector('[name="quantity"]').value = entry.quantity ?? '';
                    if (form.querySelector('[name="rate"]')) form.querySelector('[name="rate"]').value = entry.rate ?? '';
                }

                // Amount/due
                if (form.querySelector('[name="amount"]')) form.querySelector('[name="amount"]').value = entry.amount ?? '';
                if (form.querySelector('[name="due"]')) form.querySelector('[name="due"]').value = entry.due ?? '';
                this.calculateFormTotals(form);
                };
                setTimeout(runMaterialEdit, 0);
            } else {
                // labor/service
                if (form.querySelector('[name="wage_type"]')) form.querySelector('[name="wage_type"]').value = entry.wage_type || 'Daily';
                if (form.querySelector('[name="item_name"]')) form.querySelector('[name="item_name"]').value = entry.item_name || '';
                if (form.querySelector('[name="unit"]')) form.querySelector('[name="unit"]').value = entry.unit || '';
                if (form.querySelector('[name="quantity"]')) form.querySelector('[name="quantity"]').value = entry.quantity ?? '';
                if (form.querySelector('[name="rate"]')) form.querySelector('[name="rate"]').value = entry.rate ?? '';
                if (form.querySelector('[name="amount"]')) form.querySelector('[name="amount"]').value = entry.amount ?? '';
                if (form.querySelector('[name="due"]')) form.querySelector('[name="due"]').value = entry.due ?? '';
            }

            // Recalculate totals (especially when amount should be derived)
            this.calculateFormTotals(form);
        }, { once: true });
    },

    // --- Actions ---

    openPaymentModal: function(entryId) {
        const entry = Storage.getEntries().find(e => e.id === entryId);
        if (!entry) return;

        document.getElementById('payment-entry-id').value = entry.id;
        document.getElementById('payment-due-hint').textContent = `Max payable: ₹${parseFloat(entry.due).toLocaleString()}`;
        
        const amountInput = document.querySelector('#payment-form input[name="amount"]');
        amountInput.max = entry.due;
        amountInput.value = entry.due; // Default to full payment

        new bootstrap.Modal(document.getElementById('addPaymentModal')).show();
    },

    handlePaymentSubmit: function(form) {
        const formData = new FormData(form);
        const entryId = formData.get('entry_id');
        const amount = parseFloat(formData.get('amount'));
        const date = formData.get('date');
        const mode = formData.get('payment_mode');

        if (isNaN(amount) || amount <= 0) {
            alert('Invalid amount');
            return;
        }

        const entry = Storage.getEntries().find(e => e.id === entryId);
        if (!entry) return;

        if (amount > parseFloat(entry.due)) {
            alert('Payment cannot exceed due amount!');
            return;
        }

        // Update Entry
        entry.paid = parseFloat(entry.paid) + amount;
        entry.due = parseFloat(entry.due) - amount;
        
        if (!entry.payments) entry.payments = [];
        entry.payments.push({
            amount: amount,
            date: date,
            mode: mode,
            note: 'Partial Payment'
        });

        Storage.updateEntry(entry);
        
        bootstrap.Modal.getInstance(document.getElementById('addPaymentModal')).hide();
        form.reset();
        this.refreshCurrentView();
        alert('Payment recorded successfully!');
    },

    deleteProject: function(id) {
        if (confirm('Are you sure? This will delete all project data!')) {
            Storage.deleteProject(id);
            this.loadProjects();
            this.renderProjectsList();
        }
    },

    deleteEntry: function(id) {
        if (confirm('Delete this entry?')) {
            Storage.deleteEntry(id);
            this.refreshCurrentView();
        }
    },

    deleteFile: function(id) {
        if (confirm('Delete this file?')) {
            Storage.deleteFile(id);
            this.refreshCurrentView();
        }
    },

    viewAttachment: function(entryId) {
        const entry = Storage.getEntries().find(e => e.id === entryId);
        if (entry && entry.attachment) {
            const img = document.getElementById('preview-image');
            img.src = entry.attachment;
            new bootstrap.Modal(document.getElementById('imagePreviewModal')).show();
        }
    },

    previewFile: function(fileId) {
        const file = Storage.getFiles().find(f => f.id === fileId);
        if (file && file.data) {
            const img = document.getElementById('preview-image');
            const frame = document.getElementById('preview-frame');
            
            // Reset display
            img.style.display = 'none';
            frame.style.display = 'none';

            if (file.category === 'image') {
                img.src = file.data;
                img.style.display = 'block';
                new bootstrap.Modal(document.getElementById('imagePreviewModal')).show();
            } else if (file.type === 'application/pdf') {
                frame.src = file.data;
                frame.style.display = 'block';
                new bootstrap.Modal(document.getElementById('imagePreviewModal')).show();
            } else {
                alert('Preview not available for this file type.');
            }
        } else {
            alert('File not found.');
        }
    },

    downloadFile: function(fileId) {
        const file = Storage.getFiles().find(f => f.id === fileId);
        if (file && file.data) {
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('File data not found.');
        }
    },

    // --- Helpers ---

    calculateFormTotals: function(form) {
        // Special handling for Steel Table
        const materialSelect = form.querySelector('.material-select');
        if (materialSelect && materialSelect.value.toLowerCase() === 'steel') {
            let totalAmount = 0;
            form.querySelectorAll('#steel-input-tbody tr').forEach(row => {
                const kg = parseFloat(row.querySelector('.steel-kg').value || 0);
                const rate = parseFloat(row.querySelector('.steel-rate').value || 0);
                const rowTotal = kg * rate;
                
                row.querySelector('.steel-total').value = rowTotal > 0 ? rowTotal.toFixed(2) : '';
                totalAmount += rowTotal;
            });
            
            const amountInput = form.querySelector('[name="amount"]');
            if (amountInput) amountInput.value = totalAmount.toFixed(2);
            
            // Due calculation
            const paid = parseFloat(form.querySelector('[name="paid"]')?.value || 0);
            const due = totalAmount - paid;
            const dueInput = form.querySelector('[name="due"]');
            if (dueInput) dueInput.value = due.toFixed(2);
            
            return;
        }

        // Special handling for Tiles Table
        if (materialSelect && materialSelect.value.toLowerCase() === 'tiles') {
            let totalAmount = 0;
            form.querySelectorAll('#tiles-input-tbody tr').forEach(row => {
                const rowTotal = parseFloat(row.querySelector('.tiles-total').value || 0);
                totalAmount += rowTotal;
            });
            
            const amountInput = form.querySelector('[name="amount"]');
            if (amountInput) amountInput.value = totalAmount.toFixed(2);
            
            // Due calculation
            const paid = parseFloat(form.querySelector('[name="paid"]')?.value || 0);
            const due = totalAmount - paid;
            const dueInput = form.querySelector('[name="due"]');
            if (dueInput) dueInput.value = due.toFixed(2);
            
            return;
        }
        
        // Special handling for Granite Table
        if (materialSelect && materialSelect.value.toLowerCase() === 'granite') {
            let totalAmount = 0;
            form.querySelectorAll('#granite-input-tbody tr').forEach(row => {
                const rowTotal = parseFloat(row.querySelector('.granite-total').value || 0);
                totalAmount += rowTotal;
            });
            const amountInput = form.querySelector('[name="amount"]');
            if (amountInput) amountInput.value = totalAmount.toFixed(2);
            const paid = parseFloat(form.querySelector('[name="paid"]')?.value || 0);
            const due = totalAmount - paid;
            const dueInput = form.querySelector('[name="due"]');
            if (dueInput) dueInput.value = due.toFixed(2);
            return;
        }

        // Default handling
        const qty = parseFloat(form.querySelector('[name="quantity"]')?.value || 0);
        const rate = parseFloat(form.querySelector('[name="rate"]')?.value || 0);
        const paid = parseFloat(form.querySelector('[name="paid"]')?.value || 0);
        
        const total = qty * rate;
        const due = total - paid;
        
        const amountInput = form.querySelector('[name="amount"]');
        const dueInput = form.querySelector('[name="due"]');
        
        if (amountInput) amountInput.value = total;
        if (dueInput) dueInput.value = due;
    },

    handleEntrySubmit: async function(form, modalId, formKind) {
        if (!this.currentProjectId) {
            alert('Please select a project first!');
            return;
        }

        const formData = new FormData(form);
        const entry = Object.fromEntries(formData.entries());
        
        entry.projectId = this.currentProjectId;
        entry.createdBy = this.currentUser.username;
        
        // Handle Steel Stock Data
        if (entry.item_name && entry.item_name.toLowerCase() === 'steel') {
            const stockDetails = [];
            form.querySelectorAll('#steel-input-tbody tr').forEach(row => {
                const dia = row.querySelector('.steel-nos').dataset.dia;
                const nos = row.querySelector('.steel-nos').value;
                const kg = row.querySelector('.steel-kg').value;
                const rate = row.querySelector('.steel-rate').value;
                
                if (kg && parseFloat(kg) > 0) {
                    stockDetails.push({
                        diameter: dia,
                        nos: parseFloat(nos || 0),
                        kg: parseFloat(kg),
                        rate: parseFloat(rate || 0)
                    });
                }
            });
            entry.stockDetails = stockDetails;
            // Ensure quantity/unit are set for display purposes (optional, but good for list view)
            const totalKg = stockDetails.reduce((sum, item) => sum + item.kg, 0);
            entry.quantity = totalKg;
            entry.unit = 'Kg';
        }

        // Handle Tiles Data
        if (entry.item_name && entry.item_name.toLowerCase() === 'tiles') {
            const tilesDetails = [];
            form.querySelectorAll('#tiles-input-tbody tr').forEach(row => {
                const room = row.querySelector('.tiles-room').value;
                const boxes = parseFloat(row.querySelector('.tiles-boxes').value || 0);
                const name = row.querySelector('.tiles-name').value;
                const w = parseFloat(row.querySelector('.tiles-w').value || 0);
                const h = parseFloat(row.querySelector('.tiles-h').value || 0);
                const rate = parseFloat(row.querySelector('.tiles-rate').value || 0);
                const total = parseFloat(row.querySelector('.tiles-total').value || 0);
                
                if (boxes > 0) {
                    tilesDetails.push({
                        room: room,
                        boxes: boxes,
                        name: name,
                        w: w,
                        h: h,
                        rate: rate,
                        total: total
                    });
                }
            });
            entry.tilesDetails = tilesDetails;
            // Aggregate for list view
            const totalBoxes = tilesDetails.reduce((sum, item) => sum + item.boxes, 0);
            entry.quantity = totalBoxes;
            entry.unit = 'Box';
        }
        
        // Handle Granite Data
        if (entry.item_name && entry.item_name.toLowerCase() === 'granite') {
            const graniteDetails = [];
            form.querySelectorAll('#granite-input-tbody tr').forEach(row => {
                const name = row.querySelector('.granite-name').value;
                const nos = parseFloat(row.querySelector('.granite-nos').value || 0);
                const w = parseFloat(row.querySelector('.granite-w').value || 0);
                const h = parseFloat(row.querySelector('.granite-h').value || 0);
                const size = w * h;
                // Total Sq.ft column should reflect only W×H (not multiplied by Nos)
                const sqft = parseFloat(row.querySelector('.granite-sqft').value || size || 0);
                const rate = parseFloat(row.querySelector('.granite-rate').value || 0);
                const total = parseFloat(row.querySelector('.granite-total').value || (size * nos * rate) || 0);
                if (nos > 0) {
                    graniteDetails.push({
                        name: name,
                        nos: nos,
                        w: w,
                        h: h,
                        size: size,
                        sqft: sqft,
                        rate: rate,
                        total: total
                    });
                }
            });
            entry.graniteDetails = graniteDetails;
            const totalSqft = graniteDetails.reduce((sum, item) => sum + (item.sqft || 0), 0);
            entry.quantity = totalSqft;
            entry.unit = 'Sq.ft';
        }

        // Handle File (keep existing when editing unless replaced)
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
            entry.attachment = await this.readFileAsBase64(fileInput.files[0]);
        } else if (this.editingEntryId && this.editingFormKind === formKind && this.editingExistingAttachment) {
            entry.attachment = this.editingExistingAttachment;
        }
        
        // Numeric conversions
        if (entry.amount) entry.amount = parseFloat(entry.amount);
        if (entry.paid) entry.paid = parseFloat(entry.paid);
        if (entry.due) entry.due = parseFloat(entry.due);
        if (entry.quantity) entry.quantity = parseFloat(entry.quantity);
        if (entry.rate) entry.rate = parseFloat(entry.rate);

        // Edit vs Add
        if (this.editingEntryId && this.editingFormKind === formKind) {
            const existing = Storage.getEntries().find(e => e.id === this.editingEntryId);
            if (!existing) {
                Storage.addEntry(entry);
            } else {
                // Preserve immutable / history fields
                entry.id = existing.id;
                entry.timestamp = existing.timestamp;
                entry.payments = existing.payments || [];

                // If payments exist, keep paid consistent with payments history
                if (entry.type === 'cash_out' && Array.isArray(existing.payments) && existing.payments.length > 0) {
                    entry.paid = parseFloat(existing.paid || 0);
                    entry.due = Math.max(0, parseFloat(entry.amount || 0) - entry.paid);
                }

                Storage.updateEntry(entry);
            }
        } else {
            Storage.addEntry(entry);
        }
        
        bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
        form.reset();
        this.clearEditState();
        this.refreshCurrentView();
        alert('Entry saved successfully');
    },

    handleFileUpload: async function(form) {
        if (!this.currentProjectId) {
            alert('Please select a project first!');
            return;
        }

        const formData = new FormData(form);
        const fileInput = form.querySelector('input[type="file"]');
        
        if (!fileInput.files[0]) {
            alert('Please select a file.');
            return;
        }

        const file = {
            projectId: this.currentProjectId,
            category: formData.get('category'),
            name: formData.get('name') || fileInput.files[0].name,
            uploadedBy: this.currentUser.username,
            type: fileInput.files[0].type
        };

        // Size check (simulated limit for local storage)
        if (fileInput.files[0].size > 3000000) { // 3MB limit
            alert('File too large for this prototype (Max 3MB).');
            return;
        }

        try {
            file.data = await this.readFileAsBase64(fileInput.files[0]);
            
            const result = Storage.addFile(file);
            if (result) {
                bootstrap.Modal.getInstance(document.getElementById('uploadFileModal')).hide();
                form.reset();
                this.refreshCurrentView();
                alert('File uploaded successfully!');
            }
        } catch (error) {
            console.error(error);
            alert('Error uploading file.');
        }
    },

    readFileAsBase64: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
