// Event type definitions for the integration test app
import { UserContext } from '../../../../src/utils/types';

export interface AppEvents {
  // User events - now with proper user field structure following Inngest best practices
  'user.created': {
    data: {
      createdAt: string;
    };
    user: UserContext;
  };

  'user.updated': {
    data: {
      changes: {
        email?: string;
        name?: string;
      };
      updatedAt: string;
    };
    user: UserContext;
  };

  'user.deleted': {
    data: {
      deletedAt: string;
    };
    user: UserContext;
  };

  'user.verified': {
    data: {
      verificationToken: string;
      verifiedAt: string;
    };
    user: UserContext;
  };

  // User workflow events
  'user.welcome.started': {
    data: {
      userId: string;
      email: string;
    };
  };

  'user.welcome.completed': {
    data: {
      userId: string;
      profileId: string;
      completedAt: string;
    };
  };

  'user.onboarding.completed': {
    data: {
      userId: string;
      profileId: string;
      completedAt: string;
    };
  };

  // Notification events - with user context for better attribution
  'notification.email.send': {
    data: {
      to: string;
      subject: string;
      template: string;
      templateData: Record<string, any>;
      priority?: 'high' | 'normal' | 'low';
    };
    user: UserContext;
  };

  'notification.email.sent': {
    data: {
      to: string;
      messageId: string;
      sentAt: string;
    };
    user: UserContext;
  };

  'notification.email.failed': {
    data: {
      to: string;
      error: string;
      failedAt: string;
      retryCount: number;
    };
  };

  'notification.batch.process': {
    data: {
      batchId: string;
      notifications: Array<{
        type: string;
        recipient: string;
        data: Record<string, any>;
      }>;
    };
  };

  // System/Health events
  'system.health.check': {
    data: {
      timestamp: string;
    };
  };

  'system.health.alert': {
    data: {
      alertType: 'database' | 'memory' | 'cpu' | 'disk' | 'external_api';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      metrics: Record<string, number>;
      timestamp: string;
    };
  };

  'system.cleanup.started': {
    data: {
      cleanupType: 'inactive_users' | 'old_notifications' | 'temp_files';
      startedAt: string;
    };
  };

  'system.cleanup.completed': {
    data: {
      cleanupType: 'inactive_users' | 'old_notifications' | 'temp_files';
      itemsProcessed: number;
      completedAt: string;
    };
  };

  // Test events for manual testing
  'test.simple': {
    data: {
      message: string;
      timestamp: string;
    };
  };

  'test.workflow': {
    data: {
      workflowId: string;
      steps: string[];
      metadata: Record<string, any>;
    };
  };

  'test.error': {
    data: {
      shouldFail: boolean;
      errorType: 'validation' | 'network' | 'timeout' | 'unknown';
      message?: string;
    };
  };
}

// User data types
export interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  profileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: Date;
}

// System health types
export interface HealthMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    usage: number;
    total: number;
    available: number;
  };
  disk: {
    usage: number;
    total: number;
    available: number;
  };
  database: {
    isConnected: boolean;
    responseTime: number;
  };
  externalApis: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    lastCheck: Date;
  }>;
}