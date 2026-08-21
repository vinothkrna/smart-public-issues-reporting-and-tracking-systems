/**
 * Smart Public Issue Reporting - Core Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auto-dismiss alert boxes after 5 seconds
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(alert => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        });
    }, 5000);

    // Setup Upvote Buttons
    document.querySelectorAll('.btn-upvote').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const issueId = btn.dataset.issueId;
            try {
                const response = await fetch(`/api/issues/${issueId}/upvote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                if (response.ok) {
                    const countSpan = btn.querySelector('.upvote-count');
                    if (countSpan) countSpan.textContent = data.upvotes;
                    btn.classList.add('text-primary', 'border-primary');
                    btn.disabled = true;
                }
            } catch (err) {
                console.error('Error upvoting:', err);
            }
        });
    });

    // Setup Notification Mark All as Read button
    const markReadBtn = document.getElementById('markAllNotificationsRead');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/notifications/read-all', { method: 'POST' });
                if (res.ok) {
                    const badge = document.getElementById('notificationBadge');
                    if (badge) badge.style.display = 'none';
                    document.querySelectorAll('.notification-item.unread').forEach(el => {
                        el.classList.remove('unread');
                        el.classList.add('bg-light');
                    });
                }
            } catch (err) {
                console.error('Error clearing notifications:', err);
            }
        });
    }
});
