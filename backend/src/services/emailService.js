const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    this.transporter = null;
    this.emailProvider = this.detectEmailProvider();
    this.setupEmailService();
  }

  detectEmailProvider() {
    if (process.env.SENDGRID_API_KEY) {
      return 'sendgrid';
    } else if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      return 'gmail';
    } else {
      return 'console'; // Fallback to console logging
    }
  }

  setupEmailService() {
    switch (this.emailProvider) {
      case 'sendgrid':
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        console.log('📧 Email service: SendGrid (Professional)');
        break;
      case 'gmail':
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          }
        });
        console.log('📧 Email service: Gmail SMTP');
        break;
      default:
        console.log('📧 Email service: Console logging (Development)');
    }
  }

  async sendPasswordResetEmail(email, resetCode) {
    try {
      const emailContent = this.generateEmailContent(email, resetCode);

      switch (this.emailProvider) {
        case 'sendgrid':
          return await this.sendWithSendGrid(emailContent);
        case 'gmail':
          return await this.sendWithGmail(emailContent);
        default:
          return this.sendWithConsole(email, resetCode);
      }
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      // Fallback to console
      console.log(`🔑 Password reset code for ${email}: ${resetCode}`);
      return { success: false, error: error.message, resetCode };
    }
  }

  async sendWithSendGrid(emailContent) {
    const msg = {
      to: emailContent.to,
      from: {
        email: process.env.FROM_EMAIL,
        name: 'LinkedIn Automation Platform'
      },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    await sgMail.send(msg);
    console.log('✅ SendGrid email sent successfully');
    return { success: true, provider: 'sendgrid' };
  }

  async sendWithGmail(emailContent) {
    const mailOptions = {
      from: {
        name: 'LinkedIn Automation Platform',
        address: process.env.EMAIL_USER
      },
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log('✅ Gmail email sent successfully');
    return { success: true, provider: 'gmail', messageId: info.messageId };
  }

  sendWithConsole(email, resetCode) {
    console.log('\n📧 EMAIL SIMULATION (Development Mode)');
    console.log('=====================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Password Reset Code`);
    console.log(`Reset Code: ${resetCode}`);
    console.log('=====================================\n');
    
    return { 
      success: true, 
      provider: 'console', 
      message: 'Email simulated in console for development',
      resetCode // Include reset code for development
    };
  }

  generateEmailContent(email, resetCode) {
    return {
      to: email,
      subject: 'Password Reset Code - LinkedIn Automation Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0a66c2; margin-bottom: 10px;">LinkedIn Automation Platform</h1>
            <h2 style="color: #333; font-weight: normal;">Password Reset Request</h2>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              We received a request to reset your password. Use the code below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="display: inline-block; background: #0a66c2; color: white; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
                ${resetCode}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              This code will expire in <strong>15 minutes</strong> for security reasons.
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <p style="color: #856404; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. Your account is still secure.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
            <p>LinkedIn Automation Platform</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      `,
      text: `
        LinkedIn Automation Platform - Password Reset Request
        
        We received a request to reset your password.
        
        Your reset code is: ${resetCode}
        
        This code will expire in 15 minutes for security reasons.
        
        If you didn't request this password reset, please ignore this email.
      `
    };
  }

  async testConnection() {
    try {
      if (this.emailProvider === 'gmail' && this.transporter) {
        await this.transporter.verify();
        console.log('✅ Gmail SMTP connection verified');
        return { success: true, provider: 'gmail' };
      } else if (this.emailProvider === 'sendgrid') {
        console.log('✅ SendGrid API key configured');
        return { success: true, provider: 'sendgrid' };
      } else {
        console.log('✅ Console logging mode active');
        return { success: true, provider: 'console' };
      }
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();