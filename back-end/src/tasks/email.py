import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from src.settings import settings
from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(task_name="send.email")
def send_email(recipient: str, subject: str, body: str):
    sender = settings.SMTP_EMAIL_ADDRESS
    password = settings.SMTP_EMAIL_PASSWORD
    smtp_server = settings.SMTP_SERVER
    smtp_port = settings.SMTP_PORT

    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(sender, password)
        err = server.sendmail(sender, recipient, msg.as_string())

    return err if err else True