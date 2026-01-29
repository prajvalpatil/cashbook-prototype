/**
 * app.js
 * Core application logic: Routing, UI Updates, Event Listeners
 */

const App = {
    currentUser: null,
    currentProjectId: null,

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

        // Add Cash In
        document.getElementById('cash-in-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashInModal');
        });

        // Add Cash Out (Material, Labor, Service)
        document.getElementById('material-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashOutModal');
        });
        document.getElementById('labor-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashOutModal');
        });
        document.getElementById('service-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEntrySubmit(e.target, 'addCashOutModal');
        });

        // Auto-calculation logic for forms
        document.querySelectorAll('.calc-trigger').forEach(input => {
            input.addEventListener('input', (e) => {
                const form = e.target.closest('form');
                this.calculateFormTotals(form);
            });
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
            });
        }
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
        // Reports are generated on demand
    },

    // --- Render Functions ---

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
                ? `${e.item_name} (${e.quantity || ''} @ ${e.rate || ''})`
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
                <td>${e.paid ? '₹'+parseFloat(e.paid).toLocaleString() : '-'}</td>
                <td class="${e.due > 0 ? 'text-danger fw-bold' : ''}">${e.due ? '₹'+parseFloat(e.due).toLocaleString() : '-'}</td>
                <td>
                    ${e.attachment ? `<button class="btn btn-sm btn-info me-1" onclick="App.viewAttachment('${e.id}')"><i class="bi bi-paperclip"></i></button>` : ''}
                    ${this.currentUser.role === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="App.deleteEntry('${e.id}')"><i class="bi bi-trash"></i></button>` : ''}
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

    // --- Actions ---

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

    viewAttachment: function(entryId) {
        const entry = Storage.getEntries().find(e => e.id === entryId);
        if (entry && entry.attachment) {
            const img = document.getElementById('preview-image');
            img.src = entry.attachment;
            new bootstrap.Modal(document.getElementById('imagePreviewModal')).show();
        }
    },

    // --- Helpers ---

    calculateFormTotals: function(form) {
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

    handleEntrySubmit: async function(form, modalId) {
        if (!this.currentProjectId) {
            alert('Please select a project first!');
            return;
        }

        const formData = new FormData(form);
        const entry = Object.fromEntries(formData.entries());
        
        entry.projectId = this.currentProjectId;
        entry.createdBy = this.currentUser.username;
        
        // Handle File
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
            entry.attachment = await this.readFileAsBase64(fileInput.files[0]);
        }
        
        // Numeric conversions
        if (entry.amount) entry.amount = parseFloat(entry.amount);
        if (entry.paid) entry.paid = parseFloat(entry.paid);
        if (entry.due) entry.due = parseFloat(entry.due);
        if (entry.quantity) entry.quantity = parseFloat(entry.quantity);
        if (entry.rate) entry.rate = parseFloat(entry.rate);

        Storage.addEntry(entry);
        
        bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
        form.reset();
        this.refreshCurrentView();
        alert('Entry added successfully');
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
