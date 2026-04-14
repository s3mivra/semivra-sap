export const generateHWID = () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown-gpu";
    
    // FIX: Add 'window.' before screen to satisfy ESLint
    const rawString = `${navigator.hardwareConcurrency}-${window.screen.width}x${window.screen.height}-${renderer}-${navigator.platform}`;
    
    // Hash the string into a clean ID
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        hash = ((hash << 5) - hash) + rawString.charCodeAt(i);
        hash |= 0; 
    }
    return `ERP-HWID-${Math.abs(hash)}`;
};