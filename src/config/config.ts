const isDev = import.meta.env.DEV;

const API_CONFIG = {
    development: {
        baseUrl: '', // Empty for relative URLs that will be handled by Vite proxy
        ttsBaseUrl: ''
    },
    production: {
        baseUrl: 'https://kb.uuxlink.com', //'https://8.152.213.191:8471', // Direct backend URL in production
        ttsBaseUrl: 'https://askrag-proxy.wulfgang.workers.dev'//'https://openspeech.bytedance.com'
    }
};

export const config = {
    api: {
        baseUrl: isDev ? API_CONFIG.development.baseUrl : API_CONFIG.production.baseUrl,
        ttsBaseUrl: isDev ? API_CONFIG.development.ttsBaseUrl : API_CONFIG.production.ttsBaseUrl
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
