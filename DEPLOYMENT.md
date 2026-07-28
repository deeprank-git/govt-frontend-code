# Deployment — Hostinger VPS

No Docker. Pull the repo onto the VPS, build there with npm (overriding the default Cloudflare Nitro preset to `node-server`), run the output under PM2, front it with Nginx.

**VPS state:** Ubuntu, Nginx, Node, PM2, and Certbot already installed. IP `89.116.20.193`.

Replace `your-domain.com` and `<PORT>` everywhere below with the actual domain and port for this project.

---

## 1. DNS

Point the domain to the VPS:

| Type | Name | Value |
|------|------|-------|
| A | @ | `89.116.20.193` |
| A | www | `89.116.20.193` |

Propagation takes a few minutes to a few hours.

---

## 2. Clone the repo

```bash
git clone <your-repo-url> ~/govt-frontend
cd ~/govt-frontend
```

On subsequent deployments just pull:

```bash
cd ~/govt-frontend
git pull
```

---

## 3. Create `.env` with production values

`.env` is gitignored, so it must be created manually on the VPS:

```bash
cat > ~/govt-frontend/.env <<'EOF'
VITE_API_BASE_URL=http://89.116.20.193:5000/api
EOF
```

`VITE_API_BASE_URL` is inlined at build time — it must be correct **before** running `npm run build`. If the backend later gets a domain of its own, update this value and rebuild.

---

## 4. Install dependencies & build

The default Nitro preset is Cloudflare Workers. Override it to `node-server` so Nitro emits a standalone Node.js HTTP server instead of a Cloudflare Worker bundle.

```bash
cd ~/govt-frontend
npm install
NITRO_PRESET=node-server npm run build
```

The output lands in `.output/`:

```
.output/
  server/
    index.mjs      ← the Node.js server entry
  public/          ← static assets served by the SSR server
```

---

## 5. Create the PM2 ecosystem file

`package.json` has `"type": "module"`, so the ecosystem file must use the `.cjs` extension so PM2 treats it as CommonJS. Set `<PORT>` to the port you want this app to run on:

```bash
cat > ~/govt-frontend/ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    {
      name: "govt-frontend",
      script: ".output/server/index.mjs",
      interpreter: "node",
      cwd: "/root/govt-frontend",
      env: {
        PORT: <PORT>,
        NODE_ENV: "production",
      },
    },
  ],
};
EOF
```

---

## 6. Start with PM2

```bash
cd ~/govt-frontend
pm2 start ecosystem.config.cjs
pm2 save
```

Enable PM2 auto-start on reboot (run once per VPS):

```bash
pm2 startup
# execute the command it prints, then:
pm2 save
```

Verify the app is running:

```bash
curl -I http://localhost:<PORT>
# expect: HTTP/1.1 200 OK
```

---

## 7. Nginx site config

```bash
sudo tee /etc/nginx/sites-available/your-domain.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:<PORT>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

At this point `http://your-domain.com` should load the app (once DNS has propagated).

---

## 8. SSL via Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot rewrites the site file to add the `listen 443 ssl` block and an HTTP → HTTPS redirect, and sets up auto-renewal via a systemd timer (`sudo systemctl status certbot.timer` to confirm).

---

## Redeploying after changes

```bash
cd ~/govt-frontend
git pull
npm install
NITRO_PRESET=node-server npm run build
pm2 restart govt-frontend
```

---

## Notes

- **Cloudflare preset vs node-server**: The default build (`npm run build` without `NITRO_PRESET`) targets Cloudflare Workers and produces an incompatible bundle. Always set `NITRO_PRESET=node-server` on the VPS. You can also export it for the session (`export NITRO_PRESET=node-server`) to avoid repeating it.
- **`VITE_API_BASE_URL` must be set before building** — Vite bakes it into the client bundle at build time. If the backend URL ever changes, update `.env` and rebuild.
- **Static assets**: Nitro's `node-server` serves `.output/public/` directly — no separate static file location needed in Nginx.
- **PM2 `interpreter: "node"`**: Runs the `.mjs` output with the system Node binary directly.
- **`.cjs` ecosystem file**: Required because `package.json` sets `"type": "module"` — a `.js` file would be treated as ESM and break PM2's require-based loader.
