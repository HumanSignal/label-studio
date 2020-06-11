var pathname = window.location.pathname;
if (!pathname.endsWith('.html') && !pathname.endsWith('/')) {
    window.location.replace(pathname + '/');
    console.log('Redirected via js');
}