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

## Redeploying (production)

This app is actually deployed statically to S3 behind CloudFront, not Vercel — see the root [README.md](../README.md) for the full initial-setup runbook. Once that's provisioned, redeploying after any change here is:

```bash
export BUCKET_NAME=dnd-encounter-generator-web
export DISTRIBUTION_ID=E1MEU047FWHC6N   # or look it up: aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='dnd-encounter-generator'].Id" --output text

rm -f .env.local
NEXT_PUBLIC_API_URL= npm run build
aws s3 sync out "s3://$BUCKET_NAME" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*'
```

Recreate `.env.local` afterward for local dev: `echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local`. Note `NEXT_PUBLIC_API_URL` must be empty for the production build — it's baked in at build time, and CloudFront routes the resulting relative `/api/...` calls to the API's Lambda origin (see root README for why).
