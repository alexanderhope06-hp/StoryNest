/* =====================================================
   STORYNEST - PROFILE EDITOR
   ===================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    const form = document.getElementById('profileForm');
    const displayNameInput = document.getElementById('profileDisplayName');
    const bioInput = document.getElementById('profileBio');
    const emailInput = document.getElementById('profileEmail');
    const saveBtn = document.getElementById('saveProfile');
    
    // Get user
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
        showToast('Please login first.', 'error');
        setTimeout(() => window.location.replace('login.html'), 1500);
        return;
    }
    
    // Populate form
    emailInput.value = user.email || '';
    displayNameInput.value = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
    bioInput.value = user.user_metadata?.bio || '';
    
    // Save profile
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const displayName = displayNameInput.value.trim();
        const bio = bioInput.value.trim();
        
        if (!displayName) {
            showToast('Please enter a display name.', 'error');
            return;
        }
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        const { error: updateError } = await supabaseClient.auth.updateUser({
            data: {
                display_name: displayName,
                bio: bio
            }
        });
        
        if (updateError) {
            showToast('Failed to update profile: ' + updateError.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Profile';
            return;
        }
        
        showToast('Profile updated successfully!');
        setTimeout(() => window.location.replace('author.html'), 1000);
    });
});