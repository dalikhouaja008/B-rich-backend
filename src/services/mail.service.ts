import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'merle.olson73@ethereal.email', // My Ethereal email
        pass: 'wVGtGSkrpdfKNSjBv4', //My Ethereal password
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