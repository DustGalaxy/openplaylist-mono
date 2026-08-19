from fastapi import APIRouter, status

from src.dto.feedback import FeedbackData
from src.tasks.email import send_email

router = APIRouter(prefix="/feedback")


@router.post("", status_code=status.HTTP_200_OK)
async def get_feedback(data: FeedbackData):
    # Формируем HTML-письмо с данными фидбека в 3-й строке внутри тега <p>
    is_bug = data.type == "bug_report"
    type_label = "🚨 BUG REPORT" if is_bug else "💬 USER FEEDBACK"
    badge_color = "#dc3545" if is_bug else "#0d6efd"
    user_name = data.user_nickname or "Anonymous"
    user_info = f"({data.user_contact})" if data.user_contact else ""

    html_content = (
        f"<h2 style='font-family: sans-serif; color: #333;'>OpenPlaylist Notification</h2>\n"
        f"<div style='margin-bottom: 15px;'><span style='background-color: {badge_color}; color: white; padding: 4px 8px; font-size: 12px; border-radius: 4px; font-family: sans-serif; font-weight: bold;'>{type_label}</span></div>\n"
        f"<p style='font-family: sans-serif; color: #555; font-size: 14px;'>New <b>{data.type}</b> received from <b>{user_name}</b> with a rating of <b>{data.rating}/10</b>.</p>\n"
        f"<table style='width: 100%; max-width: 600px; border-collapse: collapse; font-family: sans-serif; font-size: 14px; border: 1px solid #e0e0e0;'>\n"
        f"  <tr style='background-color: #f8f9fa;'>\n"
        f"    <th style='padding: 10px; border: 1px solid #e0e0e0; text-align: left; width: 30%;'>Field</th>\n"
        f"    <th style='padding: 10px; border: 1px solid #e0e0e0; text-align: left;'>Value</th>\n"
        f"  </tr>\n"
        f"  <tr>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;'>ID</td>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; color: #666; font-size: 12px;'>{data.id}</td>\n"
        f"  </tr>\n"
        f"  <tr>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;'>User</td>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0;'>{user_name} {user_info}</td>\n"
        f"  </tr>\n"
        f"  <tr>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;'>Rating</td>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: {'#ffc107' if data.rating >= 7 else '#dc3545'};'>{data.rating} / 10</td>\n"
        f"  </tr>\n"
        f"  <tr>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;'>Date (UTC)</td>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0;'>{data.created_at.strftime('%Y-%m-%d %H:%M:%S')}</td>\n"
        f"  </tr>\n"
        f"  <tr>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;'>User Agent</td>\n"
        f"    <td style='padding: 10px; border: 1px solid #e0e0e0; font-size: 12px; color: #666;'>{data.user_agent}</td>\n"
        f"  </tr>\n"
        f"  <tr>\n"
        f"    <td colspan='2' style='padding: 15px; border: 1px solid #e0e0e0; background-color: #fff;'>\n"
        f"      <div style='font-weight: bold; margin-bottom: 8px;'>Message:</div>\n"
        f"      <div style='white-space: pre-wrap; color: #212529; line-height: 1.5; padding: 10px; background-color: #fafafa; border-left: 4px solid #6c757d;'>{data.feedback_text}</div>\n"
        f"    </td>\n"
        f"  </tr>\n"
        f"</table>"
    )

    await send_email.kiq(
        "nikitavolov444@gmail.com",
        f"Open Playlist - {data.type.replace('_', ' ').title()}",
        html_content,
    )
