-- Adds Check Constraint to Stock Count to ensure that it is not negative
ALTER TABLE "stockCount"
  ADD CONSTRAINT "stocknotnegative" CHECK ("count" >= 0);