
export const locales = {
  en: {
    // Search
    searchPlaceholder: 'Search for a Pandal...',
    searching: 'Searching...',
    noPandalsFound: 'No pandals found.',
    
    // Map & InfoWindow
    distance: 'Distance',
    kmAway: 'km away',
    walkingTime: 'Walking Time',
    calculating: 'calculating...',
    enableLocation: 'Enable location',
    getDirections: 'Get Directions',
    recenter: 'Recenter',

    // Errors & Loading
    configError: 'Configuration Error',
    apiKeyMissing: 'Google Maps API key is missing. Please add it to your environment file.',
    findingLocation: 'Finding Your Location...',
    locationError: 'Location Error',
    failedToLoadPandals: 'Failed to load pandals',
    couldNotLoadPandalData: 'Could not load pandal data.',
    geolocationNotSupported: 'Geolocation is not supported by your browser.',
    locationPermissionDenied: 'To find pandals near you, please enable location access.',
    locationUnavailable: 'Your location information is currently unavailable.',
    locationTimeout: 'The request to get your location timed out.',
    locationErrorUnknown: 'An unknown error occurred while getting your location.',

    // Install Prompt
    installApp: 'Install App',
    installAppDescription: 'Access Pujoपথ directly from your home screen',
    install: 'Install',
    close: 'Close',
  },
  bn: {
    // Search
    searchPlaceholder: 'প্যান্ডেল খুঁজুন...',
    searching: 'অনুসন্ধান চলছে...',
    noPandalsFound: 'কোন প্যান্ডেল পাওয়া যায়নি।',

    // Map & InfoWindow
    distance: 'দূরত্ব',
    kmAway: 'কিমি দূরে',
    walkingTime: 'হাঁটার সময়',
    calculating: 'গণনা করা হচ্ছে...',
    enableLocation: 'অবস্থান সক্ষম করুন',
    getDirections: 'নির্দেশনা পান',
    recenter: 'পুনরায় কেন্দ্র করুন',

    // Errors & Loading
    configError: 'কনফিগারেশন ত্রুটি',
    apiKeyMissing: 'Google Maps API কী অনুপস্থিত।',
    findingLocation: 'আপনার অবস্থান খোঁজা হচ্ছে...',
    locationError: 'অবস্থান ত্রুটি',
    failedToLoadPandals: 'প্যান্ডেল লোড করতে ব্যর্থ হয়েছে',
    couldNotLoadPandalData: 'প্যান্ডেল ডেটা লোড করা যায়নি।',
    geolocationNotSupported: 'আপনার ব্রাউজারে জিওলোকেশন সমর্থিত নয়।',
    locationPermissionDenied: 'কাছাকাছি প্যান্ডেল খুঁজে পেতে, অনুগ্রহ করে অবস্থান অ্যাক্সেস সক্ষম করুন।',
    locationUnavailable: 'আপনার অবস্থানের তথ্য বর্তমানে অনুপলব্ধ।',
    locationTimeout: 'আপনার অবস্থান পাওয়ার অনুরোধের সময় শেষ হয়েছে।',
    locationErrorUnknown: 'আপনার অবস্থান পাওয়ার সময় একটি অজানা ত্রুটি ঘটেছে।',

    // Install Prompt
    installApp: 'অ্যাপ ইনস্টল করুন',
    installAppDescription: 'আপনার হোম স্ক্রীন থেকে সরাসরি পুজোপথ অ্যাক্সেস করুন',
    install: 'ইনস্টল করুন',
    close: 'বন্ধ করুন',
  },
};

export type Lang = keyof typeof locales;
export type Translations = typeof locales.en;
