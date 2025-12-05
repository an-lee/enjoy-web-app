# Wrangler Configuration Guide

This guide explains how to configure environment variables and secrets for the Cloudflare Workers deployment.

## Configuration Overview

### 1. Non-Sensitive Variables (`wrangler.jsonc`)

Non-sensitive configuration values are stored directly in `wrangler.jsonc`:

```jsonc
"vars": {
  "AZURE_SPEECH_REGION": "eastus",
  "RAILS_API_BASE_URL": "https://enjoy.bot"
}
```

These can be overridden per environment if needed.

### 2. Sensitive Secrets

**For Production/Staging:**

Use Wrangler's secret management (recommended):

```bash
# Set a secret
wrangler secret put AZURE_SPEECH_SUBSCRIPTION_KEY

# You'll be prompted to enter the value
# The secret is encrypted and stored securely by Cloudflare
```

**For Local Development:**

1. Copy the example file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and add your actual values:
   ```
   AZURE_SPEECH_SUBSCRIPTION_KEY=your-actual-key-here
   AZURE_SPEECH_REGION=eastus
   ```

3. `.dev.vars` is automatically loaded by `wrangler dev`
   - This file is gitignored and will never be committed

### 3. KV Namespace Setup

Rate limiting requires a KV namespace:

1. Create the namespace:
   ```bash
   wrangler kv namespace create "RATE_LIMIT_KV"
   ```

2. Create preview namespace (for local testing):
   ```bash
   wrangler kv namespace create "RATE_LIMIT_KV" --preview
   ```

3. Update `wrangler.jsonc` with the returned IDs:
   ```jsonc
   "kv_namespaces": [
     {
       "binding": "RATE_LIMIT_KV",
       "id": "your-production-namespace-id",
       "preview_id": "your-preview-namespace-id"
     }
   ]
   ```

## Required Configuration

### Environment Variables

| Variable | Type | Required | Description |
|---------|------|----------|-------------|
| `AZURE_SPEECH_SUBSCRIPTION_KEY` | Secret | Yes | Azure Speech Service subscription key |
| `AZURE_SPEECH_REGION` | Var | Yes | Azure region (e.g., `eastus`) |
| `RAILS_API_BASE_URL` | Var | Optional | Rails API base URL (default: `https://enjoy.bot`) |
| `RATE_LIMIT_KV` | Binding | Recommended | KV namespace for rate limiting |

### Setting Up for First Time

1. **Create KV namespace:**
   ```bash
   wrangler kv:namespace create "RATE_LIMIT_KV"
   wrangler kv:namespace create "RATE_LIMIT_KV" --preview
   ```

2. **Update wrangler.jsonc** with the KV namespace IDs

3. **Set production secrets:**
   ```bash
   wrangler secret put AZURE_SPEECH_SUBSCRIPTION_KEY
   ```

4. **Create local development file:**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your local values
   ```

## Environment-Specific Configuration

You can use different configurations for different environments:

```bash
# Deploy to production
wrangler deploy

# Deploy to staging
wrangler deploy --env staging
```

Define environments in `wrangler.jsonc`:

```jsonc
"env": {
  "staging": {
    "vars": {
      "RAILS_API_BASE_URL": "https://staging.enjoy.bot"
    }
  }
}
```

## Security Best Practices

1. ✅ **Never commit secrets** to git
2. ✅ **Use `.dev.vars`** for local development (gitignored)
3. ✅ **Use `wrangler secret put`** for production secrets
4. ✅ **Use KV namespaces** for rate limiting data
5. ✅ **Review `.gitignore`** to ensure sensitive files are excluded

## Troubleshooting

### Secrets not working in production?

- Verify secrets are set: `wrangler secret list`
- Re-deploy after setting secrets: `wrangler deploy`

### KV namespace not found?

- Verify namespace exists: `wrangler kv:namespace list`
- Check the ID in `wrangler.jsonc` matches the actual namespace ID

### Local development not loading `.dev.vars`?

- Ensure file is named exactly `.dev.vars` (not `.dev.vars.example`)
- Restart `wrangler dev` after creating/modifying `.dev.vars`

