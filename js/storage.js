/**
 * storage.js
 * Handles all LocalStorage interactions and data persistence.
 */

const DB_KEYS = {
    USERS: 'cashbook_users',
    PROJECTS: 'cashbook_projects',
    ENTRIES: 'cashbook_entries',
    FILES: 'cashbook_files',
    PARTIES: 'cashbook_parties',
    MATERIALS: 'cashbook_materials',
    SESSION: 'cashbook_session',
    BEAM_TABLES: 'cashbook_beam_tables'
};

const Storage = {
    init: function() {
        if (!localStorage.getItem(DB_KEYS.USERS)) {
            const defaultAdmin = {
                id: 'admin_001',
                username: 'admin',
                password: 'password', // In a real app, this would be hashed
                role: 'admin',
                name: 'Administrator'
            };
            const defaultMember = {
                id: 'member_001',
                username: 'member',
                password: 'password',
                role: 'member',
                name: 'Site Engineer'
            };
            localStorage.setItem(DB_KEYS.USERS, JSON.stringify([defaultAdmin, defaultMember]));
        }
        if (!localStorage.getItem(DB_KEYS.PROJECTS)) {
            localStorage.setItem(DB_KEYS.PROJECTS, JSON.stringify([]));
        }
        if (!localStorage.getItem(DB_KEYS.ENTRIES)) {
            localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify([]));
        }
        if (!localStorage.getItem(DB_KEYS.FILES)) {
            localStorage.setItem(DB_KEYS.FILES, JSON.stringify([]));
        }
        if (!localStorage.getItem(DB_KEYS.BEAM_TABLES)) {
            localStorage.setItem(DB_KEYS.BEAM_TABLES, JSON.stringify([]));
        }
    },

    // --- Users ---
    getUsers: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
    },

    login: function(username, password, role) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password && u.role === role);
        if (user) {
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user));
            return user;
        }
        return null;
    },

    logout: function() {
        localStorage.removeItem(DB_KEYS.SESSION);
    },

    getCurrentUser: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.SESSION));
    },

    // --- Projects ---
    getProjects: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.PROJECTS) || '[]');
    },

    addProject: function(project) {
        const projects = this.getProjects();
        project.id = 'proj_' + Date.now();
        project.createdAt = new Date().toISOString();
        projects.push(project);
        localStorage.setItem(DB_KEYS.PROJECTS, JSON.stringify(projects));
        return project;
    },

    updateProject: function(updatedProject) {
        let projects = this.getProjects();
        const index = projects.findIndex(p => p.id === updatedProject.id);
        if (index !== -1) {
            projects[index] = updatedProject;
            localStorage.setItem(DB_KEYS.PROJECTS, JSON.stringify(projects));
            return true;
        }
        return false;
    },
    
    deleteProject: function(projectId) {
        let projects = this.getProjects();
        projects = projects.filter(p => p.id !== projectId);
        localStorage.setItem(DB_KEYS.PROJECTS, JSON.stringify(projects));
        
        // Also delete associated entries
        let entries = this.getEntries();
        entries = entries.filter(e => e.projectId !== projectId);
        localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify(entries));

        // Also delete associated files
        let files = this.getFiles();
        files = files.filter(f => f.projectId !== projectId);
        localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files));
    },

    getProjectById: function(id) {
        const projects = this.getProjects();
        return projects.find(p => p.id === id);
    },

    // --- Entries ---
    getEntries: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.ENTRIES) || '[]');
    },

    addEntry: function(entry) {
        const entries = this.getEntries();
        entry.id = 'entry_' + Date.now();
        entry.timestamp = new Date().toISOString();
        // Initialize payments array if not present
        if (!entry.payments) {
            entry.payments = [];
            // If there's an initial paid amount, record it as the first payment
            if (parseFloat(entry.paid) > 0) {
                entry.payments.push({
                    amount: parseFloat(entry.paid),
                    date: entry.date,
                    mode: entry.payment_mode || 'Cash', // Default to Cash if not specified
                    note: 'Initial Payment'
                });
            }
        }
        entries.push(entry);
        localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify(entries));
        return entry;
    },
    
    updateEntry: function(updatedEntry) {
        let entries = this.getEntries();
        const index = entries.findIndex(e => e.id === updatedEntry.id);
        if (index !== -1) {
            entries[index] = updatedEntry;
            localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify(entries));
            return true;
        }
        return false;
    },

    deleteEntry: function(entryId) {
        let entries = this.getEntries();
        entries = entries.filter(e => e.id !== entryId);
        localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify(entries));
    },

    getEntriesByProject: function(projectId) {
        const entries = this.getEntries();
        return entries.filter(e => e.projectId === projectId);
    },

    // --- Files ---
    getFiles: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
    },

    getFilesByProject: function(projectId) {
        return this.getFiles().filter(f => f.projectId === projectId);
    },

    addFile: function(file) {
        const files = this.getFiles();
        file.id = 'file_' + Date.now();
        file.uploadDate = new Date().toISOString();
        files.push(file);
        try {
            localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files));
            return file;
        } catch (e) {
            console.error("Storage limit exceeded", e);
            alert("File too large for browser storage! (Prototype limit)");
            return null;
        }
    },

    deleteFile: function(fileId) {
        let files = this.getFiles();
        files = files.filter(f => f.id !== fileId);
        localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files));
    },

    // --- Parties (Suppliers / Labors) ---
    getParties: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.PARTIES) || '[]');
    },

    getPartiesByProject: function(projectId) {
        // Parties might be global or project specific. 
        // For simplicity, let's make them global but filtered by usage if needed.
        // Or better, store projectId with them if they are project specific.
        // User request implies "select option to get this names", likely global or per project.
        // Let's assume project specific for better organization, or global?
        // "Supplier Name" usually global. "Labor Name" usually global.
        // Let's make them global for now as they might work on multiple projects.
        return this.getParties(); 
    },

    addParty: function(party) {
        const parties = this.getParties();
        // Check if exists
        const exists = parties.find(p => p.name.toLowerCase() === party.name.toLowerCase() && p.type === party.type);
        if (exists) return exists;

        party.id = 'party_' + Date.now();
        parties.push(party);
        localStorage.setItem(DB_KEYS.PARTIES, JSON.stringify(parties));
        return party;
    },

    // --- Materials ---
    getMaterials: function() {
        let materials = JSON.parse(localStorage.getItem(DB_KEYS.MATERIALS));
        if (!materials) {
            materials = ['Steel', 'Cement', 'Sand', 'Bricks', 'Tiles', 'Granite'];
            localStorage.setItem(DB_KEYS.MATERIALS, JSON.stringify(materials));
        } else {
            if (!materials.includes('Tiles')) {
                materials.push('Tiles');
                localStorage.setItem(DB_KEYS.MATERIALS, JSON.stringify(materials));
            }
            if (!materials.includes('Granite')) {
                materials.push('Granite');
                localStorage.setItem(DB_KEYS.MATERIALS, JSON.stringify(materials));
            }
        }
        return materials;
    },

    addMaterial: function(name) {
        const materials = this.getMaterials();
        if (!materials.includes(name)) {
            materials.push(name);
            localStorage.setItem(DB_KEYS.MATERIALS, JSON.stringify(materials));
        }
        return name;
    },

    // --- Beam Tables ---
    getBeamTables: function() {
        return JSON.parse(localStorage.getItem(DB_KEYS.BEAM_TABLES) || '[]');
    },

    getBeamTablesByProject: function(projectId) {
        return this.getBeamTables().filter(t => t.projectId === projectId);
    },

    addBeamTable: function(table) {
        const tables = this.getBeamTables();
        table.id = 'beam_' + Date.now();
        table.updatedAt = new Date().toISOString();
        tables.push(table);
        localStorage.setItem(DB_KEYS.BEAM_TABLES, JSON.stringify(tables));
        return table;
    },

    updateBeamTable: function(updatedTable) {
        let tables = this.getBeamTables();
        const index = tables.findIndex(t => t.id === updatedTable.id);
        if (index !== -1) {
            tables[index] = updatedTable;
            localStorage.setItem(DB_KEYS.BEAM_TABLES, JSON.stringify(tables));
        }
    },

    deleteBeamTable: function(id) {
        let tables = this.getBeamTables();
        tables = tables.filter(t => t.id !== id);
        localStorage.setItem(DB_KEYS.BEAM_TABLES, JSON.stringify(tables));
    }
};

// Initialize on load
Storage.init();
