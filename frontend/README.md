## Environment setup

Configure your backend base URL via environment variable. This value is used by the API client and auth redirects.

1. Create a `.env.local` file at the project root with:

```
NEXT_PUBLIC_API_BASE_URL=https://api.aletis.me/api
```

2. Restart the dev server after changing env values.

Notes:
- The `NEXT_PUBLIC_` prefix is required for variables used in the browser.
- If not set, the app falls back to `https://api.aletis.me/api`.

