/**
 * reports.js
 * Handles report generation and export (Excel/PDF)
 */

const Reports = {
    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        // Refresh preview on filter change
        ['report-type', 'report-start', 'report-end'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.generatePreview());
        });
        
        // Also refresh when tab becomes active
        document.querySelector('[data-page="reports"]').addEventListener('click', () => {
            // Set default dates if empty
            if (!document.getElementById('report-start').value) {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                document.getElementById('report-start').valueAsDate = firstDay;
                document.getElementById('report-end').valueAsDate = today;
            }
            this.generatePreview();
        });
    },

    getFilteredData: function() {
        if (!App.currentProjectId) return [];

        const type = document.getElementById('report-type').value;
        const startDate = document.getElementById('report-start').value;
        const endDate = document.getElementById('report-end').value;
        
        let entries = Storage.getEntriesByProject(App.currentProjectId);

        // Filter by Date
        if (startDate) {
            entries = entries.filter(e => e.date >= startDate);
        }
        if (endDate) {
            entries = entries.filter(e => e.date <= endDate);
        }

        // Filter by Type/Category
        if (type !== 'all') {
            if (type === 'material') {
                entries = entries.filter(e => e.category === 'material');
            } else if (type === 'labor') {
                entries = entries.filter(e => e.category === 'labor');
            } else if (type === 'service') {
                entries = entries.filter(e => e.category === 'service');
            }
        }

        // Sort by date
        return entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    generatePreview: function() {
        const data = this.getFilteredData();
        const table = document.getElementById('report-preview-table');
        
        let html = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Party</th>
                    <th>Details</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        let totalAmount = 0;
        let totalPaid = 0;
        let totalDue = 0;

        data.forEach(e => {
            const isCashIn = e.type === 'cash_in';
            const details = e.item_name ? `${e.item_name} (${e.quantity || ''} @ ${e.rate || ''})` : (e.notes || '');
            
            html += `
                <tr>
                    <td>${e.date}</td>
                    <td>${isCashIn ? 'IN' : 'OUT'}</td>
                    <td>${e.category || 'General'}</td>
                    <td>${e.party_name}</td>
                    <td>${details}</td>
                    <td>${parseFloat(e.amount || 0).toFixed(2)}</td>
                    <td>${parseFloat(e.paid || 0).toFixed(2)}</td>
                    <td>${parseFloat(e.due || 0).toFixed(2)}</td>
                </tr>
            `;

            totalAmount += parseFloat(e.amount || 0);
            totalPaid += parseFloat(e.paid || 0);
            totalDue += parseFloat(e.due || 0);
        });

        html += `
            <tr class="table-dark fw-bold">
                <td colspan="5">TOTALS</td>
                <td>${totalAmount.toFixed(2)}</td>
                <td>${totalPaid.toFixed(2)}</td>
                <td>${totalDue.toFixed(2)}</td>
            </tr>
            </tbody>
        `;

        table.innerHTML = html;
    },

    exportExcel: function() {
        const data = this.getFilteredData();
        if (data.length === 0) {
            alert('No data to export');
            return;
        }

        // Format data for Excel
        const rows = data.map(e => ({
            Date: e.date,
            Type: e.type === 'cash_in' ? 'Cash In' : 'Cash Out',
            Category: e.category || 'General',
            Party: e.party_name,
            Details: e.item_name || e.notes || '',
            Quantity: e.quantity || '',
            Rate: e.rate || '',
            TotalAmount: parseFloat(e.amount || 0),
            PaidAmount: parseFloat(e.paid || 0),
            DueAmount: parseFloat(e.due || 0),
            PaymentMode: e.payment_mode || ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cashbook Report");
        
        const projectName = Storage.getProjectById(App.currentProjectId).name;
        XLSX.writeFile(wb, `${projectName}_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    },

    exportPDF: function() {
        const data = this.getFilteredData();
        if (data.length === 0) {
            alert('No data to export');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const projectName = Storage.getProjectById(App.currentProjectId).name;
        
        doc.setFontSize(18);
        doc.text(`Cashbook Report: ${projectName}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Date", "Type", "Category", "Party", "Details", "Total", "Paid", "Due"];
        const tableRows = [];

        data.forEach(e => {
            const details = e.item_name || e.notes || '';
            const row = [
                e.date,
                e.type === 'cash_in' ? 'IN' : 'OUT',
                e.category || 'General',
                e.party_name,
                details,
                parseFloat(e.amount || 0).toFixed(2),
                parseFloat(e.paid || 0).toFixed(2),
                parseFloat(e.due || 0).toFixed(2)
            ];
            tableRows.push(row);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        doc.save(`${projectName}_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    }
};

// Expose to window for onclick handlers
window.exportExcel = () => Reports.exportExcel();
window.exportPDF = () => Reports.exportPDF();

document.addEventListener('DOMContentLoaded', () => {
    Reports.init();
});
