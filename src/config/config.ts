const isDev = import.meta.env.DEV;

const API_CONFIG = {
    development: {
        baseUrl: '', // Empty for relative URLs that will be handled by Vite proxy
    },
    production: {
        baseUrl: 'https://askrag-proxy.wulfgang.workers.dev', // Replace with your Cloudflare Worker URL
    }
};

export const config = {
    api: {
        baseUrl: isDev ? API_CONFIG.development.baseUrl : API_CONFIG.production.baseUrl,
    },
    bailian: {
        workspaceId: '123456abc',
        indexId: 'wtu9xf10cd',
        endpoint: 'bailian.cn-beijing.aliyuncs.com',
        regionId: 'cn-beijing'
    },
    auth: {
        username: 'needle',
        password: 'needle'
    }
};
