import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  SubmitBidDto,
  AcceptCounterOfferDto,
  UploadBatchPhotoDto,
  VerifyOtpHandshakeDto,
} from './orders.dto';
import { CurrentUser, TenantId, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { UserRole } from '@j3d/shared-types';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') clientId: string,
  ) {
    return this.ordersService.createOrder(dto, tenantId, clientId);
  }

  @Get()
  async getOrders(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.ordersService.getOrders(tenantId, userId, role);
  }

  @Get(':id')
  async getOrderById(
    @Param('id') orderId: string,
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.ordersService.getOrderById(orderId, tenantId, userId, role);
  }

  @Roles(UserRole.PRINTER_PROVIDER, UserRole.DELIVERY_PROVIDER, UserRole.ADMIN)
  @Post(':id/bid')
  async submitBid(
    @Param('id') orderId: string,
    @Body() dto: SubmitBidDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') providerId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.ordersService.submitBid(orderId, dto, tenantId, providerId, role);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post(':id/accept-counter-offer')
  async acceptCounterOffer(
    @Param('id') orderId: string,
    @Body() dto: AcceptCounterOfferDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') clientId: string,
  ) {
    return this.ordersService.acceptCounterOffer(orderId, dto, tenantId, clientId);
  }

  @Roles(UserRole.PRINTER_PROVIDER, UserRole.ADMIN)
  @Post(':id/photo-proof')
  async uploadBatchPhoto(
    @Param('id') orderId: string,
    @Body() dto: UploadBatchPhotoDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') makerId: string,
  ) {
    return this.ordersService.uploadBatchPhoto(orderId, dto, tenantId, makerId);
  }

  @Roles(UserRole.DELIVERY_PROVIDER, UserRole.ADMIN)
  @Post(':id/verify-pickup-otp')
  async verifyPickupOtp(
    @Param('id') orderId: string,
    @Body() dto: VerifyOtpHandshakeDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') driverId: string,
  ) {
    return this.ordersService.verifyPickupOtp(orderId, dto, tenantId, driverId);
  }

  @Roles(UserRole.DELIVERY_PROVIDER, UserRole.ADMIN)
  @Post(':id/verify-delivery-otp')
  async verifyDeliveryOtp(
    @Param('id') orderId: string,
    @Body() dto: VerifyOtpHandshakeDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') driverId: string,
  ) {
    return this.ordersService.verifyDeliveryOtp(orderId, dto, tenantId, driverId);
  }
}
