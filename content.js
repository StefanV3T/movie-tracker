console.log("Netflix Watch Tracker Loaded");

// Keep track of the current title to avoid duplicates
let currentTitle = null;
let lastSendTime = 0;
let isUserLoggedIn = false;
let checkLoginInterval = null;
const SEND_COOLDOWN = 10000; // 10 seconds cooldown

// Check if the user is logged in
function checkLoginStatus() {
  chrome.storage.local.get(['authSession'], (result) => {
    const wasLoggedIn = isUserLoggedIn;
    isUserLoggedIn = result.authSession && result.authSession.user && result.authSession.user.id ? true : false;
    
    if (isUserLoggedIn) {
      console.log("User is logged in - tracking titles");
      // Only start tracking if we weren't already
      if (!wasLoggedIn) {
        startTracking();
      }
    } else {
      console.log("User is not logged in - not tracking titles");
      // Stop tracking if we were tracking
      if (wasLoggedIn) {
        stopTracking();
      }
    }
  });
}

// Function to get titles from Netflix - ONLY using official Netflix title element
function getTitle() {
    // Skip title detection on any non-watch pages
    if (!location.pathname.startsWith("/watch")) {
        console.log("Not on a /watch page - skipping title detection");
        return null;
    }
    
    // ONLY use the official Netflix title selector
    const element = document.querySelector('[data-uia="video-title"]');
    
    if (element && element.innerText && element.innerText.trim()) {
        const title = element.innerText.trim();
        console.log(`Found Netflix title: "${title}"`);
        return title;
    }
    
    console.log("No Netflix title element found");
    return null;
}

// Function to handle title detection and sending
function checkAndSendTitle() {
    // Skip if user is not logged in
    if (!isUserLoggedIn) {
        console.log("Not checking titles - user not logged in");
        return;
    }

    // Strict check - ONLY process /watch paths
    if (!location.pathname.startsWith("/watch")) {
        console.log("Not on a /watch page - skipping title check");
        return;
    }

    const title = getTitle();
    const now = Date.now();
    
    // Only proceed if we found a valid title
    if (title && title !== currentTitle && (now - lastSendTime > SEND_COOLDOWN)) {
        console.log("New title detected:", title);
        currentTitle = title;
        lastSendTime = now;
        
        // Send message to background script
        chrome.runtime.sendMessage({ action: "save_movie", title }, response => {
            console.log("Received response from background script:", response);
            if (response && response.success) {
                console.log("Movie successfully saved:", title);
            } else {
                console.error("Failed to save movie:", title);
                setTimeout(() => {
                    if (currentTitle === title) {
                        currentTitle = null;
                    }
                }, 15000);
            }
        });
    }
}

// Variables to track observation
let titleObserver = null;
let titleInterval = null;
let urlCheckInterval = null;
let lastUrl = location.href;

// Start tracking titles
function startTracking() {
    console.log("Starting title tracking");
    
    // Initial check with a bit of delay
    setTimeout(checkAndSendTitle, 2000);
    
    // Set up DOM mutation observer to detect UI changes
    if (!titleObserver) {
        titleObserver = new MutationObserver(() => {
            setTimeout(checkAndSendTitle, 500);
        });
        
        titleObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    // Start periodic checks
    if (titleInterval) clearInterval(titleInterval);
    titleInterval = setInterval(checkAndSendTitle, 10000);
    
    // URL change detection
    if (urlCheckInterval) clearInterval(urlCheckInterval);
    urlCheckInterval = setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log("URL changed:", location.href);
            // Reset current title on URL change
            currentTitle = null;
            setTimeout(checkAndSendTitle, 1500);
        }
    }, 1000);
    
    // Also listen for navigation changes
    window.addEventListener('popstate', handleNavigation);
}

// Stop tracking titles
function stopTracking() {
    console.log("Stopping title tracking");
    
    // Disconnect observer
    if (titleObserver) {
        titleObserver.disconnect();
        titleObserver = null;
    }
    
    // Clear intervals
    if (titleInterval) {
        clearInterval(titleInterval);
        titleInterval = null;
    }
    
    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
        urlCheckInterval = null;
    }
    
    // Remove event listeners
    window.removeEventListener('popstate', handleNavigation);
}

// Navigation event handler
function handleNavigation() {
    console.log("Navigation detected - checking for new title");
    // Reset current title on navigation
    currentTitle = null;
    
    // Only check if logged in
    if (isUserLoggedIn) {
        setTimeout(checkAndSendTitle, 1500);
    }
}

// Initialize by checking login status
checkLoginStatus();

// Periodically check login status
checkLoginInterval = setInterval(checkLoginStatus, 5000);

console.log("Netflix Watch Tracker initialized - waiting for login");