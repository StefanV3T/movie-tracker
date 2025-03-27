console.log("Streaming Watch Tracker Loaded");

// Keep track of the current title to avoid duplicates
let currentTitle = null;
let lastSendTime = 0;
let isUserLoggedIn = false;
let checkLoginInterval = null;
const SEND_COOLDOWN = 10000; // 10 seconds cooldown

// Determine which streaming platform we're on
function getPlatform() {
    if (location.hostname.includes('netflix.com')) {
      return 'netflix';
    } else if (location.hostname.includes('disneyplus.com')) {
      return 'disney';
    } else if (location.hostname.includes('play.max.com')) {
      return 'hbo';
    } else if (location.hostname.includes('primevideo.com')) {
      return 'prime';
    }
    return null;
}

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

function getHboTitle() {
    // Skip title detection on any non-watch pages
    if (!location.pathname.includes("/video/watch/")) {
        console.log("Not on an HBO Max watch page - skipping title detection");
        return null;
    }
    
    // Use the HBO Max title selector
    const element = document.querySelector('[data-testid="player-ux-asset-title"]');
    
    if (element && element.innerText && element.innerText.trim()) {
        const title = element.innerText.trim();
        console.log(`Found HBO Max title: "${title}"`);
        return title;
    }
    
    // Alternate selectors if the first one fails
    const alternateSelectors = [
        '.Title-Fuse-Web-Play__sc-k9fw09-2',
        '.player-title',
        'h1.title'
    ];
    
    for (const selector of alternateSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText && element.innerText.trim()) {
            const title = element.innerText.trim();
            console.log(`Found HBO Max title (alternate): "${title}"`);
            return title;
        }
    }
    
    console.log("No HBO Max title element found");
    return null;
}

// Function to get titles based on the current platform
function getTitle() {
    const platform = getPlatform();
    
    if (platform === 'netflix') {
        return getNetflixTitle();
    } else if (platform === 'disney') {
        return getDisneyTitle();
    } else if (platform === 'hbo') {
        return getHboTitle();
    } else if (platform === 'prime') {
        return getPrimeTitle();
    }
    
    console.log("Not on a supported streaming platform");
    return null;
}

function getPrimeTitle() {
    // Skip title detection on non-detail/player pages
    if (!location.pathname.includes("/detail/") && !location.pathname.includes("/watch/")) {
        console.log("Not on a Prime Video watch page - skipping title detection");
        return null;
    }
    
    // Use the Prime Video title selector
    const titleElement = document.querySelector('h1.atvwebplayersdk-title-text');
    
    if (titleElement && titleElement.innerText && titleElement.innerText.trim()) {
        const title = titleElement.innerText.trim();
        console.log(`Found Prime Video title: "${title}"`);
        return title;
    }
    
    // Alternate selectors if the first one fails
    const alternateSelectors = [
        '.webPlayerUIContainer h1',
        '.dv-node-dp-title h1',
        '[data-automation-id="title"]',
        '.tst-title-text'
    ];
    
    for (const selector of alternateSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText && element.innerText.trim()) {
            const title = element.innerText.trim();
            console.log(`Found Prime Video title (alternate): "${title}"`);
            return title;
        }
    }
    
    console.log("No Prime Video title element found");
    return null;
}

// Function to get titles from Netflix
function getNetflixTitle() {
    // Skip title detection on any non-watch pages
    if (!location.pathname.startsWith("/watch")) {
        console.log("Not on a Netflix watch page - skipping title detection");
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

// Function to get titles from Disney+
function getDisneyTitle() {
    // Skip title detection on any non-play pages
    if (!location.pathname.includes("/play/")) {
        console.log("Not on a Disney+ play page - skipping title detection");
        return null;
    }
    
    // Use the Disney+ title selector
    const element = document.querySelector('.title-field span');
    
    if (element && element.innerText && element.innerText.trim()) {
        const title = element.innerText.trim();
        console.log(`Found Disney+ title: "${title}"`);
        return title;
    }
    
    // Alternate selectors if the first one fails
    const alternateSelectors = [
        '.title-field',
        '[data-testid="title-field"]',
        'h1.title',
        '.video-title'
    ];
    
    for (const selector of alternateSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText && element.innerText.trim()) {
            const title = element.innerText.trim();
            console.log(`Found Disney+ title (alternate): "${title}"`);
            return title;
        }
    }
    
    console.log("No Disney+ title element found");
    return null;
}

// Function to check if we're on a valid watch page
function isWatchPage() {
    const platform = getPlatform();
    if (platform === 'netflix') {
        return location.pathname.startsWith("/watch");
    } else if (platform === 'disney') {
        return location.pathname.includes("/play/");
    } else if (platform === 'hbo') {
        return location.pathname.includes("/video/watch/");
    } else if (platform === 'prime') {
        return location.pathname.includes("/detail/") || location.pathname.includes("/watch/");
    }
    return false;
}

// Function to handle title detection and sending
function checkAndSendTitle() {
    // Skip if user is not logged in
    if (!isUserLoggedIn) {
        console.log("Not checking titles - user not logged in");
        return;
    }

    // Skip if not on a watch page
    if (!isWatchPage()) {
        console.log("Not on a watch page - skipping title check");
        return;
    }

    const title = getTitle();
    const now = Date.now();
    
    // Only proceed if we found a valid title
    if (title && title !== currentTitle && (now - lastSendTime > SEND_COOLDOWN)) {
        console.log("New title detected:", title);
        currentTitle = title;
        lastSendTime = now;
        
        // Get current URL for rewatching
        const movieUrl = window.location.href;
        console.log("Current movie URL:", movieUrl);
        
        // Send message to background script with platform info and URL
        chrome.runtime.sendMessage({ 
            action: "save_movie", 
            title,
            platform: getPlatform(),
            movieUrl: movieUrl  // Add the URL here
        }, response => {
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

console.log("Streaming Watch Tracker initialized - waiting for login");