# Fidely Studio

Fidely Studio is a self-contained Next.js application. It owns the dashboard,
MongoDB persistence, Converty OAuth, encrypted token storage, order sync,
webhooks, customer analytics, loyalty settings, WhatsApp campaigns, billing,
and administration. It does not require `fidely-back`.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI`.
3. Generate a random `TOKEN_ENCRYPTION_KEY` with at least 32 characters.
4. Add the Converty client ID and client secret.
5. Register this exact local redirect URI with Converty:

   `http://localhost:3000/api/auth/converty/callback`

6. Start the app:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000/login` and choose **Continue with Converty**.

The optional default merchant account is configured with
`DEFAULT_USER_EMAIL`, `DEFAULT_USER_PASSWORD`, and
`DEFAULT_USER_SHOP_NAME`. On its first successful login, Fidely creates the
account in MongoDB and stores only a scrypt password hash.

## Create the first administrator

Administrator credentials are stored only in MongoDB. They are never loaded
from `ADMIN_EMAIL` or `ADMIN_PASSWORD` environment variables.

With `MONGODB_URI` available in the shell or `.env.local`, run:

```bash
npm run admin:create
```

The command asks interactively for the administrator email and password,
hashes the password with scrypt, and creates or updates the database account.

The first successful authorization creates the Fidely merchant account, stores
the Converty tokens encrypted with AES-256-GCM, registers order webhooks, and
imports the store's orders and customers.

## Production variables

```env
MONGODB_URI=
TOKEN_ENCRYPTION_KEY=
CONVERTY_CLIENT_ID=
CONVERTY_CLIENT_SECRET=
CONVERTY_REDIRECT_URI=https://studio.example.com/api/auth/converty/callback
STUDIO_APP_URL=https://studio.example.com
APP_URL=https://studio.example.com
EVOLUTION_API_URL=https://evolution.example.com
EVOLUTION_API_KEY=replace-with-a-strong-evolution-api-key
ORDER_RAW_RETENTION_DAYS=90
DEFAULT_USER_EMAIL=admin@studio.example.com
DEFAULT_USER_PASSWORD=replace-with-a-strong-initial-password
DEFAULT_USER_SHOP_NAME=Fidely Studio
```

Converty requires webhook targets to use the same origin as a registered
redirect URI. Because the webhook endpoint is
`/api/converty/webhooks/[storeId]`, `STUDIO_APP_URL` and
`CONVERTY_REDIRECT_URI` must use the same scheme and host.

Never expose `CONVERTY_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, or OAuth tokens
through `NEXT_PUBLIC_*` variables.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```
