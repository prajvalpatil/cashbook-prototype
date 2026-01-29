/**
 * storage.js
 * Handles all LocalStorage interactions and data persistence.
 */

const DB_KEYS = {
    USERS: 'cashbook_users',
    PROJECTS: 'cashbook_projects',
    ENTRIES: 'cashbook_entries',
    SESSION: 'cashbook_session'
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
        entries.push(entry);
        localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify(entries));
        return entry;
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

    // --- File Handling (Helper) ---
    // In a real app, we'd upload to a server. Here we store Base64 strings (limitations apply).
    // Large files might crash LocalStorage, so we should warn or limit size.
};

// Initialize on load
Storage.init();
