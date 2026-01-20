/**
 * Settings endpoint
 * Returns the complete backend configuration
 */

import { getCachedSettings } from '@/lib/config/settings';

export async function GET() {
  try {
    const settings = getCachedSettings();

    // Return settings as JSON
    // Note: Sensitive values like tokens and passwords are included
    // This endpoint should be protected in production
    return Response.json(settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
    return Response.json(
      {
        error: 'Configuration Error',
        message: 'Failed to load settings',
      },
      { status: 500 }
    );
  }
}
