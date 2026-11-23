import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface CreateZiinaIntentOptions {
  amountAed: number;
  orderNumber: string;
  successUrl?: string;
  cancelUrl?: string;
  testMode?: boolean;
}

@Injectable()
export class ZiinaPaymentService {
  private readonly logger = new Logger(ZiinaPaymentService.name);

  private getApiKey(): string {
    return (
      process.env.ZIINA_API_KEY ||
      'FffRJcT+UTifWgt49MqzgOkiq9FjG6yxTwsFFy7SzpcoF262qCgYp9MLnrFgJvCN'
    );
  }

  private getBaseUrl(): string {
    return process.env.ZIINA_API_BASE_URL || 'https://api-v2.ziina.com/api';
  }

  /**
   * Calls Ziina POST /payment_intent (amount in fils: 100 AED = 10000 fils)
   */
  async createPaymentIntent(options: CreateZiinaIntentOptions) {
    const { amountAed, orderNumber, successUrl, cancelUrl, testMode = true } = options;

    const amountInFils = Math.round(amountAed * 100);
    if (amountInFils < 200) {
      throw new BadRequestException('Minimum payment amount is 2.00 AED (200 fils)');
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://j3d.msoms.ai';
    const payload = {
      amount: amountInFils,
      currency_code: 'AED',
      test: testMode,
      success_url:
        successUrl || `${siteUrl}/orders/confirmation?orderNumber=${orderNumber}&session_id={id}`,
      cancel_url: cancelUrl || `${siteUrl}/studio/checkout?cancelled=true&orderNumber=${orderNumber}`,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/payment_intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Ziina API error (${response.status}): ${errorText}`);
        throw new BadRequestException(`Ziina payment initialization failed: ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`Created Ziina payment intent ${data.id} for order #${orderNumber} (${amountAed} AED)`);
      return {
        id: data.id,
        amountFils: data.amount,
        amountAed,
        currencyCode: data.currency_code,
        status: data.status,
        redirectUrl: data.redirect_url,
      };
    } catch (err: any) {
      this.logger.error(`Failed to create Ziina payment intent: ${err.message}`);
      throw err;
    }
  }

  /**
   * Checks status of a payment intent by ID
   */
  async getPaymentIntent(intentId: string) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/payment_intent/${intentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getApiKey()}`,
        },
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to retrieve payment intent ${intentId}`);
      }

      return await response.json();
    } catch (err: any) {
      this.logger.error(`Ziina payment status check error: ${err.message}`);
      throw err;
    }
  }
}
