// Global state
let leads = [];
let currentLeadId = null;
let deleteLeadId = null;
let editMode = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadLeadsFromStorage();
    initializeEventListeners();
    loadThemePreference();
    updateDashboard();
    renderRecentLeads();
    renderAllLeads();
    updateAnalytics();
});

// Load leads from localStorage
function loadLeadsFromStorage() {
    const storedLeads = localStorage.getItem('leads');
    if (storedLeads) {
        leads = JSON.parse(storedLeads);
    }
}

// Save leads to localStorage
function saveLeadsToStorage() {
    localStorage.setItem('leads', JSON.stringify(leads));
}

// Generate unique lead ID
function generateLeadId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `LD${timestamp}${random}`;
}

// Initialize all event listeners
function initializeEventListeners() {
    // Navigation
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            switchPage(this.dataset.page);
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Add lead buttons
    document.getElementById('addLeadBtn').addEventListener('click', openAddLeadModal);
    document.getElementById('addLeadBtnLeads').addEventListener('click', openAddLeadModal);

    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', closeLeadModal);
    document.getElementById('cancelBtn').addEventListener('click', closeLeadModal);
    document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);

    // Form submit
    document.getElementById('leadForm').addEventListener('submit', handleLeadSubmit);

    // Filters and search
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
    document.getElementById('sourceFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // Detail modal
    document.getElementById('detailStatus').addEventListener('change', handleStatusChange);
    document.getElementById('editFromDetail').addEventListener('click', editFromDetail);
    document.getElementById('noteForm').addEventListener('submit', handleNoteSubmit);

    // Delete confirmation
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteLead);

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// Switch page
function switchPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageName).classList.add('active');

    if (pageName === 'analytics') {
        updateAnalytics();
    }
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load theme preference
function loadThemePreference() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }
}

// Open add lead modal
function openAddLeadModal() {
    editMode = false;
    currentLeadId = null;
    document.getElementById('modalTitle').textContent = 'Add New Lead';
    document.getElementById('leadForm').reset();
    document.getElementById('leadId').value = '';
    document.getElementById('leadModal').classList.add('active');
}

// Close lead modal
function closeLeadModal() {
    document.getElementById('leadModal').classList.remove('active');
    document.getElementById('leadForm').reset();
}

// Handle lead form submit
function handleLeadSubmit(e) {
    e.preventDefault();

    const formData = {
        id: document.getElementById('leadId').value || generateLeadId(),
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value || 'N/A',
        source: document.getElementById('source').value,
        priority: document.getElementById('priority').value,
        notes: document.getElementById('notes').value,
        status: 'New',
        createdAt: new Date().toISOString(),
        activities: []
    };

    if (editMode && currentLeadId) {
        const leadIndex = leads.findIndex(l => l.id === currentLeadId);
        if (leadIndex !== -1) {
            formData.status = leads[leadIndex].status;
            formData.createdAt = leads[leadIndex].createdAt;
            formData.activities = leads[leadIndex].activities || [];
            formData.activities.push({
                type: 'updated',
                message: 'Lead details updated',
                timestamp: new Date().toISOString()
            });
            leads[leadIndex] = formData;
            showToast('Lead updated successfully!', 'success');
        }
    } else {
        formData.activities.push({
            type: 'created',
            message: 'Lead created',
            timestamp: new Date().toISOString()
        });
        leads.unshift(formData);
        showToast('Lead added successfully!', 'success');
    }

    saveLeadsToStorage();
    closeLeadModal();
    updateDashboard();
    renderRecentLeads();
    renderAllLeads();
    updateAnalytics();
}

// Open detail modal
function openDetailModal(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    currentLeadId = leadId;

    document.getElementById('detailName').textContent = lead.fullName;
    document.getElementById('detailEmail').textContent = lead.email;
    document.getElementById('detailPhone').textContent = lead.phone;
    document.getElementById('detailCompany').textContent = lead.company;
    document.getElementById('detailSource').textContent = lead.source;
    document.getElementById('detailPriority').textContent = lead.priority;
    document.getElementById('detailId').textContent = lead.id;
    document.getElementById('detailStatus').value = lead.status;

    renderActivityTimeline(lead.activities || []);

    document.getElementById('detailModal').classList.add('active');
}

// Close detail modal
function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
    currentLeadId = null;
}

// Render activity timeline
function renderActivityTimeline(activities) {
    const timeline = document.getElementById('activityTimeline');
    timeline.innerHTML = '';

    if (activities.length === 0) {
        timeline.innerHTML = '<p style="color: var(--text-secondary)">No activity yet</p>';
        return;
    }

    activities.slice().reverse().forEach(activity => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        const date = document.createElement('div');
        date.className = 'timeline-date';
        date.textContent = formatDateTime(activity.timestamp);

        const content = document.createElement('div');
        content.className = 'timeline-content';
        content.textContent = activity.message;

        item.appendChild(date);
        item.appendChild(content);
        timeline.appendChild(item);
    });
}

