---
title: Deployment scenarios
type: guide
order: 907
---


## WSGIServer instead of Flask

Use `--use-gevent` option on start to enable WSGI server. It wraps around app.run with gevent's WSGIServer to enable the server to better handle concurrent requests.

```
label-studio start test --use-gevent
```

## HTTPS & SSL

You can enable https protocol for Flask or WSGIServer. You need to generate SSL certificate and key for it, e.g.: 

```
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out certificate.pem
```

Than you need to use `--cert` and `--key` option on start:

```
label-studio start test --cert certificate.pem --key key.pem
```


## Health check

LS has a special endpoint for health checks: 
  
```
/api/health
```