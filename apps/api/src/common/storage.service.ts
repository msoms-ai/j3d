import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client!: S3Client;
  private bucket!: string;

  onModuleInit() {
    this.bucket = process.env.S3_BUCKET || 'j3d-assets';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const accessKeyId = process.env.S3_ACCESS_KEY || 'j3d_minio_user';
    const secretAccessKey = process.env.S3_SECRET_KEY || 'j3d_minio_password';

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // required for MinIO and R2
    });

    this.ensureBucketExists().catch((err) => {
      this.logger.warn(`Could not ensure S3 bucket ${this.bucket}: ${err.message}`);
    });
  }

  private async ensureBucketExists() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created S3 bucket: ${this.bucket}`);
      } catch (e: any) {
        this.logger.warn(`Bucket creation error: ${e.message}`);
      }
    }

    // Set public read policy for browser STL downloads
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Ensured public read policy on bucket: ${this.bucket}`);
    } catch (e: any) {
      this.logger.warn(`Could not set bucket policy on ${this.bucket}: ${e.message}`);
    }
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const baseUrl = process.env.S3_PUBLIC_BASE_URL || `http://localhost:9000/${this.bucket}`;
    return `${baseUrl}/${key}`;
  }
}
