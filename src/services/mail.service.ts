import * as nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'genesis.gottlieb@ethereal.email', // My Ethereal email
        pass: 'ZeVEfRRSP5U4Mg2Zrm', //My Ethereal password
      },
    });
  }

  // Envoyer objet mailOptions
  async sendMail(mailOptions: { to: string; subject: string; text: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email envoyé à ${mailOptions.to}`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw new Error('Impossible d\'envoyer l\'email');
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetLink = `myapp://reset-password?token=${token}&&email=${to}`;
    const mailOptions = {
      from: 'Auth-backend service <no-reply@yourapp.com>',
      to,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending password reset email:', error.message);
      throw new Error('Could not send password reset email');
    }
  }
}