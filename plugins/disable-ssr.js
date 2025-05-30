// Custom plugin to disable SSR features in uni-app
export default function disableSSRPlugin() {
  return {
    name: 'disable-ssr',
    configResolved(config) {
      // Find the uni-app plugin in the plugins array
      const uniPlugin = config.plugins.find(plugin => 
        plugin.name === 'vite:uni-app'
      );
      
      if (uniPlugin && uniPlugin.options) {
        // Force disable SSR in the uni-app plugin options
        uniPlugin.options.ssr = false;
      }
    },
    
    // Override required SSR files with empty implementations
    resolveId(id) {
      // Intercept SSR-related file requests
      if (id.includes('entry-server.js') || id.includes('@dcloudio/vite-plugin-uni/lib/ssr')) {
        // Return a custom virtual module ID
        return '\0virtual:' + id;
      }
      return null;
    },
    
    load(id) {
      // Provide empty implementations for virtual modules
      if (id.startsWith('\0virtual:')) {
        console.log('🔧 Replacing SSR module:', id.slice(9));
        return 'export default () => ({ app: {}, router: null, store: null });';
      }
      return null;
    }
  };
} 