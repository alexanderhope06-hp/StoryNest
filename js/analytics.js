/* =====================================================
   STORYNEST - ANALYTICS TRACKING
   ===================================================== */

const Analytics = {
    sessionId: null,
    startTime: null,
    currentNovelId: null,
    currentChapterId: null,
    pageStartTime: null,
    
    // Initialize tracking
    init() {
        this.sessionId = this.getOrCreateSessionId();
        this.startTime = new Date();
        this.pageStartTime = new Date();
        
        // Track page view
        this.trackPageView();
        
        // Track when user leaves
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackSessionEnd();
            }
        });
        
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
            this.trackPageTime();
        });
        
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = this.getScrollPercent();
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                // Update scroll depth every 25%
                if (maxScroll % 25 < 5) {
                    this.trackScrollDepth(maxScroll);
                }
            }
        });
    },
    
    // Get or create session ID
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('reader_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('reader_session_id', sessionId);
        }
        return sessionId;
    },
    
    // Track page view
    async trackPageView() {
        const urlParams = new URLSearchParams(window.location.search);
        const novelId = urlParams.get('id');
        const chapterNumber = urlParams.get('chapter');
        
        if (!novelId) return;
        
        this.currentNovelId = novelId;
        
        // Get chapter ID if available
        let chapterId = null;
        if (chapterNumber) {
            const { data } = await supabaseClient
                .from('chapters')
                .select('id')
                .eq('novel_id', novelId)
                .eq('chapter_number', parseInt(chapterNumber))
                .single();
            if (data) chapterId = data.id;
            this.currentChapterId = chapterId;
        }
        
        // Track page view
        const { error } = await supabaseClient
            .from('page_views')
            .insert({
                novel_id: novelId,
                chapter_id: chapterId,
                session_id: this.sessionId,
                reader_id: (await this.getCurrentUser())?.id || null,
                viewed_at: new Date().toISOString()
            });
        
        if (error) console.error('Analytics error:', error);
    },
    
    // Track time on page
    async trackPageTime() {
        if (!this.pageStartTime) return;
        
        const timeSpent = Math.round((new Date() - this.pageStartTime) / 1000);
        if (timeSpent < 2) return; // Ignore quick bounces
        
        // Update page view with time
        const { error } = await supabaseClient
            .from('page_views')
            .update({
                time_on_page_seconds: timeSpent
            })
            .eq('session_id', this.sessionId)
            .eq('novel_id', this.currentNovelId)
            .order('viewed_at', { ascending: false })
            .limit(1);
        
        if (error) console.error('Time tracking error:', error);
    },
    
    // Track session end
    async trackSessionEnd() {
        if (!this.startTime) return;
        
        const timeSpent = Math.round((new Date() - this.startTime) / 1000);
        if (timeSpent < 5) return;
        
        // Update or create session
        const { error } = await supabaseClient
            .from('reader_sessions')
            .insert({
                novel_id: this.currentNovelId,
                session_id: this.sessionId,
                ended_at: new Date().toISOString(),
                time_spent_seconds: timeSpent,
                device_type: this.getDeviceType(),
                country: await this.getCountry()
            });
        
        if (error) console.error('Session tracking error:', error);
    },
    
    // Track scroll depth
    async trackScrollDepth(percent) {
        if (!this.currentNovelId) return;
        
        const { error } = await supabaseClient
            .from('page_views')
            .update({
                scroll_percentage: percent
            })
            .eq('session_id', this.sessionId)
            .eq('novel_id', this.currentNovelId)
            .order('viewed_at', { ascending: false })
            .limit(1);
        
        if (error) console.error('Scroll tracking error:', error);
    },
    
    // Get scroll percentage
    getScrollPercent() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        return scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
    },
    
    // Get device type
    getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
        return 'desktop';
    },
    
    // Get country (simplified)
    async getCountry() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return data.country_name || 'Unknown';
        } catch {
            return 'Unknown';
        }
    },
    
    // Get current user
    async getCurrentUser() {
        const { data } = await supabaseClient.auth.getUser();
        return data?.user || null;
    }
};

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', () => {
    Analytics.init();
});