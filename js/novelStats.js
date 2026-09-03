/* =====================================================
   STORYNEST - NOVEL STATISTICS DASHBOARD
   ===================================================== */

async function loadNovelStats(novelId) {
    try {
        // Get stats from novel_stats table
        const { data: stats, error } = await supabaseClient
            .from('novel_stats')
            .select('*')
            .eq('novel_id', novelId)
            .single();
        
        if (error) {
            console.error('Stats error:', error);
            return null;
        }
        
        return stats;
    } catch (error) {
        console.error('Error loading stats:', error);
        return null;
    }
}

async function updateNovelStats(novelId) {
    // Calculate stats from raw data
    const { data: sessions } = await supabaseClient
        .from('reader_sessions')
        .select('*')
        .eq('novel_id', novelId);
    
    if (!sessions || sessions.length === 0) return;
    
    const totalReads = sessions.length;
    const totalTime = sessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
    const avgTime = Math.round(totalTime / totalReads);
    
    // Update stats
    await supabaseClient
        .from('novel_stats')
        .upsert({
            novel_id: novelId,
            total_reads: totalReads,
            total_views: totalReads,
            avg_time_spent: avgTime,
            updated_at: new Date().toISOString()
        });
}

// Call this when viewing novel details
async function displayNovelStats(novelId) {
    const stats = await loadNovelStats(novelId);
    if (!stats) return;
    
    // Update UI
    const readersEl = document.getElementById('totalReaders');
    const timeEl = document.getElementById('avgReadingTime');
    
    if (readersEl) readersEl.textContent = stats.total_reads || 0;
    if (timeEl) {
        const mins = Math.floor((stats.avg_time_spent || 0) / 60);
        timeEl.textContent = mins > 0 ? `${mins}m` : '< 1m';
    }
}