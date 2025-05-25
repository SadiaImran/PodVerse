import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

async def send_otp_email(email: str, otp: str):
    msg = MIMEMultipart()
    msg['From'] = os.getenv('EMAIL_USER')
    msg['To'] = email
    msg['Subject'] = "Your OTP for PodVerse"
    
    body = f"""
    <html>
        <body>
            <h2>Your OTP for PodVerse</h2>
            <p>Your OTP is: <strong>{otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
        </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))
    
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
        server.send_message(msg)

async def send_reset_link_email(email: str, reset_url: str):
    msg = MIMEMultipart()
    msg['From'] = os.getenv('EMAIL_USER')
    msg['To'] = email
    msg['Subject'] = "Reset Your PodVerse Password"
    
    body = f"""
    <html>
        <body>
            <h2>Reset Your PodVerse Password</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_url}">{reset_url}</a></p>
            <p>This link will expire in 30 minutes.</p>
        </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))
    
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
        server.send_message(msg) 