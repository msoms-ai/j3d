import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { EmailService } from '../email/email.service';
import { ZiinaPaymentService } from '../escrow/ziina-payment.service';
import {
  CreateOrderDto,
  SubmitBidDto,
  AcceptCounterOfferDto,
  UploadBatchPhotoDto,
  VerifyOtpHandshakeDto,
} from './orders.dto';
import {
  OrderStatus,
  UserRole,
  BidRole,
  BidStatus,
} from '@j3d/shared-types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
    private readonly ziinaPayment: ZiinaPaymentService,
  ) {}

  /**
   * Generates a 6-digit numeric OTP and its Argon2id hash
   */
  private async generateOtpPair() {
    const plain = crypto.randomInt(100000, 999999).toString();
    const hash = await argon2.hash(plain, {
      memoryCost: 32768,
      timeCost: 2,
      parallelism: 2,
    });
    return { plain, hash };
  }

  /**
   * Distance in KM between two geographic points using Haversine formula
   */
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  async createOrder(dto: CreateOrderDto, tenantId: string, clientId: string) {
    const stl = await this.prisma.stlFile.findFirst({
      where: { id: dto.stlFileId, tenantId },
    });

    if (!stl) {
      throw new NotFoundException(`STL File '${dto.stlFileId}' not found.`);
    }

    // Algorithmic Minimum Floor Enforcement:
    // MinPrintFloor = stl.unitFloorAed * quantity
    const minPrintFloorAed = Number((Number(stl.unitFloorAed) * dto.quantity).toFixed(2));
    if (dto.clientMaxPrintBudgetAed < minPrintFloorAed) {
      throw new BadRequestException(
        `Print budget ${dto.clientMaxPrintBudgetAed} AED is below algorithmic floor of ${minPrintFloorAed} AED for ${dto.quantity} piece(s).`,
      );
    }

    // Minimum Delivery Floor: max(15, ceil(12 + distanceKm * 1.25))
    // Default estimate assuming ~15km average UAE cross-district route if maker not yet assigned
    const estimatedDistanceKm = 15.0;
    const minDeliveryFloorAed = Math.max(15.0, Math.ceil(12.0 + estimatedDistanceKm * 1.25));
    if (dto.clientMaxDeliveryBudgetAed < minDeliveryFloorAed) {
      throw new BadRequestException(
        `Delivery budget ${dto.clientMaxDeliveryBudgetAed} AED is below UAE minimum floor of ${minDeliveryFloorAed} AED.`,
      );
    }

    // Generate readable order number: J3D-2026-XXXX
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const orderNumber = `J3D-2026-${randomHex}`;

    // Total authorized budget
    const totalAuthorizedAed = dto.clientMaxPrintBudgetAed + dto.clientMaxDeliveryBudgetAed;

    // Create Ziina Payment Intent
    const paymentIntent = await this.ziinaPayment.createPaymentIntent({
      amountAed: totalAuthorizedAed,
      orderNumber,
      testMode: true,
    });

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        clientId,
        stlFileId: dto.stlFileId,
        quantity: dto.quantity,
        status: OrderStatus.PENDING_PRINTER,
        minPrintFloorAed,
        clientMaxPrintBudgetAed: dto.clientMaxPrintBudgetAed,
        minDeliveryFloorAed,
        clientMaxDeliveryBudgetAed: dto.clientMaxDeliveryBudgetAed,
        dropoffEmirate: dto.dropoffEmirate,
        dropoffDistrict: dto.dropoffDistrict,
        dropoffStreetAddress: dto.dropoffStreetAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        requiredByDate: new Date(dto.requiredByDate),
      },
    });

    // Notify client
    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (client) {
      await this.emailService.sendOrderAlert({
        tenantId,
        to: client.email,
        orderNumber,
        title: 'Your 3D Print Order is Dispatched to UAE Makers',
        message: `Your order for ${dto.quantity} piece(s) has been broadcasted to verified 3D printer providers in the UAE. Your total authorized escrow budget is ${totalAuthorizedAed} AED.`,
      });
    }

    return {
      order,
      paymentIntent,
    };
  }

  async getOrders(tenantId: string, userId: string, role: UserRole) {
    const where: any = { tenantId };

    if (role === UserRole.CLIENT) {
      where.clientId = userId;
    } else if (role === UserRole.PRINTER_PROVIDER) {
      where.OR = [
        { status: { in: [OrderStatus.PENDING_PRINTER, OrderStatus.BIDDING_PRINTER] } },
        { printerProviderId: userId },
      ];
    } else if (role === UserRole.DELIVERY_PROVIDER) {
      where.OR = [
        { status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.BIDDING_DELIVERY] } },
        { deliveryProviderId: userId },
      ];
    }
    // ADMIN sees all

    return this.prisma.order.findMany({
      where,
      include: {
        stlFile: true,
        client: {
          select: { id: true, fullName: true, email: true, phone: true, emirate: true, district: true },
        },
        printerProvider: {
          select: { id: true, fullName: true, phone: true, emirate: true, district: true, printerModels: true },
        },
        deliveryProvider: {
          select: { id: true, fullName: true, phone: true, vehicleType: true },
        },
        bids: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, tenantId: string, userId: string, role: UserRole) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        stlFile: true,
        client: {
          select: { id: true, fullName: true, email: true, phone: true, emirate: true, district: true },
        },
        printerProvider: {
          select: { id: true, fullName: true, phone: true, emirate: true, district: true, printerModels: true },
        },
        deliveryProvider: {
          select: { id: true, fullName: true, phone: true, vehicleType: true },
        },
        bids: {
          include: {
            provider: {
              select: { id: true, fullName: true, ratingAvg: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found.`);
    }

    // Role-based redaction
    const sanitized: any = { ...order };
    if (role === UserRole.PRINTER_PROVIDER && order.printerProviderId !== userId) {
      // Maker who is bidding cannot see exact clientMaxPrintBudgetAed or client phone
      delete sanitized.clientMaxPrintBudgetAed;
      if (sanitized.client) {
        delete sanitized.client.phone;
      }
    }

    if (role === UserRole.DELIVERY_PROVIDER && order.deliveryProviderId !== userId) {
      delete sanitized.clientMaxDeliveryBudgetAed;
      if (sanitized.client) {
        delete sanitized.client.phone;
      }
    }

    return sanitized;
  }

  /**
   * Reverse-Bidding Engine with Redis Redlock Concurrency
   */
  async submitBid(orderId: string, dto: SubmitBidDto, tenantId: string, providerId: string, role: UserRole) {
    if (role !== UserRole.PRINTER_PROVIDER && role !== UserRole.DELIVERY_PROVIDER) {
      throw new ForbiddenException('Only registered 3D Printer or Delivery providers can submit bids.');
    }

    const lockResource = `j3d:lock:order:${orderId}`;
    let lock;
    try {
      lock = await this.redis.acquireLock(lockResource, 6000);
    } catch {
      throw new BadRequestException('Another provider is currently submitting an offer. Please retry in a moment.');
    }

    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, tenantId },
        include: { client: true },
      });

      if (!order) {
        throw new NotFoundException(`Order '${orderId}' not found.`);
      }

      if (role === UserRole.PRINTER_PROVIDER) {
        if (order.status !== OrderStatus.PENDING_PRINTER && order.status !== OrderStatus.BIDDING_PRINTER) {
          throw new BadRequestException(`Order is no longer accepting 3D printing bids (Status: ${order.status})`);
        }

        const isWithinBudget = dto.proposedAmountAed <= Number(order.clientMaxPrintBudgetAed);

        if (isWithinBudget) {
          // Case A: Instant Match!
          const agreedPrice = dto.proposedAmountAed;
          const savingsRefundAed = Number(order.clientMaxPrintBudgetAed) - agreedPrice;

          // Fetch provider details for pickup coordinates snapshot
          const providerUser = await this.prisma.user.findUnique({ where: { id: providerId } });

          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.PRINTING,
              printerProviderId: providerId,
              agreedPrintPriceAed: agreedPrice,
              pickupEmirate: providerUser?.emirate || 'Dubai',
              pickupDistrict: providerUser?.district || 'JVC',
              pickupLat: providerUser?.latitude || 25.0551,
              pickupLng: providerUser?.longitude || 55.2094,
            },
          });

          await this.prisma.orderBid.create({
            data: {
              tenantId,
              orderId,
              providerId,
              bidRole: BidRole.PRINTER_PROVIDER,
              proposedAmountAed: agreedPrice,
              estimatedHours: dto.estimatedHours,
              notes: dto.notes,
              isWithinClientMax: true,
              status: BidStatus.INSTANT_MATCHED,
            },
          });

          // If savings exist, credit back to client
          if (savingsRefundAed > 0) {
            await this.prisma.user.update({
              where: { id: order.clientId },
              data: { walletBalanceAed: { increment: savingsRefundAed } },
            });
            this.logger.log(`Refunded ${savingsRefundAed} AED savings difference to client ${order.clientId}`);
          }

          // Alert Client
          await this.emailService.sendOrderAlert({
            tenantId,
            to: order.client.email,
            orderNumber: order.orderNumber,
            title: '3D Printer Provider Matched & Printing Started!',
            message: `A verified maker accepted your order at ${agreedPrice} AED (you saved ${savingsRefundAed} AED). Printing is now underway!`,
          });

          return {
            status: OrderStatus.PRINTING,
            matched: true,
            agreedPrintPriceAed: agreedPrice,
            savingsRefundAed,
          };
        } else {
          // Case B: Counter-Offer
          await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.BIDDING_PRINTER },
          });

          const bid = await this.prisma.orderBid.create({
            data: {
              tenantId,
              orderId,
              providerId,
              bidRole: BidRole.PRINTER_PROVIDER,
              proposedAmountAed: dto.proposedAmountAed,
              estimatedHours: dto.estimatedHours,
              notes: dto.notes,
              isWithinClientMax: false,
              status: BidStatus.COUNTER_OFFER_PENDING,
            },
          });

          // Alert Client with counter-offer
          await this.emailService.sendOrderAlert({
            tenantId,
            to: order.client.email,
            orderNumber: order.orderNumber,
            title: 'New Counter-Offer for Your 3D Print Order',
            message: `A maker offered ${dto.proposedAmountAed} AED for your order (your max budget was ${order.clientMaxPrintBudgetAed} AED). You can accept this counter-offer in one click.`,
          });

          return {
            status: OrderStatus.BIDDING_PRINTER,
            matched: false,
            counterOfferAed: dto.proposedAmountAed,
            bidId: bid.id,
          };
        }
      } else {
        // Delivery Provider Bidding
        if (order.status !== OrderStatus.READY_FOR_PICKUP && order.status !== OrderStatus.BIDDING_DELIVERY) {
          throw new BadRequestException(`Order is not ready for delivery bidding (Status: ${order.status})`);
        }

        const isWithinDeliveryBudget = dto.proposedAmountAed <= Number(order.clientMaxDeliveryBudgetAed);

        if (isWithinDeliveryBudget) {
          // Instant match for delivery driver!
          const agreedDeliveryPrice = dto.proposedAmountAed;
          const savingsAed = Number(order.clientMaxDeliveryBudgetAed) - agreedDeliveryPrice;

          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.DELIVERY_ASSIGNED,
              deliveryProviderId: providerId,
              agreedDeliveryPriceAed: agreedDeliveryPrice,
            },
          });

          await this.prisma.orderBid.create({
            data: {
              tenantId,
              orderId,
              providerId,
              bidRole: BidRole.DELIVERY_PROVIDER,
              proposedAmountAed: agreedDeliveryPrice,
              estimatedHours: dto.estimatedHours,
              notes: dto.notes,
              isWithinClientMax: true,
              status: BidStatus.INSTANT_MATCHED,
            },
          });

          if (savingsAed > 0) {
            await this.prisma.user.update({
              where: { id: order.clientId },
              data: { walletBalanceAed: { increment: savingsAed } },
            });
          }

          return {
            status: OrderStatus.DELIVERY_ASSIGNED,
            matched: true,
            agreedDeliveryPriceAed: agreedDeliveryPrice,
          };
        } else {
          // Driver Counter-Offer
          await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.BIDDING_DELIVERY },
          });

          const bid = await this.prisma.orderBid.create({
            data: {
              tenantId,
              orderId,
              providerId,
              bidRole: BidRole.DELIVERY_PROVIDER,
              proposedAmountAed: dto.proposedAmountAed,
              estimatedHours: dto.estimatedHours,
              notes: dto.notes,
              isWithinClientMax: false,
              status: BidStatus.COUNTER_OFFER_PENDING,
            },
          });

          return {
            status: OrderStatus.BIDDING_DELIVERY,
            matched: false,
            counterOfferAed: dto.proposedAmountAed,
            bidId: bid.id,
          };
        }
      }
    } finally {
      if (lock) {
        await lock.release();
      }
    }
  }

  /**
   * Client accepts a maker or driver counter-offer
   */
  async acceptCounterOffer(orderId: string, dto: AcceptCounterOfferDto, tenantId: string, clientId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, clientId },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found.`);
    }

    const bid = await this.prisma.orderBid.findFirst({
      where: { id: dto.bidId, orderId },
    });

    if (!bid || bid.status !== BidStatus.COUNTER_OFFER_PENDING) {
      throw new BadRequestException('Invalid or expired counter-offer.');
    }

    if (bid.bidRole === BidRole.PRINTER_PROVIDER) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PRINTING,
          printerProviderId: bid.providerId,
          agreedPrintPriceAed: bid.proposedAmountAed,
        },
      });

      await this.prisma.orderBid.update({
        where: { id: bid.id },
        data: { status: BidStatus.CLIENT_ACCEPTED },
      });

      return { status: OrderStatus.PRINTING, agreedPrice: bid.proposedAmountAed };
    } else {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERY_ASSIGNED,
          deliveryProviderId: bid.providerId,
          agreedDeliveryPriceAed: bid.proposedAmountAed,
        },
      });

      await this.prisma.orderBid.update({
        where: { id: bid.id },
        data: { status: BidStatus.CLIENT_ACCEPTED },
      });

      return { status: OrderStatus.DELIVERY_ASSIGNED, agreedPrice: bid.proposedAmountAed };
    }
  }

  /**
   * Maker uploads completion photo proof before dispatching to UAE courier fleet
   */
  async uploadBatchPhoto(orderId: string, dto: UploadBatchPhotoDto, tenantId: string, makerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, printerProviderId: makerId },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found or not assigned to you.`);
    }

    if (order.status !== OrderStatus.PRINTING) {
      throw new BadRequestException(`Order cannot be marked packaged from status ${order.status}`);
    }

    // Generate 6-digit Pickup OTP for the maker to show the courier
    const { plain: pickupOtpPlain, hash: pickupOtpHash } = await this.generateOtpPair();

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        batchPrintPhotoUrl: dto.photoUrl,
        status: OrderStatus.READY_FOR_PICKUP,
        pickupOtpPlainForPrinter: pickupOtpPlain,
        pickupOtpHash,
      },
    });

    this.logger.log(`Order #${order.orderNumber} is READY_FOR_PICKUP with Pickup OTP: ${pickupOtpPlain}`);

    return {
      status: OrderStatus.READY_FOR_PICKUP,
      pickupOtpPlainForPrinter: pickupOtpPlain,
    };
  }

  /**
   * Driver enters Pickup OTP provided by the Maker -> Moves order to IN_TRANSIT
   */
  async verifyPickupOtp(orderId: string, dto: VerifyOtpHandshakeDto, tenantId: string, driverId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, deliveryProviderId: driverId },
      include: { client: true },
    });

    if (!order || !order.pickupOtpHash) {
      throw new BadRequestException('Order not assigned to driver or missing pickup verification.');
    }

    const isMatch = await argon2.verify(order.pickupOtpHash, dto.otpCode);
    if (!isMatch) {
      throw new BadRequestException('Invalid Pickup OTP code. Verify code with the maker.');
    }

    // Generate 6-digit Delivery OTP for the client to give upon doorstep delivery
    const { plain: deliveryOtpPlain, hash: deliveryOtpHash } = await this.generateOtpPair();

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.IN_TRANSIT,
        deliveryOtpPlainForClient: deliveryOtpPlain,
        deliveryOtpHash,
      },
    });

    // Send Delivery OTP to Client
    await this.emailService.sendOrderAlert({
      tenantId,
      to: order.client.email,
      orderNumber: order.orderNumber,
      title: 'Your 3D Printed Package is In Transit!',
      message: `Your package has been picked up by the courier. Your 6-digit Delivery Handshake OTP is: ${deliveryOtpPlain}. Give this code to the courier upon doorstep delivery to release escrow.`,
    });

    return {
      status: OrderStatus.IN_TRANSIT,
      message: 'Pickup handshake verified. Package is now in transit.',
    };
  }

  /**
   * Driver enters Delivery OTP provided by Client -> Completes order and releases escrow funds
   */
  async verifyDeliveryOtp(orderId: string, dto: VerifyOtpHandshakeDto, tenantId: string, driverId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, deliveryProviderId: driverId },
    });

    if (!order || !order.deliveryOtpHash) {
      throw new BadRequestException('Order not in transit or missing delivery handshake.');
    }

    const isMatch = await argon2.verify(order.deliveryOtpHash, dto.otpCode);
    if (!isMatch) {
      throw new BadRequestException('Invalid Delivery OTP. Please ask the client for their 6-digit code.');
    }

    // Release escrow: Payout to maker and courier
    const makerPayout = Number(order.agreedPrintPriceAed || order.clientMaxPrintBudgetAed);
    const courierPayout = Number(order.agreedDeliveryPriceAed || order.clientMaxDeliveryBudgetAed);

    if (order.printerProviderId) {
      await this.prisma.user.update({
        where: { id: order.printerProviderId },
        data: { walletBalanceAed: { increment: makerPayout } },
      });
    }

    await this.prisma.user.update({
      where: { id: driverId },
      data: { walletBalanceAed: { increment: courierPayout } },
    });

    const completed = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
      },
    });

    this.logger.log(`Order #${order.orderNumber} COMPLETED. Escrow released: Maker ${makerPayout} AED, Courier ${courierPayout} AED.`);

    return {
      status: OrderStatus.COMPLETED,
      message: 'Delivery confirmed! Escrow funds have been successfully released.',
      makerPayoutAed: makerPayout,
      courierPayoutAed: courierPayout,
    };
  }
}
