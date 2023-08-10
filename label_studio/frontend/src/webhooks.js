const getWebhookUrl = () => {
    const webhook_url = new URL(window.location.toString());
    if(webhook_url.host.includes('label-studio-server')){
        webhook_url.host = '100.69.138.47';
    }
    webhook_url.port = 3535;
    return webhook_url.origin;
};
export default getWebhookUrl;