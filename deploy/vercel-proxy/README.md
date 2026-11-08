# dedio.vercel.app → VPS

Vercel project **dedio** that only proxies every request to the platform on the Hostinger VPS.

```bash
cd deploy/vercel-proxy
vercel link --project dedio     # once
vercel deploy --prod
```

The backend host name must match `BACKEND_DOMAIN` in `deploy/.env`.
