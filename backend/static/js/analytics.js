/**
 * Chart.js Analytics for Smart Public Issues Platform
 */

document.addEventListener('DOMContentLoaded', async () => {
    const catCanvas = document.getElementById('categoryChart');
    if (!catCanvas) return;

    try {
        const res = await fetch('/api/analytics');
        const data = await res.json();

        // 1. Category Breakdown Donut Chart
        new Chart(catCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.categories),
                datasets: [{
                    data: Object.values(data.categories),
                    backgroundColor: [
                        '#ef4444', // Pothole
                        '#f59e0b', // Garbage
                        '#0ea5e9', // Water
                        '#8b5cf6', // Streetlight
                        '#10b981'  // Drainage
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '65%'
            }
        });

        // 2. Status Distribution Bar Chart
        const statusCanvas = document.getElementById('statusChart');
        if (statusCanvas) {
            new Chart(statusCanvas, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.statuses),
                    datasets: [{
                        label: 'Number of Complaints',
                        data: Object.values(data.statuses),
                        backgroundColor: '#4f46e5',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // 3. Department Workload Chart
        const deptCanvas = document.getElementById('departmentChart');
        if (deptCanvas && Object.keys(data.departments).length > 0) {
            new Chart(deptCanvas, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.departments),
                    datasets: [{
                        label: 'Assigned Issues',
                        data: Object.values(data.departments),
                        backgroundColor: '#0ea5e9',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    scales: {
                        x: { beginAtZero: true, ticks: { precision: 0 } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // 4. Priority Breakdown Chart
        const priorityCanvas = document.getElementById('priorityChart');
        if (priorityCanvas) {
            new Chart(priorityCanvas, {
                type: 'pie',
                data: {
                    labels: Object.keys(data.priorities),
                    datasets: [{
                        data: Object.values(data.priorities),
                        backgroundColor: ['#94a3b8', '#f59e0b', '#f97316', '#ef4444']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

    } catch (err) {
        console.error('Failed to load analytics data:', err);
    }
});
