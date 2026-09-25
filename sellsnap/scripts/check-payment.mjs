import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, status: true, amount: true, buyerEmail: true, buyerName: true, transactionReference: true, createdAt: true, product: { select: { name: true, user: { select: { email: true, businessName: true } } } } } });
  console.log('latest orders:', JSON.stringify(orders, null, 1));
  const evts = await prisma.paymentEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 12, select: { event: true, txRef: true, status: true, hashOk: true, detail: true, processed: true, gatewayReference: true, amountPaidKobo: true, currency: true, createdAt: true } });
  console.log('recent events:', JSON.stringify(evts, null, 1));
  const pays = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, orderId: true, status: true, gatewayReference: true, paidAt: true, amountKobo: true } });
  console.log('payments:', JSON.stringify(pays, null, 1));
}
main().finally(() => prisma.$disconnect());