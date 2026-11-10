ALTER TABLE "User" ADD COLUMN "lastTotpStep" INTEGER;

DELETE FROM "AuthSession" WHERE "userId" IN (
    SELECT "id" FROM "User" WHERE "role" = 'ADMIN'
);

ALTER TABLE "AuthSession" ADD COLUMN "adminVerified" BOOLEAN NOT NULL DEFAULT false;
