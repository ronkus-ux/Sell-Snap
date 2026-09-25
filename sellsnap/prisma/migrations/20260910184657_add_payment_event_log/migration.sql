-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "txRef" TEXT,
    "gatewayReference" TEXT,
    "event" TEXT NOT NULL,
    "hashOk" BOOLEAN,
    "status" TEXT,
    "currency" TEXT,
    "amountPaidKobo" INTEGER,
    "detail" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

-- CreateIndex
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