// Handle status change
function handleStatusChange() {
    if (!currentLeadId) return;

    const newStatus = document.getElementById('detailStatus').value;
    const leadIndex = leads.findIndex(l => l.id === currentLeadId);

    if (leadIndex !== -1) {
        const oldStatus = leads[leadIndex].status;
        leads[leadIndex].status = newStatus;
        leads[leadIndex].activities = leads[leadIndex].activities || [];
        leads[leadIndex].activities.push({
            type: 'status_change',
            message: `Status changed from ${oldStatus} to ${newStatus}`,
            timestamp: new Date().toISOString()
        });

        saveLeadsToStorage();
        updateDashboard();
        renderRecentLeads();
        renderAllLeads();
        updateAnalytics();
        renderActivityTimeline(leads[leadIndex].activities);
        showToast('Status updated successfully!', 'success');
    }
}

// Edit from detail
function editFromDetail() {
    if (!currentLeadId) return;

    const lead = leads.find(l => l.id === currentLeadId);
    if (!lead) return;

    closeDetailModal();

    editMode = true;
    document.getElementById('modalTitle').textContent = 'Edit Lead';
    document.getElementById('leadId').value = lead.id;
    document.getElementById('fullName').value = lead.fullName;
    document.getElementById('email').value = lead.email;
    document.getElementById('phone').value = lead.phone;
    document.getElementById('company').value = lead.company;
    document.getElementById('source').value = lead.source;
    document.getElementById('priority').value = lead.priority;
    document.getElementById('notes').value = lead.notes;

    document.getElementById('leadModal').classList.add('active');
}

// Handle note submit
function handleNoteSubmit(e) {
    e.preventDefault();

    if (!currentLeadId) return;

    const note = document.getElementById('followupNote').value;
    if (!note.trim()) return;

    const leadIndex = leads.findIndex(l => l.id === currentLeadId);
    if (leadIndex !== -1) {
        leads[leadIndex].activities = leads[leadIndex].activities || [];
        leads[leadIndex].activities.push({
            type: 'note',
            message: note,
            timestamp: new Date().toISOString()
        });

        saveLeadsToStorage();
        renderActivityTimeline(leads[leadIndex].activities);
        document.getElementById('followupNote').value = '';
        showToast('Note added successfully!', 'success');
    }
}

// Edit lead
function editLead(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    editMode = true;
    currentLeadId = leadId;

    document.getElementById('modalTitle').textContent = 'Edit Lead';
    document.getElementById('leadId').value = lead.id;
    document.getElementById('fullName').value = lead.fullName;
    document.getElementById('email').value = lead.email;
    document.getElementById('phone').value = lead.phone;
    document.getElementById('company').value = lead.company;
    document.getElementById('source').value = lead.source;
    document.getElementById('priority').value = lead.priority;
    document.getElementById('notes').value = lead.notes;

    document.getElementById('leadModal').classList.add('active');
}

// Delete lead
function deleteLead(leadId) {
    deleteLeadId = leadId;
    document.getElementById('deleteModal').classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteLeadId = null;
}

// Confirm delete lead
function confirmDeleteLead() {
    if (!deleteLeadId) return;

    leads = leads.filter(l => l.id !== deleteLeadId);
    saveLeadsToStorage();
    closeDeleteModal();
    updateDashboard();
    renderRecentLeads();
    renderAllLeads();
    updateAnalytics();
    showToast('Lead deleted successfully!', 'success');
}

// Update dashboard
function updateDashboard() {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'New').length;
    const contacted = leads.filter(l => l.status === 'Contacted').length;
    const converted = leads.filter(l => l.status === 'Converted').length;
    const lost = leads.filter(l => l.status === 'Lost').length;

    document.getElementById('totalLeads').textContent = total;
    document.getElementById('newLeads').textContent = newLeads;
    document.getElementById('contactedLeads').textContent = contacted;
    document.getElementById('convertedLeads').textContent = converted;
    document.getElementById('lostLeads').textContent = lost;
}

// Render recent leads
function renderRecentLeads() {
    const tbody = document.getElementById('recentLeadsTable');
    tbody.innerHTML = '';

    const recentLeads = leads.slice(0, 5);

    if (recentLeads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No leads found</td></tr>';
        return;
    }

    recentLeads.forEach(lead => {
        const row = createLeadRow(lead, true);
        tbody.appendChild(row);
    });
}

// Render all leads
function renderAllLeads() {
    const tbody = document.getElementById('allLeadsTable');
    tbody.innerHTML = '';

    let filteredLeads = getFilteredLeads();

    if (filteredLeads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--text-secondary);">No leads found</td></tr>';
        return;
    }

    filteredLeads.forEach(lead => {
        const row = createLeadRow(lead, false);
        tbody.appendChild(row);
    });
}

