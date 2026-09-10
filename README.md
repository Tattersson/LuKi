# LuKi

Internal team tools. First feature: an anonymous team-captain voting system (see
[src/features/voting](src/features/voting)).

## Local development

```bash
docker compose up -d db  # starts a dedicated Postgres on 127.0.0.1:5433
npm install
npm run prisma:migrate   # applies prisma/migrations against DATABASE_URL in .env
npm run db:seed          # optional: seeds a demo election at /vote/demo-team-captain
npm run dev
```

`.env` is already set up for local dev with `MAILER_DRIVER=console`, so OTP codes are
printed to the terminal instead of emailed, and `DATABASE_URL` pointing at
`localhost:5433` (the `db` service's port, loopback-only). If that port is also taken
on your machine, change the mapping in `docker-compose.yml`'s `db` service and update
`DATABASE_URL` to match.

Admin login requires a real Keycloak issuer/client - set `KEYCLOAK_ISSUER`,
`KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, and `ADMIN_ROLE_NAME` (a *client* role
on that client - Keycloak: Clients > your client > Roles - assigned to admin users'
accounts) in `.env`.

To work on the admin area without a working Keycloak connection, set
`DEV_BYPASS_ADMIN_AUTH=true` in `.env` and restart `npm run dev`. `/admin` then treats
you as an admin automatically - a yellow "DEV MODE" banner appears whenever this is
active as a reminder. This only ever works outside production (`next start` /
the Docker image both set `NODE_ENV=production`, which disables it unconditionally).

## Project structure

- `src/features/voting/` - everything specific to the voting feature (OTP/vote
  services, validation, email template, public + admin UI). Future features get their
  own sibling under `src/features/`.
- `src/lib/` - cross-cutting platform code shared by all features: Prisma client,
  Auth.js/Keycloak config, the mailer abstraction, hashing helpers.
- `src/app/` - thin route shell that renders feature UI/actions.

## Deployment

```bash
docker network create traefik-public   # once, if it doesn't already exist
docker compose up -d --build
```

This starts Postgres, runs `prisma migrate deploy` once, then starts the app
container (`luki-app`) joined to `traefik-public` - the external network your own
Traefik instance already watches. No ports are published to the host; point your
Traefik dynamic config at the container the way
[deploy/traefik-dynamic-example.yml](deploy/traefik-dynamic-example.yml) shows.

To test locally without Traefik, temporarily uncomment `ports: ["3000:3000"]` on the
`app` service in `docker-compose.yml`.

Required environment variables are documented in [.env.example](.env.example).
