/**
 * Storage Module
 * BlakQube Smart Buckets for encrypted document storage
 */

import { MoneyPennyClient } from '../client';

export interface SmartBucket {
  bucket_id: string;
  name: string;
  created_at: string;
  file_count: number;
  total_size_bytes: number;
}

export interface UploadToken {
  upload_url: string;
  headers?: Record<string, string>;
  expires_at: string;
}

export interface BucketFile {
  file_id: string;
  name: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  indexed: boolean;
  metaqube_ref?: string; // Reference to metaQube lineage
}

export class StorageModule {
  constructor(private client: MoneyPennyClient) {}

  // Initialize Smart Bucket
  async initBucket(name: string): Promise<SmartBucket> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.blakQubeUrl}/buckets/init`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // List buckets
  async listBuckets(): Promise<SmartBucket[]> {
    const config = this.client.getConfig();
    const scope = this.client.getScope();
    
    if (!scope) return [];

    return this.client['fetch'](`${config.blakQubeUrl}/buckets?scope=${scope}`);
  }

  // Get bucket details
  async getBucket(bucketId: string): Promise<SmartBucket> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.blakQubeUrl}/buckets/${bucketId}`);
  }

  // Get upload token (presigned URL)
  async getUploadToken(
    bucketId: string,
    fileName: string,
    mimeType: string
  ): Promise<UploadToken> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.blakQubeUrl}/buckets/upload-token`, {
      method: 'POST',
      body: JSON.stringify({
        bucket_id: bucketId,
        file_name: fileName,
        mime_type: mimeType,
      }),
    });
  }

  // Upload file to BlakQube
  async uploadFile(
    token: UploadToken,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('PUT', token.upload_url);
      
      if (token.headers) {
        Object.entries(token.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      xhr.send(file);
    });
  }

  // Complete upload flow
  async uploadFileComplete(
    bucketId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<BucketFile> {
    // Get upload token
    const token = await this.getUploadToken(bucketId, file.name, file.type);

    // Upload file
    await this.uploadFile(token, file, onProgress);

    // Confirm upload
    return this.confirmUpload(bucketId, file.name);
  }

  // Confirm upload (after presigned URL upload)
  async confirmUpload(bucketId: string, fileName: string): Promise<BucketFile> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](`${config.blakQubeUrl}/buckets/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        bucket_id: bucketId,
        file_name: fileName,
      }),
    });
  }

  // List files in bucket
  async listFiles(bucketId: string): Promise<BucketFile[]> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.blakQubeUrl}/buckets/list?bucket_id=${bucketId}`
    );
  }

  // Get file details
  async getFile(bucketId: string, fileId: string): Promise<BucketFile> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.blakQubeUrl}/buckets/${bucketId}/files/${fileId}`
    );
  }

  // Get download URL
  async getDownloadUrl(bucketId: string, fileId: string): Promise<{ download_url: string }> {
    const config = this.client.getConfig();
    
    return this.client['fetch'](
      `${config.blakQubeUrl}/buckets/${bucketId}/files/${fileId}/download`
    );
  }

  // Delete file
  async deleteFile(bucketId: string, fileId: string): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.blakQubeUrl}/buckets/delete`, {
      method: 'POST',
      body: JSON.stringify({
        bucket_id: bucketId,
        file_id: fileId,
      }),
    });
  }

  // Delete bucket
  async deleteBucket(bucketId: string): Promise<void> {
    const config = this.client.getConfig();
    
    await this.client['fetch'](`${config.blakQubeUrl}/buckets/${bucketId}`, {
      method: 'DELETE',
    });
  }
}
