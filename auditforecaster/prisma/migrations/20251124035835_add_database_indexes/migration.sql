-- CreateIndex
CREATE INDEX "Job_builderId_idx" ON "Job"("builderId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_inspectorId_idx" ON "Job"("inspectorId");

-- CreateIndex
CREATE INDEX "Job_subdivisionId_idx" ON "Job"("subdivisionId");
