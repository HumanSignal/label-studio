const getWebhookUrl = () => {
    const webhook_url = new URL(window.location.toString());
    webhook_url.port = 3535;
    return webhook_url.origin;
};
export default getWebhookUrl;