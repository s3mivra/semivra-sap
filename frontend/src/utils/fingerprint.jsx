export const getMachineId = () => {
    const gl = document.createElement('canvas').getContext('webgl');
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    // Combine Screen, Hardware Concurrency (CPU cores), and GPU Renderer
    const rawId = `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.hardwareConcurrency}-${renderer}`;
    
    // Simple hash function to make it a clean string
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) {
        const char = rawId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `HWID-${Math.abs(hash)}`;
};