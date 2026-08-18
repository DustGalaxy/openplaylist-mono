"""Tests for src/tasks/log.py"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_log_calls_sio_service_log():
    log_schema = MagicMock()

    with patch("src.tasks.log.sio_playlist_service") as mock_sio:
        mock_sio.log = AsyncMock()
        from src.tasks.log import log

        await log(log_schema)

        mock_sio.log.assert_awaited_once_with(log_schema)
