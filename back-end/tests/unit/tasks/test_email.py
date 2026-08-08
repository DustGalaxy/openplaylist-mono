"""Tests for src/tasks/email.py"""

from unittest.mock import MagicMock, patch

import pytest


_FAKE_SETTINGS = {
    "SMTP_EMAIL_ADDRESS": "sender@example.com",
    "SMTP_EMAIL_PASSWORD": "secret",
    "SMTP_SERVER": "smtp.example.com",
    "SMTP_PORT": 587,
}


def _make_smtp(*, sendmail_return=None):
    smtp = MagicMock()
    smtp.__enter__ = MagicMock(return_value=smtp)
    smtp.__exit__ = MagicMock(return_value=False)
    smtp.sendmail.return_value = sendmail_return if sendmail_return is not None else {}
    return smtp


def _patch_settings(mocker):
    mock_settings = mocker.patch("src.tasks.email.settings")
    for k, v in _FAKE_SETTINGS.items():
        setattr(mock_settings, k, v)
    return mock_settings


def test_send_email_returns_true_on_success(mocker):
    """sendmail вернул {} → True."""
    smtp = _make_smtp(sendmail_return={})
    mocker.patch("src.tasks.email.smtplib.SMTP", return_value=smtp)
    _patch_settings(mocker)

    from src.tasks.email import send_email

    assert send_email("to@example.com", "Hi", "<p>Hello</p>") is True


def test_send_email_returns_err_dict_on_partial_failure(mocker):
    """sendmail вернул непустой dict → возвращаем его."""
    err = {"bad@example.com": (550, b"User unknown")}
    smtp = _make_smtp(sendmail_return=err)
    mocker.patch("src.tasks.email.smtplib.SMTP", return_value=smtp)
    _patch_settings(mocker)

    from src.tasks.email import send_email

    assert send_email("bad@example.com", "Hi", "body") == err


def test_send_email_calls_sendmail_with_correct_sender_and_recipient(mocker):
    """sendmail вызван с sender из настроек и переданным recipient."""
    smtp = _make_smtp()
    mocker.patch("src.tasks.email.smtplib.SMTP", return_value=smtp)
    _patch_settings(mocker)

    from src.tasks.email import send_email

    send_email("to@example.com", "Subject", "<b>hi</b>")

    smtp.sendmail.assert_called_once()
    sender_arg, recipient_arg, _ = smtp.sendmail.call_args.args
    assert sender_arg == "sender@example.com"
    assert recipient_arg == "to@example.com"


def test_send_email_calls_starttls_and_login(mocker):
    """Порядок: starttls → login → sendmail."""
    smtp = _make_smtp()
    mocker.patch("src.tasks.email.smtplib.SMTP", return_value=smtp)
    _patch_settings(mocker)

    from src.tasks.email import send_email

    send_email("to@example.com", "Subj", "body")

    smtp.starttls.assert_called_once()
    smtp.login.assert_called_once_with("sender@example.com", "secret")


def test_send_email_opens_smtp_with_correct_host_and_port(mocker):
    """SMTP инициализируется с сервером и портом из настроек."""
    smtp = _make_smtp()
    mock_smtp_cls = mocker.patch("src.tasks.email.smtplib.SMTP", return_value=smtp)
    _patch_settings(mocker)

    from src.tasks.email import send_email

    send_email("to@example.com", "Subj", "body")

    mock_smtp_cls.assert_called_once_with("smtp.example.com", 587)
