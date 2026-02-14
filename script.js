document.addEventListener('DOMContentLoaded', function() {
    const continueBtn = document.getElementById('continue-btn');
    const greetingPage = document.getElementById('greeting-page');
    const messagePage = document.getElementById('message-page');

    continueBtn.addEventListener('click', function() {
        // Add fade out animation
        greetingPage.style.opacity = '0';
        greetingPage.style.transition = 'opacity 0.5s ease-out';
        
        setTimeout(function() {
            greetingPage.classList.remove('active');
            messagePage.classList.add('active');
            messagePage.style.opacity = '0';
            messagePage.style.transition = 'opacity 0.5s ease-in';
            
            // Trigger reflow to ensure transition works
            void messagePage.offsetWidth;
            
            messagePage.style.opacity = '1';
        }, 500);
    });
});