// Create lead table row
function createLeadRow(lead, isRecent) {
    const row = document.createElement('tr');

    const statusClass = lead.status.toLowerCase().replace(/[^a-z]/g, '-');
    const priorityClass = lead.priority.toLowerCase();

    if (isRecent) {
        row.innerHTML = `
            <td>${lead.id}</td>
            <td>${lead.fullName}</td>
            <td>${lead.email}</td>
            <td><span class="status-badge status-${statusClass}">${lead.status}</span></td>
            <td><span class="priority-badge priority-${priorityClass}">${lead.priority}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn btn-view" onclick="openDetailModal('${lead.id}')">View</button>
                    <button class="action-btn btn-edit" onclick="editLead('${lead.id}')">Edit</button>
                    <button class="action-btn btn-delete" onclick="deleteLead('${lead.id}')">Delete</button>
                </div>
            </td>
        `;
    } else {
        row.innerHTML = `
            <td>${lead.id}</td>
            <td>${lead.fullName}</td>
            <td>${lead.email}</td>
            <td>${lead.phone}</td>
            <td>${lead.company}</td>
            <td><span class="status-badge status-${statusClass}">${lead.status}</span></td>
            <td><span class="priority-badge priority-${priorityClass}">${lead.priority}</span></td>
            <td>${lead.source}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn btn-view" onclick="openDetailModal('${lead.id}')">View</button>
                    <button class="action-btn btn-edit" onclick="editLead('${lead.id}')">Edit</button>
                    <button class="action-btn btn-delete" onclick="deleteLead('${lead.id}')">Delete</button>
                </div>
            </td>
        `;
    }

    return row;
}

// Apply filters
function applyFilters() {
    renderAllLeads();
}

// Get filtered leads
function getFilteredLeads() {
    let filtered = [...leads];

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const sourceFilter = document.getElementById('sourceFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    if (searchTerm) {
        filtered = filtered.filter(lead =>
            lead.fullName.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm) ||
            lead.phone.includes(searchTerm)
        );
    }

    if (statusFilter) {
        filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (priorityFilter) {
        filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    if (sourceFilter) {
        filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'priority') {
        const priorityOrder = { High: 1, Medium: 2, Low: 3 };
        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    return filtered;
}

// Update analytics
function updateAnalytics() {
    updateConversionRate();
    renderStatusChart();
    renderPriorityChart();
    renderSourceChart();
    renderMonthlyChart();
}

// Update conversion rate
function updateConversionRate() {
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'Converted').length;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
    document.getElementById('conversionRate').textContent = rate + '%';
}

// Render status chart
function renderStatusChart() {
    const statusCounts = {
        'New': 0,
        'Contacted': 0,
        'Follow-up': 0,
        'Converted': 0,
        'Lost': 0
    };

    leads.forEach(lead => {
        if (statusCounts.hasOwnProperty(lead.status)) {
            statusCounts[lead.status]++;
        }
    });

    const chart = document.getElementById('statusChart');
    chart.innerHTML = '';

    const total = leads.length || 1;

    Object.entries(statusCounts).forEach(([status, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        chart.innerHTML += createChartBar(status, count, percentage);
    });
}

// Render priority chart
function renderPriorityChart() {
    const priorityCounts = {
        'High': 0,
        'Medium': 0,
        'Low': 0
    };

    leads.forEach(lead => {
        if (priorityCounts.hasOwnProperty(lead.priority)) {
            priorityCounts[lead.priority]++;
        }
    });

    const chart = document.getElementById('priorityChart');
    chart.innerHTML = '';

    const total = leads.length || 1;

    Object.entries(priorityCounts).forEach(([priority, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        chart.innerHTML += createChartBar(priority, count, percentage);
    });
}

// Render source chart
function renderSourceChart() {
    const sourceCounts = {};

    leads.forEach(lead => {
        if (!sourceCounts[lead.source]) {
            sourceCounts[lead.source] = 0;
        }
        sourceCounts[lead.source]++;
    });

    const chart = document.getElementById('sourceChart');
    chart.innerHTML = '';

    const total = leads.length || 1;

    Object.entries(sourceCounts).forEach(([source, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        chart.innerHTML += createChartBar(source, count, percentage);
    });
}

// Render monthly chart
function renderMonthlyChart() {
    const monthlyCounts = {};

    leads.forEach(lead => {
        const date = new Date(lead.createdAt);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyCounts[monthYear]) {
            monthlyCounts[monthYear] = 0;
        }
        monthlyCounts[monthYear]++;
    });

    const chart = document.getElementById('monthlyChart');
    chart.innerHTML = '';

    if (Object.keys(monthlyCounts).length === 0) {
        chart.innerHTML = '<p style="color: var(--text-secondary)">No data available</p>';
        return;
    }

    const maxCount = Math.max(...Object.values(monthlyCounts));

    Object.entries(monthlyCounts).forEach(([month, count]) => {
        const percentage = ((count / maxCount) * 100).toFixed(1);
        chart.innerHTML += createChartBar(month, count, percentage);
    });
}

// Create chart bar
function createChartBar(label, count, percentage) {
    return `
        <div class="chart-bar">
            <div class="chart-label">
                <span>${label}</span>
                <span>${count}</span>
            </div>
            <div class="chart-bar-bg">
                <div class="chart-bar-fill" style="width: ${percentage}%">${percentage}%</div>
            </div>
        </div>
    `;
}

// Format date time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
        return 'Yesterday at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
        return days + ' days ago';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
