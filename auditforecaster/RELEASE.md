# Release Checklist

## Pre-Release Verification
- [ ] **Linting**: Run `npm run lint` and ensure no errors.
- [ ] **Type Checking**: Run `npm run type-check` and ensure no errors.
- [ ] **Unit Tests**: Run `npm test` and ensure all tests pass.
- [ ] **Integration Tests**: Run `npm test integration` (or specific test files).
- [ ] **E2E Tests**: Run `npx playwright test` (if configured).
- [ ] **Build**: Run `npm run build` to verify production build succeeds.

## Docker Build & Push
- [ ] **Build Image**: `docker build -t auditforecaster:latest .`
- [ ] **Tag Version**: `docker tag auditforecaster:latest auditforecaster:vX.Y.Z`
- [ ] **Save Image**: `docker save -o auditforecaster.tar auditforecaster:latest`
- [ ] **Transfer**: `scp auditforecaster.tar root@UNRAID_IP:/mnt/user/appdata/auditforecaster/`

## Deployment on Unraid
- [ ] **Backup DB**: Ensure automated backups are running or run manual `pg_dump`.
- [ ] **Load Image**: `docker load -i auditforecaster.tar`
- [ ] **Stop Old Container**: `docker stop auditforecaster-ui`
- [ ] **Remove Old Container**: `docker rm auditforecaster-ui`
- [ ] **Start New Container**: `docker-compose up -d`
- [ ] **Run Migrations**: `docker exec auditforecaster-ui npx prisma migrate deploy`

## Post-Deployment Verification
- [ ] **Health Check**: `curl http://UNRAID_IP:3000/api/health` -> `{"status":"ok"}`
- [ ] **Metrics**: `curl http://UNRAID_IP:3000/api/metrics` -> Prometheus data
- [ ] **Manual Smoke Test**:
  - Login as Admin
  - View Dashboard
  - Check Builder List
  - Check Schedule
  - Upload a test Plan
  - Check Assets (Equipment/Fleet)

## Rollback Plan
If critical issues are found:
1. Stop current container: `docker stop auditforecaster-ui`
2. Load previous image tag: `docker load -i auditforecaster_prev.tar`
3. Start previous container: `docker-compose up -d`
4. Revert DB migrations if necessary (careful!).
