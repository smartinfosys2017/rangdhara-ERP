-- CreateTable
CREATE TABLE "user_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "profilePhoto" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'available',
    "birthday" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "socialLinkedin" TEXT,
    "socialTwitch" TEXT,
    "socialX" TEXT,
    "socialDribbble" TEXT,
    "referralCode" TEXT,
    "referralLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_details_userId_key" ON "user_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_details_referralCode_key" ON "user_details"("referralCode");

-- AddForeignKey
ALTER TABLE "user_details" ADD CONSTRAINT "user_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
