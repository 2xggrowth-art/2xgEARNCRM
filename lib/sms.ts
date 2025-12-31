/**
 * SMS Provider Integration
 *
 * This file provides a unified interface for sending SMS messages.
 * Implement the provider of your choice below.
 *
 * Supported providers (examples):
 * - Twilio
 * - MSG91 (Popular in India)
 * - AWS SNS
 * - Vonage (Nexmo)
 */

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS using configured provider
 * @param phone Phone number in format: 919876543210 (with country code)
 * @param message Message content
 */
export async function sendSMS(phone: string, message: string): Promise<SMSResult> {
  const provider = process.env.SMS_PROVIDER || 'console'; // 'twilio', 'msg91', 'aws-sns', 'console'

  switch (provider) {
    case 'twilio':
      return sendViaTwilio(phone, message);
    case 'msg91':
      return sendViaMSG91(phone, message);
    case 'aws-sns':
      return sendViaAWSSNS(phone, message);
    case 'console':
    default:
      // Development mode - just log to console
      console.log(`[SMS] To: +${phone}`);
      console.log(`[SMS] Message: ${message}`);
      return { success: true, messageId: 'dev-mode' };
  }
}

/**
 * Twilio implementation
 */
async function sendViaTwilio(phone: string, message: string): Promise<SMSResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+${phone}`,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.sid };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * MSG91 implementation (Popular in India)
 */
async function sendViaMSG91(phone: string, message: string): Promise<SMSResult> {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID || 'LEADSM';

    if (!authKey) {
      throw new Error('MSG91 credentials not configured');
    }

    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        short_url: '0',
        mobiles: phone,
        var: message,
        route: '4', // Transactional route
        country: '91', // India
      }),
    });

    const data = await response.json();

    if (data.type === 'success') {
      return { success: true, messageId: data.message };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * AWS SNS implementation
 */
async function sendViaAWSSNS(phone: string, message: string): Promise<SMSResult> {
  try {
    // Note: You'll need to install @aws-sdk/client-sns
    // npm install @aws-sdk/client-sns

    return {
      success: false,
      error: 'AWS SNS not implemented. Install @aws-sdk/client-sns and implement.',
    };

    /* Example implementation:
    import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

    const client = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PublishCommand({
      PhoneNumber: `+${phone}`,
      Message: message,
    });

    const response = await client.send(command);
    return { success: true, messageId: response.MessageId };
    */
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Format OTP message
 */
export function formatOTPMessage(otp: string, appName: string = 'Lead CRM'): string {
  return `Your ${appName} OTP is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
}

/**
 * Format invite message for new sales rep
 */
export function formatInviteMessage(name: string, otp: string, appName: string = 'Lead CRM'): string {
  return `Hi ${name}! Welcome to ${appName}. Your login OTP is: ${otp}. Valid for 5 minutes.`;
}
