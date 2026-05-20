/**
 * Export user data to CSV file
 */
export function exportToCSV(users, filename = 'x-unfollower-export.csv') {
  const headers = ['Username', 'Display Name', 'Follows You', 'Wallchain Score', 'Verified', 'Scanned At'];

  const rows = users.map(user => [
    `@${user.username}`,
    user.displayName || '',
    user.followsYou ? 'Yes' : 'No',
    user.wallchainScore !== null ? user.wallchainScore : 'N/A',
    user.isVerified ? 'Yes' : 'No',
    user.scannedAt ? new Date(user.scannedAt).toISOString() : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export unfollow history to CSV
 */
export function exportHistoryCSV(history, filename = 'x-unfollower-history.csv') {
  const headers = ['Username', 'Display Name', 'Wallchain Score', 'Unfollowed At'];

  const rows = history.map(item => [
    `@${item.username}`,
    item.displayName || '',
    item.wallchainScore !== null ? item.wallchainScore : 'N/A',
    new Date(item.unfollowedAt).toISOString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
