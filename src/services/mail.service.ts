import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      logger: true,
      debug: true,
    });
    
  }
  async sendTestEmail(to: string): Promise<void> {
    const mailOptions = {
      from: '"Auth Backend" <no-reply@example.com>',
      to,
      subject: 'Test Email',
      text: 'This is a test email from MailService',
      html: '<p>This is a test email from MailService</p>',
    };
  
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
  

  // Envoyer objet mailOptions
  async sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
    const mailOptions = {
      from: '"Your App Name" <your-email@gmail.com>', // Sender address
      to, // Recipient address
      subject, // Email subject
      text, // Plain text body
      html, // HTML body
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Email sending failed');
    }
  }


  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Your OTP Code';
    const text = `Your OTP code is: ${otp}`;
    const html = `<p>Your OTP code is: <strong>${otp}</strong></p>`;

    await this.sendMail(to, subject, text, html);
  }
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetLink = `http://yourapp.com/reset-password?token=${token}`;
    const mailOptions = {
      from: 'Auth-backend service',
      to,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${to}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Could not send password reset email');
    }
  }
}