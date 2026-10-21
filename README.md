This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CRM account setup

Create `backend/my-app/.env.local` with `MONGODB_URI`, `FRONTEND_URL`, `SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH`. Use `.env.example` as a placeholder template; keep real values in `.env.local`, which is ignored by Git.

Generate a session secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the SMTP sender to an address authorized by your mail provider. For Gmail, use an App Password rather than your normal account password. Port `587` uses STARTTLS; port `465` uses TLS. Never put SMTP credentials in the frontend.

Users register at `/register`, verify the code sent to the email they enter, and sign in at `/login`. All verified accounts currently share the same CRM lead workspace. The backend requires a signed, HTTP-only session cookie for lead APIs.

Administrator sign-in is at `/admin/login`. Set `ADMIN_USERNAME=admin` and generate an scrypt password hash with:

```bash
node -e "const {scryptSync,randomBytes}=require('node:crypto');const salt=randomBytes(16).toString('hex');console.log('scrypt:'+salt+':'+scryptSync('replace-with-a-strong-password',salt,64).toString('hex'))"
```

Use a unique password of at least 12 characters, replace the example password in the command before running it, and store only the resulting hash in `ADMIN_PASSWORD_HASH`. The requested `admin123` is weak and should only be used for local testing; do not deploy it.
